package service

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestModelPlazaV3MonitoringExactScopeAndNoSamples(t *testing.T) {
	repo := monitorV3StatusFixture()
	for i := range repo.components {
		repo.components[i].GroupPlatform = "openai"
	}
	// A group-wide component must not copy gpt's traffic to an untested model.
	targets := []PlazaMonitorTarget{
		{GroupID: 4, Platform: "openai", Model: "gpt"},
		{GroupID: 4, Platform: "openai", Model: "untested"},
		{GroupID: 5, Platform: "openai", Model: "gpt"},
		{GroupID: 6, Platform: "openai", Model: "gpt"},
		{GroupID: 4, Platform: "anthropic", Model: "gpt"},
		{GroupID: 99, Platform: "openai", Model: "gpt"},
	}
	out, err := monitorV3Service(repo).PlazaStatuses(context.Background(), ChannelMonitorV3Viewer{AllowedGroups: map[int64]bool{4: true}}, targets)
	require.NoError(t, err)
	require.Len(t, out, 3)
	require.Equal(t, "down", out[targets[0].Key()].Status)
	require.InDelta(t, 80, *out[targets[0].Key()].Availability, .001)
	for _, target := range targets[1:3] {
		item := out[target.Key()]
		require.Equal(t, "unknown", item.Status)
		require.Nil(t, item.Availability)
		require.Nil(t, item.UpdatedAt)
		require.Nil(t, item.Throughput)
		for _, cell := range item.Cells {
			require.Equal(t, "unknown", cell.Status)
		}
	}
	// Protocol, restricted group and unconfigured group cannot leak into results.
	for _, target := range targets[3:] {
		require.NotContains(t, out, target.Key())
	}
	blob, err := json.Marshal(out[targets[0].Key()])
	require.NoError(t, err)
	for _, secret := range []string{"requests", "errors", "api_key", "endpoint", "group_id", "top_error", "probes"} {
		require.NotContains(t, string(blob), `"`+secret+`"`)
	}
	// Disabled components disappear even if historical traffic exists.
	repo.components[0].Enabled = false
	out, err = monitorV3Service(repo).PlazaStatuses(context.Background(), ChannelMonitorV3Viewer{Admin: true}, targets[:2])
	require.NoError(t, err)
	require.Empty(t, out)
}

func TestModelPlazaV3ExplicitThresholdAndUncategorizedComponent(t *testing.T) {
	repo := monitorV3StatusFixture()
	repo.components = []ChannelMonitorV3Component{
		{ID: 1, GroupID: 4, GroupPlatform: "openai", Enabled: true, Visibility: "public"},
		{ID: 2, GroupID: 4, GroupPlatform: "openai", Enabled: true, Visibility: "public", Model: "gpt", DegradedTTFTMs: 30000},
	}
	repo.slotFacts = ChannelMonitorV3Facts{
		Metrics: []ChannelMonitorV3Fact{{GroupID: 4, Model: "gpt", Slot: monitorV3Slot(0), Success: 20}},
		Latency: []ChannelMonitorV3LatencyFact{{GroupID: 4, Model: "gpt", Slot: monitorV3Slot(0), UpperBound: 15000, Count: 20}},
	}
	target := PlazaMonitorTarget{GroupID: 4, Platform: "openai", Model: "gpt"}
	out, err := monitorV3Service(repo).PlazaStatuses(context.Background(), ChannelMonitorV3Viewer{}, []PlazaMonitorTarget{target})
	require.NoError(t, err)
	require.Equal(t, "operational", out[target.Key()].Status)
	require.EqualValues(t, 15000, *out[target.Key()].LatencyMs)
	require.Equal(t, "ttft", out[target.Key()].LatencyKind)
}

func TestModelPlazaV3ProbeIsPerModel(t *testing.T) {
	repo := monitorV3StatusFixture()
	repo.components = []ChannelMonitorV3Component{{ID: 1, GroupID: 4, GroupPlatform: "openai", Enabled: true, Visibility: "public"}}
	repo.config.IdleProbe = ChannelMonitorV3IdleProbe{Enabled: true, Groups: []ChannelMonitorV3IdleProbeGroup{{GroupID: 4, Model: "probe-model"}}}
	repo.slotFacts, repo.totals = ChannelMonitorV3Facts{}, ChannelMonitorV3Facts{}
	repo.probeSlots = []ChannelMonitorV3ProbeFact{{GroupID: 4, Model: "probe-model", Slot: monitorV3Slot(0), Count: 1, LatencyP50Ms: 2500}}
	repo.probeTotals = repo.probeSlots
	targets := []PlazaMonitorTarget{{GroupID: 4, Platform: "openai", Model: "probe-model"}, {GroupID: 4, Platform: "openai", Model: "different-model"}}
	out, err := monitorV3Service(repo).PlazaStatuses(context.Background(), ChannelMonitorV3Viewer{}, targets)
	require.NoError(t, err)
	require.Equal(t, "probe", out[targets[0].Key()].LatencyKind)
	require.NotNil(t, out[targets[0].Key()].LatencyMs)
	require.Nil(t, out[targets[1].Key()].Availability)
}

