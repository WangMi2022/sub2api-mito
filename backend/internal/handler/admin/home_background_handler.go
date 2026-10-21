package admin

import (
	"io"
	"net/http"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

// HomeBackgroundHandler uploads the home page background image.
//
// The destination (local disk or the configured S3 bucket) is chosen in the
// same request so the admin UI can offer a one-click switch without saving
// settings twice.
type HomeBackgroundHandler struct {
	settingService *service.SettingService
	background     *service.HomeBackgroundService
}

func NewHomeBackgroundHandler(settingService *service.SettingService, background *service.HomeBackgroundService) *HomeBackgroundHandler {
	return &HomeBackgroundHandler{settingService: settingService, background: background}
}

// Upload 接收 multipart 图片并返回可公开访问的 URL。
// POST /api/v1/admin/settings/home-background/upload
func (h *HomeBackgroundHandler) Upload(c *gin.Context) {
	if h.background == nil {
		response.BadRequest(c, "background storage is unavailable")
		return
	}
	maxBytes := h.background.MaxBytes()
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes+(1<<20))

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "请选择有效的图片文件（multipart 字段名 file）")
		return
	}
	defer func() { _ = file.Close() }()

	mode := strings.ToLower(strings.TrimSpace(c.PostForm("storage")))
	if mode != service.HomeBackgroundStorageS3 {
		mode = service.HomeBackgroundStorageLocal
	}

	data, err := io.ReadAll(io.LimitReader(file, maxBytes+1))
	if err != nil {
		response.BadRequest(c, "failed to read the uploaded file")
		return
	}
	if int64(len(data)) > maxBytes {
		response.BadRequest(c, service.ErrHomeBackgroundTooLarge.Error())
		return
	}

	// Detect from the bytes rather than trusting the client-provided header.
	contentType := http.DetectContentType(data)

	url, err := h.background.Save(c.Request.Context(), mode, header.Filename, contentType, data)
	if err != nil {
		if err == service.ErrHomeBackgroundS3Unavailable {
			response.BadRequest(c, err.Error())
			return
		}
		response.BadRequest(c, err.Error())
		return
	}

	// Persist both the URL and the storage mode so the next upload defaults to
	// the same destination.
	if h.settingService != nil {
		stored, err := service.MarshalHomeBackgroundStorageConfig(mode)
		if err == nil {
			_ = h.settingService.UpdateSettingValues(c.Request.Context(), map[string]string{
				"home_background_image":   url,
				"home_background_storage": stored,
			})
		}
	}

	response.Success(c, gin.H{"url": url, "storage": mode})
}
