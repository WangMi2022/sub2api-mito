package admin

import (
	"strconv"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

// UserGroupHandler 处理器：用户组 CRUD 与用户组策略。
type UserGroupHandler struct {
	adminService service.AdminService
}

// NewUserGroupHandler 创建用户组处理器。
func NewUserGroupHandler(adminService service.AdminService) *UserGroupHandler {
	return &UserGroupHandler{adminService: adminService}
}

// List 返回全部用户组
// GET /api/v1/admin/user-groups
func (h *UserGroupHandler) List(c *gin.Context) {
	groups, err := h.adminService.ListUserGroups(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	if groups == nil {
		groups = []service.UserGroup{}
	}
	response.Success(c, groups)
}

// GetByID 返回单个用户组
// GET /api/v1/admin/user-groups/:id
func (h *UserGroupHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid user group ID")
		return
	}
	group, err := h.adminService.GetUserGroup(c.Request.Context(), id)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, group)
}

// CreateUserGroupRequest 新建用户组请求。
type CreateUserGroupRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// Create 新建用户组
// POST /api/v1/admin/user-groups
func (h *UserGroupHandler) Create(c *gin.Context) {
	var req CreateUserGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	group, err := h.adminService.CreateUserGroup(c.Request.Context(), service.CreateUserGroupInput{
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, group)
}

// UpdateUserGroupRequest 更新用户组请求；指针区分「未提供」。
type UpdateUserGroupRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
}

// Update 更新用户组
// PUT /api/v1/admin/user-groups/:id
func (h *UserGroupHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid user group ID")
		return
	}
	var req UpdateUserGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	group, err := h.adminService.UpdateUserGroup(c.Request.Context(), id, service.UpdateUserGroupInput{
		Name:        req.Name,
		Description: req.Description,
		Status:      req.Status,
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, group)
}

// Delete 删除用户组
// DELETE /api/v1/admin/user-groups/:id
func (h *UserGroupHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid user group ID")
		return
	}
	if err := h.adminService.DeleteUserGroup(c.Request.Context(), id); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "User group deleted successfully"})
}

// ListMembers 返回组内用户 id
// GET /api/v1/admin/user-groups/:id/members
func (h *UserGroupHandler) ListMembers(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid user group ID")
		return
	}
	members, err := h.adminService.ListUserGroupMembers(c.Request.Context(), id)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	if members == nil {
		members = []int64{}
	}
	response.Success(c, gin.H{"user_ids": members})
}

// SyncMembersRequest 整组覆盖成员请求。
type SyncMembersRequest struct {
	UserIDs []int64 `json:"user_ids"`
}

// SyncMembers 整组覆盖组内成员
// PUT /api/v1/admin/user-groups/:id/members
func (h *UserGroupHandler) SyncMembers(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid user group ID")
		return
	}
	var req SyncMembersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	affected, err := h.adminService.SyncUserGroupMembers(c.Request.Context(), id, req.UserIDs)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"affected": affected})
}

// GetGroupUserGroupPolicies 返回某 API 分组下的用户组策略矩阵
// GET /api/v1/admin/groups/:id/user-group-policies
func (h *GroupHandler) GetGroupUserGroupPolicies(c *gin.Context) {
	if h.rejectUnsupportedSimpleModeOperation(c, "advanced") {
		return
	}
	groupID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid group ID")
		return
	}
	rows, err := h.adminService.GetGroupUserGroupPolicies(c.Request.Context(), groupID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	if rows == nil {
		rows = []service.UserGroupPolicyRow{}
	}
	response.Success(c, rows)
}

// BatchSetGroupUserGroupRatesRequest 批量设置用户组专属倍率。
type BatchSetGroupUserGroupRatesRequest struct {
	Entries []service.GroupUserGroupRateInput `json:"entries" binding:"required"`
}

// BatchSetGroupUserGroupRates 批量设置用户组专属倍率
// PUT /api/v1/admin/groups/:id/user-group-rates
func (h *GroupHandler) BatchSetGroupUserGroupRates(c *gin.Context) {
	if h.rejectUnsupportedSimpleModeOperation(c, "advanced") {
		return
	}
	groupID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid group ID")
		return
	}
	var req BatchSetGroupUserGroupRatesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if err := h.adminService.BatchSetGroupUserGroupRates(c.Request.Context(), groupID, req.Entries); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "User group rate multipliers updated successfully"})
}

// BatchSetGroupUserGroupRPMRequest 批量设置用户组专属 RPM。
type BatchSetGroupUserGroupRPMRequest struct {
	Entries []service.GroupUserGroupRPMInput `json:"entries" binding:"required"`
}

// BatchSetGroupUserGroupRPM 批量设置用户组专属 RPM
// PUT /api/v1/admin/groups/:id/user-group-rpm
func (h *GroupHandler) BatchSetGroupUserGroupRPM(c *gin.Context) {
	if h.rejectUnsupportedSimpleModeOperation(c, "advanced") {
		return
	}
	groupID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid group ID")
		return
	}
	var req BatchSetGroupUserGroupRPMRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if err := h.adminService.BatchSetGroupUserGroupRPM(c.Request.Context(), groupID, req.Entries); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "User group RPM overrides updated successfully"})
}

// BatchSetGroupUserGroupDeniedModelsRequest 批量设置用户组模型限制。
type BatchSetGroupUserGroupDeniedModelsRequest struct {
	Entries []service.GroupUserGroupDeniedModelsInput `json:"entries" binding:"required"`
}

// BatchSetGroupUserGroupDeniedModels 批量设置用户组模型限制
// PUT /api/v1/admin/groups/:id/user-group-denied-models
func (h *GroupHandler) BatchSetGroupUserGroupDeniedModels(c *gin.Context) {
	if h.rejectUnsupportedSimpleModeOperation(c, "advanced") {
		return
	}
	groupID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid group ID")
		return
	}
	var req BatchSetGroupUserGroupDeniedModelsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if err := h.adminService.BatchSetGroupUserGroupDeniedModels(c.Request.Context(), groupID, req.Entries); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "User group denied models updated successfully"})
}

// ClearGroupUserGroupPolicies 清空该 API 分组的全部用户组策略
// DELETE /api/v1/admin/groups/:id/user-group-policies
func (h *GroupHandler) ClearGroupUserGroupPolicies(c *gin.Context) {
	if h.rejectUnsupportedSimpleModeOperation(c, "advanced") {
		return
	}
	groupID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid group ID")
		return
	}
	if err := h.adminService.ClearGroupUserGroupPolicies(c.Request.Context(), groupID); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "User group policies cleared successfully"})
}
