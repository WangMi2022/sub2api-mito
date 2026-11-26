package admin

import (
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

// IQ 题面方案的读写挂在 ScheduledTestHandler 上,复用其注入的 SettingService。
// 数据按当前登录管理员隔离,任何设备登录同一账号可见。

type saveIQTestPresetsRequest struct {
	Presets []service.IQTestPreset `json:"presets"`
}

// ListIQTestPresets GET /admin/iq-test-presets
func (h *ScheduledTestHandler) ListIQTestPresets(c *gin.Context) {
	subject, ok := middleware.GetAuthSubjectFromContext(c)
	if !ok || subject.UserID <= 0 {
		response.Unauthorized(c, "authentication required")
		return
	}
	presets, err := h.settingService.ListIQTestPresets(c.Request.Context(), subject.UserID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, presets)
}

// SaveIQTestPresets PUT /admin/iq-test-presets
func (h *ScheduledTestHandler) SaveIQTestPresets(c *gin.Context) {
	subject, ok := middleware.GetAuthSubjectFromContext(c)
	if !ok || subject.UserID <= 0 {
		response.Unauthorized(c, "authentication required")
		return
	}
	var req saveIQTestPresetsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	saved, err := h.settingService.SaveIQTestPresets(c.Request.Context(), subject.UserID, req.Presets)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, saved)
}