func TestModelPlazaV2MonitoringConfigAndRedaction(t *testing.T) {
	groupID := int64(4)
	repo := &channelMonitorV2RepoStub{config: ChannelMonitorV2Config{Enabled: true, Platforms: []ChannelMonitorV2PlatformConfig{{Platform: "openai", Enabled: true, Models: []string{"gpt"}}}, GroupIDs: []int64{4}}, matrix: &ChannelMonitorV2Matrix{Items: []ChannelMonitorV2MatrixRow{
		{GroupID: &groupID, Platform: "openai", Model: "gpt", Metrics: ChannelMonitorV2Metric{RequestCount: 10, ErrorRequests: 10, ErrorRate: 1, TPM: 600}, Health: ChannelMonitorV2Health{Overall: "critical"}},
	}}}
	target := PlazaMonitorTarget{GroupID: 4, Platform: "openai", Model: "gpt"}
	targets := []PlazaMonitorTarget{target, {GroupID: 4, Platform: "openai", Model: "other"}, {GroupID: 5, Platform: "openai", Model: "gpt"}}
	out, err := NewChannelMonitorV2Service(repo).PlazaStatuses(context.Background(), targets, []int64{4}, true)
	require.NoError(t, err)
	require.Len(t, out, 1)
	require.Equal(t, "down", out[target.Key()].Status)
	require.Equal(t, 0.0, *out[target.Key()].Availability, "a true 0 percent must not become missing or healthy")
	require.Nil(t, out[target.Key()].Throughput)
	require.False(t, repo.admin)
	require.Equal(t, ChannelMonitorV2GroupByPlatformGroupModel, repo.group)
	out, err = NewChannelMonitorV2Service(repo).PlazaStatuses(context.Background(), targets, nil, false)
	require.NoError(t, err)
	require.Empty(t, out)
	repo.config.Enabled = false
	out, err = NewChannelMonitorV2Service(repo).PlazaStatuses(context.Background(), targets, []int64{4}, false)
	require.NoError(t, err)
	require.Empty(t, out)
}

// Verify the projection never serializes the richer upstream telemetry structs.
func TestModelPlazaMonitoringJSONNulls(t *testing.T) {
	status := PlazaMonitorStatus{Source: "v3", Status: "unknown", Cells: []PlazaMonitorCell{{At: time.Now(), Status: "unknown"}}}
	raw, err := json.Marshal(status)
	require.NoError(t, err)
	require.Contains(t, string(raw), `"availability":null`)
	require.Contains(t, string(raw), `"throughput":null`)
}

type plazaLegacyRepo struct {
	ChannelMonitorRepository
	monitors []*ChannelMonitor
	checked  time.Time
}

func (r *plazaLegacyRepo) ListEnabled(context.Context) ([]*ChannelMonitor, error) {
	return r.monitors, nil
}
func (r *plazaLegacyRepo) ListLatestPerModel(context.Context, int64) ([]*ChannelMonitorLatest, error) {
	return []*ChannelMonitorLatest{{Model: "gpt", Status: "operational", CheckedAt: r.checked}}, nil
}
func (r *plazaLegacyRepo) ComputeAvailability(context.Context, int64, int) ([]*ChannelMonitorAvailability, error) {
	return []*ChannelMonitorAvailability{{Model: "gpt", TotalChecks: 10, AvailabilityPct: 90}}, nil
}
func (r *plazaLegacyRepo) ListHistory(context.Context, int64, string, int) ([]*ChannelMonitorHistoryEntry, error) {
	return []*ChannelMonitorHistoryEntry{{Model: "gpt", Status: "operational", CheckedAt: r.checked}}, nil
}

func TestModelPlazaV1ExactUnambiguousBindingAndFreshness(t *testing.T) {
	repo := &plazaLegacyRepo{monitors: []*ChannelMonitor{{ID: 1, GroupName: "one", Provider: "openai", PrimaryModel: "gpt", IntervalSeconds: 60}}, checked: time.Now()}
	svc := NewChannelMonitorService(repo, nil)
	target := PlazaMonitorTarget{GroupID: 1, GroupName: "one", Platform: "openai", Model: "gpt"}
	targets := []PlazaMonitorTarget{target, {GroupID: 2, GroupName: "two", Platform: "openai", Model: "gpt"}, {GroupID: 1, GroupName: "one", Platform: "anthropic", Model: "gpt"}}
	out, err := svc.PlazaStatuses(context.Background(), targets, map[string]bool{"one": true, "two": true})
	require.NoError(t, err)
	require.Len(t, out, 1)
	require.Equal(t, "operational", out[target.Key()].Status)
	repo.checked = time.Now().Add(-24 * time.Hour)
	out, err = svc.PlazaStatuses(context.Background(), targets, map[string]bool{"one": true})
	require.NoError(t, err)
	require.Equal(t, "unknown", out[target.Key()].Status)
	require.Equal(t, 90.0, *out[target.Key()].Availability)
	out, err = svc.PlazaStatuses(context.Background(), targets, map[string]bool{"one": false})
	require.NoError(t, err)
	require.Empty(t, out)
	repo.monitors = append(repo.monitors, repo.monitors[0])
	out, err = svc.PlazaStatuses(context.Background(), targets, map[string]bool{"one": true})
	require.NoError(t, err)
	require.Nil(t, out[target.Key()])
}
