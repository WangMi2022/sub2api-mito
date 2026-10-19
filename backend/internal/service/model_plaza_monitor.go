package service

import (
	"context"
	"slices"
	"time"
)

// PlazaMonitorTarget comes from the already-authorized plaza, never the client.
type PlazaMonitorTarget struct {
	GroupID   int64
	GroupName string
	Platform  string
	Model     string
}

// PlazaMonitorStatus is deliberately smaller than the monitoring APIs: no
// credentials, endpoints, request volumes, errors or operator configuration.
type PlazaMonitorStatus struct {
	Source       string             `json:"source"`
	Status       string             `json:"status"`
	Availability *float64           `json:"availability"`
	Range        string             `json:"range"`
	LatencyMs    *int64             `json:"latency_ms"`
	LatencyKind  string             `json:"latency_kind"`
	Throughput   *float64           `json:"throughput"`
	UpdatedAt    *time.Time         `json:"updated_at"`
	Cells        []PlazaMonitorCell `json:"cells"`
}

type PlazaMonitorCell struct {
	At     time.Time `json:"at"`
	Status string    `json:"status"`
}

// Internal keys prevent same-name models in different groups from sharing data.
type PlazaMonitorKey struct {
	GroupID  int64
	Platform string
	Model    string
}

func (t PlazaMonitorTarget) Key() PlazaMonitorKey {
	return PlazaMonitorKey{t.GroupID, t.Platform, t.Model}
}

// PlazaStatuses splits whole-group components by the actual requested model.
// Reusing the group aggregate on every card would falsely report an untested
// model as healthy. It also includes uncategorized enabled components.
func (s *ChannelMonitorV3Service) PlazaStatuses(ctx context.Context, viewer ChannelMonitorV3Viewer, targets []PlazaMonitorTarget) (map[PlazaMonitorKey]*PlazaMonitorStatus, error) {
	out := make(map[PlazaMonitorKey]*PlazaMonitorStatus)
	visible, _, err := s.visibleComponents(ctx, viewer)
	if err != nil {
		return nil, err
	}
	selected := make(map[PlazaMonitorKey]ChannelMonitorV3Component)
	groups := []int64{}
	for _, target := range targets {
		for _, component := range visible {
			if component.GroupID != target.GroupID || component.GroupPlatform != target.Platform || (component.Model != "" && component.Model != target.Model) {
				continue
			}
			previous, exists := selected[target.Key()]
			// An explicit model configuration takes precedence over a group-wide one.
			if !exists || (previous.Model == "" && component.Model != "") {
				selected[target.Key()] = component
			}
			if !slices.Contains(groups, target.GroupID) {
				groups = append(groups, target.GroupID)
			}
		}
	}
	if len(selected) == 0 {
		return out, nil
	}
	cfg, err := s.repo.GetConfig(ctx)
	if err != nil {
		return nil, err
	}
	now := s.now().UTC()
	interval := time.Duration(cfg.IntervalMinutes) * time.Minute
	first := now.Truncate(interval).Add(-time.Duration(cfg.Cells-1) * interval)
	end := now.Truncate(interval).Add(interval)
	rangeFrom := now.Add(-channelMonitorV3Ranges[cfg.AvailabilityRange]).Truncate(time.Hour)
	facts, err := s.repo.SlotFacts(ctx, groups, first, end, interval, true)
	if err != nil {
		return nil, err
	}
	totals, err := s.repo.RangeFacts(ctx, groups, rangeFrom, now)
	if err != nil {
		return nil, err
	}
	probed := cfg.IdleProbe.probedGroups(groups)
	if err := s.attachProbes(ctx, facts, probed, first, end, interval); err != nil {
		return nil, err
	}
	if err := s.attachProbes(ctx, totals, probed, rangeFrom, now, 0); err != nil {
		return nil, err
	}
	for key, component := range selected {
		component.Model = key.Model
		// Never pass the admin flag: request and probe volumes stay server-side.
		item := s.componentStatus(*cfg, component, facts, totals, first, interval, ChannelMonitorV3Viewer{})
		status := &PlazaMonitorStatus{
			Source: "v3", Status: plazaMonitorState(item.Status), Availability: item.Availability,
			Range: cfg.AvailabilityRange, UpdatedAt: item.LastDataAt, Throughput: item.Throughput,
			LatencyKind: "ttft", Cells: make([]PlazaMonitorCell, len(item.Cells)),
		}
		for i, cell := range item.Cells {
			status.Cells[i] = PlazaMonitorCell{At: first.Add(time.Duration(i) * interval), Status: "unknown"}
			if cell == nil {
				continue
			}
			status.Cells[i].Status = plazaMonitorState(cell.Status)
			// Last sampled slot, not an old successful sample after a failure.
			status.LatencyMs, status.LatencyKind = cell.TTFTP50Ms, "ttft"
			if cell.Probed {
				status.LatencyMs, status.LatencyKind = cell.ProbeLatencyMs, "probe"
			}
		}
		out[key] = status
	}
	return out, nil
}

func plazaMonitorState(state string) string {
	switch state {
	case "operational", "healthy", "available":
		return "operational"
	case "degraded", "warning":
		return "degraded"
	case "down", "critical", "unavailable", "failed", "error":
		return "down"
	default:
		return "unknown"
	}
}

func plazaV2Configured(cfg *ChannelMonitorV2Config, target PlazaMonitorTarget) bool {
	if cfg == nil || !cfg.Enabled || (len(cfg.GroupIDs) > 0 && !slices.Contains(cfg.GroupIDs, target.GroupID)) {
		return false
	}
	for _, platform := range cfg.Platforms {
		if platform.Enabled && platform.Platform == target.Platform {
			return len(platform.Models) == 0 || slices.Contains(platform.Models, target.Model)
		}
	}
	return false
}

