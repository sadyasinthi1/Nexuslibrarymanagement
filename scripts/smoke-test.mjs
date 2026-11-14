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
