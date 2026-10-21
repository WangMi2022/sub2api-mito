//go:build unit

package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

func TestHomeBackgroundS3DoesNotEnableAsyncImageTasks(t *testing.T) {
	for _, saved := range []bool{false, true} {
		name := "backup_only"
		if saved {
			name = "saved_image_settings"
		}
		t.Run(name, func(t *testing.T) {
			images, repo, built := newImageStorageFixture(t, config.ImageStorageConfig{})
			ctx := context.Background()
			seedBackupS3(t, repo, BackupS3Config{
				Endpoint: "https://storage.example.com", Region: "auto",
				Bucket: "backup-bucket", AccessKeyID: "test-key", SecretAccessKey: "test-secret",
				ForcePathStyle: true,
			})
			if saved {
				_, err := images.Update(ctx, ImageStorageSettings{Enabled: false, ReuseBackupS3: true})
				require.NoError(t, err)
			}

			// A previously cached disabled async resolver must not block uploads.
			_, enabled := images.resolve()
			require.False(t, enabled)
			background := NewHomeBackgroundService(images)
			url, err := background.Save(ctx, HomeBackgroundStorageS3, "hero.png", "image/png", []byte("image"))
			require.NoError(t, err)
			require.Equal(t, "https://cdn.example.com/home-background/hero.png", url)
			require.Len(t, *built, 1)
			require.Equal(t, "backup-bucket", (*built)[0].Bucket)
			require.Equal(t, "test-secret", (*built)[0].SecretAccessKey)
			require.True(t, (*built)[0].ForcePathStyle)
			_, enabled = images.resolve()
			require.False(t, enabled, "uploading a background must not enable async image tasks")
		})
	}
}

func TestHomeBackgroundS3UsesCurrentImageStorageSettings(t *testing.T) {
	images, repo, built := newImageStorageFixture(t, config.ImageStorageConfig{})
	ctx := context.Background()
	seedBackupS3(t, repo, BackupS3Config{
		Bucket: "backup-bucket", AccessKeyID: "backup-key", SecretAccessKey: "backup-secret",
	})
	background := NewHomeBackgroundService(images)
	for _, bucket := range []string{"first-images", "second-images"} {
		_, err := images.Update(ctx, ImageStorageSettings{
			Enabled: false, Bucket: bucket, Endpoint: "https://images.example.com",
			AccessKeyID: "image-key", SecretAccessKey: "image-secret",
		})
		require.NoError(t, err)
		_, err = background.Save(ctx, HomeBackgroundStorageS3, "hero.png", "image/png", []byte("image"))
		require.NoError(t, err)
		require.Equal(t, bucket, (*built)[len(*built)-1].Bucket)
		require.Equal(t, "image-key", (*built)[len(*built)-1].AccessKeyID)
	}
}

func TestHomeBackgroundS3RejectsMissingCredentials(t *testing.T) {
	for _, saved := range []bool{false, true} {
		name := "no_configuration"
		if saved {
			name = "incomplete_independent_configuration"
		}
		t.Run(name, func(t *testing.T) {
			images, repo, built := newImageStorageFixture(t, config.ImageStorageConfig{})
			ctx := context.Background()
			if saved {
				seedBackupS3(t, repo, BackupS3Config{
					Bucket: "backup-bucket", AccessKeyID: "backup-key", SecretAccessKey: "backup-secret",
				})
				_, err := images.Update(ctx, ImageStorageSettings{Bucket: "independent-images"})
				require.NoError(t, err)
			}
			_, err := NewHomeBackgroundService(images).Save(ctx, HomeBackgroundStorageS3, "hero.png", "image/png", []byte("image"))
			require.ErrorIs(t, err, ErrHomeBackgroundS3Unavailable)
			require.Empty(t, *built, "an explicit independent configuration must not silently use backup S3")
		})
	}
}

func TestHomeBackgroundS3UsesConfiguredFallback(t *testing.T) {
	images, repo, built := newImageStorageFixture(t, config.ImageStorageConfig{
		Enabled: false, Bucket: "configured-images", Endpoint: "https://images.example.com",
		AccessKeyID: "image-key", SecretAccessKey: "image-secret",
	})
	seedBackupS3(t, repo, BackupS3Config{
		Bucket: "backup-bucket", AccessKeyID: "backup-key", SecretAccessKey: "backup-secret",
	})
	_, err := NewHomeBackgroundService(images).Save(context.Background(), HomeBackgroundStorageS3, "hero.png", "image/png", []byte("image"))
	require.NoError(t, err)
	require.Len(t, *built, 1)
	require.Equal(t, "configured-images", (*built)[0].Bucket)
	require.Equal(t, "image-secret", (*built)[0].SecretAccessKey)
}
