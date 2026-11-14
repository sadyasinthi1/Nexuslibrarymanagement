# ALL SOURCE CODE — Team Nexus / Mini Library

COMP229 — Web Application Development (SEC. 405, Fall 2026)

All the application code is below, separated by file path. **Do not paste everything into one file.** Use the provided ZIP for the easiest setup.


## `package.json`

````json
{
  "name": "team-nexus-mini-library",
  "version": "1.0.0",
  "private": true,
  "description": "Team Nexus - simple full-stack Library Management System first release",
  "main": "backend/server.js",
  "scripts": {
    "start": "node backend/server.js",
    "dev": "node --watch backend/server.js",
    "check": "node --check backend/server.js && node --check backend/controllers/authController.js && node --check backend/controllers/bookController.js && node --check backend/controllers/userController.js && node --check backend/middleware/auth.js && node --check public/app.js && node --check scripts/smoke-test.mjs",
    "test:api": "node scripts/smoke-test.mjs"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.5",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.9.5"
  }
}
````


## `.env.example`

````dotenv
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/team_nexus_library
JWT_SECRET=change-this-to-a-long-random-secret-before-running
````


## `docker-compose.yml`

````yaml
services:
  mongodb:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "127.0.0.1:27017:27017"
    volumes:
      - mongo_data:/data/db
volumes:
  mongo_data:
````


## `backend/server.js`

````javascript
require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '25kb' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Team Nexus Mini Library' }));
app.use(express.static(path.resolve(__dirname, '../public')));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) return res.status(400).json({ message: 'Invalid JSON request body' });
  if (err.code === 11000) return res.status(409).json({ message: 'Duplicate record' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});
async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) throw new Error('Set JWT_SECRET to a long secret in .env');
  await connectDB();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Mini Library running at http://localhost:${port}`));
}
if (require.main === module) start().catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
module.exports = { app, start };
````


## `backend/config/db.js`

````javascript
const mongoose = require('mongoose');

async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error('Missing MONGO_URI in .env');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 6000 });
  console.log('MongoDB connected');
}
module.exports = connectDB;
````


## `backend/models/User.js`

````javascript
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
````


## `backend/models/Book.js`

````javascript
const mongoose = require('mongoose');
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  author: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, default: 'General', trim: true, maxlength: 60 },
  status: { type: String, enum: ['Available', 'Borrowed'], default: 'Available' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Book', bookSchema);
````


## `backend/middleware/auth.js`

````javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Account no longer exists' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
}
module.exports = { requireAuth, adminOnly };
````


## `backend/controllers/authController.js`

````javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const makeToken = (user) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '8h' });
const safeUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role });
exports.register = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Name, valid email and password (8+ characters) required' });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: 'Email is already registered' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    return res.status(201).json({ token: makeToken(user), user: safeUser(user) });
  } catch (error) { next(error); }
};
exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || typeof req.body.password !== 'string' || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }
    return res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (error) { next(error); }
};
````


## `backend/controllers/userController.js`

````javascript
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Book = require('../models/Book');
const present = user => ({ id: user._id, name: user.name, email: user.email, role: user.role });
exports.me = (req, res) => res.json({ user: present(req.user) });
exports.updateMe = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'Valid name required' });
      req.user.name = name.trim();
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'Password must be 8+ characters' });
      req.user.passwordHash = await bcrypt.hash(password, 10);
    }
    await req.user.save();
    res.json({ user: present(req.user) });
  } catch (error) { next(error); }
};
exports.deleteMe = async (req, res, next) => {
  try {
    await Book.deleteMany({ createdBy: req.user._id });
    await User.deleteOne({ _id: req.user._id });
    res.json({ message: 'Account and associated books deleted' });
  } catch (error) { next(error); }
};
exports.allUsers = async (req, res, next) => {
  try { res.json(await User.find().select('name email role createdAt')); }
  catch (error) { next(error); }
};
````


## `backend/controllers/bookController.js`

