package handler

import (
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

// attachPlazaMonitoring attaches status to the offers the plaza already renders.
// Its scope is the plaza's own result: if this viewer may see a group and its
// prices, they may see that group's configured status too. Using a second,
// narrower rule (bindable API-key groups, or a component's public flag) made a
// visible quote silently lose its status and made anonymous and signed-in
// views disagree.
func (h *ModelPlazaHandler) attachPlazaMonitoring(c *gin.Context, all []service.PlazaGroup, out []modelPlazaGroup) error {
	ctx := c.Request.Context()
	runtime := h.settingService.GetChannelMonitorRuntime(ctx)
	if !runtime.Enabled || len(out) == 0 {
		return nil
	}
	names, counts := map[int64]string{}, map[string]int{}
	for _, group := range all {
		names[group.ID] = group.Name
		counts[group.Name]++
	}
	unique := map[string]bool{}
	for name, count := range counts {
		unique[name] = name != "" && count == 1
	}
	targets := []service.PlazaMonitorTarget{}
	for _, group := range out {
		for _, model := range group.Models {
			targets = append(targets, service.PlazaMonitorTarget{GroupID: group.ID, GroupName: names[group.ID], Platform: model.Platform, Model: model.Name})
		}
	}
	if len(targets) == 0 {
		return nil
	}
	// out is already filtered for this viewer (anonymous, group restriction,
	// exclusive grants), so it is the only scope needed here.
	allowed := make([]int64, 0, len(out))
	visible := make(map[int64]bool, len(out))
	for _, group := range out {
		allowed = append(allowed, group.ID)
		visible[group.ID] = true
	}
	var statuses map[service.PlazaMonitorKey]*service.PlazaMonitorStatus
	var err error
	switch runtime.Mode {
	case service.ChannelMonitorModeV1:
		if h.monitorV1 != nil {
			statuses, err = h.monitorV1.PlazaStatuses(ctx, targets, unique)
		}
	case service.ChannelMonitorModeV2, service.ChannelMonitorModeV3:
		viewer := service.ChannelMonitorV3Viewer{AllowedGroups: visible, Admin: channelMonitorV2IsAdmin(c)}
		if runtime.Mode == service.ChannelMonitorModeV3 && h.monitorV3 != nil {
			statuses, err = h.monitorV3.PlazaStatuses(ctx, viewer, targets)
		} else if runtime.Mode == service.ChannelMonitorModeV2 && h.monitorV2 != nil {
			statuses, err = h.monitorV2.PlazaStatuses(ctx, targets, allowed, runtime.HideThroughput)
		}
	}
	if err != nil {
		return err
	}
	for i := range out {
		for j := range out[i].Models {
			model := &out[i].Models[j]
			model.Monitoring = statuses[service.PlazaMonitorKey{GroupID: out[i].ID, Platform: model.Platform, Model: model.Name}]
		}
	}
	return nil
}
