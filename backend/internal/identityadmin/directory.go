package identityadmin

import (
	"context"
	"net/mail"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

var objectID = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)

type User struct {
	AccessSource           string   `json:"accessSource,omitempty"`
	ID                     string   `json:"id"`
	Username               string   `json:"username"`
	Email                  string   `json:"email"`
	FirstName              string   `json:"firstName"`
	LastName               string   `json:"lastName"`
	Enabled                bool     `json:"enabled"`
	EmailVerified          bool     `json:"emailVerified"`
	CreatedTimestamp       int64    `json:"createdTimestamp"`
	RequiredActions        []string `json:"requiredActions,omitempty"`
	ServiceAccountClientID string   `json:"serviceAccountClientId,omitempty"`
	Protected              bool     `json:"protected"`
}

type UserInput struct {
	Username          string `json:"username"`
	Email             string `json:"email"`
	FirstName         string `json:"firstName"`
	LastName          string `json:"lastName"`
	Enabled           bool   `json:"enabled"`
	Password          string `json:"password,omitempty"`
	TemporaryPassword bool   `json:"temporaryPassword,omitempty"`
}

type UserFilter struct {
	Search        string
	First         int
	Enabled       string
	EmailVerified string
	Ungrouped     bool
}

type UserPage struct {
	Users   []User `json:"users"`
	First   int    `json:"first"`
	HasMore bool   `json:"hasMore"`
}
type Group struct {
	ID            string              `json:"id"`
	Name          string              `json:"name"`
	Path          string              `json:"path"`
	SubGroupCount int                 `json:"subGroupCount"`
	Attributes    map[string][]string `json:"attributes,omitempty"`
	Managed       bool                `json:"managed"`
	CanAdopt      bool                `json:"canAdopt"`
	MemberCount   int                 `json:"memberCount"`
	Applications  []Access            `json:"applications"`
}
type Session struct {
	ID         string            `json:"id"`
	IP         string            `json:"ipAddress"`
	Start      int64             `json:"start"`
	LastAccess int64             `json:"lastAccess"`
	Clients    map[string]string `json:"clients"`
}
type Role struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Composite bool   `json:"composite"`
}
type Access struct {
	Application
	Granted   bool `json:"granted"`
	Inherited bool `json:"inherited"`
}
type Detail struct {
	User         User      `json:"user"`
	Groups       []Group   `json:"groups"`
	Sessions     []Session `json:"sessions"`
	Applications []Access  `json:"applications"`
}

func (c *Client) user(ctx context.Context, id string) (User, error) {
	var user User
	if !objectID.MatchString(id) {
		return user, failure("invalid_request", 400)
	}
	if err := c.request(ctx, "GET", "/users/"+id, nil, &user); err != nil {
		return user, err
	}
	if user.ID != id {
		return user, failure("identity_invalid_response", 502)
	}
	return user, nil
}

func (c *Client) protected(ctx context.Context, user User) (bool, error) {
	if user.ServiceAccountClientID != "" {
		return true, nil
	}
	for _, id := range c.cfg.ProtectedSubjects {
		if user.ID == id {
			return true, nil
		}
	}
	var clients []struct {
		ID string `json:"id"`
	}
	if err := c.request(ctx, "GET", "/clients?clientId=realm-management", nil, &clients); err != nil {
		return true, err
	}
	if len(clients) != 1 || !objectID.MatchString(clients[0].ID) {
		return true, failure("identity_invalid_response", 502)
	}
	var roles []Role
	if err := c.request(ctx, "GET", "/users/"+user.ID+"/role-mappings/clients/"+clients[0].ID+"/composite", nil, &roles); err != nil {
		return true, err
	}
	return len(roles) > 0, nil
}

func (c *Client) mutableUser(ctx context.Context, id string) (User, error) {
	user, err := c.user(ctx, id)
	if err != nil {
		return user, err
	}
	protected, err := c.protected(ctx, user)
	if err != nil {
		return user, err
	}
	if protected {
		return user, failure("identity_protected_account", 403)
	}
	return user, nil
}

func (c *Client) Users(ctx context.Context, filter UserFilter) (UserPage, error) {
	page := UserPage{Users: []User{}, First: filter.First}
	search := strings.TrimSpace(filter.Search)
	if utf8.RuneCountInString(search) > 120 || strings.Contains(search, ":") || filter.First < 0 || filter.First > 100000 {
		return page, failure("invalid_request", 400)
	}
	if filter.Ungrouped {
		return c.ungroupedUsers(ctx, filter)
	}
	query := directoryPageQuery(filter.First)
	for key, value := range map[string]string{"enabled": filter.Enabled, "emailVerified": filter.EmailVerified} {
		switch value {
		case "":
		case "true", "false":
			query.Set(key, value)
		default:
			return page, failure("invalid_request", 400)
		}
	}
	if search != "" {
		query.Set("search", search)
	}
	var users []User
	if err := c.request(ctx, "GET", "/users?"+query.Encode(), nil, &users); err != nil {
		return page, err
	}
	return c.userPage(ctx, users, filter.First)
}

