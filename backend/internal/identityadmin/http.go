package identityadmin

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/gin-gonic/gin"
)

// Register keeps authorization ahead of every directory operation. Capabilities
// are advisory for navigation; backend authorization never trusts browser state.
func Register(parent *gin.RouterGroup, client *Client, userID func(*gin.Context) int64, jwt, audit, stepUp, limiter gin.HandlerFunc) {
	group := parent.Group("/identity")
	group.Use(jwt, limiter)
	group.GET("/capabilities", func(ctx *gin.Context) {
		id := userID(ctx)
		response.Success(ctx, gin.H{"manage": client != nil && client.cfg.Allows(id)})
	})
	group.Use(audit, func(ctx *gin.Context) {
		id := userID(ctx)
		if client == nil || !client.cfg.Allows(id) {
			reply(ctx, nil, failure("identity_forbidden", 403))
			ctx.Abort()
			return
		}
		if _, err := client.Realm(ctx.Request.Context()); err != nil {
			reply(ctx, nil, err)
			ctx.Abort()
			return
		}
		ctx.Next()
	})
	group.GET("/overview", func(ctx *gin.Context) {
		realm, err := client.Realm(ctx.Request.Context())
		reply(ctx, gin.H{"realm": realm, "applications": client.cfg.Applications}, err)
	})
	group.GET("/users", func(ctx *gin.Context) {
		first, err := strconv.Atoi(ctx.DefaultQuery("first", "0"))
		if err != nil {
			reply(ctx, nil, failure("invalid_request", 400))
			return
		}
		result, err := client.Users(ctx.Request.Context(), ctx.Query("search"), first)
		reply(ctx, result, err)
	})
	group.GET("/users/:id", func(ctx *gin.Context) {
		result, err := client.Detail(ctx.Request.Context(), ctx.Param("id"))
		reply(ctx, result, err)
	})
	group.GET("/groups", func(ctx *gin.Context) { result, err := client.Groups(ctx.Request.Context()); reply(ctx, result, err) })
	write := group.Group("")
	write.Use(stepUp)
	write.POST("/users", func(ctx *gin.Context) {
		var in UserInput
		if decode(ctx, &in) {
			reply(ctx, nil, client.CreateUser(ctx.Request.Context(), in))
		}
	})
	write.PUT("/users/:id", func(ctx *gin.Context) {
		var in UserInput
		if decode(ctx, &in) {
			reply(ctx, nil, client.UpdateUser(ctx.Request.Context(), ctx.Param("id"), in))
		}
	})
	write.DELETE("/users/:id", func(ctx *gin.Context) {
		var in struct {
			Confirmation string `json:"confirmation"`
		}
		if decode(ctx, &in) {
			reply(ctx, nil, client.DeleteUser(ctx.Request.Context(), ctx.Param("id"), in.Confirmation))
		}
	})
	write.PUT("/users/:id/password", func(ctx *gin.Context) {
		var in struct {
			Password string `json:"password"`
		}
		if decode(ctx, &in) {
			reply(ctx, nil, client.ResetPassword(ctx.Request.Context(), ctx.Param("id"), in.Password))
		}
	})
	write.POST("/users/:id/logout", func(ctx *gin.Context) {
		var in struct{}
		if decode(ctx, &in) {
			reply(ctx, nil, client.Logout(ctx.Request.Context(), ctx.Param("id")))
		}
	})
	write.PUT("/users/:id/groups/:group", func(ctx *gin.Context) {
		var in struct {
			Member bool `json:"member"`
		}
		if decode(ctx, &in) {
			reply(ctx, nil, client.Membership(ctx.Request.Context(), ctx.Param("id"), ctx.Param("group"), in.Member))
		}
	})
	write.PUT("/users/:id/applications/:client", func(ctx *gin.Context) {
		var in struct {
			Granted bool `json:"granted"`
		}
		if decode(ctx, &in) {
			reply(ctx, nil, client.SetAccess(ctx.Request.Context(), ctx.Param("id"), ctx.Param("client"), in.Granted))
		}
	})
	write.POST("/groups", func(ctx *gin.Context) {
		var in struct {
			Name string `json:"name"`
		}
		if decode(ctx, &in) {
			reply(ctx, nil, client.SaveGroup(ctx.Request.Context(), "", in.Name))
		}
	})
	write.PUT("/groups/:id", func(ctx *gin.Context) {
		var in struct {
			Name string `json:"name"`
		}
		if decode(ctx, &in) {
			reply(ctx, nil, client.SaveGroup(ctx.Request.Context(), ctx.Param("id"), in.Name))
		}
	})
	write.DELETE("/groups/:id", func(ctx *gin.Context) {
		var in struct {
			Confirmation string `json:"confirmation"`
		}
		if decode(ctx, &in) {
			reply(ctx, nil, client.DeleteGroup(ctx.Request.Context(), ctx.Param("id"), in.Confirmation))
		}
	})
}

func decode(ctx *gin.Context, target any) bool {
	ctx.Request.Body = http.MaxBytesReader(ctx.Writer, ctx.Request.Body, 8192)
	decoder := json.NewDecoder(ctx.Request.Body)
	decoder.DisallowUnknownFields()
	if decoder.Decode(target) != nil || decoder.Decode(new(any)) != io.EOF {
		reply(ctx, nil, failure("invalid_request", 400))
		return false
	}
	return true
}

func reply(ctx *gin.Context, result any, err error) {
	if err == nil {
		response.Success(ctx, result)
		return
	}
	var safe *Error
	if !errors.As(err, &safe) {
		safe = &Error{Code: "identity_unavailable", Status: 503}
	}
	response.ErrorWithDetails(ctx, safe.Status, safe.Code, safe.Code, nil)
}
