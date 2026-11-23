import { auth } from './firebase';
import { BACKEND_URL } from './config';

// Calls our backend with the staff member's login token. Throws an Error with a readable message.
export async function api(path, method = 'GET', body) {
  const user = auth.currentUser;
  if (!user) throw new Error('You are not logged in.');
  const token = await user.getIdToken();
  let res;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`Cannot reach the backend at ${BACKEND_URL}. Is it running? (CORS_ORIGINS must include this panel's address.)`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Server error (${res.status}).`);
  return data;
}
