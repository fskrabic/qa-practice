/* ══════════════════════════════════════════════════════════════════════
   TaskFlow — Frontend Application
   ══════════════════════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────────────────────────────
let token         = null;
let currentUser   = null;
let currentTaskId = null;
let editingTaskId = null;
let sortBy        = "";
let sortOrder     = "asc";
let allUsers      = [];

// ── DOM Helpers ───────────────────────────────────────────────────────────────
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ── API Client ────────────────────────────────────────────────────────────────
async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ── Toast Notifications ───────────────────────────────────────────────────────
function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  el.setAttribute("data-cy", "toast");
  $("#toast-container").appendChild(el);
  setTimeout(() => {
    el.classList.add("fading");
    setTimeout(() => el.remove(), 320);
  }, 3000);
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function showConfirm(title, msg) {
  return new Promise((resolve) => {
    $("#confirm-title").textContent = title;
    $("#confirm-msg").textContent   = msg;
    $("#confirm-modal").classList.add("open");

    function onOk()     { cleanup(); resolve(true);  }
    function onCancel() { cleanup(); resolve(false); }

    function cleanup() {
      $("#confirm-modal").classList.remove("open");
      $("#confirm-ok").removeEventListener("click", onOk);
      $("#confirm-cancel").removeEventListener("click", onCancel);
    }

    $("#confirm-ok").addEventListener("click", onOk);
    $("#confirm-cancel").addEventListener("click", onCancel);
  });
}

// ── Badge Helpers ─────────────────────────────────────────────────────────────
function statusBadge(s) {
  const labels = { todo: "To Do", "in-progress": "In Progress", done: "Done" };
  return `<span class="badge status-${s}" data-cy="status-badge">${labels[s] || s}</span>`;
}

function priorityBadge(p) {
  const label = p.charAt(0).toUpperCase() + p.slice(1);
  return `<span class="badge priority-${p}" data-cy="priority-badge">${label}</span>`;
}

function assigneeDisplay(id) {
  if (!id) return '<span style="color:var(--text-muted)">Unassigned</span>';
  const user = allUsers.find((u) => u.id === id);
  return user ? user.name : "Unknown";
}

function initials(name) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Page / View Switching ─────────────────────────────────────────────────────
function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("active"));
  $(id).classList.add("active");
}

function showView(id) {
  $$(".view").forEach((v) => v.classList.remove("active"));
  $(`#view-${id}`).classList.add("active");
  $$(".nav-link").forEach((l) => l.classList.remove("active"));
  const link = $(`.nav-link[data-view="${id}"]`);
  if (link) link.classList.add("active");
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════

async function login() {
  const username = $("#login-username").value.trim();
  const password = $("#login-password").value;
  $("#login-error").textContent = "";

  if (!username || !password) {
    $("#login-error").textContent = "Username and password are required.";
    return;
  }

  const btn = $("#login-btn");
  btn.disabled    = true;
  btn.textContent = "Signing in…";

  try {
    const data = await api("/api/auth/login", { method: "POST", body: { username, password } });
    token       = data.token;
    currentUser = data.user;
    localStorage.setItem("tf_token", token);
    await initApp();
  } catch (e) {
    $("#login-error").textContent = e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = "Sign In";
  }
}

async function logout() {
  try { await api("/api/auth/logout", { method: "POST" }); } catch (_) { /* ignore */ }
  token       = null;
  currentUser = null;
  localStorage.removeItem("tf_token");
  showPage("#login-page");
  $("#login-username").value    = "";
  $("#login-password").value    = "";
  $("#login-error").textContent = "";
}

// ══════════════════════════════════════════════════════════════════════════════
// APP INIT
// ══════════════════════════════════════════════════════════════════════════════

