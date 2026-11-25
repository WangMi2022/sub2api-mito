package service

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/authidentity"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

// AdminIdentityImportItem 是单个统一身份账号的导入结果。
// Status 取值：created（新建并绑定）、exists（已有绑定，幂等跳过）、failed（本条失败）。
type AdminIdentityImportItem struct {
	Subject  string `json:"subject"`
	Email    string `json:"email,omitempty"`
	Username string `json:"username,omitempty"`
	UserID   int64  `json:"userId,omitempty"`
	Status   string `json:"status"`
	Reason   string `json:"reason,omitempty"`
}

// AdminIdentityImportInput 描述一次批量导入。账号资料由调用方（handler）从
// 身份目录权威读取后传入，服务层只负责本地落地，绝不按邮箱猜测绑定。
type AdminIdentityImportInput struct {
	Issuer       string
	UserGroupID  int64
	ActorAdminID int64
	Accounts     []AdminIdentityImportAccount
}

type AdminIdentityImportAccount struct {
	Subject  string
	Email    string
	Username string
}

const adminIdentityImportMaxBatch = 20

// ImportIdentities 把统一身份目录中的账号按需落地为本地普通用户：
// 已有 (issuer, subject) 绑定的账号幂等跳过；没有绑定的创建本地账号
// （随机密码、默认余额/订阅，与管理员建号路径一致）并写入 auth_identities，
// 最后统一归入指定用户组。只增不删：不会改动已有用户的归属与权限。
func (s *adminServiceImpl) ImportIdentities(ctx context.Context, input AdminIdentityImportInput) ([]AdminIdentityImportItem, error) {
	issuer := strings.TrimSpace(input.Issuer)
	if issuer == "" || len(input.Accounts) == 0 || len(input.Accounts) > adminIdentityImportMaxBatch {
		return nil, infraerrors.BadRequest("INVALID_INPUT", "issuer and 1-20 accounts are required")
	}
	if s == nil || s.userRepo == nil || s.entClient == nil {
		return nil, infraerrors.InternalServer("ADMIN_IDENTITY_IMPORT_UNAVAILABLE", "identity import service is unavailable")
	}
	group, err := s.GetUserGroup(ctx, input.UserGroupID)
	if err != nil {
		return nil, err
	}
	if group.Status != StatusActive {
		return nil, infraerrors.BadRequest("USER_GROUP_DISABLED", "target user group is disabled")
	}

	results := make([]AdminIdentityImportItem, 0, len(input.Accounts))
	seen := make(map[string]bool, len(input.Accounts))
	memberIDs := make([]int64, 0, len(input.Accounts))
	for _, account := range input.Accounts {
		subject := strings.TrimSpace(account.Subject)
		email := strings.TrimSpace(account.Email)
		item := AdminIdentityImportItem{Subject: subject, Email: email, Username: strings.TrimSpace(account.Username)}
		if subject == "" || seen[subject] {
			item.Status = "failed"
			item.Reason = "identity_import_invalid_subject"
			results = append(results, item)
			continue
		}
		seen[subject] = true

		existing, err := s.lookupIdentityBinding(ctx, issuer, subject)
		if err != nil {
			item.Status = "failed"
			item.Reason = "identity_import_lookup_failed"
			results = append(results, item)
			continue
		}
		if existing != nil {
			item.Status = "exists"
			item.UserID = existing.ID
			item.Username = existing.Username
			memberIDs = append(memberIDs, existing.ID)
			results = append(results, item)
			continue
		}

		user, err := s.createImportedIdentityUser(ctx, issuer, subject, email, item.Username, input.UserGroupID, input.ActorAdminID)
		if err != nil {
			item.Status = "failed"
			item.Reason = identityImportFailureReason(err)
			results = append(results, item)
			continue
		}
		item.Status = "created"
		item.UserID = user.ID
		item.Username = user.Username
		memberIDs = append(memberIDs, user.ID)
		results = append(results, item)
	}

	// 与 SyncUserGroupMembers 相同的并集语义：只追加成员，不移除既有成员，
	// 并让受影响用户的 Key 认证缓存失效。
	if len(memberIDs) > 0 {
		if _, err := s.appendUserGroupMembers(ctx, input.UserGroupID, memberIDs); err != nil {
			return results, err
		}
	}
	return results, nil
}

