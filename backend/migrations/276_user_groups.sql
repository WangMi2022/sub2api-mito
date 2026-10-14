-- 用户组（user groups）：把「专属倍率 / 专属 RPM / 用户模型限制」从按用户
-- 配置改为按用户组配置，并让没有归属用户组的用户无法登录与调用。
--
-- 该迁移是纯增量的：新增表和新增列，既不修改 1-275 号迁移，也不改变
-- user_group_rate_multipliers 的主键与语义。因此旧的 8080 镜像（不包含本
-- 迁移）可以继续从同一个库正常启动和服务；旧镜像的迁移执行器只遍历自己
-- 内嵌的迁移文件，会忽略 276。
--
-- 回填覆盖全部在用用户，避免上线后因为「未分组」被整体拦截。

CREATE TABLE IF NOT EXISTS user_groups (
    id          BIGSERIAL    PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL,
    code        VARCHAR(32)  NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

-- 唯一约束按未删除行生效，允许软删除后复用同名/同编码。
CREATE UNIQUE INDEX IF NOT EXISTS user_groups_code_unique_active
    ON user_groups (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_groups_name_unique_active
    ON user_groups (name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_groups_deleted_at ON user_groups (deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_groups_status ON user_groups (status);

-- 系统内置组：系统管理员组 + 普通用户组（新注册用户默认落入）。
INSERT INTO user_groups (name, code, description, is_system, status)
SELECT '系统管理员组', 'system_admin', '系统内置管理员用户组，管理员默认归属。', TRUE, 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM user_groups WHERE code = 'system_admin' AND deleted_at IS NULL
);

INSERT INTO user_groups (name, code, description, is_system, status)
SELECT '普通用户组', 'default_user', '系统内置默认用户组，新注册用户自动加入。', TRUE, 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM user_groups WHERE code = 'default_user' AND deleted_at IS NULL
);

-- 用户归属用户组。NULL 表示未分组：未分组用户禁止登录与调用。
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_group_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_users_user_group_id ON users (user_group_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_user_group_id_fkey'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_user_group_id_fkey
            FOREIGN KEY (user_group_id) REFERENCES user_groups (id) ON DELETE SET NULL;
    END IF;
END $$;

-- 回填：管理员 → 系统管理员组，其余在用用户 → 普通用户组。
UPDATE users
SET user_group_id = (SELECT id FROM user_groups WHERE code = 'system_admin' AND deleted_at IS NULL)
WHERE user_group_id IS NULL AND role = 'admin' AND deleted_at IS NULL;

UPDATE users
SET user_group_id = (SELECT id FROM user_groups WHERE code = 'default_user' AND deleted_at IS NULL)
WHERE user_group_id IS NULL AND deleted_at IS NULL;

-- 用户组 × API 分组 的策略：专属倍率 / 专属 RPM / 用户模型限制。
CREATE TABLE IF NOT EXISTS user_group_policies (
    user_group_id   BIGINT       NOT NULL REFERENCES user_groups (id) ON DELETE CASCADE,
    group_id        BIGINT       NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    rate_multiplier NUMERIC(10,4),
    rpm_override    INTEGER,
    denied_models   JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_group_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_user_group_policies_group_id
    ON user_group_policies (group_id);
CREATE INDEX IF NOT EXISTS idx_user_group_policies_user_group_id
    ON user_group_policies (user_group_id);

-- 兼容层：无论写入方是包含本迁移的新镜像还是尚未升级的旧 8080 镜像，
-- 新建用户若未显式指定用户组，都按角色自动落入内置组，避免出现新的「未分组」用户。
CREATE OR REPLACE FUNCTION users_default_user_group() RETURNS trigger AS $fn$
BEGIN
    IF NEW.user_group_id IS NULL THEN
        IF NEW.role = 'admin' THEN
            SELECT id INTO NEW.user_group_id FROM user_groups
                WHERE code = 'system_admin' AND deleted_at IS NULL LIMIT 1;
        ELSE
            SELECT id INTO NEW.user_group_id FROM user_groups
                WHERE code = 'default_user' AND deleted_at IS NULL LIMIT 1;
        END IF;
    END IF;
    RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_default_user_group ON users;
CREATE TRIGGER trg_users_default_user_group
    BEFORE INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION users_default_user_group();
