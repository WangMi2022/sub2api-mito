package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/domain"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/lib/pq"
)

type userGroupRepository struct {
	sql sqlExecutor
}

// NewUserGroupRepository 创建用户组仓储。
func NewUserGroupRepository(sqlDB *sql.DB) service.UserGroupRepository {
	return &userGroupRepository{sql: sqlDB}
}

const userGroupColumns = `id, name, code, description, is_system, status, created_at, updated_at`

func (r *userGroupRepository) List(ctx context.Context) ([]service.UserGroup, error) {
	rows, err := r.sql.QueryContext(ctx, `
		SELECT g.id, g.name, g.code, g.description, g.is_system, g.status, g.created_at, g.updated_at,
		       (SELECT COUNT(*) FROM users u WHERE u.user_group_id = g.id AND u.deleted_at IS NULL) AS member_count
		FROM user_groups g
		WHERE g.deleted_at IS NULL
		ORDER BY g.is_system DESC, g.id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	result := make([]service.UserGroup, 0, 8)
	for rows.Next() {
		var g service.UserGroup
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&g.ID, &g.Name, &g.Code, &g.Description, &g.IsSystem, &g.Status, &createdAt, &updatedAt, &g.MemberCount); err != nil {
			return nil, err
		}
		g.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		g.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		result = append(result, g)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *userGroupRepository) GetByID(ctx context.Context, id int64) (*service.UserGroup, error) {
	return r.getOne(ctx, `g.id = $1`, id)
}

func (r *userGroupRepository) GetByCode(ctx context.Context, code string) (*service.UserGroup, error) {
	return r.getOne(ctx, `g.code = $1`, code)
}

func (r *userGroupRepository) getOne(ctx context.Context, where string, arg any) (*service.UserGroup, error) {
	query := fmt.Sprintf(`
		SELECT g.id, g.name, g.code, g.description, g.is_system, g.status, g.created_at, g.updated_at,
		       (SELECT COUNT(*) FROM users u WHERE u.user_group_id = g.id AND u.deleted_at IS NULL) AS member_count
		FROM user_groups g
		WHERE g.deleted_at IS NULL AND %s
	`, where)
	rows, err := r.sql.QueryContext(ctx, query, arg)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return nil, err
		}
		return nil, service.ErrUserGroupNotFound
	}
	var g service.UserGroup
	var createdAt, updatedAt time.Time
	if err := rows.Scan(&g.ID, &g.Name, &g.Code, &g.Description, &g.IsSystem, &g.Status, &createdAt, &updatedAt, &g.MemberCount); err != nil {
		return nil, err
	}
	g.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	g.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return &g, nil
}

func (r *userGroupRepository) Create(ctx context.Context, in service.CreateUserGroupInput) (*service.UserGroup, error) {
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return nil, fmt.Errorf("user group name is required")
	}
	code := userGroupCodeFromName(name)
	rows, err := r.sql.QueryContext(ctx, `
		INSERT INTO user_groups (name, code, description, is_system, status)
		VALUES ($1, $2, $3, FALSE, 'active')
		RETURNING id, name, code, description, is_system, status, created_at, updated_at
	`, name, code, strings.TrimSpace(in.Description))
	if err != nil {
		if isUniqueViolation(err) {
			return nil, service.ErrUserGroupNameTaken
		}
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	if !rows.Next() {
		return nil, fmt.Errorf("create user group returned no row")
	}
	var g service.UserGroup
	var createdAt, updatedAt time.Time
	if err := rows.Scan(&g.ID, &g.Name, &g.Code, &g.Description, &g.IsSystem, &g.Status, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	g.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	g.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return &g, nil
}

func (r *userGroupRepository) Update(ctx context.Context, id int64, in service.UpdateUserGroupInput) (*service.UserGroup, error) {
	current, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if current.IsSystem && in.Name != nil && strings.TrimSpace(*in.Name) != current.Name {
		return nil, service.ErrUserGroupSystemImmutable
	}
	if in.Status != nil {
		status := strings.TrimSpace(*in.Status)
		if status != domain.StatusActive && status != domain.StatusDisabled {
			return nil, fmt.Errorf("invalid user group status %q", status)
		}
	}
	rows, err := r.sql.QueryContext(ctx, `
		UPDATE user_groups SET
			name = COALESCE($2, name),
			description = COALESCE($3, description),
			status = COALESCE($4, status),
			updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, name, code, description, is_system, status, created_at, updated_at
	`, id, trimPtr(in.Name), trimPtr(in.Description), trimPtr(in.Status))
	if err != nil {
		if isUniqueViolation(err) {
			return nil, service.ErrUserGroupNameTaken
		}
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	if !rows.Next() {
		return nil, service.ErrUserGroupNotFound
	}
	var g service.UserGroup
	var createdAt, updatedAt time.Time
	if err := rows.Scan(&g.ID, &g.Name, &g.Code, &g.Description, &g.IsSystem, &g.Status, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	g.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	g.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return &g, nil
}

func (r *userGroupRepository) Delete(ctx context.Context, id int64) error {
	current, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if current.IsSystem {
		return service.ErrUserGroupSystemImmutable
	}
	var members int64
	if err := scanSingleRow(ctx, r.sql, `SELECT COUNT(*) FROM users WHERE user_group_id = $1 AND deleted_at IS NULL`, []any{id}, &members); err != nil {
		return err
	}
	if members > 0 {
		return fmt.Errorf("user group still has %d members", members)
	}
	_, err = r.sql.ExecContext(ctx, `UPDATE user_groups SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	return err
}

func (r *userGroupRepository) ListMembers(ctx context.Context, id int64) ([]int64, error) {
	rows, err := r.sql.QueryContext(ctx, `
		SELECT id FROM users WHERE user_group_id = $1 AND deleted_at IS NULL ORDER BY id
	`, id)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	result := make([]int64, 0, 16)
	for rows.Next() {
		var uid int64
		if err := rows.Scan(&uid); err != nil {
			return nil, err
		}
		result = append(result, uid)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *userGroupRepository) SyncMembers(ctx context.Context, id int64, userIDs []int64) (int, error) {
	if _, err := r.GetByID(ctx, id); err != nil {
		return 0, err
	}
	unique := uniquePositiveIDs(userIDs)
	if len(unique) == 0 {
		res, err := r.sql.ExecContext(ctx, `
			UPDATE users SET user_group_id = NULL, updated_at = NOW()
			WHERE user_group_id = $1 AND deleted_at IS NULL
		`, id)
		if err != nil {
			return 0, err
		}
		n, _ := res.RowsAffected()
		return int(n), nil
	}
	if _, err := r.sql.ExecContext(ctx, `
		UPDATE users SET user_group_id = NULL, updated_at = NOW()
		WHERE user_group_id = $1 AND deleted_at IS NULL AND id <> ALL($2)
	`, id, pq.Array(unique)); err != nil {
		return 0, err
	}
	res, err := r.sql.ExecContext(ctx, `
		UPDATE users SET user_group_id = $1, updated_at = NOW()
		WHERE deleted_at IS NULL AND id = ANY($2)
	`, id, pq.Array(unique))
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

func (r *userGroupRepository) AssignUsersToDefault(ctx context.Context, userIDs []int64) (int, error) {
	unique := uniquePositiveIDs(userIDs)
	if len(unique) == 0 {
		return 0, nil
	}
	def, err := r.GetByCode(ctx, service.UserGroupCodeDefault)
	if err != nil {
		return 0, err
	}
	res, err := r.sql.ExecContext(ctx, `
		UPDATE users SET user_group_id = $1, updated_at = NOW()
		WHERE deleted_at IS NULL AND id = ANY($2) AND user_group_id IS NULL
	`, def.ID, pq.Array(unique))
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

const userGroupPolicyColumns = `ugp.user_group_id, ugp.group_id, ugp.rate_multiplier, ugp.rpm_override, ugp.denied_models`

func (r *userGroupRepository) GetPolicy(ctx context.Context, userGroupID, groupID int64) (*service.UserGroupPolicy, error) {
	rows, err := r.sql.QueryContext(ctx, `
		SELECT user_group_id, group_id, rate_multiplier, rpm_override, denied_models
		FROM user_group_policies WHERE user_group_id = $1 AND group_id = $2
	`, userGroupID, groupID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return nil, err
		}
		return nil, nil
	}
	return scanUserGroupPolicy(rows)
}

func (r *userGroupRepository) GetPolicyByUserAndGroup(ctx context.Context, userID, groupID int64) (*service.UserGroupPolicy, error) {
	rows, err := r.sql.QueryContext(ctx, `
		SELECT ugp.user_group_id, ugp.group_id, ugp.rate_multiplier, ugp.rpm_override, ugp.denied_models
		FROM user_group_policies ugp
		JOIN users u ON u.user_group_id = ugp.user_group_id AND u.deleted_at IS NULL
		WHERE u.id = $1 AND ugp.group_id = $2
	`, userID, groupID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return nil, err
		}
		return nil, nil
	}
	return scanUserGroupPolicy(rows)
}

func (r *userGroupRepository) ListPoliciesByGroupID(ctx context.Context, groupID int64) ([]service.UserGroupPolicyRow, error) {
	rows, err := r.sql.QueryContext(ctx, `
		SELECT g.id, g.name, g.code, g.is_system,
		       (SELECT COUNT(*) FROM users u WHERE u.user_group_id = g.id AND u.deleted_at IS NULL) AS member_count,
		       p.rate_multiplier, p.rpm_override, p.denied_models
		FROM user_groups g
		LEFT JOIN user_group_policies p ON p.user_group_id = g.id AND p.group_id = $1
		WHERE g.deleted_at IS NULL
		ORDER BY g.is_system DESC, g.id ASC
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	result := make([]service.UserGroupPolicyRow, 0, 8)
	for rows.Next() {
		var row service.UserGroupPolicyRow
		var rate sql.NullFloat64
		var rpm sql.NullInt32
		var denied []byte
		if err := rows.Scan(&row.UserGroupID, &row.UserGroupName, &row.UserGroupCode, &row.IsSystem, &row.MemberCount, &rate, &rpm, &denied); err != nil {
			return nil, err
		}
		if rate.Valid {
			v := rate.Float64
			row.RateMultiplier = &v
		}
		if rpm.Valid {
			v := int(rpm.Int32)
			row.RPMOverride = &v
		}
		models, err := decodeUserGroupDeniedModels(denied)
		if err != nil {
			return nil, err
		}
		row.DeniedModels = models
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *userGroupRepository) SyncGroupRateMultipliers(ctx context.Context, groupID int64, entries []service.GroupUserGroupRateInput) error {
	groupIDs := make([]int64, 0, len(entries))
	rates := make([]float64, 0, len(entries))
	for _, e := range entries {
		if e.UserGroupID <= 0 {
			continue
		}
		groupIDs = append(groupIDs, e.UserGroupID)
		rates = append(rates, e.RateMultiplier)
	}
	// 未出现在 entries 中的用户组：rate_multiplier 归 NULL。
	if len(groupIDs) == 0 {
		if _, err := r.sql.ExecContext(ctx, `
			UPDATE user_group_policies SET rate_multiplier = NULL, updated_at = NOW()
			WHERE group_id = $1 AND rate_multiplier IS NOT NULL
		`, groupID); err != nil {
			return err
		}
	} else {
		if _, err := r.sql.ExecContext(ctx, `
			UPDATE user_group_policies SET rate_multiplier = NULL, updated_at = NOW()
			WHERE group_id = $1 AND user_group_id <> ALL($2) AND rate_multiplier IS NOT NULL
		`, groupID, pq.Array(groupIDs)); err != nil {
			return err
		}
	}
	if err := r.deleteEmptyPolicies(ctx, groupID); err != nil {
		return err
	}
	if len(groupIDs) == 0 {
		return nil
	}
	now := time.Now()
	_, err := r.sql.ExecContext(ctx, `
		INSERT INTO user_group_policies (user_group_id, group_id, rate_multiplier, created_at, updated_at)
		SELECT data.user_group_id, $1::bigint, data.rate_multiplier, $2::timestamptz, $2::timestamptz
		FROM unnest($3::bigint[], $4::double precision[]) AS data(user_group_id, rate_multiplier)
		ON CONFLICT (user_group_id, group_id)
		DO UPDATE SET rate_multiplier = EXCLUDED.rate_multiplier, updated_at = EXCLUDED.updated_at
	`, groupID, now, pq.Array(groupIDs), pq.Array(rates))
	return err
}

func (r *userGroupRepository) SyncGroupRPMOverrides(ctx context.Context, groupID int64, entries []service.GroupUserGroupRPMInput) error {
	keepIDs := make([]int64, 0, len(entries))
	var clearIDs []int64
	upsertIDs := make([]int64, 0, len(entries))
	upsertValues := make([]int32, 0, len(entries))
	for _, e := range entries {
		if e.UserGroupID <= 0 {
			continue
		}
		keepIDs = append(keepIDs, e.UserGroupID)
		if e.RPMOverride == nil {
			clearIDs = append(clearIDs, e.UserGroupID)
		} else {
			upsertIDs = append(upsertIDs, e.UserGroupID)
			upsertValues = append(upsertValues, int32(*e.RPMOverride))
		}
	}
	if len(keepIDs) == 0 {
		if _, err := r.sql.ExecContext(ctx, `
			UPDATE user_group_policies SET rpm_override = NULL, updated_at = NOW()
			WHERE group_id = $1 AND rpm_override IS NOT NULL
		`, groupID); err != nil {
			return err
		}
	} else {
		if _, err := r.sql.ExecContext(ctx, `
			UPDATE user_group_policies SET rpm_override = NULL, updated_at = NOW()
			WHERE group_id = $1 AND user_group_id <> ALL($2) AND rpm_override IS NOT NULL
		`, groupID, pq.Array(keepIDs)); err != nil {
			return err
		}
	}
	if len(clearIDs) > 0 {
		if _, err := r.sql.ExecContext(ctx, `
			UPDATE user_group_policies SET rpm_override = NULL, updated_at = NOW()
			WHERE group_id = $1 AND user_group_id = ANY($2)
		`, groupID, pq.Array(clearIDs)); err != nil {
			return err
		}
	}
	if err := r.deleteEmptyPolicies(ctx, groupID); err != nil {
		return err
	}
	if len(upsertIDs) == 0 {
		return nil
	}
	now := time.Now()
	_, err := r.sql.ExecContext(ctx, `
		INSERT INTO user_group_policies (user_group_id, group_id, rpm_override, created_at, updated_at)
		SELECT data.user_group_id, $1::bigint, data.rpm_override, $2::timestamptz, $2::timestamptz
		FROM unnest($3::bigint[], $4::integer[]) AS data(user_group_id, rpm_override)
		ON CONFLICT (user_group_id, group_id)
		DO UPDATE SET rpm_override = EXCLUDED.rpm_override, updated_at = EXCLUDED.updated_at
	`, groupID, now, pq.Array(upsertIDs), pq.Array(upsertValues))
	return err
}

func (r *userGroupRepository) SyncGroupDeniedModels(ctx context.Context, groupID int64, entries []service.GroupUserGroupDeniedModelsInput) error {
	upsertIDs := make([]int64, 0, len(entries))
	upsertModels := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.UserGroupID <= 0 || len(e.DeniedModels) == 0 {
			continue
		}
		encoded, err := json.Marshal(e.DeniedModels)
		if err != nil {
			return err
		}
		upsertIDs = append(upsertIDs, e.UserGroupID)
		upsertModels = append(upsertModels, string(encoded))
	}
	if len(upsertIDs) == 0 {
		if _, err := r.sql.ExecContext(ctx, `
			UPDATE user_group_policies SET denied_models = NULL, updated_at = NOW()
			WHERE group_id = $1 AND denied_models IS NOT NULL
		`, groupID); err != nil {
			return err
		}
	} else {
		if _, err := r.sql.ExecContext(ctx, `
			UPDATE user_group_policies SET denied_models = NULL, updated_at = NOW()
			WHERE group_id = $1 AND user_group_id <> ALL($2) AND denied_models IS NOT NULL
		`, groupID, pq.Array(upsertIDs)); err != nil {
			return err
		}
	}
	if err := r.deleteEmptyPolicies(ctx, groupID); err != nil {
		return err
	}
	if len(upsertIDs) == 0 {
		return nil
	}
	now := time.Now()
	_, err := r.sql.ExecContext(ctx, `
		INSERT INTO user_group_policies (user_group_id, group_id, denied_models, created_at, updated_at)
		SELECT data.user_group_id, $1::bigint, data.denied_models::jsonb, $2::timestamptz, $2::timestamptz
		FROM unnest($3::bigint[], $4::text[]) AS data(user_group_id, denied_models)
		ON CONFLICT (user_group_id, group_id)
		DO UPDATE SET denied_models = EXCLUDED.denied_models, updated_at = EXCLUDED.updated_at
	`, groupID, now, pq.Array(upsertIDs), pq.Array(upsertModels))
	return err
}

func (r *userGroupRepository) ClearGroupPolicies(ctx context.Context, groupID int64) error {
	_, err := r.sql.ExecContext(ctx, `DELETE FROM user_group_policies WHERE group_id = $1`, groupID)
	return err
}

func (r *userGroupRepository) deleteEmptyPolicies(ctx context.Context, groupID int64) error {
	_, err := r.sql.ExecContext(ctx, `
		DELETE FROM user_group_policies
		WHERE group_id = $1 AND rate_multiplier IS NULL AND rpm_override IS NULL AND denied_models IS NULL
	`, groupID)
	return err
}

func scanUserGroupPolicy(rows *sql.Rows) (*service.UserGroupPolicy, error) {
	var p service.UserGroupPolicy
	var rate sql.NullFloat64
	var rpm sql.NullInt32
	var denied []byte
	if err := rows.Scan(&p.UserGroupID, &p.GroupID, &rate, &rpm, &denied); err != nil {
		return nil, err
	}
	if rate.Valid {
		v := rate.Float64
		p.RateMultiplier = &v
	}
	if rpm.Valid {
		v := int(rpm.Int32)
		p.RPMOverride = &v
	}
	models, err := decodeUserGroupDeniedModels(denied)
	if err != nil {
		return nil, err
	}
	p.DeniedModels = models
	return &p, nil
}

func trimPtr(v *string) *string {
	if v == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*v)
	return &trimmed
}

func uniquePositiveIDs(ids []int64) []int64 {
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

// userGroupCodeFromName 由组名派生唯一编码（仅用于非系统组，避免与内置组的编码冲突）。
func userGroupCodeFromName(name string) string {
	var b strings.Builder
	b.WriteString("ug_")
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r >= 'A' && r <= 'Z':
			b.WriteRune(r + ('a' - 'A'))
		default:
			b.WriteByte('_')
		}
	}
	code := b.String()
	if len(code) > 28 {
		code = code[:28]
	}
	code += fmt.Sprintf("_%d", time.Now().UnixNano()%1000000)
	return code
}
