package service

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
)

func TestStableOpsInstanceIDPersistsAcrossCalls(t *testing.T) {
	dir := t.TempDir()
	cfg := &config.Config{}
	cfg.Pricing.DataDir = dir
	first := stableOpsInstanceID(cfg)
	if first == "" {
		t.Fatal("empty instance id")
	}
	if _, err := os.Stat(filepath.Join(dir, "ops_instance_id")); err != nil {
		t.Fatalf("id file not written: %v", err)
	}
	second := stableOpsInstanceID(cfg)
	if first != second {
		t.Fatalf("id changed across restarts: %s vs %s", first, second)
	}
}

func TestStableOpsInstanceIDFallsBackWithoutDir(t *testing.T) {
	cfg := &config.Config{}
	cfg.Pricing.DataDir = filepath.Join(t.TempDir(), "missing", "nested")
	id := stableOpsInstanceID(cfg)
	if id == "" {
		t.Fatal("empty fallback id")
	}
	// Second call reads the file created by the first (MkdirAll succeeded).
	if again := stableOpsInstanceID(cfg); again != id {
		t.Fatalf("fallback id not persisted: %s vs %s", id, again)
	}
}
