package identityadmin

import (
	"context"
	"strings"
	"time"
)

const directoryLimit = 1000

func (c *Client) ProtectsLocalUser(id int64) bool { return c.cfg.Allows(id) }

// Only explicitly enrolled, non-composite application admission roles are safe
// to inherit. Realm administration and client roles remain outside this UI.
func (c *Client) safeGroupRoles(roles []Role, clients map[string]any) bool {
	if len(clients) != 0 {
		return false
	}
	for _, role := range roles {
		allowed := false
		for _, app := range c.cfg.Applications {
			if role.Name == app.AccessRole && !role.Composite && objectID.MatchString(role.ID) {
				allowed = true
			}
		}
		if !allowed {
			return false
		}
	}
	return true
}

func (c *Client) rawMembers(ctx context.Context, id string) ([]User, error) {
	if !objectID.MatchString(id) {
		return nil, failure("invalid_request", 400)
	}
	users := []User{}
	if err := c.request(ctx, "GET", "/groups/"+id+"/members?first=0&max=1001&briefRepresentation=false", nil, &users); err != nil {
		return nil, err
	}
	if len(users) > directoryLimit {
		return nil, failure("identity_directory_limit", 409)
	}
	return users, nil
}

func (c *Client) enrichGroup(ctx context.Context, group *Group) error {
	if !objectID.MatchString(group.ID) {
		return failure("identity_invalid_response", 502)
	}
	var mappings struct {
		Realm   []Role         `json:"realmMappings"`
		Clients map[string]any `json:"clientMappings"`
	}
	if err := c.request(ctx, "GET", "/groups/"+group.ID+"/role-mappings", nil, &mappings); err != nil {
		return err
	}
	markGroup(group)
	safe := c.safeGroupRoles(mappings.Realm, mappings.Clients) && group.SubGroupCount == 0 && strings.Count(group.Path, "/") == 1
	group.Managed = group.Managed && safe
	group.CanAdopt = !group.Managed && safe
	group.Applications = []Access{}
	for _, app := range c.cfg.Applications {
		group.Applications = append(group.Applications, Access{Application: app, Granted: hasRole(mappings.Realm, app.AccessRole)})
	}
	members, err := c.rawMembers(ctx, group.ID)
	if err != nil {
		return err
	}
	group.MemberCount = 0
	for _, user := range members {
		if user.ServiceAccountClientID == "" {
			group.MemberCount++
		}
		protected, err := c.protected(ctx, user)
		if err != nil {
			return err
		}
		if protected {
			group.CanAdopt = false
		}
	}
	return nil
}

// Account also verifies the pinned realm before extensions can use a subject.
func (c *Client) Account(ctx context.Context, id string) (User, error) {
	if _, err := c.Realm(ctx); err != nil {
		return User{}, err
	}
	user, err := c.user(ctx, id)
	if err != nil {
		return user, err
	}
	user.Protected, err = c.protected(ctx, user)
	return user, err
}

func (c *Client) AdoptGroup(ctx context.Context, id string) error {
	if !objectID.MatchString(id) {
		return failure("invalid_request", 400)
	}
	var group Group
	if err := c.request(ctx, "GET", "/groups/"+id, nil, &group); err != nil {
		return err
	}
	if group.ID != id {
		return failure("identity_invalid_response", 502)
	}
	if err := c.enrichGroup(ctx, &group); err != nil {
		return err
	}
	if group.Managed {
		return nil
	}
	if !group.CanAdopt {
		return failure("identity_protected_group", 403)
	}
	if group.Attributes == nil {
		group.Attributes = map[string][]string{}
	}
	group.Attributes["mito.identity.managed"] = []string{"true"}
	return c.request(ctx, "PUT", "/groups/"+id, map[string]any{"name": group.Name, "attributes": group.Attributes}, nil)
}

