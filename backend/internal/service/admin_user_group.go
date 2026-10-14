package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

// ListUserGroups 返回全部用户组（含成员数）。
func (s *adminServiceImpl) ListUserGroups(ctx context.Context) ([]UserGroup, error) {
	if s.userGroupRepo == nil {
		return []UserGroup{}, nil
	}
	return s.userGroupRepo.List(ctx)
}

func (s *adminServiceImpl) GetUserGroup(ctx context.Context, id int64) (*UserGroup, error) {
	if s.userGroupRepo == nil {
		return nil, ErrUserGroupNotFound
	}
	group, err := s.userGroupRepo.GetByID(ctx, id)
	if err != nil {
		return nil, translateUserGroupError(err)
	}
	return group, nil
}

func (s *adminServiceImpl) CreateUserGroup(ctx context.Context, input CreateUserGroupInput) (*UserGroup, error) {
	if s.userGroupRepo == nil {
		return nil, fmt.Errorf("user group repository is not configured")
	}
	if strings.TrimSpace(input.Name) == "" {
		return nil, infraerrors.BadRequest("USER_GROUP_NAME_REQUIRED", "user group name is required")
	}
	group, err := s.userGroupRepo.Create(ctx, input)
	if err != nil {
		return nil, translateUserGroupError(err)
	}
	return group, nil
}

func (s *adminServiceImpl) UpdateUserGroup(ctx context.Context, id int64, input UpdateUserGroupInput) (*UserGroup, error) {
	if s.userGroupRepo == nil {
		return nil, ErrUserGroupNotFound
	}
	group, err := s.userGroupRepo.Update(ctx, id, input)
	if err != nil {
		return nil, translateUserGroupError(err)
	}
	return group, nil
}

func (s *adminServiceImpl) DeleteUserGroup(ctx context.Context, id int64) error {
	if s.userGroupRepo == nil {
		return ErrUserGroupNotFound
	}
	if err := s.userGroupRepo.Delete(ctx, id); err != nil {
		return translateUserGroupError(err)
	}
	return nil
}

func (s *adminServiceImpl) ListUserGroupMembers(ctx context.Context, id int64) ([]int64, error) {
	if s.userGroupRepo == nil {
		return []int64{}, nil
	}
	members, err := s.userGroupRepo.ListMembers(ctx, id)
	if err != nil {
		return nil, translateUserGroupError(err)
	}
	return members, nil
}

// SyncUserGroupMembers 整组覆盖成员；被移出的用户回到「未分组」状态。
// 变更会失效相关用户的 API Key 认证缓存，让未分组拦截立即生效。
func (s *adminServiceImpl) SyncUserGroupMembers(ctx context.Context, id int64, userIDs []int64) (int, error) {
	if s.userGroupRepo == nil {
		return 0, ErrUserGroupNotFound
	}
	before, err := s.userGroupRepo.ListMembers(ctx, id)
	if err != nil {
		return 0, translateUserGroupError(err)
	}
	count, err := s.userGroupRepo.SyncMembers(ctx, id, userIDs)
	if err != nil {
		return 0, translateUserGroupError(err)
	}
	touched := unionInt64(before, uniqueIDs(userIDs))
	s.invalidateUserGroupAuthCache(ctx, touched)
	return count, nil
}

func (s *adminServiceImpl) GetGroupUserGroupPolicies(ctx context.Context, groupID int64) ([]UserGroupPolicyRow, error) {
	if err := s.ValidateSimpleModeGroupOperation(AdminGroupOperationMultiplier); err != nil {
		return nil, err
	}
	if s.userGroupRepo == nil {
		return []UserGroupPolicyRow{}, nil
	}
	return s.userGroupRepo.ListPoliciesByGroupID(ctx, groupID)
}

func (s *adminServiceImpl) BatchSetGroupUserGroupRates(ctx context.Context, groupID int64, entries []GroupUserGroupRateInput) error {
	if err := s.ValidateSimpleModeGroupOperation(AdminGroupOperationMultiplier); err != nil {
		return err
	}
	if s.userGroupRepo == nil {
		return nil
	}
	for _, e := range entries {
		if e.UserGroupID <= 0 {
			return infraerrors.BadRequest("INVALID_USER_GROUP_ID", "user_group_id must be positive")
		}
		if e.RateMultiplier <= 0 {
			return infraerrors.BadRequest("INVALID_RATE_MULTIPLIER", fmt.Sprintf("rate_multiplier must be > 0 (user_group_id=%d)", e.UserGroupID))
		}
	}
	if err := s.userGroupRepo.SyncGroupRateMultipliers(ctx, groupID, entries); err != nil {
		return err
	}
	s.invalidateGroupAuthCache(ctx, groupID)
	return nil
}