func directoryPageQuery(first int) url.Values {
	return url.Values{"first": {strconv.Itoa(first)}, "max": {"51"}, "briefRepresentation": {"false"}}
}

// GroupMembers lists direct members, including protected accounts as read-only.
func (c *Client) GroupMembers(ctx context.Context, id string, first int) (UserPage, error) {
	page := UserPage{Users: []User{}, First: first}
	if !objectID.MatchString(id) || first < 0 || first > 100000 {
		return page, failure("invalid_request", 400)
	}
	query := directoryPageQuery(first)
	var users []User
	if err := c.request(ctx, "GET", "/groups/"+id+"/members?"+query.Encode(), nil, &users); err != nil {
		return page, err
	}
	return c.userPage(ctx, users, first)
}

func (c *Client) userPage(ctx context.Context, users []User, first int) (UserPage, error) {
	page := UserPage{Users: []User{}, First: first}
	page.HasMore = len(users) > 50
	if page.HasMore {
		users = users[:50]
	}
	for _, user := range users {
		if user.ServiceAccountClientID != "" {
			continue
		}
		protected, err := c.protected(ctx, user)
		if err != nil {
			return page, err
		}
		user.Protected = protected
		page.Users = append(page.Users, user)
	}
	return page, nil
}

func validateUser(in UserInput, create bool, realm Realm) error {
	parsed, err := mail.ParseAddress(in.Email)
	if err != nil || parsed.Address != in.Email || len(in.Email) > 254 || utf8.RuneCountInString(in.FirstName) > 100 || utf8.RuneCountInString(in.LastName) > 100 {
		return failure("invalid_request", 400)
	}
	if !realm.EmailAsUsername && (in.Username == "" || strings.TrimSpace(in.Username) != in.Username || utf8.RuneCountInString(in.Username) > 120) {
		return failure("invalid_request", 400)
	}
	if create {
		return validatePassword(in.Password)
	}
	if in.Password != "" || in.TemporaryPassword {
		return failure("invalid_request", 400)
	}
	return nil
}
func validatePassword(password string) error {
	if len(password) < 8 || len(password) > 256 {
		return failure("identity_password_policy", 400)
	}
	return nil
}

func (c *Client) CreateUser(ctx context.Context, realm Realm, in UserInput) error {
	if err := validateUser(in, true, realm); err != nil {
		return err
	}
	if realm.EmailAsUsername {
		in.Username = in.Email
	}
	return c.request(ctx, "POST", "/users", map[string]any{
		"username": in.Username, "email": in.Email, "firstName": in.FirstName, "lastName": in.LastName,
		"enabled": in.Enabled, "emailVerified": false,
		"credentials": []map[string]any{{"type": "password", "value": in.Password, "temporary": in.TemporaryPassword}},
	}, nil)
}

func (c *Client) UpdateUser(ctx context.Context, realm Realm, id string, in UserInput) error {
	if err := validateUser(in, false, realm); err != nil {
		return err
	}
	user, err := c.mutableUser(ctx, id)
	if err != nil {
		return err
	}
	patch := map[string]any{"firstName": in.FirstName, "lastName": in.LastName}
	if user.Username != in.Username && !realm.EmailAsUsername {
		if !realm.UsernameEditable {
			return failure("identity_username_immutable", 400)
		}
		patch["username"] = in.Username
	}
	if user.Email != in.Email {
		patch["email"] = in.Email
		patch["emailVerified"] = false
	}
	// Keycloak can clear login failures on an explicit enabled=true write.
	if user.Enabled != in.Enabled {
		patch["enabled"] = in.Enabled
	}
	if err = c.request(ctx, "PUT", "/users/"+id, patch, nil); err != nil {
		return err
	}
	if !in.Enabled {
		return c.logoutAfterMutation(ctx, id)
	}
	return nil
}

