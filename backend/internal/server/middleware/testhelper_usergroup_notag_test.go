//go:build !unit

package middleware

// userGroupIDPtr 让测试桩用户带上用户组，满足未分组拦截的前置条件。
func userGroupIDPtr(v int64) *int64 { return &v }
