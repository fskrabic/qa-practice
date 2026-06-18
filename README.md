# TaskFlow

A purpose-built demo application for practicing **Cypress E2E automation testing**. It is a full-stack task manager with real authentication, filtering, sorting, comments, a Kanban board, and an admin panel.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
# → http://localhost:3000

# 3. Open Cypress (in a second terminal)
npm run cy:open

# 4. Or run tests headlessly
npm run cy:run
```

---

## Test Accounts

| Username   | Password   | Role    |
|------------|------------|---------|
| `admin`    | `admin123` | Admin   |
| `testuser` | `test1234` | User    |
| `viewer`   | `view5678` | Viewer  |

---

## Project Structure

```
taskflow-qa-practice/
├── src/
│   └── server.js            # Express backend (REST API + in-memory store)
├── public/
│   ├── index.html           # Single-page app (HTML + CSS)
│   └── app.js               # Frontend JavaScript
├── cypress/
│   ├── e2e/
│   │   ├── auth.cy.ts                 # Login, logout, password change, roles
│   │   ├── tasks.cy.ts                # CRUD, form validation, API interception
│   │   ├── filters-sorting.cy.ts      # Search, dropdowns, multi-filter, sort
│   │   ├── task-detail.cy.ts          # Detail view, inline status, comments
│   │   ├── board.cy.ts                # Kanban board, drag-and-drop
│   │   └── dashboard.cy.ts            # Stats
│       └── admin.cy.ts                # User management
│   ├── fixtures/
│   │   └── data.json                  # Reusable test data
│   └── support/
│       └── commands.ts                # Custom commands + global beforeEach reset
├── cypress.config.js
└── package.json
```

---

## Custom Cypress Commands

Defined in `cypress/support/commands.ts`:

| Command | Description |
|---|---|
| `cy.login(username, password)` | Logs in via the UI form |
| `cy.loginAsAdmin()` | Shorthand for admin login |
| `cy.loginAsTestUser()` | Shorthand for testuser login |
| `cy.loginByApi(username, password)` | Logs in via API, sets localStorage — skips UI. Faster for tests not about auth. |
| `cy.navigateTo(view)` | Clicks the nav link for `dashboard`, `tasks`, `board`, or `admin` |
| `cy.typeInSearchInput(query)`  |  Type into the search input
| `cy.selectStatusFilter(status)`  | Select status to filter
| `cy.dragAndDrop(sourceSelector, targetSelector)` | Drag and drop item

---

## API Endpoints

All endpoints except `/api/auth/login` and `/api/test/reset` require a Bearer token.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/password` | Change password |
| GET | `/api/tasks` | List tasks (supports `status`, `priority`, `tag`, `search`, `sortBy`, `order`, `assigneeId`) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/status` | Update status only |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/:id/comments` | List comments |
| POST | `/api/tasks/:id/comments` | Add comment |
| DELETE | `/api/comments/:id` | Delete comment |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user (admin only) |
| GET | `/api/stats` | Dashboard stats |
| POST | `/api/test/reset` | **Reset all state** (called automatically in `beforeEach`) |

---

## `data-cy` Attribute Reference

Every interactive element has a `data-cy` attribute for clean Cypress selectors.

### Auth
`username-input`, `password-input`, `login-button`, `login-error`, `logout-button`, `user-badge`, `pw-current`, `pw-new`, `pw-confirm`, `pw-error`, `change-password-button`

### Navigation
`nav-dashboard`, `nav-tasks`, `nav-board`, `nav-admin`

### Tasks list
`add-task-button`, `search-input`, `filter-status`, `filter-priority`, `filter-tag`, `clear-filters`, `tasks-count`, `tasks-table`, `tasks-tbody`, `task-row`, `task-title`, `status-badge`, `priority-badge`, `edit-task-icon`, `delete-task-icon`, `empty-state`, `sort-title`, `sort-status`, `sort-priority`, `sort-due`

### Task modal
`task-modal`, `task-title-input`, `task-desc-input`, `task-status-input`, `task-priority-input`, `task-assignee-input`, `task-due-input`, `tags-checkboxes`, `task-modal-submit`, `title-error`, `task-form-error`

### Task detail
`detail-title`, `detail-description`, `detail-priority`, `detail-due`, `detail-assignee`, `detail-tags`, `status-select`, `back-button`, `edit-task-button`, `delete-task-button`, `comment`, `comment-author`, `comment-text`, `comment-input`, `add-comment-button`, `delete-comment`, `comment-count`, `no-comments`

### Board
`board`, `col-todo`, `col-in-progress`, `col-done`, `count-todo`, `count-in-progress`, `count-done`, `cards-todo`, `cards-in-progress`, `cards-done`, `board-card`, `add-task-board-button`

### Dashboard
`stats-grid`, `stat-total`, `stat-todo`, `stat-inprogress`, `stat-done`, `stat-high`, `recent-tasks`, `recent-task`

### Admin
`add-user-button`, `users-table`, `users-tbody`, `user-row`, `user-name`, `user-username`, `user-role`, `user-modal`, `user-name-input`, `user-username-input`, `user-password-input`, `user-role-input`, `user-modal-submit`, `user-form-error`

### Global
`toast`, `confirm-modal`, `confirm-ok`, `confirm-cancel`, `profile-card`, `profile-name`, `profile-username`, `profile-role`

---