package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

// IQ 题面方案按管理员账号存服务端 settings(每个用户一个 key),跨设备可见。
// 只增不改共享结构:settings 表本就存在,官方实例对新增 key 无感知。
const settingKeyIQTestPresetsPrefix = "iq_test_presets_u"

const (
	iqPresetLimit     = 20
	iqPresetNameMax   = 40
	iqPresetPromptMax = 32000
)

// IQTestPreset 是智商测试弹窗保存的一份自定义题面配置,不含凭据。
type IQTestPreset struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	QuestionKind    string `json:"question_kind"`
	Prompt          string `json:"prompt"`
	ReasoningEffort string `json:"reasoning_effort"`
	ParallelCount   int    `json:"parallel_count"`
	UpdatedAt       string `json:"updated_at"`
}

func iqTestPresetsKey(userID int64) string {
	return fmt.Sprintf("%s%d", settingKeyIQTestPresetsPrefix, userID)
}

var iqPresetEfforts = map[string]struct{}{
	"low": {}, "medium": {}, "high": {}, "xhigh": {}, "max": {},
}

// ListIQTestPresets 读取该管理员已保存的题面方案;无记录返回空列表。
func (s *SettingService) ListIQTestPresets(ctx context.Context, userID int64) ([]IQTestPreset, error) {
	if s == nil || s.settingRepo == nil || userID <= 0 {
		return nil, ErrServiceUnavailable
	}
	raw, err := s.settingRepo.GetValue(ctx, iqTestPresetsKey(userID))
	if err != nil {
		return []IQTestPreset{}, nil
	}
	var presets []IQTestPreset
	if json.Unmarshal([]byte(raw), &presets) != nil {
		return []IQTestPreset{}, nil
	}
	return presets, nil
}

// SaveIQTestPresets 全量替换该管理员的题面方案列表。逐条校验并归一化,
// 同名视为覆盖(保留原 id),超限拒绝而不是静默截断。
func (s *SettingService) SaveIQTestPresets(ctx context.Context, userID int64, presets []IQTestPreset) ([]IQTestPreset, error) {
	if s == nil || s.settingRepo == nil || userID <= 0 {
		return nil, ErrServiceUnavailable
	}
	if len(presets) > iqPresetLimit {
		return nil, fmt.Errorf("too many presets (max %d)", iqPresetLimit)
	}
	previous, _ := s.ListIQTestPresets(ctx, userID)
	byName := make(map[string]IQTestPreset, len(previous))
	for _, p := range previous {
		byName[p.Name] = p
	}
	seenID := make(map[string]struct{}, len(presets))
	seenName := make(map[string]struct{}, len(presets))
	out := make([]IQTestPreset, 0, len(presets))
	for _, p := range presets {
		p.Name = strings.TrimSpace(p.Name)
		if p.Name == "" || utf8.RuneCountInString(p.Name) > iqPresetNameMax {
			return nil, fmt.Errorf("preset name must be 1-%d characters", iqPresetNameMax)
		}
		if p.QuestionKind != "candy" && p.QuestionKind != "pelican" {
			return nil, fmt.Errorf("preset question kind must be candy or pelican")
		}
		p.Prompt = strings.TrimSpace(p.Prompt)
		if p.Prompt == "" || len(p.Prompt) > iqPresetPromptMax {
			return nil, fmt.Errorf("preset prompt must be 1-%d bytes", iqPresetPromptMax)
		}
		if _, ok := iqPresetEfforts[p.ReasoningEffort]; !ok {
			p.ReasoningEffort = "medium"
		}
		if p.ParallelCount < 1 || p.ParallelCount > 8 {
			p.ParallelCount = 1
		}
		if _, dup := seenName[p.Name]; dup {
			return nil, fmt.Errorf("duplicate preset name")
		}
		seenName[p.Name] = struct{}{}
		p.ID = strings.TrimSpace(p.ID)
		if p.ID == "" || len(p.ID) > 64 {
			if old, ok := byName[p.Name]; ok {
				p.ID = old.ID
			} else {
				p.ID = fmt.Sprintf("p%d", time.Now().UnixNano())
			}
		}
		if _, dup := seenID[p.ID]; dup {
			return nil, fmt.Errorf("duplicate preset id")
		}
		seenID[p.ID] = struct{}{}
		p.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		out = append(out, p)
	}
	data, err := json.Marshal(out)
	if err != nil {
		return nil, err
	}
	if err := s.settingRepo.Set(ctx, iqTestPresetsKey(userID), string(data)); err != nil {
		return nil, err
	}
	return out, nil
}
