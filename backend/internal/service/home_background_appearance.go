package service

import (
	"strconv"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

const (
	DefaultHomeBackgroundBlur    = 0
	DefaultHomeBackgroundOverlay = 100
	MaxHomeBackgroundBlur        = 20
)

// Invalid or absent stored values retain the original home appearance.
func parseHomeBackgroundValue(raw string, fallback, max int) int {
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 || value > max {
		return fallback
	}
	return value
}

func validateHomeBackgroundAppearance(blur, overlay int) error {
	if blur < 0 || blur > MaxHomeBackgroundBlur || overlay < 0 || overlay > 100 {
		return infraerrors.BadRequest("INVALID_HOME_BACKGROUND_APPEARANCE", "background blur must be between 0 and 20 and overlay must be between 0 and 100")
	}
	return nil
}