````javascript
const mongoose = require('mongoose');
const Book = require('../models/Book');
function filterFor(req, id) {
  const filter = { _id: id };
  if (req.user.role !== 'admin') filter.createdBy = req.user._id;
  return filter;
}
function validId(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid book ID' });
    return false;
  }
  return true;
}
exports.list = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    res.json(await Book.find(filter).sort({ createdAt: -1 }));
  } catch (error) { next(error); }
};
exports.getOne = async (req, res, next) => {
  try {
    if (!validId(req, res)) return;
    const book = await Book.findOne(filterFor(req, req.params.id));
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const author = String(req.body.author || '').trim();
    const category = req.body.category === undefined ? 'General' : req.body.category;
    const status = req.body.status || 'Available';
    if (!title || !author || typeof category !== 'string' || !['Available','Borrowed'].includes(status)) {
      return res.status(400).json({ message: 'Title, author and valid status required' });
    }
    const book = await Book.create({ title, author, category, status, createdBy: req.user._id });
    res.status(201).json(book);
  } catch (error) { next(error); }
};
exports.update = async (req, res, next) => {
  try {
    if (!validId(req, res)) return;
    const changes = {};
    for (const field of ['title','author','category','status']) {
      if (req.body[field] !== undefined) changes[field] = req.body[field];
    }
    if ((changes.title !== undefined && (typeof changes.title !== 'string' || !changes.title.trim())) ||
        (changes.author !== undefined && (typeof changes.author !== 'string' || !changes.author.trim())) ||
        (changes.category !== undefined && typeof changes.category !== 'string') ||
        (changes.status !== undefined && !['Available','Borrowed'].includes(changes.status))) {
      return res.status(400).json({ message: 'Invalid book details' });
    }
    const book = await Book.findOneAndUpdate(filterFor(req, req.params.id), changes, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (error) { next(error); }
};
exports.remove = async (req, res, next) => {
  try {
    if (!validId(req, res)) return;
    const book = await Book.findOneAndDelete(filterFor(req, req.params.id));
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json({ message: 'Book deleted' });
  } catch (error) { next(error); }
};
````


## `backend/routes/authRoutes.js`

````javascript
const router = require('express').Router();
const controller = require('../controllers/authController');
router.post('/register', controller.register);
router.post('/login', controller.login);
module.exports = router;
````


## `backend/routes/userRoutes.js`

````javascript
const router = require('express').Router();
const c = require('../controllers/userController');
const { requireAuth, adminOnly } = require('../middleware/auth');
router.use(requireAuth);
router.get('/me', c.me);
router.put('/me', c.updateMe);
router.delete('/me', c.deleteMe);
router.get('/', adminOnly, c.allUsers);
module.exports = router;
````


## `backend/routes/bookRoutes.js`

````javascript
const router = require('express').Router();
const c = require('../controllers/bookController');
const { requireAuth } = require('../middleware/auth');
router.use(requireAuth);
router.route('/').get(c.list).post(c.create);
router.route('/:id').get(c.getOne).put(c.update).delete(c.remove);
module.exports = router;
````


## `public/index.html`

````html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Team Nexus | Mini Library</title><link rel="stylesheet" href="/style.css"></head>
<body><header><div class="brand"><img class="brand-image" src="/logo.png" alt="Team Nexus logo"><div><b>Team Nexus</b><small>Mini Library</small></div></div><div id="profile" hidden><span id="username"></span><button class="ghost" id="logout">Log out</button></div></header>
<main><section id="auth-view" class="auth-card"><div class="eyebrow">FIRST RELEASE DEMO</div><h1 id="auth-title">Welcome back</h1><p>Sign in to manage your own books.</p><form id="auth-form"><label id="name-wrap" hidden>Full name<input id="name" autocomplete="name" placeholder="Your name"></label><label>Email<input id="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>Password<input id="password" type="password" autocomplete="current-password" minlength="8" required placeholder="At least 8 characters"></label><button class="primary" type="submit" id="auth-submit">Log in</button></form><p class="toggle"><span id="toggle-hint">No account yet?</span> <button class="link" id="toggle-auth">Create one</button></p></section>
<section id="books-view" hidden><div class="page-head"><div><div class="eyebrow">YOUR COLLECTION</div><h1>My Library</h1><p>Add, view, update and delete books.</p></div><button class="primary" id="add-book">+ Add book</button></div><div class="stats"><div><small>Total books</small><strong id="total">0</strong></div><div><small>Available</small><strong id="available">0</strong></div><div><small>Borrowed</small><strong id="borrowed">0</strong></div></div><div id="empty" class="empty">No books yet. Select <b>Add book</b> to create your first one.</div><div class="table-wrap" id="table-wrap" hidden><table><thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead><tbody id="book-rows"></tbody></table></div></section>
<div class="notice" id="notice" role="status" aria-live="polite" hidden></div>
<dialog id="book-dialog"><form id="book-form"><div class="dialog-head"><h2 id="book-form-title">Add a book</h2><button type="button" class="link" id="cancel">✕</button></div><label>Book title<input id="book-title" required maxlength="150" placeholder="e.g. Clean Code"></label><label>Author<input id="book-author" required maxlength="120" placeholder="e.g. Robert C. Martin"></label><label>Category<input id="book-category" maxlength="60" placeholder="e.g. Technology"></label><label>Status<select id="book-status"><option>Available</option><option>Borrowed</option></select></label><button class="primary" type="submit" id="save-book">Save book</button></form></dialog>
</main><footer>Team Nexus · Educational first-release demonstration</footer><script src="/app.js"></script></body></html>
````


## `public/style.css`

````css
[hidden]{display:none !important}
:root{font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#192849;background:#f5f8fd}*{box-sizing:border-box}body{margin:0}header{height:76px;background:#fff;border-bottom:1px solid #e2e9f3;display:flex;align-items:center;justify-content:space-between;padding:0 max(28px,calc((100vw - 1100px)/2))}.brand{display:flex;align-items:center;gap:12px;font-size:18px}.brandmark{display:grid;place-items:center;width:43px;height:43px;border-radius:13px;background:#eaf3ff;font-size:24px}.brand small{display:block;font-size:12px;color:#728098;font-weight:500}main{max-width:1100px;margin:0 auto;padding:48px 26px 80px}h1{font-size:36px;letter-spacing:-1px;margin:8px 0}h2{margin:0}p{color:#758199;line-height:1.5}button{cursor:pointer;font-weight:650;font-family:inherit}button:focus-visible,input:focus,select:focus{outline:3px solid #b0d8ff}.primary{border:0;border-radius:10px;background:#156cda;color:white;padding:13px 22px;font-size:15px}.primary:hover{background:#0955ae}.ghost{background:#eff4fb;color:#1a3971;border:0;border-radius:8px;padding:10px 15px;margin-left:15px}.link{border:0;background:none;color:#156cda;padding:4px}.auth-card{max-width:425px;margin:38px auto;background:#fff;padding:38px;border:1px solid #e5ebf3;border-radius:20px;box-shadow:0 18px 50px rgba(30,60,100,.06)}.auth-card h1{font-size:32px}.auth-card form{display:grid;gap:18px;margin:24px 0}.eyebrow{color:#0874c5;font-size:11px;font-weight:800;letter-spacing:2.5px}label{font-size:13px;font-weight:700;display:grid;gap:7px}input,select{border:1px solid #d9e3ef;border-radius:9px;padding:13px;font-size:15px;width:100%;background:white}.toggle{font-size:14px;text-align:center}.page-head{display:flex;justify-content:space-between;align-items:center;gap:25px;margin-bottom:28px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:30px}.stats>div{background:#fff;border:1px solid #e5ebf3;border-radius:14px;padding:22px 25px}.stats small{display:block;color:#718099;font-weight:650}.stats strong{display:block;font-size:32px;margin-top:6px}.table-wrap{overflow:auto;background:white;border:1px solid #e5ebf3;border-radius:15px}table{border-collapse:collapse;width:100%;text-align:left}th,td{padding:19px;border-bottom:1px solid #eaf0f6;font-size:14px}th{font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:#73839b;background:#fafdff}tr:last-child td{border-bottom:0}.pill{display:inline-block;padding:6px 10px;border-radius:25px;background:#e2f5e9;color:#12623e;font-size:12px;font-weight:700}.pill.borrowed{background:#fff2d7;color:#996010}.action{border:1px solid #dce7f4;background:#fff;padding:8px 11px;border-radius:7px;margin-right:6px;color:#165db4}.action.danger{color:#ba3441}.empty{text-align:center;padding:60px 25px;color:#708099;background:white;border:1px dashed #c9d8ea;border-radius:15px}.notice{position:fixed;bottom:24px;right:24px;padding:14px 19px;border-radius:10px;background:#18345d;color:white;max-width:400px;box-shadow:0 8px 25px #0002}dialog{border:1px solid #d8e3ef;border-radius:17px;padding:30px;width:min(430px,calc(100vw - 32px));box-shadow:0 20px 70px #11294c44}dialog::backdrop{background:#18233b88}dialog form{display:grid;gap:18px}.dialog-head{display:flex;align-items:center;justify-content:space-between}footer{text-align:center;color:#94a2b3;padding:25px;font-size:12px}@media(max-width:600px){main{padding:25px 16px}header{padding:0 16px}.stats{gap:8px}.stats>div{padding:15px}.stats strong{font-size:26px}.page-head{align-items:flex-start;flex-direction:column}.auth-card{margin:20px auto;padding:25px}}

.brand-image{width:48px;height:48px;object-fit:contain;border-radius:9px}
````


## `public/app.js`

````javascript
const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem('tn_token') || '';
let currentUser = null;
let books = [];
let editingId = null;
let registerMode = false;
async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  let payload;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) throw Error(payload.message || `Request failed: ${response.status}`);
  return payload;
}
function notice(message) {
  $('notice').textContent = message;
  $('notice').hidden = false;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => $('notice').hidden = true, 3500);
}
function showAuth() {
  $('auth-view').hidden = false;
  $('books-view').hidden = true;
  $('profile').hidden = true;
}
function showLibrary() {
  $('auth-view').hidden = true;
  $('books-view').hidden = false;
  $('profile').hidden = false;
  $('username').textContent = currentUser.name;
}
function logout() {
  sessionStorage.removeItem('tn_token'); token = ''; currentUser = null; books = [];
  showAuth();
}
function setRegisterMode(enabled) {
  registerMode = enabled;
  $('auth-title').textContent = enabled ? 'Create an account' : 'Welcome back';
  $('auth-submit').textContent = enabled ? 'Register' : 'Log in';
  $('name-wrap').hidden = !enabled;
  $('name').required = enabled;
  $('toggle-hint').textContent = enabled ? 'Already have an account?' : 'No account yet?';
  $('toggle-auth').textContent = enabled ? 'Log in' : 'Create one';
}
$('toggle-auth').addEventListener('click', () => setRegisterMode(!registerMode));
$('logout').addEventListener('click', logout);
$('auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = { email: $('email').value, password: $('password').value };
    if (registerMode) data.name = $('name').value;
    const result = await api(`/api/auth/${registerMode ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(data) });
    token = result.token;
    sessionStorage.setItem('tn_token', token);
    currentUser = result.user;
    $('auth-form').reset();
    showLibrary(); await loadBooks(); notice('Signed in successfully');
  } catch (error) { notice(error.message); }
});
function cell(row, text) { const td = document.createElement('td'); td.textContent = text; row.appendChild(td); return td; }
function renderBooks() {
  $('total').textContent = books.length;
  $('available').textContent = books.filter(b => b.status === 'Available').length;
  $('borrowed').textContent = books.filter(b => b.status === 'Borrowed').length;
  $('empty').hidden = books.length > 0;
  $('table-wrap').hidden = books.length === 0;
  $('book-rows').replaceChildren();
  for (const book of books) {
    const tr = document.createElement('tr');
    cell(tr, book.title); cell(tr, book.author); cell(tr, book.category || 'General');
    const statusTd = document.createElement('td');
    const pill = document.createElement('span'); pill.className = `pill ${book.status === 'Borrowed' ? 'borrowed' : ''}`;
    pill.textContent = book.status;
    statusTd.appendChild(pill); tr.appendChild(statusTd);
    const actions = document.createElement('td');
    const edit = document.createElement('button'); edit.textContent = 'Edit'; edit.className = 'action';
    edit.onclick = () => openBookDialog(book);
    const del = document.createElement('button'); del.textContent = 'Delete'; del.className = 'action danger';
    del.onclick = () => deleteBook(book._id, book.title);
    actions.append(edit, del); tr.appendChild(actions); $('book-rows').appendChild(tr);
  }
}
async function loadBooks() { try { books = await api('/api/books'); renderBooks(); } catch(error) { notice(error.message); } }
function openBookDialog(book = null) {
  editingId = book?._id || null;
  $('book-form-title').textContent = book ? 'Edit book' : 'Add a book';
  $('book-title').value = book?.title || '';
  $('book-author').value = book?.author || '';
  $('book-category').value = book?.category || '';
  $('book-status').value = book?.status || 'Available';
  $('book-dialog').showModal();
}
$('add-book').addEventListener('click', () => openBookDialog());
$('cancel').addEventListener('click', () => $('book-dialog').close());
$('book-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = { title: $('book-title').value, author: $('book-author').value,
    category: $('book-category').value || 'General', status: $('book-status').value };
  try {
    await api(editingId ? `/api/books/${editingId}` : '/api/books', {
      method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload)
    });
    $('book-dialog').close(); await loadBooks(); notice(editingId ? 'Book updated' : 'Book added');
  } catch(error) { notice(error.message); }
});
async function deleteBook(id, title) {
  if (!confirm(`Delete “${title}”?`)) return;
  try { await api(`/api/books/${id}`, { method: 'DELETE' }); await loadBooks(); notice('Book deleted'); }
  catch(error) { notice(error.message); }
}
(async function boot() {
  if (!token) return showAuth();
  try { const result = await api('/api/users/me'); currentUser = result.user; showLibrary(); await loadBooks(); }
  catch { logout(); }
})();
````


## `scripts/smoke-test.mjs`

````javascript
/**
 * End-to-end API verification. Run while the app AND MongoDB are running.
 * node scripts/smoke-test.mjs
 * Uses a unique demo email and cleans up the test accounts.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const unique = crypto.randomBytes(5).toString('hex');
const email = `smoke.${unique}@example.com`;
const email2 = `smoke.second.${unique}@example.com`;
const pwd = 'DemoPassword123!';

async function request(method, route, body, token, expectedStatus) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  if (token) options.headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + route, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (expectedStatus !== undefined) {
    assert.equal(res.status, expectedStatus,
      `${method} ${route}: expected ${expectedStatus}, got ${res.status}. ${text}`);
  }
  console.log(`${method.padEnd(6)} ${String(res.status).padEnd(3)} ${route}`);
  return { status: res.status, data };
}

let token = null;
let token2 = null;
try {
  await request('GET', '/api/health', undefined, undefined, 200);
  await request('GET', '/api/books', undefined, undefined, 401);
  const created = await request('POST', '/api/auth/register',
    { name: 'Solo Student', email, password: pwd }, undefined, 201);
  token = created.data.token;
  assert.ok(token);
  assert.equal(created.data.user.role, 'user');
  await request('POST', '/api/auth/register',
    { name: 'Solo Student', email, password: pwd }, undefined, 409);
  await request('POST', '/api/auth/login',
    { email, password: 'wrongPassword123' }, undefined, 401);
  const logged = await request('POST', '/api/auth/login',
    { email, password: pwd }, undefined, 200);
  token = logged.data.token;
  await request('GET', '/api/users/me', undefined, token, 200);
  await request('GET', '/api/users', undefined, token, 403); // user != admin
  await request('PUT', '/api/users/me', { name: 'Updated Solo Student' }, token, 200);
  const second = await request('POST', '/api/auth/register',
    { name: 'Other Student', email: email2, password: pwd }, undefined, 201);
  token2 = second.data.token;
  const added = await request('POST', '/api/books',
    { title: 'Clean Code', author: 'Robert C. Martin', category: 'Technology', status: 'Available' }, token, 201);
  const id = added.data._id;
  assert.ok(id);
  const listed = await request('GET', '/api/books', undefined, token, 200);
  assert.ok(listed.data.some(b => b._id === id));
  const mine = await request('GET', `/api/books/${id}`, undefined, token, 200);
  assert.equal(mine.data.title, 'Clean Code');
  await request('GET', `/api/books/${id}`, undefined, token2, 404); // owner protection
  await request('PUT', `/api/books/${id}`, { status: 'Borrowed' }, token2, 404);
  await request('DELETE', `/api/books/${id}`, undefined, token2, 404);
  const changed = await request('PUT', `/api/books/${id}`,
    { status: 'Borrowed', title: 'Clean Code - Revised' }, token, 200);
  assert.equal(changed.data.status, 'Borrowed');
  await request('DELETE', `/api/books/${id}`, undefined, token, 200);
  await request('GET', `/api/books/${id}`, undefined, token, 404);
  await request('DELETE', '/api/users/me', undefined, token, 200);
  token = null;
  await request('DELETE', '/api/users/me', undefined, token2, 200);
  token2 = null;
  console.log('\nPASS: authentication, authorization, user API, book CRUD and validation cases.');
} catch (err) {
  console.error('\nFAIL:', err.message);
  process.exitCode = 1;
} finally {
  // In a failed run, try to clean up created test users.
  for (const t of [token, token2]) {
    if (t) try { await request('DELETE', '/api/users/me', undefined, t); } catch {}
  }
}
````
