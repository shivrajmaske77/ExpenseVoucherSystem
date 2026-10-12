export async function api(path, { method = 'GET', body, form } = {}) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  const res = await fetch('/api' + path, { method, headers, body: payload });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.details = data.details || {};
    throw err;
  }
  return data;
}
