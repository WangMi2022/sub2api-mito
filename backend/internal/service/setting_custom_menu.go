package service

// CustomMenuUserVisible preserves the old audience when the optional override
// is absent. Explicit false must survive serialization and settings updates.
func CustomMenuUserVisible(visibility string, userVisible *bool) bool {
	if userVisible != nil {
		return *userVisible
	}
	return visibility == "user"
}
