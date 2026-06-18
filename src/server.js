const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── In-memory store ──────────────────────────────────────────────────────────
let users = [
  { id: 1, username: "admin",    password: "admin123",  name: "Alice Admin",  role: "admin" },
  { id: 2, username: "testuser", password: "test1234",  name: "Bob Tester",   role: "user"  },
  { id: 3, username: "viewer",   password: "view5678",  name: "Carol Viewer", role: "viewer"},
];

let tasks = [
  { id: 1, title: "Write test plan",        description: "Draft the full QA test plan for v2",  status: "todo",        priority: "high",   assigneeId: 2, tags: ["qa", "docs"],     dueDate: "2026-06-20", createdAt: "2026-06-01" },
  { id: 2, title: "Set up CI pipeline",     description: "Configure GitHub Actions for E2E",    status: "in-progress", priority: "high",   assigneeId: 1, tags: ["devops"],         dueDate: "2026-06-15", createdAt: "2026-06-02" },
  { id: 3, title: "Review login flow",      description: "Check all edge cases for auth",        status: "done",        priority: "medium", assigneeId: 2, tags: ["qa", "auth"],     dueDate: "2026-06-10", createdAt: "2026-06-03" },
  { id: 4, title: "Fix pagination bug",     description: "Page 2 returns wrong items",           status: "todo",        priority: "low",    assigneeId: null, tags: ["bug"],        dueDate: "2026-06-25", createdAt: "2026-06-04" },
  { id: 5, title: "Update API docs",        description: "Document all new endpoints",           status: "in-progress", priority: "medium", assigneeId: 1, tags: ["docs"],          dueDate: "2026-06-18", createdAt: "2026-06-05" },
  { id: 6, title: "Performance testing",    description: "Run load tests on /api/tasks",         status: "todo",        priority: "high",   assigneeId: null, tags: ["qa", "perf"], dueDate: "2026-06-30", createdAt: "2026-06-06" },
];

let comments = [
  { id: 1, taskId: 1, userId: 1, text: "Let's start with smoke tests.", createdAt: "2026-06-02T10:00:00Z" },
  { id: 2, taskId: 1, userId: 2, text: "Agreed. I'll draft by EOD.",    createdAt: "2026-06-02T11:30:00Z" },
  { id: 3, taskId: 2, userId: 1, text: "Runner is configured.",          createdAt: "2026-06-03T09:00:00Z" },
];

let nextTaskId    = 7;
let nextCommentId = 4;
let sessions      = {}; // token → userId

// ── Helpers ──────────────────────────────────────────────────────────────────
const randomToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token || !sessions[token]) return res.status(401).json({ error: "Unauthorized" });
  req.user = users.find((u) => u.id === sessions[token]);
  next();
};
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
};

// ── Auth ─────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });

  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = randomToken();
  sessions[token] = user.id;
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post("/api/auth/logout", authMiddleware, (req, res) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  delete sessions[token];
  res.json({ message: "Logged out" });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json(safeUser);
});

app.put("/api/auth/password", authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "Both fields are required" });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  const user = users.find((u) => u.id === req.user.id);
  if (user.password !== currentPassword)
    return res.status(400).json({ error: "Current password is incorrect" });
  user.password = newPassword;
  res.json({ message: "Password updated" });
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get("/api/tasks", authMiddleware, (req, res) => {
  const { status, priority, assigneeId, search, tag, sortBy, order } = req.query;
  let result = [...tasks];
  if (status)     result = result.filter((t) => t.status === status);
  if (priority)   result = result.filter((t) => t.priority === priority);
  if (assigneeId) result = result.filter((t) => String(t.assigneeId) === assigneeId);
  if (tag)        result = result.filter((t) => t.tags.includes(tag));
  if (search)     result = result.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );
  if (sortBy) {
    result.sort((a, b) => {
      const dir = order === "desc" ? -1 : 1;
      if (a[sortBy] < b[sortBy]) return -dir;
      if (a[sortBy] > b[sortBy]) return dir;
      return 0;
    });
  }
  res.json({ tasks: result, total: result.length });
});

app.post("/api/tasks", authMiddleware, (req, res) => {
  const { title, description, status, priority, assigneeId, tags, dueDate } = req.body;
  if (!title || title.trim() === "")
    return res.status(400).json({ error: "Title is required" });
  if (title.length > 100)
    return res.status(400).json({ error: "Title must be 100 characters or fewer" });
  if (!["todo", "in-progress", "done"].includes(status))
    return res.status(400).json({ error: "Invalid status" });
  if (!["low", "medium", "high"].includes(priority))
    return res.status(400).json({ error: "Invalid priority" });

  const task = {
    id: nextTaskId++,
    title: title.trim(),
    description: description || "",
    status: status || "todo",
    priority: priority || "medium",
    assigneeId: assigneeId || null,
    tags: tags || [],
    dueDate: dueDate || null,
    createdAt: new Date().toISOString().split("T")[0],
  };
  tasks.push(task);
  res.status(201).json(task);
});

