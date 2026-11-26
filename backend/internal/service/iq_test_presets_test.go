package service

import (
	"context"
	"testing"
)

type iqPresetFakeRepo struct {
	values map[string]string
}

func (r *iqPresetFakeRepo) GetValue(_ context.Context, key string) (string, error) {
	v, ok := r.values[key]
	if !ok {
		return "", ErrSettingNotFound
	}
	return v, nil
}

func (r *iqPresetFakeRepo) Set(_ context.Context, key, value string) error {
	r.values[key] = value
	return nil
}

// 只实现题面方案用到的两个方法;其余接口方法由内嵌接口占位(nil),不会被调用。
type iqPresetSettingRepo struct {
	SettingRepository
	fake *iqPresetFakeRepo
}

func (r iqPresetSettingRepo) GetValue(ctx context.Context, key string) (string, error) {
	return r.fake.GetValue(ctx, key)
}
func (r iqPresetSettingRepo) Set(ctx context.Context, key, value string) error {
	return r.fake.Set(ctx, key, value)
}

func newIQPresetService() (*SettingService, *iqPresetFakeRepo) {
	fake := &iqPresetFakeRepo{values: map[string]string{}}
	return &SettingService{settingRepo: iqPresetSettingRepo{fake: fake}}, fake
}

func TestIQTestPresetsRoundTripPerUser(t *testing.T) {
	svc, fake := newIQPresetService()
	ctx := context.Background()
	saved, err := svc.SaveIQTestPresets(ctx, 7, []IQTestPreset{
		{Name: "叮当猫", QuestionKind: "pelican", Prompt: "画叮当猫", ReasoningEffort: "high", ParallelCount: 3},
	})
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	if len(saved) != 1 || saved[0].ID == "" || saved[0].UpdatedAt == "" {
		t.Fatalf("saved normalization: %+v", saved)
	}
	got, err := svc.ListIQTestPresets(ctx, 7)
	if err != nil || len(got) != 1 || got[0].Name != "叮当猫" {
		t.Fatalf("list user 7: %v %+v", err, got)
	}
	other, err := svc.ListIQTestPresets(ctx, 8)
	if err != nil || len(other) != 0 {
		t.Fatalf("user 8 must be isolated: %v %+v", err, other)
	}
	if _, ok := fake.values["iq_test_presets_u7"]; !ok {
		t.Fatalf("expected per-user key, got %v", fake.values)
	}
}

func TestIQTestPresetsValidationAndOverwrite(t *testing.T) {
	svc, _ := newIQPresetService()
	ctx := context.Background()
	if _, err := svc.SaveIQTestPresets(ctx, 1, []IQTestPreset{{Name: "", QuestionKind: "pelican", Prompt: "x"}}); err == nil {
		t.Fatal("empty name must fail")
	}
	if _, err := svc.SaveIQTestPresets(ctx, 1, []IQTestPreset{{Name: "a", QuestionKind: "ciallo", Prompt: "x"}}); err == nil {
		t.Fatal("unsupported kind must fail")
	}
	if _, err := svc.SaveIQTestPresets(ctx, 1, []IQTestPreset{
		{Name: "a", QuestionKind: "pelican", Prompt: "x"},
		{Name: "a", QuestionKind: "candy", Prompt: "y"},
	}); err == nil {
		t.Fatal("duplicate name must fail")
	}
	first, err := svc.SaveIQTestPresets(ctx, 1, []IQTestPreset{{Name: "a", QuestionKind: "pelican", Prompt: "v1", ReasoningEffort: "bogus", ParallelCount: 99}})
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	if first[0].ReasoningEffort != "medium" || first[0].ParallelCount != 1 {
		t.Fatalf("normalization: %+v", first[0])
	}
	second, err := svc.SaveIQTestPresets(ctx, 1, []IQTestPreset{{Name: "a", QuestionKind: "pelican", Prompt: "v2"}})
	if err != nil {
		t.Fatalf("overwrite: %v", err)
	}
	if second[0].ID != first[0].ID {
		t.Fatalf("same-name overwrite keeps id: %s vs %s", second[0].ID, first[0].ID)
	}
	if _, err := svc.SaveIQTestPresets(ctx, 1, []IQTestPreset{}); err != nil {
		t.Fatalf("clear: %v", err)
	}
	got, _ := svc.ListIQTestPresets(ctx, 1)
	if len(got) != 0 {
		t.Fatalf("cleared list: %+v", got)
	}
}
