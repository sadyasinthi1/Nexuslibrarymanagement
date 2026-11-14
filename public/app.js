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