func (c *Client) SetGroupAccess(ctx context.Context, id, clientID string, grant bool) error {
	if _, err := c.managedGroup(ctx, id); err != nil {
		return err
	}
	role, err := c.applicationRole(ctx, clientID)
	if err != nil {
		return err
	}
	members, err := c.rawMembers(ctx, id)
	if err != nil {
		return err
	}
	// Never change the inherited access of maintenance/service accounts.
	for _, user := range members {
		protected, err := c.protected(ctx, user)
		if err != nil {
			return err
		}
		if protected {
			return failure("identity_protected_account", 403)
		}
	}
	method := "DELETE"
	if grant {
		method = "POST"
	}
	if err := c.request(ctx, method, "/groups/"+id+"/role-mappings/realm", []Role{role}, nil); err != nil {
		return err
	}
	if !grant {
		for _, user := range members {
			if err := c.logoutAfterMutation(ctx, user.ID); err != nil {
				return err
			}
		}
	}
	return nil
}

type MembershipResult struct {
	Changed []string `json:"changed"`
	Failed  []string `json:"failed"`
}

// Validate the entire selection before changing any memberships. All writes
// through this client are serialized so simultaneous moves cannot add two groups.
func (c *Client) BulkMembership(ctx context.Context, groupID string, ids []string, member bool) (MembershipResult, error) {
	c.membershipMu.Lock()
	defer c.membershipMu.Unlock()
	result := MembershipResult{Changed: []string{}, Failed: []string{}}
	if len(ids) == 0 || len(ids) > 50 {
		return result, failure("invalid_request", 400)
	}
	if _, err := c.managedGroup(ctx, groupID); err != nil {
		return result, err
	}
	plans := make(map[string][]Group, len(ids))
	for _, id := range ids {
		if _, exists := plans[id]; exists {
			return result, failure("invalid_request", 400)
		}
		groups, err := c.membershipPlan(ctx, id, groupID, member)
		if err != nil {
			return result, err
		}
		plans[id] = groups
	}
	for _, id := range ids {
		if err := c.changeMembership(ctx, id, groupID, member, plans[id]); err != nil {
			result.Failed = append(result.Failed, id)
		} else {
			result.Changed = append(result.Changed, id)
		}
	}
	return result, nil
}

func (c *Client) membershipPlan(ctx context.Context, id, target string, member bool) ([]Group, error) {
	if _, err := c.mutableUser(ctx, id); err != nil {
		return nil, err
	}
	groups, err := c.userGroups(ctx, id)
	if err != nil {
		return nil, err
	}
	if member {
		for _, group := range groups {
			if group.ID != target {
				// Never silently remove membership of an external or privileged group.
				if _, err := c.managedGroup(ctx, group.ID); err != nil {
					return nil, err
				}
			}
		}
	}
	return groups, nil
}

func (c *Client) changeMembership(ctx context.Context, id, target string, member bool, previous []Group) error {
	endpoint := "/users/" + id + "/groups/"
	if !member {
		if err := c.request(ctx, "DELETE", endpoint+target, nil, nil); err != nil {
			return err
		}
		return c.logoutAfterMutation(ctx, id)
	}
	alreadyMember := false
	old := []Group{}
	for _, group := range previous {
		if group.ID == target {
			alreadyMember = true
		} else {
			old = append(old, group)
		}
	}
	// Remove old admission before granting the new one, avoiding a temporary
	// union of permissions. Restore the original membership on upstream failure.
	attempted := []Group{}
	for _, group := range old {
		attempted = append(attempted, group)
		if err := c.request(ctx, "DELETE", endpoint+group.ID, nil, nil); err != nil {
			return c.restoreMembership(ctx, id, target, false, attempted, err)
		}
	}
	if !alreadyMember {
		if err := c.request(ctx, "PUT", endpoint+target, nil, nil); err != nil {
			return c.restoreMembership(ctx, id, target, true, attempted, err)
		}
	}
	if len(old) > 0 {
		return c.logoutAfterMutation(ctx, id)
	}
	return nil
}

func (c *Client) restoreMembership(ctx context.Context, id, target string, removeTarget bool, old []Group, cause error) error {
	// The browser may have disconnected; compensation must still run.
	recovery, cancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
	defer cancel()
	endpoint := "/users/" + id + "/groups/"
	if removeTarget {
		if err := c.request(recovery, "DELETE", endpoint+target, nil, nil); err != nil {
			_ = c.logoutAfterMutation(recovery, id)
			return failure("identity_membership_recovery_failed", 503)
		}
	}
	failed := false
	for _, group := range old {
		if err := c.request(recovery, "PUT", endpoint+group.ID, nil, nil); err != nil {
			failed = true
		}
	}
	if len(old) > 0 {
		_ = c.logoutAfterMutation(recovery, id)
	}
	if failed {
		return failure("identity_membership_recovery_failed", 503)
	}
	return cause
}

