package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"slices"

	"entgo.io/ent/dialect"
	dbuser "github.com/Wei-Shaw/sub2api/ent/user"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"strings"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/authidentity"
)

// The callback is installed once at startup only for a configured Mito identity
// instance. It never grants Mito roles from IdP realm roles or email matches.
func (s *AuthService) SetUnifiedAccessCheck(check func(context.Context, string, string) error) {
	s.unifiedAccessCheck = check
}

func (s *AuthService) checkUnifiedAccess(ctx context.Context, issuer, subject string) error {
	if s.unifiedAccessCheck == nil {
		return nil
	}
	return s.unifiedAccessCheck(ctx, issuer, subject)
}

// ResolveUnifiedIdentityUser resolves only the exact configured issuer/subject.
// A missing binding is returned as nil, never guessed from an email address.
func (s *AuthService) ResolveUnifiedIdentityUser(ctx context.Context, subject string) (*User, error) {
	if s.entClient == nil || s.cfg == nil || s.cfg.IdentityAdminFile == "" || strings.TrimSpace(subject) == "" {
		return nil, ErrServiceUnavailable
	}
	identity, err := s.entClient.AuthIdentity.Query().Where(
		authidentity.ProviderTypeEQ("oidc"), authidentity.ProviderKeyEQ(strings.TrimSpace(s.cfg.OIDC.IssuerURL)), authidentity.ProviderSubjectEQ(subject),
	).Only(ctx)
	if dbent.IsNotFound(err) {
		return nil, nil
	}
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	return s.userRepo.GetByID(ctx, identity.UserID)
}

type MitoPermissions struct {
	ID                   int64   `json:"id"`
	Username             string  `json:"username"`
	Email                string  `json:"email"`
	Role                 string  `json:"role"`
	Status               string  `json:"status"`
	UserGroupID          int64   `json:"userGroupId"`
	AllowedGroups        []int64 `json:"allowedGroups"`
	ObserverGroupIDs     []int64 `json:"observerGroupIds"`
	RestrictPublicGroups bool    `json:"restrictPublicGroups"`
	Concurrency          int     `json:"concurrency"`
	RPMLimit             int     `json:"rpmLimit"`
	Revision             string  `json:"revision"`
}

func (user *User) MitoPermissions() MitoPermissions {
	p := MitoPermissions{ID: user.ID, Username: user.Username, Email: user.Email, Role: user.Role, Status: user.Status,
		AllowedGroups: append([]int64{}, user.AllowedGroups...), ObserverGroupIDs: append([]int64{}, user.ObserverGroupIDs...),
		RestrictPublicGroups: user.RestrictPublicGroups, Concurrency: user.Concurrency, RPMLimit: user.RPMLimit}
	if user.UserGroupID != nil {
		p.UserGroupID = *user.UserGroupID
	}
	slices.Sort(p.AllowedGroups)
	slices.Sort(p.ObserverGroupIDs)
	raw, _ := json.Marshal(p)
	sum := sha256.Sum256(raw)
	p.Revision = hex.EncodeToString(sum[:])
	return p
}

// Lock the account shared by permission edits and identity links until commit.
func lockedMitoUser(ctx context.Context, tx *dbent.Tx, id int64) (*dbent.User, error) {
	query := tx.User.Query().Where(dbuser.IDEQ(id), dbuser.DeletedAtIsNil())
	if tx.Client().Driver().Dialect() == dialect.Postgres {
		query = query.ForUpdate()
	}
	row, err := query.Only(ctx)
	if dbent.IsNotFound(err) {
		return nil, ErrUserNotFound
	}
	return row, err
}

var ErrMitoLinkUnavailable = infraerrors.Conflict("identity_mito_link_unavailable", "This Mito account cannot be linked to the selected identity")

func checkMitoLinkTarget(ctx context.Context, tx *dbent.Tx, userID int64, issuer, subject, email string) error {
	row, err := lockedMitoUser(ctx, tx, userID)
	if err != nil {
		return err
	}
	if row.Role != RoleUser || !strings.EqualFold(strings.TrimSpace(row.Email), email) {
		return ErrMitoLinkUnavailable
	}
	other, err := tx.AuthIdentity.Query().Where(authidentity.UserIDEQ(userID), authidentity.ProviderTypeEQ("oidc"),
		authidentity.ProviderKeyEQ(issuer), authidentity.ProviderSubjectNEQ(subject)).Exist(ctx)
	if err != nil {
		return err
	}
	if other {
		return ErrMitoLinkUnavailable
	}
	return nil
}
