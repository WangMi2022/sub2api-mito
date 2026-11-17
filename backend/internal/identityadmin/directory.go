package identityadmin

import (
	"context"
	"net/mail"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

var objectID = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)

type User struct {
	ID                     string `json:"id"`
	Username               string `json:"username"`
	Email                  string `json:"email"`
	FirstName              string `json:"firstName"`
	LastName               string `json:"lastName"`
	Enabled                bool   `json:"enabled"`
	EmailVerified          bool   `json:"emailVerified"`
	CreatedTimestamp       int64  `json:"createdTimestamp"`
	ServiceAccountClientID string `json:"serviceAccountClientId,omitempty"`
	Protected              bool   `json:"protected"`
}

type UserInput struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Enabled   bool   `json:"enabled"`
	Password  string `json:"password,omitempty"`
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
	err := c.request(ctx, "GET", "/users/"+id, nil, &user)
	return user, err
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

func (c *Client) Users(ctx context.Context, search string, first int) (UserPage, error) {
	page := UserPage{Users: []User{}, First: first}
	if len(search) > 120 || first < 0 || first > 100000 {
		return page, failure("invalid_request", 400)
	}
	query := url.Values{"first": {strconv.Itoa(first)}, "max": {"51"}, "briefRepresentation": {"false"}}
	if search != "" {
		query.Set("search", search)
	}
	var users []User
	if err := c.request(ctx, "GET", "/users?"+query.Encode(), nil, &users); err != nil {
		return page, err
	}
	return c.userPage(ctx, users, first)
}

// GroupMembers lists direct members, including protected accounts as read-only.
func (c *Client) GroupMembers(ctx context.Context, id string, first int) (UserPage, error) {
	page := UserPage{Users: []User{}, First: first}
	if !objectID.MatchString(id) || first < 0 || first > 100000 {
		return page, failure("invalid_request", 400)
	}
	query := url.Values{"first": {strconv.Itoa(first)}, "max": {"51"}, "briefRepresentation": {"false"}}
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

func validateUser(in UserInput, create bool) error {
	parsed, err := mail.ParseAddress(in.Email)
	if err != nil || parsed.Address != in.Email || len(in.Email) > 254 || strings.TrimSpace(in.Username) != in.Username || in.Username == "" || len(in.Username) > 120 || len(in.FirstName) > 100 || len(in.LastName) > 100 {
		return failure("invalid_request", 400)
	}
	if create {
		return validatePassword(in.Password)
	}
	if in.Password != "" {
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

func (c *Client) CreateUser(ctx context.Context, in UserInput) error {
	if err := validateUser(in, true); err != nil {
		return err
	}
	return c.request(ctx, "POST", "/users", map[string]any{
		"username": in.Username, "email": in.Email, "firstName": in.FirstName, "lastName": in.LastName,
		"enabled": in.Enabled, "emailVerified": false,
		"credentials": []map[string]any{{"type": "password", "value": in.Password, "temporary": false}},
	}, nil)
}

func (c *Client) UpdateUser(ctx context.Context, id string, in UserInput) error {
	if err := validateUser(in, false); err != nil {
		return err
	}
	user, err := c.mutableUser(ctx, id)
	if err != nil {
		return err
	}
	if user.Username != in.Username {
		return failure("identity_username_immutable", 400)
	}
	patch := map[string]any{"email": in.Email, "firstName": in.FirstName, "lastName": in.LastName, "enabled": in.Enabled}
	if user.Email != in.Email {
		patch["emailVerified"] = false
	}
	if err = c.request(ctx, "PUT", "/users/"+id, patch, nil); err != nil {
		return err
	}
	if !in.Enabled {
		return c.logoutAfterMutation(ctx, id)
	}
	return nil
}

func (c *Client) ResetPassword(ctx context.Context, id, password string) error {
	if err := validatePassword(password); err != nil {
		return err
	}
	if _, err := c.mutableUser(ctx, id); err != nil {
		return err
	}
	if err := c.request(ctx, "PUT", "/users/"+id+"/reset-password", map[string]any{"type": "password", "value": password, "temporary": false}, nil); err != nil {
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
	if err = c.request(ctx, "GET", "/users/"+id+"/sessions", nil, &detail.Sessions); err != nil {
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
		markGroup(&groups[i])
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
	if len(mappings.Realm) > 0 || len(mappings.Clients) > 0 {
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
	return c.request(ctx, "DELETE", "/groups/"+id, nil, nil)
}
func (c *Client) Membership(ctx context.Context, id, groupID string, member bool) error {
	if _, err := c.mutableUser(ctx, id); err != nil {
		return err
	}
	if _, err := c.managedGroup(ctx, groupID); err != nil {
		return err
	}
	method := "DELETE"
	if member {
		method = "PUT"
	}
	return c.request(ctx, method, "/users/"+id+"/groups/"+groupID, nil, nil)
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
func (c *Client) SetAccess(ctx context.Context, id, clientID string, grant bool) error {
	if _, err := c.mutableUser(ctx, id); err != nil {
		return err
	}
	var app *Application
	for i := range c.cfg.Applications {
		if c.cfg.Applications[i].ClientID == clientID {
			app = &c.cfg.Applications[i]
		}
	}
	if app == nil {
		return failure("identity_application_forbidden", 403)
	}
	var role Role
	if err := c.request(ctx, "GET", "/roles/"+url.PathEscape(app.AccessRole), nil, &role); err != nil {
		return err
	}
	if role.Composite || role.Name != app.AccessRole || role.ID == "" {
		return failure("identity_application_forbidden", 403)
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