func (c *Client) allUsers(ctx context.Context) ([]User, error) {
	users := []User{}
	if err := c.request(ctx, "GET", "/users?first=0&max=1001&briefRepresentation=false", nil, &users); err != nil {
		return nil, err
	}
	if len(users) > directoryLimit {
		return nil, failure("identity_directory_limit", 409)
	}
	return users, nil
}

func (c *Client) userGroups(ctx context.Context, id string) ([]Group, error) {
	if !objectID.MatchString(id) {
		return nil, failure("identity_invalid_response", 502)
	}
	groups := []Group{}
	if err := c.request(ctx, "GET", "/users/"+id+"/groups?max=1001&briefRepresentation=false", nil, &groups); err != nil {
		return nil, err
	}
	if len(groups) > directoryLimit {
		return nil, failure("identity_group_limit", 409)
	}
	return groups, nil
}

type DirectorySummary struct {
	Accounts  int `json:"accounts"`
	Grouped   int `json:"grouped"`
	Ungrouped int `json:"ungrouped"`
}

func (c *Client) Summary(ctx context.Context) (DirectorySummary, error) {
	var summary DirectorySummary
	users, err := c.allUsers(ctx)
	if err != nil {
		return summary, err
	}
	for _, user := range users {
		if user.ServiceAccountClientID != "" {
			continue
		}
		groups, err := c.userGroups(ctx, user.ID)
		if err != nil {
			return summary, err
		}
		summary.Accounts++
		if len(groups) > 0 {
			summary.Grouped++
		} else {
			summary.Ungrouped++
		}
	}
	return summary, nil
}

func (c *Client) ungroupedUsers(ctx context.Context, filter UserFilter) (UserPage, error) {
	page := UserPage{Users: []User{}, First: filter.First}
	for _, value := range []string{filter.Enabled, filter.EmailVerified} {
		if value != "" && value != "true" && value != "false" {
			return page, failure("invalid_request", 400)
		}
	}
	users, err := c.allUsers(ctx)
	if err != nil {
		return page, err
	}
	filtered := []User{}
	query := strings.ToLower(strings.TrimSpace(filter.Search))
	for _, user := range users {
		if user.ServiceAccountClientID != "" || (filter.Enabled != "" && user.Enabled != (filter.Enabled == "true")) || (filter.EmailVerified != "" && user.EmailVerified != (filter.EmailVerified == "true")) {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(user.Username+" "+user.Email+" "+user.FirstName+" "+user.LastName), query) {
			continue
		}
		groups, err := c.userGroups(ctx, user.ID)
		if err != nil {
			return page, err
		}
		if len(groups) == 0 {
			filtered = append(filtered, user)
		}
	}
	if filter.First >= len(filtered) {
		return page, nil
	}
	end := filter.First + 51
	if end > len(filtered) {
		end = len(filtered)
	}
	return c.userPage(ctx, filtered[filter.First:end], filter.First)
}

// EffectiveApplicationAccounts includes group/composite inheritance rather
// than presenting the direct role-members endpoint as the full access list.
func (c *Client) EffectiveApplicationAccounts(ctx context.Context, clientID string, first int) (UserPage, error) {
	page := UserPage{Users: []User{}, First: first}
	if first < 0 || first > 100000 {
		return page, failure("invalid_request", 400)
	}
	if _, err := c.applicationRole(ctx, clientID); err != nil {
		return page, err
	}
	users, err := c.allUsers(ctx)
	if err != nil {
		return page, err
	}
	granted := []User{}
	for _, user := range users {
		if user.ServiceAccountClientID != "" {
			continue
		}
		access, err := c.access(ctx, user.ID)
		if err != nil {
			return page, err
		}
		for _, app := range access {
			if app.ClientID == clientID && app.Granted {
				user.AccessSource = "direct"
				if app.Inherited {
					user.AccessSource = "inherited"
				}
				granted = append(granted, user)
			}
		}
	}
	if first >= len(granted) {
		return page, nil
	}
	end := first + 51
	if end > len(granted) {
		end = len(granted)
	}
	return c.userPage(ctx, granted[first:end], first)
}
