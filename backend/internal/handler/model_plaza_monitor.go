package handler

import (
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

func (h *ModelPlazaHandler) attachPlazaMonitoring(c *gin.Context, all []service.PlazaGroup, out []modelPlazaGroup, userID int64) error {
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
	var statuses map[service.PlazaMonitorKey]*service.PlazaMonitorStatus
	var err error
	switch runtime.Mode {
	case service.ChannelMonitorModeV1:
		if h.monitorV1 != nil {
			statuses, err = h.monitorV1.PlazaStatuses(ctx, targets, unique)
		}
	case service.ChannelMonitorModeV2, service.ChannelMonitorModeV3:
		available, accessErr := h.apiKeyService.GetAvailableGroups(ctx, userID)
		if accessErr != nil {
			return accessErr
		}
		allowed := []int64{}
		viewer := service.ChannelMonitorV3Viewer{AllowedGroups: map[int64]bool{}, Admin: channelMonitorV2IsAdmin(c)}
		for _, group := range available {
			allowed = append(allowed, group.ID)
			viewer.AllowedGroups[group.ID] = true
		}
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