func (c *Client) ResetPassword(ctx context.Context, id, password string, temporary bool) error {
	if err := validatePassword(password); err != nil {
		return err
	}
	if _, err := c.mutableUser(ctx, id); err != nil {
		return err
	}
	if err := c.request(ctx, "PUT", "/users/"+id+"/reset-password", map[string]any{"type": "password", "value": password, "temporary": temporary}, nil); err != nil {
		return err
	}
	return c.logoutAfterMutation(ctx, id)
}
func (c *Client) logoutAfterMutation(ctx context.Context, id string) error {
	if err := c.request(ctx, "POST", "/users/"+id+"/logout", nil, nil); err != nil {
		return failure("identity_changed_logout_failed", 502)
	}
	return nil
}
func (c *Client) Logout(ctx context.Context, id string) error {
	if _, err := c.mutableUser(ctx, id); err != nil {
		return err
	}
	return c.request(ctx, "POST", "/users/"+id+"/logout", nil, nil)
}
func (c *Client) DeleteUser(ctx context.Context, id, confirmation string) error {
	user, err := c.mutableUser(ctx, id)
	if err != nil {
		return err
	}
	if confirmation != user.Username {
		return failure("identity_confirmation_required", 400)
	}
	if err = c.request(ctx, "POST", "/users/"+id+"/logout", nil, nil); err != nil {
		return err
	}
	return c.request(ctx, "DELETE", "/users/"+id, nil, nil)
}

func (c *Client) Detail(ctx context.Context, id string) (Detail, error) {
	detail := Detail{Groups: []Group{}, Sessions: []Session{}, Applications: []Access{}}
	user, err := c.user(ctx, id)
	if err != nil {
		return detail, err
	}
	if user.ServiceAccountClientID != "" {
		return detail, failure("identity_protected_account", 403)
	}
	user.Protected, err = c.protected(ctx, user)
	if err != nil {
		return detail, err
	}
	detail.User = user
	if err = c.request(ctx, "GET", "/users/"+id+"/groups?max=1000&briefRepresentation=false", nil, &detail.Groups); err != nil {
		return detail, err
	}
	for i := range detail.Groups {
		markGroup(&detail.Groups[i])
		detail.Groups[i].Attributes = nil
	}
	if detail.Sessions, err = c.sessions(ctx, id); err != nil {
		return detail, err
	}
	detail.Applications, err = c.access(ctx, id)
	return detail, err
}

func markGroup(group *Group) {
	values := group.Attributes["mito.identity.managed"]
	group.Managed = len(values) == 1 && values[0] == "true" && group.SubGroupCount == 0
}

func (c *Client) Groups(ctx context.Context) ([]Group, error) {
	groups := []Group{}
	if err := c.request(ctx, "GET", "/groups?max=1001&briefRepresentation=false&populateHierarchy=false", nil, &groups); err != nil {
		return nil, err
	}
	if len(groups) > 1000 {
		return nil, failure("identity_group_limit", 409)
	}
	for i := range groups {
		if err := c.enrichGroup(ctx, &groups[i]); err != nil {
			return nil, err
		}
		groups[i].Attributes = nil
	}
	return groups, nil
}

func (c *Client) managedGroup(ctx context.Context, id string) (Group, error) {
	var group Group
	if !objectID.MatchString(id) {
		return group, failure("invalid_request", 400)
	}
	if err := c.request(ctx, "GET", "/groups/"+id, nil, &group); err != nil {
		return group, err
	}
	markGroup(&group)
	if !group.Managed || strings.Count(group.Path, "/") != 1 {
		return group, failure("identity_protected_group", 403)
	}
	var mappings struct {
		Realm   []Role         `json:"realmMappings"`
		Clients map[string]any `json:"clientMappings"`
	}
	if err := c.request(ctx, "GET", "/groups/"+id+"/role-mappings", nil, &mappings); err != nil {
		return group, err
	}
	if !c.safeGroupRoles(mappings.Realm, mappings.Clients) {
		return group, failure("identity_protected_group", 403)
	}
	return group, nil
}

func (c *Client) SaveGroup(ctx context.Context, id, name string) error {
	if name == "" || name != strings.TrimSpace(name) || len(name) > 100 || strings.ContainsAny(name, "/\\\n\r") {
		return failure("invalid_request", 400)
	}
	if id == "" {
		return c.request(ctx, "POST", "/groups", map[string]any{"name": name, "attributes": map[string][]string{"mito.identity.managed": {"true"}}}, nil)
	}
	if _, err := c.managedGroup(ctx, id); err != nil {
		return err
	}
	return c.request(ctx, "PUT", "/groups/"+id, map[string]any{"name": name}, nil)
}
func (c *Client) DeleteGroup(ctx context.Context, id, confirmation string) error {
	group, err := c.managedGroup(ctx, id)
	if err != nil {
		return err
	}
	if confirmation != group.Name {
		return failure("identity_confirmation_required", 400)
	}
	members, err := c.rawMembers(ctx, id)
	if err != nil {
		return err
	}
	for _, user := range members {
		protected, err := c.protected(ctx, user)
		if err != nil {
			return err
		}
		if protected {
			return failure("identity_protected_account", 403)
		}
	}
	if err := c.request(ctx, "DELETE", "/groups/"+id, nil, nil); err != nil {
		return err
	}
	for _, user := range members {
		if err := c.logoutAfterMutation(ctx, user.ID); err != nil {
			return err
		}
	}
	return nil
}
func (c *Client) Membership(ctx context.Context, id, groupID string, member bool) error {
	c.membershipMu.Lock()
	defer c.membershipMu.Unlock()
	previous, err := c.membershipPlan(ctx, id, groupID, member)
	if err != nil {
		return err
	}
	if _, err := c.managedGroup(ctx, groupID); err != nil {
		return err
	}
	return c.changeMembership(ctx, id, groupID, member, previous)
}

