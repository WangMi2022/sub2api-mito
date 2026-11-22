package service

// ChituSSOOrigin is instance-local; shared settings never enable the official instance.
func (s *SettingService) ChituSSOOrigin() string {
	if s == nil || s.cfg == nil {
		return ""
	}
	return s.cfg.ChituSSOOrigin
}