app.get("/api/tasks/:id", authMiddleware, (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

app.put("/api/tasks/:id", authMiddleware, (req, res) => {
  const idx = tasks.findIndex((t) => t.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Task not found" });
  const { title, description, status, priority, assigneeId, tags, dueDate } = req.body;
  if (title !== undefined && title.trim() === "")
    return res.status(400).json({ error: "Title cannot be empty" });
  if (status && !["todo", "in-progress", "done"].includes(status))
    return res.status(400).json({ error: "Invalid status" });
  if (priority && !["low", "medium", "high"].includes(priority))
    return res.status(400).json({ error: "Invalid priority" });
  tasks[idx] = { ...tasks[idx], ...req.body, id: tasks[idx].id };
  res.json(tasks[idx]);
});

app.patch("/api/tasks/:id/status", authMiddleware, (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: "Task not found" });
  const { status } = req.body;
  if (!["todo", "in-progress", "done"].includes(status))
    return res.status(400).json({ error: "Invalid status" });
  task.status = status;
  res.json(task);
});

app.delete("/api/tasks/:id", authMiddleware, (req, res) => {
  const idx = tasks.findIndex((t) => t.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Task not found" });
  tasks.splice(idx, 1);
  comments = comments.filter((c) => c.taskId !== Number(req.params.id));
  res.status(204).send();
});

// ── Comments ──────────────────────────────────────────────────────────────────
app.get("/api/tasks/:id/comments", authMiddleware, (req, res) => {
  const taskId = Number(req.params.id);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const result = comments
    .filter((c) => c.taskId === taskId)
    .map((c) => {
      const author = users.find((u) => u.id === c.userId);
      return { ...c, author: { id: author.id, name: author.name } };
    });
  res.json(result);
});

app.post("/api/tasks/:id/comments", authMiddleware, (req, res) => {
  const taskId = Number(req.params.id);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const { text } = req.body;
  if (!text || text.trim() === "")
    return res.status(400).json({ error: "Comment text is required" });
  const comment = {
    id: nextCommentId++,
    taskId,
    userId: req.user.id,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  const author = users.find((u) => u.id === req.user.id);
  res.status(201).json({ ...comment, author: { id: author.id, name: author.name } });
});

app.delete("/api/comments/:id", authMiddleware, (req, res) => {
  const commentId = Number(req.params.id);
  const idx = comments.findIndex((c) => c.id === commentId);
  if (idx === -1) return res.status(404).json({ error: "Comment not found" });
  const comment = comments[idx];
  if (comment.userId !== req.user.id && req.user.role !== "admin")
    return res.status(403).json({ error: "Cannot delete another user's comment" });
  comments.splice(idx, 1);
  res.status(204).send();
});

// ── Users (admin) ─────────────────────────────────────────────────────────────
app.get("/api/users", authMiddleware, (req, res) => {
  const safe = users.map(({ password: _, ...u }) => u);
  res.json(safe);
});

app.post("/api/users", authMiddleware, adminOnly, (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name)
    return res.status(400).json({ error: "username, password, and name are required" });
  if (users.find((u) => u.username === username))
    return res.status(409).json({ error: "Username already exists" });
  const newUser = { id: users.length + 1, username, password, name, role: role || "user" };
  users.push(newUser);
  const { password: _, ...safe } = newUser;
  res.status(201).json(safe);
});

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get("/api/stats", authMiddleware, (req, res) => {
  res.json({
    total:      tasks.length,
    todo:       tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    done:       tasks.filter((t) => t.status === "done").length,
    highPriority: tasks.filter((t) => t.priority === "high" && t.status !== "done").length,
  });
});

// ── Reset (for test setup) ────────────────────────────────────────────────────
app.post("/api/test/reset", (req, res) => {
  // Reset ALL mutable state — including users, so password-change tests
  // cannot pollute subsequent tests that rely on the seed credentials.
  users = [
    { id: 1, username: "admin",    password: "admin123", name: "Alice Admin",  role: "admin"  },
    { id: 2, username: "testuser", password: "test1234", name: "Bob Tester",   role: "user"   },
    { id: 3, username: "viewer",   password: "view5678", name: "Carol Viewer", role: "viewer" },
  ];
  tasks = [
    { id: 1, title: "Write test plan",     description: "Draft the full QA test plan for v2", status: "todo",        priority: "high",   assigneeId: 2,    tags: ["qa", "docs"], dueDate: "2026-06-20", createdAt: "2026-06-01" },
    { id: 2, title: "Set up CI pipeline",  description: "Configure GitHub Actions for E2E",   status: "in-progress", priority: "high",   assigneeId: 1,    tags: ["devops"],      dueDate: "2026-06-15", createdAt: "2026-06-02" },
    { id: 3, title: "Review login flow",   description: "Check all edge cases for auth",       status: "done",        priority: "medium", assigneeId: 2,    tags: ["qa", "auth"],  dueDate: "2026-06-10", createdAt: "2026-06-03" },
    { id: 4, title: "Fix pagination bug",  description: "Page 2 returns wrong items",          status: "todo",        priority: "low",    assigneeId: null, tags: ["bug"],         dueDate: "2026-06-25", createdAt: "2026-06-04" },
    { id: 5, title: "Update API docs",     description: "Document all new endpoints",          status: "in-progress", priority: "medium", assigneeId: 1,    tags: ["docs"],        dueDate: "2026-06-18", createdAt: "2026-06-05" },
    { id: 6, title: "Performance testing", description: "Run load tests on /api/tasks",        status: "todo",        priority: "high",   assigneeId: null, tags: ["qa", "perf"],  dueDate: "2026-06-30", createdAt: "2026-06-06" },
  ];
  comments = [
    { id: 1, taskId: 1, userId: 1, text: "Let's start with smoke tests.", createdAt: "2026-06-02T10:00:00Z" },
    { id: 2, taskId: 1, userId: 2, text: "Agreed. I'll draft by EOD.",    createdAt: "2026-06-02T11:30:00Z" },
    { id: 3, taskId: 2, userId: 1, text: "Runner is configured.",         createdAt: "2026-06-03T09:00:00Z" },
  ];
  nextTaskId    = 7;
  nextCommentId = 4;
  sessions      = {};
  res.json({ message: "State reset" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
