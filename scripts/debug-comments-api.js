/**
 * Debug script to check comments API responses.
 * Run: node scripts/debug-comments-api.js
 *
 * Set these env vars or edit below:
 *   SHARE_TOKEN - from client view URL /view/:token
 *   EVENT_ID - event UUID (from planner dashboard)
 *   PASSWORD - optional, for protected share links
 *   JWT - planner auth token (from localStorage after login) - needed for /api/events/:id/comments
 */

const BASE = process.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchSharedComments(token, password) {
  const url = new URL(`${BASE}/shared/${token}/comments`);
  if (password) url.searchParams.set('password', password);
  url.searchParams.set('_t', Date.now());
  console.log('\n--- GET /api/shared/:token/comments ---');
  console.log('URL:', url.toString());
  const res = await fetch(url.toString(), { headers: { 'Cache-Control': 'no-cache' } });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response body (raw):', text);
  try {
    const json = JSON.parse(text);
    console.log('Parsed data:', json?.data);
    console.log('Is array:', Array.isArray(json?.data));
    console.log('Count:', Array.isArray(json?.data) ? json.data.length : 0);
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

async function fetchEventComments(eventId, jwt) {
  const url = new URL(`${BASE}/events/${eventId}/comments`);
  url.searchParams.set('_t', Date.now());
  console.log('\n--- GET /api/events/:eventId/comments ---');
  console.log('URL:', url.toString());
  const headers = { 'Cache-Control': 'no-cache' };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  const res = await fetch(url.toString(), { headers });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response body (raw):', text);
  try {
    const json = JSON.parse(text);
    console.log('Parsed data:', json?.data);
    console.log('Is array:', Array.isArray(json?.data));
    console.log('Count:', Array.isArray(json?.data) ? json.data.length : 0);
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

async function main() {
  const token = process.env.SHARE_TOKEN;
  const eventId = process.env.EVENT_ID;
  const password = process.env.PASSWORD || null;
  const jwt = process.env.JWT || null;

  console.log('Debug Comments API');
  console.log('BASE:', BASE);
  console.log('SHARE_TOKEN:', token || '(not set)');
  console.log('EVENT_ID:', eventId || '(not set)');
  console.log('PASSWORD:', password ? '***' : '(none)');
  console.log('JWT:', jwt ? 'Bearer ***' : '(not set - events endpoint will 401)');

  if (token) {
    await fetchSharedComments(token, password);
  } else {
    console.log('\nSkipping shared comments (set SHARE_TOKEN)');
  }

  if (eventId) {
    await fetchEventComments(eventId, jwt);
  } else {
    console.log('\nSkipping event comments (set EVENT_ID)');
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
