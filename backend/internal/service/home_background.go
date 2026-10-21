package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// HomeBackgroundStorageMode selects where an uploaded home background lives.
const (
	HomeBackgroundStorageLocal = "local"
	HomeBackgroundStorageS3    = "s3"
)

// HomeBackgroundStorageConfig is the persisted destination choice.
//
// Only the mode is stored here: S3 credentials are not duplicated. When mode is
// "s3" the upload reuses whatever the image/backup S3 configuration already
// provides, which is the same object store the operator already configured.
type HomeBackgroundStorageConfig struct {
	Mode string `json:"mode"`
}

const (
	// homeBackgroundLocalDir is relative to the process working directory and
	// lives on the same mounted volume as the rest of ./data.
	homeBackgroundLocalDir = "data/public/home-background"
	// homeBackgroundURLPrefix is what the browser receives for a local file.
	homeBackgroundURLPrefix = "/public/home-background/"
)

var (
	ErrHomeBackgroundUnsupportedType = errors.New("only png, jpeg, webp, gif and avif images are supported")
	ErrHomeBackgroundTooLarge        = errors.New("background image exceeds the size limit")
	ErrHomeBackgroundS3Unavailable   = errors.New("S3 storage is not configured; configure image storage or choose local storage")
)

// HomeBackgroundService stores an uploaded home page background and returns a
// URL the frontend can render directly.
type HomeBackgroundService struct {
	imageStorage *ImageStorageSettingService
	maxBytes     int64
}

func NewHomeBackgroundService(imageStorage *ImageStorageSettingService) *HomeBackgroundService {
	return &HomeBackgroundService{imageStorage: imageStorage, maxBytes: 8 << 20}
}

// MaxBytes is the accepted upload size, exposed so the handler can cap the body.
func (s *HomeBackgroundService) MaxBytes() int64 { return s.maxBytes }

// ParseStorageConfig decodes a persisted storage config, defaulting to local.
func ParseHomeBackgroundStorageConfig(raw string) HomeBackgroundStorageConfig {
	cfg := HomeBackgroundStorageConfig{Mode: HomeBackgroundStorageLocal}
	if strings.TrimSpace(raw) == "" {
		return cfg
	}
	if err := json.Unmarshal([]byte(raw), &cfg); err != nil || cfg.Mode == "" {
		return HomeBackgroundStorageConfig{Mode: HomeBackgroundStorageLocal}
	}
	if cfg.Mode != HomeBackgroundStorageS3 {
		cfg.Mode = HomeBackgroundStorageLocal
	}
	return cfg
}

// MarshalHomeBackgroundStorageConfig validates and encodes the mode.
func MarshalHomeBackgroundStorageConfig(mode string) (string, error) {
	mode = strings.ToLower(strings.TrimSpace(mode))
	switch mode {
	case "", HomeBackgroundStorageLocal:
		mode = HomeBackgroundStorageLocal
	case HomeBackgroundStorageS3:
	default:
		return "", fmt.Errorf("unsupported background storage mode %q", mode)
	}
	data, err := json.Marshal(HomeBackgroundStorageConfig{Mode: mode})
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// imageExtensionFor maps an accepted image MIME type to its file extension.
func imageExtensionFor(contentType string) (string, bool) {
	switch strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0])) {
	case "image/png":
		return ".png", true
	case "image/jpeg", "image/jpg":
		return ".jpg", true
	case "image/webp":
		return ".webp", true
	case "image/gif":
		return ".gif", true
	case "image/avif":
		return ".avif", true
	default:
		return "", false
	}
}

// Save writes the bytes to the configured destination and returns the URL.
//
// Local files are content-addressed by name so an upload never overwrites a
// still-referenced image, and old files can be pruned later.
func (s *HomeBackgroundService) Save(ctx context.Context, mode, name, contentType string, data []byte) (string, error) {
	ext, ok := imageExtensionFor(contentType)
	if !ok {
		return "", ErrHomeBackgroundUnsupportedType
	}
	if int64(len(data)) > s.maxBytes {
		return "", ErrHomeBackgroundTooLarge
	}
	switch mode {
	case HomeBackgroundStorageS3:
		return s.saveToS3(ctx, name, ext, contentType, data)
	default:
		return s.saveToLocal(name, ext, data)
	}
}

func (s *HomeBackgroundService) saveToLocal(name, ext string, data []byte) (string, error) {
	if err := os.MkdirAll(homeBackgroundLocalDir, 0o755); err != nil {
		return "", fmt.Errorf("create background directory: %w", err)
	}
	fileName := sanitizeUploadBaseName(name) + ext
	target := filepath.Join(homeBackgroundLocalDir, fileName)
	// 0644 so the static route can serve it to anonymous visitors.
	if err := os.WriteFile(target, data, 0o644); err != nil {
		return "", fmt.Errorf("write background image: %w", err)
	}
	return homeBackgroundURLPrefix + fileName, nil
}

func (s *HomeBackgroundService) saveToS3(ctx context.Context, name, ext, contentType string, data []byte) (string, error) {
	if s.imageStorage == nil {
		return "", ErrHomeBackgroundS3Unavailable
	}
	storage, err := s.imageStorage.storageForUpload(ctx)
	if errors.Is(err, ErrImageStorageIncomplete) {
		return "", ErrHomeBackgroundS3Unavailable
	}
	if err != nil {
		return "", fmt.Errorf("resolve background image storage: %w", err)
	}
	key := "home-background/" + sanitizeUploadBaseName(name) + ext
	return storage.Save(ctx, key, contentType, data)
}

// sanitizeUploadBaseName keeps an upload name filesystem- and S3-safe.
func sanitizeUploadBaseName(name string) string {
	base := strings.TrimSuffix(filepath.Base(name), filepath.Ext(name))
	var b strings.Builder
	for _, r := range strings.ToLower(base) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '-' || r == '_':
			b.WriteRune(r)
		default:
			b.WriteRune('-')
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = "background"
	}
	if len(out) > 48 {
		out = out[:48]
	}
	return out
}