// SessionLogout ends one Keycloak session while preserving the user's other
// devices. Session IDs come from Detail and are treated as opaque identifiers.
func (c *Client) SessionLogout(ctx context.Context, userID, sessionID string) error {
	if !objectID.MatchString(userID) || !objectID.MatchString(sessionID) {
		return failure("invalid_request", 400)
	}
	if _, err := c.mutableUser(ctx, userID); err != nil {
		return err
	}
	sessions, err := c.sessions(ctx, userID)
	if err != nil {
		return err
	}
	for _, session := range sessions {
		if session.ID == sessionID {
			return c.request(ctx, "DELETE", "/sessions/"+sessionID, nil, nil)
		}
	}
	return failure("identity_session_not_found", 404)
}

func (c *Client) sessions(ctx context.Context, id string) ([]Session, error) {
	sessions := []Session{}
	err := c.request(ctx, "GET", "/users/"+id+"/sessions", nil, &sessions)
	return sessions, err
}

func hasRole(roles []Role, name string) bool {
	for _, role := range roles {
		if role.Name == name {
			return true
		}
	}
	return false
}
func (c *Client) access(ctx context.Context, id string) ([]Access, error) {
	var direct, effective []Role
	if err := c.request(ctx, "GET", "/users/"+id+"/role-mappings/realm", nil, &direct); err != nil {
		return nil, err
	}
	if err := c.request(ctx, "GET", "/users/"+id+"/role-mappings/realm/composite", nil, &effective); err != nil {
		return nil, err
	}
	result := []Access{}
	for _, app := range c.cfg.Applications {
		granted := hasRole(effective, app.AccessRole)
		result = append(result, Access{Application: app, Granted: granted, Inherited: granted && !hasRole(direct, app.AccessRole)})
	}
	return result, nil
}
func (c *Client) applicationRole(ctx context.Context, clientID string) (Role, error) {
	var role Role
	for _, app := range c.cfg.Applications {
		if app.ClientID != clientID {
			continue
		}
		if err := c.request(ctx, "GET", "/roles/"+url.PathEscape(app.AccessRole), nil, &role); err != nil {
			return Role{}, err
		}
		if role.Composite || role.Name != app.AccessRole || !objectID.MatchString(role.ID) {
			break
		}
		return role, nil
	}
	return Role{}, failure("identity_application_forbidden", 403)
}

func (c *Client) ApplicationAccounts(ctx context.Context, clientID string, first int) (UserPage, error) {
	page := UserPage{Users: []User{}, First: first}
	if first < 0 || first > 100000 {
		return page, failure("invalid_request", 400)
	}
	role, err := c.applicationRole(ctx, clientID)
	if err != nil {
		return page, err
	}
	var users []User
	endpoint := "/roles/" + url.PathEscape(role.Name) + "/users?" + directoryPageQuery(first).Encode()
	if err := c.request(ctx, "GET", endpoint, nil, &users); err != nil {
		return page, err
	}
	return c.userPage(ctx, users, first)
}

func (c *Client) SetAccess(ctx context.Context, id, clientID string, grant bool) error {
	if _, err := c.mutableUser(ctx, id); err != nil {
		return err
	}
	role, err := c.applicationRole(ctx, clientID)
	if err != nil {
		return err
	}
	if !grant {
		access, err := c.access(ctx, id)
		if err != nil {
			return err
		}
		for _, item := range access {
			if item.ClientID == clientID && item.Inherited {
				return failure("identity_inherited_access", 409)
			}
		}
	}
	method := "DELETE"
	if grant {
		method = "POST"
	}
	if err := c.request(ctx, method, "/users/"+id+"/role-mappings/realm", []Role{role}, nil); err != nil {
		return err
	}
	if !grant {
		return c.logoutAfterMutation(ctx, id)
	}
	return nil
}