// lookupIdentityBinding 只按精确 (provider_key, provider_subject) 查绑定。
func (s *adminServiceImpl) lookupIdentityBinding(ctx context.Context, issuer, subject string) (*User, error) {
	identity, err := s.entClient.AuthIdentity.Query().Where(
		authidentity.ProviderTypeEQ("oidc"), authidentity.ProviderKeyEQ(issuer), authidentity.ProviderSubjectEQ(subject),
	).Only(ctx)
	if dbent.IsNotFound(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return s.userRepo.GetByID(ctx, identity.UserID)
}

func (s *adminServiceImpl) createImportedIdentityUser(ctx context.Context, issuer, subject, email, username string, userGroupID, actorAdminID int64) (*User, error) {
	if _, err := mail.ParseAddress(email); err != nil {
		return nil, infraerrors.BadRequest("IDENTITY_IMPORT_EMAIL_INVALID", "identity account has no usable email")
	}
	if username == "" {
		username = email
		if at := strings.IndexByte(username, '@'); at > 0 {
			username = username[:at]
		}
	}
	if len([]rune(username)) > 100 {
		username = string([]rune(username)[:100])
	}
	password, err := randomHexString(32)
	if err != nil {
		return nil, infraerrors.InternalServer("ADMIN_IDENTITY_IMPORT_PASSWORD_FAILED", "failed to generate account password").WithCause(err)
	}
	rpmLimit := 0
	if s.settingService != nil {
		rpmLimit = s.settingService.GetDefaultUserRPMLimit(ctx)
	}
	user, err := s.CreateUser(ctx, &CreateUserInput{
		Email:        email,
		Username:     username,
		Password:     password,
		Role:         RoleUser,
		RPMLimit:     rpmLimit,
		UserGroupID:  ptrInt64(userGroupID),
		Notes:        "imported from unified identity directory",
		ActorAdminID: actorAdminID,
	})
	if err != nil {
		return nil, err
	}
	metadata := map[string]any{"signup_via": "admin_identity_import"}
	if _, err := s.BindUserAuthIdentity(ctx, user.ID, AdminBindAuthIdentityInput{
		ProviderType: "oidc", ProviderKey: issuer, Issuer: &issuer, ProviderSubject: subject,
		Metadata: metadata,
	}); err != nil {
		// 绑定失败时回收刚创建的账号，避免留下无法登录的孤儿用户。
		if delErr := s.DeleteUser(ctx, user.ID); delErr != nil {
			return nil, fmt.Errorf("bind identity failed (%w) and rollback delete failed (%v)", err, delErr)
		}
		return nil, err
	}
	return user, nil
}

// appendUserGroupMembers 只增不删地把用户并入用户组，并失效认证缓存。
func (s *adminServiceImpl) appendUserGroupMembers(ctx context.Context, groupID int64, userIDs []int64) (int, error) {
	if s.userGroupRepo == nil {
		return 0, ErrUserGroupNotFound
	}
	before, err := s.userGroupRepo.ListMembers(ctx, groupID)
	if err != nil {
		return 0, translateUserGroupError(err)
	}
	merged := unionInt64(before, uniqueIDs(userIDs))
	count, err := s.userGroupRepo.SyncMembers(ctx, groupID, merged)
	if err != nil {
		return 0, translateUserGroupError(err)
	}
	s.invalidateUserGroupAuthCache(ctx, merged)
	return count, nil
}

func identityImportFailureReason(err error) string {
	switch {
	case errors.Is(err, ErrEmailExists):
		return "identity_import_email_exists"
	case infraerrors.Reason(err) == "AUTH_IDENTITY_OWNERSHIP_CONFLICT":
		return "identity_import_subject_bound"
	case infraerrors.Reason(err) != "":
		return strings.ToLower(infraerrors.Reason(err))
	default:
		return "identity_import_create_failed"
	}
}