async function initApp() {
  try {
    allUsers = await api("/api/users");
  } catch (_) {
    allUsers = [];
  }

  // Populate topbar
  $("#user-name").textContent   = currentUser.name;
  $("#user-avatar").textContent = initials(currentUser.name);
  const rb = $("#user-role-badge");
  rb.textContent = currentUser.role;
  rb.className   = `role-badge role-${currentUser.role}`;

  // Show/hide admin nav item
  const isAdmin = currentUser.role === "admin";
  $$(".admin-only").forEach((el) => { el.style.display = isAdmin ? "" : "none"; });

  showPage("#app-page");
  showView("dashboard");
  loadDashboard();
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

async function loadDashboard() {
  try {
    const [stats, { tasks }] = await Promise.all([
      api("/api/stats"),
      api("/api/tasks"),
    ]);

    $("[data-cy=stat-total]").textContent      = stats.total;
    $("[data-cy=stat-todo]").textContent       = stats.todo;
    $("[data-cy=stat-inprogress]").textContent = stats.inProgress;
    $("[data-cy=stat-done]").textContent       = stats.done;
    $("[data-cy=stat-high]").textContent       = stats.highPriority;

    const recent = tasks.slice(0, 5);
    $("#recent-tasks").innerHTML = recent.map((t) => `
      <div class="recent-task-row" data-cy="recent-task" onclick="openDetail(${t.id})">
        <span class="task-name">${t.title}</span>
        ${statusBadge(t.status)}
        ${priorityBadge(t.priority)}
        <span class="task-due">${t.dueDate || "–"}</span>
      </div>
    `).join("");
  } catch (e) {
    toast("Failed to load dashboard", "error");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TASKS LIST
// ══════════════════════════════════════════════════════════════════════════════

async function loadTasks() {
  const params = new URLSearchParams();
  const search   = $("#search-input").value.trim();
  const status   = $("#filter-status").value;
  const priority = $("#filter-priority").value;
  const tag      = $("#filter-tag").value;

  if (search)   params.set("search",   search);
  if (status)   params.set("status",   status);
  if (priority) params.set("priority", priority);
  if (tag)      params.set("tag",      tag);
  if (sortBy)   { params.set("sortBy", sortBy); params.set("order", sortOrder); }

  try {
    const { tasks, total } = await api(`/api/tasks?${params}`);
    $("#tasks-count").textContent = `${total} task${total !== 1 ? "s" : ""}`;

    const tbody = $("#tasks-tbody");
    if (tasks.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state" data-cy="empty-state">
              No tasks found. Try adjusting your filters.
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = tasks.map((t) => `
      <tr data-cy="task-row" data-task-id="${t.id}">
        <td>
          <span class="task-title-link" data-cy="task-title" onclick="openDetail(${t.id})">
            ${t.title}
          </span>
        </td>
        <td>${statusBadge(t.status)}</td>
        <td>${priorityBadge(t.priority)}</td>
        <td>${t.tags.map((tg) => `<span class="tag">${tg}</span>`).join("") || "–"}</td>
        <td style="color:var(--text-dim)">${t.dueDate || "–"}</td>
        <td>
          <button class="btn-icon"            data-cy="edit-task-icon"   onclick="openTaskModal(${t.id})" title="Edit">✎</button>
          <button class="btn-icon btn-delete" data-cy="delete-task-icon" onclick="deleteTask(${t.id})"   title="Delete">✕</button>
        </td>
      </tr>
    `).join("");
  } catch (e) {
    toast("Failed to load tasks", "error");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TASK DETAIL
// ══════════════════════════════════════════════════════════════════════════════

async function openDetail(id) {
  currentTaskId = id;
  showView("detail");

  try {
    const t = await api(`/api/tasks/${id}`);
    $("#detail-title").textContent        = t.title;
    $("#detail-description").textContent  = t.description || "No description provided.";
    $("#detail-meta").innerHTML           = `${statusBadge(t.status)} ${priorityBadge(t.priority)}`;
    $("#detail-priority").innerHTML       = priorityBadge(t.priority);
    $("#detail-due").textContent          = t.dueDate || "–";
    $("#detail-assignee").innerHTML       = assigneeDisplay(t.assigneeId);
    $("#detail-created").textContent      = t.createdAt;
    $("#detail-tags").innerHTML           = t.tags.map((tg) => `<span class="tag">${tg}</span>`).join("") || "–";
    $("#detail-status-select").value      = t.status;
    loadComments(id);
  } catch (e) {
    toast("Failed to load task", "error");
  }
}

// ── Comments ──────────────────────────────────────────────────────────────────

async function loadComments(taskId) {
  try {
    const comments = await api(`/api/tasks/${taskId}/comments`);
    $("#comment-count").textContent = comments.length;

    const list = $("#comments-list");
    if (comments.length === 0) {
      list.innerHTML = `
        <p style="color:var(--text-muted);font-size:13px;padding:8px 0" data-cy="no-comments">
          No comments yet.
        </p>`;
      return;
    }

    list.innerHTML = comments.map((c) => `
      <div class="comment" data-cy="comment" data-comment-id="${c.id}">
        <div class="comment-header">
          <div class="avatar" style="width:22px;height:22px;font-size:9px">${initials(c.author.name)}</div>
          <span class="comment-author" data-cy="comment-author">${c.author.name}</span>
          <span class="comment-time">${new Date(c.createdAt).toLocaleString()}</span>
          ${(currentUser.id === c.userId || currentUser.role === "admin")
            ? `<button class="comment-delete" data-cy="delete-comment" onclick="deleteComment(${c.id})">✕</button>`
            : ""}
        </div>
        <p class="comment-text" data-cy="comment-text">${c.text}</p>
      </div>
    `).join("");
  } catch (e) {
    toast("Failed to load comments", "error");
  }
}

async function addComment() {
  const text = $("#comment-input").value.trim();
  $("#comment-error").textContent = "";

  if (!text) {
    $("#comment-error").textContent = "Comment cannot be empty.";
    return;
  }

  try {
    await api(`/api/tasks/${currentTaskId}/comments`, { method: "POST", body: { text } });
    $("#comment-input").value = "";
    await loadComments(currentTaskId);
    toast("Comment added", "success");
  } catch (e) {
    toast(e.message, "error");
  }
}

async function deleteComment(id) {
  const ok = await showConfirm("Delete Comment", "Are you sure you want to delete this comment?");
  if (!ok) return;

  try {
    await api(`/api/comments/${id}`, { method: "DELETE" });
    await loadComments(currentTaskId);
    toast("Comment deleted", "success");
  } catch (e) {
    toast(e.message, "error");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TASK MODAL (create / edit)
// ══════════════════════════════════════════════════════════════════════════════

async function openTaskModal(taskId = null) {
  editingTaskId = taskId;
  $("#task-modal-title").textContent    = taskId ? "Edit Task" : "New Task";
  $("#task-title-input").value          = "";
  $("#task-desc-input").value           = "";
  $("#task-status-input").value         = "todo";
  $("#task-priority-input").value       = "medium";
  $("#task-due-input").value            = "";
  $("#task-form-error").textContent     = "";
  $("#title-error").textContent         = "";
  $$("#tags-checkboxes input").forEach((cb) => { cb.checked = false; });

  // Repopulate assignee dropdown from latest user list
  const sel = $("#task-assignee-input");
  sel.innerHTML = `<option value="">Unassigned</option>` +
    allUsers.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");

  if (taskId) {
    try {
      const t = await api(`/api/tasks/${taskId}`);
      $("#task-title-input").value    = t.title;
      $("#task-desc-input").value     = t.description || "";
      $("#task-status-input").value   = t.status;
      $("#task-priority-input").value = t.priority;
      $("#task-due-input").value      = t.dueDate || "";
      sel.value = t.assigneeId ? String(t.assigneeId) : "";
      t.tags.forEach((tg) => {
        const cb = $(`#tags-checkboxes input[value="${tg}"]`);
        if (cb) cb.checked = true;
      });
    } catch (e) {
      toast("Failed to load task for editing", "error");
      return;
    }
  }

  $("#task-modal").classList.add("open");
  $("#task-title-input").focus();
}

function closeTaskModal() {
  $("#task-modal").classList.remove("open");
  editingTaskId = null;
}

async function submitTaskForm() {
  const title      = $("#task-title-input").value.trim();
  const desc       = $("#task-desc-input").value.trim();
  const status     = $("#task-status-input").value;
  const priority   = $("#task-priority-input").value;
  const assigneeId = $("#task-assignee-input").value ? Number($("#task-assignee-input").value) : null;
  const dueDate    = $("#task-due-input").value || null;
  const tags       = $$("#tags-checkboxes input:checked").map((cb) => cb.value);

  $("#title-error").textContent     = "";
  $("#task-form-error").textContent = "";

  if (!title) {
    $("#title-error").textContent = "Title is required.";
    return;
  }

  const body = { title, description: desc, status, priority, assigneeId, dueDate, tags };

  try {
    if (editingTaskId) {
      await api(`/api/tasks/${editingTaskId}`, { method: "PUT", body });
      toast("Task updated", "success");
    } else {
      await api("/api/tasks", { method: "POST", body });
      toast("Task created", "success");
    }

    closeTaskModal();

    // Refresh whichever view is currently visible
    if ($("#view-tasks").classList.contains("active"))     loadTasks();
    if ($("#view-board").classList.contains("active"))     loadBoard();
    if ($("#view-dashboard").classList.contains("active")) loadDashboard();
    if (currentTaskId && $("#view-detail").classList.contains("active")) openDetail(currentTaskId);
  } catch (e) {
    $("#task-form-error").textContent = e.message;
  }
}

async function deleteTask(id) {
  const ok = await showConfirm("Delete Task", "This will permanently delete the task and all its comments.");
  if (!ok) return;

  try {
    await api(`/api/tasks/${id}`, { method: "DELETE" });
    toast("Task deleted", "success");
    if ($("#view-detail").classList.contains("active")) showView("tasks");
    loadTasks();
    loadDashboard();
  } catch (e) {
    toast(e.message, "error");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BOARD
// ══════════════════════════════════════════════════════════════════════════════

async function loadBoard() {
  try {
    const { tasks } = await api("/api/tasks");
    const cols = { todo: [], "in-progress": [], done: [] };
    tasks.forEach((t) => { if (cols[t.status]) cols[t.status].push(t); });

    for (const [status, items] of Object.entries(cols)) {
      $(`#count-${status}`).textContent  = items.length;
      $(`#cards-${status}`).innerHTML    = items.map((t) => `
        <div class="board-card"
             data-cy="board-card"
             data-task-id="${t.id}"
             data-status="${t.status}"
             draggable="true"
             onclick="openDetail(${t.id})">
          <div class="board-card-title">${t.title}</div>
          ${t.description
            ? `<div class="board-card-desc">${t.description.slice(0, 60)}${t.description.length > 60 ? "…" : ""}</div>`
            : ""}
          <div class="board-card-footer">
            ${priorityBadge(t.priority)}
            <span class="board-card-due">${t.dueDate || ""}</span>
          </div>
        </div>
      `).join("");
    }

    initDragDrop();
  } catch (e) {
    toast("Failed to load board", "error");
  }
}

function initDragDrop() {
  let dragged = null;

  $$(".board-card").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      dragged = card;
      // Timeout lets the browser snapshot the element before we style it
      setTimeout(() => card.classList.add("dragging"), 0);
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      dragged = null;
      $$(".board-col").forEach((c) => c.classList.remove("drag-over"));
    });
  });

  $$(".board-col").forEach((col) => {
    col.addEventListener("dragover",  (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", ()  => col.classList.remove("drag-over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      if (!dragged) return;

      const taskId    = Number(dragged.dataset.taskId);
      const newStatus = col.dataset.status;
      const oldStatus = dragged.dataset.status;
      if (newStatus === oldStatus) return;

      try {
        await api(`/api/tasks/${taskId}/status`, { method: "PATCH", body: { status: newStatus } });
        toast(`Moved to "${newStatus}"`, "info");
        loadBoard();
        loadDashboard();
      } catch (e) {
        toast(e.message, "error");
      }
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════════════════════════

function loadProfile() {
  $("#profile-name").textContent     = currentUser.name;
  $("#profile-username").textContent = currentUser.username;
  $("#profile-role").innerHTML       = `<span class="role-badge role-${currentUser.role}">${currentUser.role}</span>`;
  $("#pw-current").value             = "";
  $("#pw-new").value                 = "";
  $("#pw-confirm").value             = "";
  $("#pw-error").textContent         = "";
}

async function changePassword() {
  const current  = $("#pw-current").value;
  const next     = $("#pw-new").value;
  const confirm  = $("#pw-confirm").value;
  $("#pw-error").textContent = "";

  if (!current || !next || !confirm) {
    $("#pw-error").textContent = "All fields are required.";
    return;
  }
  if (next !== confirm) {
    $("#pw-error").textContent = "New passwords do not match.";
    return;
  }
  if (next.length < 6) {
    $("#pw-error").textContent = "Password must be at least 6 characters.";
    return;
  }

  try {
    await api("/api/auth/password", { method: "PUT", body: { currentPassword: current, newPassword: next } });
    toast("Password updated successfully", "success");
    $("#pw-current").value = "";
    $("#pw-new").value     = "";
    $("#pw-confirm").value = "";
  } catch (e) {
    $("#pw-error").textContent = e.message;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════════════════════

async function loadAdmin() {
  try {
    const users = await api("/api/users");
    $("#users-tbody").innerHTML = users.map((u) => `
      <tr data-cy="user-row">
        <td data-cy="user-name">${u.name}</td>
        <td data-cy="user-username">${u.username}</td>
        <td><span class="role-badge role-${u.role}" data-cy="user-role">${u.role}</span></td>
      </tr>
    `).join("");
  } catch (e) {
    toast("Failed to load users", "error");
  }
}

function openUserModal() {
  $("#user-name-input").value       = "";
  $("#user-username-input").value   = "";
  $("#user-password-input").value   = "";
  $("#user-role-input").value       = "user";
  $("#user-form-error").textContent = "";
  $("#user-modal").classList.add("open");
  $("#user-name-input").focus();
}

async function submitUserForm() {
  const name     = $("#user-name-input").value.trim();
  const username = $("#user-username-input").value.trim();
  const password = $("#user-password-input").value;
  const role     = $("#user-role-input").value;
  $("#user-form-error").textContent = "";

  if (!name || !username || !password) {
    $("#user-form-error").textContent = "All fields are required.";
    return;
  }

  try {
    await api("/api/users", { method: "POST", body: { name, username, password, role } });
    toast("User created", "success");
    $("#user-modal").classList.remove("open");
    allUsers = await api("/api/users");
    loadAdmin();
  } catch (e) {
    $("#user-form-error").textContent = e.message;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT WIRING
// ══════════════════════════════════════════════════════════════════════════════

// ── Login ─────────────────────────────────────────────────────────────────────
$("#login-btn").addEventListener("click", login);
$("#login-password").addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });

// ── Logout ────────────────────────────────────────────────────────────────────
$("#logout-btn").addEventListener("click", logout);

// ── Navigation ────────────────────────────────────────────────────────────────
$$(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    const view = link.dataset.view;
    showView(view);
    if (view === "dashboard") loadDashboard();
    if (view === "tasks")     loadTasks();
    if (view === "board")     loadBoard();
    if (view === "admin")     loadAdmin();
  });
});

// User badge → profile
$("#user-badge").addEventListener("click", () => {
  $$(".nav-link").forEach((l) => l.classList.remove("active"));
  showView("profile");
  loadProfile();
});

// ── Task List ─────────────────────────────────────────────────────────────────
$("#btn-add-task").addEventListener("click", () => openTaskModal());

// Search (debounced)
let filterTimer;
$("#search-input").addEventListener("input", () => {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(loadTasks, 300);
});

["#filter-status", "#filter-priority", "#filter-tag"].forEach((sel) => {
  $(sel).addEventListener("change", loadTasks);
});

$("#btn-clear-filters").addEventListener("click", () => {
  $("#search-input").value    = "";
  $("#filter-status").value   = "";
  $("#filter-priority").value = "";
  $("#filter-tag").value      = "";
  sortBy    = "";
  sortOrder = "asc";
  loadTasks();
});

// Column sorting
$$(".sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const col = th.dataset.sort;
    sortOrder = (sortBy === col && sortOrder === "asc") ? "desc" : "asc";
    sortBy    = col;
    loadTasks();
  });
});

// ── Task Modal ────────────────────────────────────────────────────────────────
$("#task-modal-submit").addEventListener("click", submitTaskForm);
$("#task-modal-close").addEventListener("click", closeTaskModal);
$("#task-modal-cancel").addEventListener("click", closeTaskModal);

// ── Task Detail ───────────────────────────────────────────────────────────────
$("#btn-back").addEventListener("click", () => {
  showView("tasks");
  loadTasks();
});

$("#btn-edit-task").addEventListener("click", () => openTaskModal(currentTaskId));
$("#btn-delete-task").addEventListener("click", () => deleteTask(currentTaskId));

$("#btn-add-comment").addEventListener("click", addComment);
$("#comment-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.ctrlKey) addComment();
});

$("#detail-status-select").addEventListener("change", async (e) => {
  try {
    await api(`/api/tasks/${currentTaskId}/status`, { method: "PATCH", body: { status: e.target.value } });
    toast("Status updated", "success");
    loadDashboard();
  } catch (err) {
    toast(err.message, "error");
  }
});

// ── Board ─────────────────────────────────────────────────────────────────────
$("#btn-add-task-board").addEventListener("click", () => openTaskModal());

// ── Profile ───────────────────────────────────────────────────────────────────
$("#btn-change-pw").addEventListener("click", changePassword);

// ── Admin ─────────────────────────────────────────────────────────────────────
$("#btn-add-user").addEventListener("click", openUserModal);
$("#user-modal-submit").addEventListener("click", submitUserForm);
$("#user-modal-close").addEventListener("click",  () => $("#user-modal").classList.remove("open"));
$("#user-modal-cancel").addEventListener("click", () => $("#user-modal").classList.remove("open"));

// ── Modal overlay — click outside to close (except confirm) ──────────────────
["#task-modal", "#user-modal"].forEach((id) => {
  $(id).addEventListener("click", (e) => {
    if (e.target === $(id)) $(id).classList.remove("open");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP — restore session from localStorage
// ══════════════════════════════════════════════════════════════════════════════
(async () => {
  const stored = localStorage.getItem("tf_token");
  if (!stored) return;

  token = stored;
  try {
    currentUser = await api("/api/auth/me");
    await initApp();
  } catch (_) {
    // Token is stale — clear it and stay on login page
    token = null;
    localStorage.removeItem("tf_token");
  }
})();