func (s *ChannelMonitorV2Service) PlazaStatuses(ctx context.Context, targets []PlazaMonitorTarget, allowed []int64, hideThroughput bool) (map[PlazaMonitorKey]*PlazaMonitorStatus, error) {
	out := make(map[PlazaMonitorKey]*PlazaMonitorStatus)
	cfg, err := s.GetConfig(ctx)
	if err != nil {
		return nil, err
	}
	groups := []int64{}
	for _, target := range targets {
		if !slices.Contains(allowed, target.GroupID) || !plazaV2Configured(cfg, target) {
			continue
		}
		out[target.Key()] = &PlazaMonitorStatus{Source: "v2", Status: "unknown", Range: "24h", LatencyKind: "ttft", Cells: []PlazaMonitorCell{}}
		if !slices.Contains(groups, target.GroupID) {
			groups = append(groups, target.GroupID)
		}
	}
	if len(out) == 0 {
		return out, nil
	}
	filter, err := s.ParseFilter("24h", nil, nil, groups)
	if err != nil {
		return nil, err
	}
	filter.RestrictGroups, filter.AllowedGroupIDs = true, allowed
	matrix, err := s.Matrix(ctx, filter, ChannelMonitorV2GroupByPlatformGroupModel, false)
	if err != nil {
		return nil, err
	}
	if matrix == nil {
		return out, nil
	}
	for _, row := range matrix.Items {
		if row.GroupID == nil {
			continue
		}
		key := PlazaMonitorKey{*row.GroupID, row.Platform, row.Model}
		status := out[key]
		if status == nil {
			continue
		}
		if row.Metrics.HasSamples {
			status.Status = plazaMonitorState(row.Health.Overall)
			availability := (1 - row.Metrics.ErrorRate) * 100
			status.Availability, status.LatencyMs = &availability, row.Metrics.TTFT.P50Ms
			if !hideThroughput {
				// Aggregate traffic, not single-response generation speed.
				throughput := row.Metrics.TPM / 60
				status.Throughput = &throughput
			}
		}
		for _, bucket := range row.Buckets {
			state := "unknown"
			if bucket.Metrics.HasSamples {
				state = plazaMonitorState(bucket.Health.Overall)
			}
			status.Cells = append(status.Cells, PlazaMonitorCell{At: bucket.BucketStart, Status: state})
			if bucket.Metrics.HasSamples {
				at := bucket.BucketStart
				status.UpdatedAt = &at
			}
		}
	}
	return out, nil
}

// Legacy V1 has no group ID. Only an unambiguous, exact configured group label
// and provider may bind a probe to a plaza offer; never guess by model alone.
func (s *ChannelMonitorService) PlazaStatuses(ctx context.Context, targets []PlazaMonitorTarget, uniqueGroups map[string]bool) (map[PlazaMonitorKey]*PlazaMonitorStatus, error) {
	out := make(map[PlazaMonitorKey]*PlazaMonitorStatus)
	monitors, err := s.repo.ListEnabled(ctx)
	if err != nil {
		return nil, err
	}
	for _, monitor := range monitors {
		matched := []PlazaMonitorTarget{}
		for _, target := range targets {
			if uniqueGroups[target.GroupName] && monitor.GroupName == target.GroupName && monitor.Provider == target.Platform && (monitor.PrimaryModel == target.Model || slices.Contains(monitor.ExtraModels, target.Model)) {
				matched = append(matched, target)
			}
		}
		if len(matched) == 0 {
			continue
		}
		latest, err := s.repo.ListLatestPerModel(ctx, monitor.ID)
		if err != nil {
			return nil, err
		}
		availability, err := s.repo.ComputeAvailability(ctx, monitor.ID, 7)
		if err != nil {
			return nil, err
		}
		for _, target := range matched {
			// Ambiguous duplicate probes must not silently select a healthy one.
			if _, exists := out[target.Key()]; exists {
				out[target.Key()] = nil
				continue
			}
			status := &PlazaMonitorStatus{Source: "v1", Status: "unknown", Range: "7d", LatencyKind: "probe", Cells: []PlazaMonitorCell{}}
			if sample := pickLatest(latest, target.Model); sample != nil {
				// Historical uptime is still useful, but an old successful probe
				// must not be presented as the channel's current health.
				freshness := time.Duration(monitor.IntervalSeconds) * 3 * time.Second
				if freshness < 3*time.Minute {
					freshness = 3 * time.Minute
				}
				if time.Since(sample.CheckedAt) <= freshness {
					status.Status = plazaMonitorState(sample.Status)
				}
				at := sample.CheckedAt
				status.UpdatedAt = &at
				if sample.LatencyMs != nil {
					latency := int64(*sample.LatencyMs)
					status.LatencyMs = &latency
				}
			}
			history, err := s.repo.ListHistory(ctx, monitor.ID, target.Model, 60)
			if err != nil {
				return nil, err
			}
			for i := len(history) - 1; i >= 0; i-- {
				status.Cells = append(status.Cells, PlazaMonitorCell{At: history[i].CheckedAt, Status: plazaMonitorState(history[i].Status)})
			}
			for _, stat := range availability {
				if stat.Model == target.Model && stat.TotalChecks > 0 {
					rate := stat.AvailabilityPct
					status.Availability = &rate
				}
			}
			out[target.Key()] = status
		}
	}
	return out, nil
}