func (s *adminServiceImpl) BatchSetGroupUserGroupRPM(ctx context.Context, groupID int64, entries []GroupUserGroupRPMInput) error {
	if err := s.ValidateSimpleModeGroupOperation(AdminGroupOperationRPMOverride); err != nil {
		return err
	}
	if s.userGroupRepo == nil {
		return nil
	}
	for _, e := range entries {
		if e.UserGroupID <= 0 {
			return infraerrors.BadRequest("INVALID_USER_GROUP_ID", "user_group_id must be positive")
		}
		if e.RPMOverride != nil && *e.RPMOverride < 0 {
			return infraerrors.BadRequest("INVALID_RPM_OVERRIDE", fmt.Sprintf("rpm_override must be >= 0 (user_group_id=%d)", e.UserGroupID))
		}
	}
	if err := s.userGroupRepo.SyncGroupRPMOverrides(ctx, groupID, entries); err != nil {
		return err
	}
	s.invalidateGroupAuthCache(ctx, groupID)
	return nil
}

func (s *adminServiceImpl) BatchSetGroupUserGroupDeniedModels(ctx context.Context, groupID int64, entries []GroupUserGroupDeniedModelsInput) error {
	if err := s.ValidateSimpleModeGroupOperation(AdminGroupOperationDeniedModels); err != nil {
		return err
	}
	if s.userGroupRepo == nil {
		return nil
	}
	normalized := make([]GroupUserGroupDeniedModelsInput, 0, len(entries))
	seen := make(map[int64]struct{}, len(entries))
	for _, e := range entries {
		if e.UserGroupID <= 0 {
			return infraerrors.BadRequest("INVALID_USER_GROUP_ID", "user_group_id must be positive")
		}
		if _, dup := seen[e.UserGroupID]; dup {
			return infraerrors.BadRequest("INVALID_USER_GROUP_DENIED_MODELS", fmt.Sprintf("duplicate user_group_id %d", e.UserGroupID))
		}
		seen[e.UserGroupID] = struct{}{}
		models, err := NormalizeUserGroupDeniedModels(e.DeniedModels)
		if err != nil {
			return err
		}
		normalized = append(normalized, GroupUserGroupDeniedModelsInput{UserGroupID: e.UserGroupID, DeniedModels: models})
	}
	if err := s.userGroupRepo.SyncGroupDeniedModels(ctx, groupID, normalized); err != nil {
		return err
	}
	s.invalidateGroupAuthCache(ctx, groupID)
	return nil
}

func (s *adminServiceImpl) ClearGroupUserGroupPolicies(ctx context.Context, groupID int64) error {
	if err := s.ValidateSimpleModeGroupOperation(AdminGroupOperationMultiplier); err != nil {
		return err
	}
	if s.userGroupRepo == nil {
		return nil
	}
	if err := s.userGroupRepo.ClearGroupPolicies(ctx, groupID); err != nil {
		return err
	}
	s.invalidateGroupAuthCache(ctx, groupID)
	return nil
}

// invalidateGroupAuthCache 让该 API 分组下全部 Key 的认证快照立即失效。
func (s *adminServiceImpl) invalidateGroupAuthCache(ctx context.Context, groupID int64) {
	if s.authCacheInvalidator != nil {
		s.authCacheInvalidator.InvalidateAuthCacheByGroupID(ctx, groupID)
	}
}

// invalidateUserGroupAuthCache 让指定用户的 Key 认证快照失效；在无法按分组定位时使用。
func (s *adminServiceImpl) invalidateUserGroupAuthCache(ctx context.Context, userIDs []int64) {
	if s.authCacheInvalidator == nil {
		return
	}
	for _, userID := range uniqueIDs(userIDs) {
		s.authCacheInvalidator.InvalidateAuthCacheByUserID(ctx, userID)
	}
}

// translateUserGroupError 把仓储哨兵错误映射为对外可用的领域错误。
func translateUserGroupError(err error) error {
	switch {
	case err == nil:
		return nil
	case errors.Is(err, ErrUserGroupNotFound):
		return infraerrors.NotFound("USER_GROUP_NOT_FOUND", "user group not found")
	case errors.Is(err, ErrUserGroupSystemImmutable):
		return infraerrors.BadRequest("USER_GROUP_IMMUTABLE", "system user group cannot be renamed or deleted")
	case errors.Is(err, ErrUserGroupNameTaken):
		return infraerrors.Conflict("USER_GROUP_NAME_TAKEN", "user group name already exists")
	case strings.HasPrefix(err.Error(), "user group still has "):
		return infraerrors.BadRequest("USER_GROUP_NOT_EMPTY", err.Error())
	default:
		return err
	}
}

func uniqueIDs(ids []int64) []int64 {
	seen := make(map[int64]struct{}, len(ids))
	out := make([]int64, 0, len(ids))
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func unionInt64(a, b []int64) []int64 {
	seen := make(map[int64]struct{}, len(a)+len(b))
	out := make([]int64, 0, len(a)+len(b))
	for _, list := range [][]int64{a, b} {
		for _, id := range list {
			if id <= 0 {
				continue
			}
			if _, ok := seen[id]; ok {
				continue
			}
			seen[id] = struct{}{}
			out = append(out, id)
		}
	}
	return out
}
