package service

import (
	"context"
	"errors"
)

// 用户组仓储的哨兵错误。仓储层直接返回这些值，服务层据此映射 HTTP 状态。
var (
	// ErrUserGroupNotFound 用户组不存在。
	ErrUserGroupNotFound = errors.New("user group not found")
	// ErrUserGroupSystemImmutable 系统内置用户组不可删除或改名。
	ErrUserGroupSystemImmutable = errors.New("system user group is immutable")
	// ErrUserGroupNameTaken 用户组名称已被占用。
	ErrUserGroupNameTaken = errors.New("user group name already exists")
)

// UserGroup 是「用户组」：用于把专属倍率、专属 RPM、用户模型限制等
// 按用户组统一配置，并把用户归属到组。未归属任何用户组的用户不允许登录
// 或调用网关接口。
type UserGroup struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description"`
	IsSystem    bool   `json:"is_system"`
	Status      string `json:"status"`
	// MemberCount 组内未删除用户数，仅在列表接口填充。
	MemberCount int64  `json:"member_count"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// 系统内置用户组编码。这两组由迁移创建且不可删除。
const (
	UserGroupCodeSystemAdmin = "system_admin"
	UserGroupCodeDefault     = "default_user"
)

// UserGroupPolicy 表示某用户组在某个 API 分组上的专属策略。
// RateMultiplier / RPMOverride / DeniedModels 均为「未设置」时表示不覆盖。
type UserGroupPolicy struct {
	UserGroupID    int64    `json:"user_group_id"`
	GroupID        int64    `json:"group_id"`
	RateMultiplier *float64 `json:"rate_multiplier,omitempty"`
	RPMOverride    *int     `json:"rpm_override,omitempty"`
	DeniedModels   []string `json:"denied_models,omitempty"`
}

// UserGroupPolicyRow 是「分组 × 用户组」矩阵里的一行，用于管理端渲染。
type UserGroupPolicyRow struct {
	UserGroupID    int64    `json:"user_group_id"`
	UserGroupName  string   `json:"user_group_name"`
	UserGroupCode  string   `json:"user_group_code"`
	IsSystem       bool     `json:"is_system"`
	MemberCount    int64    `json:"member_count"`
	RateMultiplier *float64 `json:"rate_multiplier,omitempty"`
	RPMOverride    *int     `json:"rpm_override,omitempty"`
	DeniedModels   []string `json:"denied_models,omitempty"`
}

// GroupUserGroupRateInput 批量设置「分组 × 用户组」的专属倍率。
type GroupUserGroupRateInput struct {
	UserGroupID    int64   `json:"user_group_id"`
	RateMultiplier float64 `json:"rate_multiplier"`
}

// GroupUserGroupRPMInput 批量设置「分组 × 用户组」的专属 RPM；nil 表示清除。
type GroupUserGroupRPMInput struct {
	UserGroupID int64 `json:"user_group_id"`
	RPMOverride *int  `json:"rpm_override"`
}

// GroupUserGroupDeniedModelsInput 批量设置「分组 × 用户组」的用户模型限制。
type GroupUserGroupDeniedModelsInput struct {
	UserGroupID  int64    `json:"user_group_id"`
	DeniedModels []string `json:"denied_models"`
}

// CreateUserGroupInput 新建用户组。
type CreateUserGroupInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// UpdateUserGroupInput 更新用户组；Name/Description 为指针以区分「未提供」。
type UpdateUserGroupInput struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
}

// UserGroupMemberInput 用户组内的用户 id 列表（整组覆盖）。
type UserGroupMembersInput struct {
	UserIDs []int64 `json:"user_ids"`
}

// UserGroupRepository 用户组与用户组策略仓储。
type UserGroupRepository interface {
	// List 返回用户组（含成员数），按系统组优先、创建时间排序。
	List(ctx context.Context) ([]UserGroup, error)
	// GetByID 返回单个用户组。
	GetByID(ctx context.Context, id int64) (*UserGroup, error)
	// GetByCode 按编码返回用户组（用于系统默认组查找）。
	GetByCode(ctx context.Context, code string) (*UserGroup, error)
	// Create 新建用户组。
	Create(ctx context.Context, in CreateUserGroupInput) (*UserGroup, error)
	// Update 更新用户组。
	Update(ctx context.Context, id int64, in UpdateUserGroupInput) (*UserGroup, error)
	// Delete 删除用户组；系统组或仍被用户引用时返回错误。
	Delete(ctx context.Context, id int64) error
	// ListMembers 返回组内用户 id。
	ListMembers(ctx context.Context, id int64) ([]int64, error)
	// SyncMembers 整组覆盖组内用户；未列出的用户被移出该组（置为未分组）。
	SyncMembers(ctx context.Context, id int64, userIDs []int64) (int, error)
	// AssignUsersToDefault 把指定用户加入默认用户组（仅当用户当前未分组）。
	AssignUsersToDefault(ctx context.Context, userIDs []int64) (int, error)

	// GetPolicy 返回某用户组在某 API 分组的策略（不存在返回 nil）。
	GetPolicy(ctx context.Context, userGroupID, groupID int64) (*UserGroupPolicy, error)
	// GetPolicyByUserAndGroup 通过用户当前用户组解析策略（用户未分组或未设置返回 nil）。
	GetPolicyByUserAndGroup(ctx context.Context, userID, groupID int64) (*UserGroupPolicy, error)
	// ListPoliciesByGroupID 返回该 API 分组下全部用户组的策略行（含未配置的组）。
	ListPoliciesByGroupID(ctx context.Context, groupID int64) ([]UserGroupPolicyRow, error)
	// SyncGroupRateMultipliers 整组覆盖该 API 分组的用户组专属倍率。
	SyncGroupRateMultipliers(ctx context.Context, groupID int64, entries []GroupUserGroupRateInput) error
	// SyncGroupRPMOverrides 整组覆盖该 API 分组的用户组专属 RPM。
	SyncGroupRPMOverrides(ctx context.Context, groupID int64, entries []GroupUserGroupRPMInput) error
	// SyncGroupDeniedModels 整组覆盖该 API 分组的用户组模型限制。
	SyncGroupDeniedModels(ctx context.Context, groupID int64, entries []GroupUserGroupDeniedModelsInput) error
	// ClearGroupPolicies 清空该 API 分组的全部用户组策略。
	ClearGroupPolicies(ctx context.Context, groupID int64) error
}
