package service

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseHomeBackgroundStorageConfig(t *testing.T) {
	for _, tc := range []struct {
		raw  string
		want string
	}{
		{"", HomeBackgroundStorageLocal},
		{"{}", HomeBackgroundStorageLocal},
		{`{"mode":"local"}`, HomeBackgroundStorageLocal},
		{`{"mode":"s3"}`, HomeBackgroundStorageS3},
		{`{"mode":"gcs"}`, HomeBackgroundStorageLocal}, // unknown falls back
		{"not json", HomeBackgroundStorageLocal},
	} {
		require.Equal(t, tc.want, ParseHomeBackgroundStorageConfig(tc.raw).Mode, "raw=%q", tc.raw)
	}
}

func TestMarshalHomeBackgroundStorageConfig(t *testing.T) {
	got, err := MarshalHomeBackgroundStorageConfig("S3")
	require.NoError(t, err)
	require.Contains(t, got, HomeBackgroundStorageS3)

	got, err = MarshalHomeBackgroundStorageConfig("")
	require.NoError(t, err)
	require.Contains(t, got, HomeBackgroundStorageLocal)

	_, err = MarshalHomeBackgroundStorageConfig("gcs")
	require.Error(t, err)
}

func TestHomeBackgroundSaveRejectsNonImages(t *testing.T) {
	svc := NewHomeBackgroundService(nil)
	_, err := svc.Save(context.Background(), HomeBackgroundStorageLocal, "x", "text/html", []byte("<script>"))
	require.ErrorIs(t, err, ErrHomeBackgroundUnsupportedType)
}

func TestHomeBackgroundSaveLocalWritesFile(t *testing.T) {
	dir := t.TempDir()
	// The service writes relative to the working directory.
	prev, err := os.Getwd()
	require.NoError(t, err)
	require.NoError(t, os.Chdir(dir))
	t.Cleanup(func() { _ = os.Chdir(prev) })

	svc := NewHomeBackgroundService(nil)
	png := []byte("\x89PNG\r\n\x1a\nfake")
	url, err := svc.Save(context.Background(), HomeBackgroundStorageLocal, "My Photo!!.png", "image/png", png)
	require.NoError(t, err)
	require.True(t, strings.HasPrefix(url, homeBackgroundURLPrefix))
	require.Contains(t, url, "my-photo")

	stored, err := os.ReadFile(filepath.Join(dir, "data", "public", "home-background", filepath.Base(url)))
	require.NoError(t, err)
	require.Equal(t, png, stored)
}

func TestHomeBackgroundS3WithoutStorageFails(t *testing.T) {
	svc := NewHomeBackgroundService(nil)
	_, err := svc.Save(context.Background(), HomeBackgroundStorageS3, "x", "image/png", []byte("x"))
	require.ErrorIs(t, err, ErrHomeBackgroundS3Unavailable)
}
