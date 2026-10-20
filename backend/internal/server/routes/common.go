package routes

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// RegisterCommonRoutes 注册通用路由（健康检查、状态等）
func RegisterCommonRoutes(r *gin.Engine) {
	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Home 页背景图（本地上传）：匿名可读，只暴露固定目录下的图片文件。
	// 上传时已按 MIME 校验并生成安全文件名，这里再做一次目录越界防护。
	r.GET("/public/home-background/:name", func(c *gin.Context) {
		name := c.Param("name")
		if name == "" || strings.ContainsAny(name, "/\\") || strings.Contains(name, "..") {
			c.Status(http.StatusNotFound)
			return
		}
		c.File(filepath.Join("data", "public", "home-background", name))
	})

	// Claude Code 遥测日志（忽略，直接返回200）
	r.POST("/api/event_logging/batch", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// Setup status endpoint (always returns needs_setup: false in normal mode)
	// This is used by the frontend to detect when the service has restarted after setup
	r.GET("/setup/status", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{
				"needs_setup": false,
				"step":        "completed",
			},
		})
	})
}
