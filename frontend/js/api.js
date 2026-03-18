// ── API Client ────────────────────────────────────────────────────────────
const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const url = API_BASE + path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const API = {
  // Sites
  sites: {
    list: () => apiFetch('/sites'),
    get: (id) => apiFetch(`/sites/${id}`),
    create: (data) => apiFetch('/sites', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/sites/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/sites/${id}`, { method: 'DELETE' }),
  },

  // Units
  units: {
    list: (params = {}) => apiFetch('/units?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/units/${id}`),
    create: (data) => apiFetch('/units', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/units/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/units/${id}`, { method: 'DELETE' }),
  },

  // Tickets
  tickets: {
    list: (params = {}) => apiFetch('/tickets?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/tickets/${id}`),
    create: (data) => apiFetch('/tickets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/tickets/${id}`, { method: 'DELETE' }),
  },

  // Commissioning
  commissioning: {
    get: (unitId) => apiFetch(`/units/${unitId}/commissioning`),
    updateLevel: (unitId, data) => apiFetch(`/units/${unitId}/commissioning/level`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Contractors
  contractors: {
    list: () => apiFetch('/contractors'),
    get: (id) => apiFetch(`/contractors/${id}`),
    create: (data) => apiFetch('/contractors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/contractors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/contractors/${id}`, { method: 'DELETE' }),
  },

  // BOM
  bom: {
    list: () => apiFetch('/bom'),
    getItems: (id) => apiFetch(`/bom/${id}/items`),
    import: (formData) => fetch(API_BASE + '/bom/import', { method: 'POST', body: formData }).then(r => r.json()),
    searchParts: (q) => apiFetch(`/parts/search?q=${encodeURIComponent(q)}`),
  },

  // Site job numbers
  site_job_numbers: {
    list: (siteId) => apiFetch(`/sites/${siteId}/job-numbers`),
    create: (siteId, data) => apiFetch(`/sites/${siteId}/job-numbers`, { method: 'POST', body: JSON.stringify(data) }),
    update: (siteId, id, data) => apiFetch(`/sites/${siteId}/job-numbers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (siteId, id) => apiFetch(`/sites/${siteId}/job-numbers/${id}`, { method: 'DELETE' }),
  },

  // Site contacts
  site_contacts: {
    list: (siteId) => apiFetch(`/sites/${siteId}/contacts`),
    create: (siteId, data) => apiFetch(`/sites/${siteId}/contacts`, { method: 'POST', body: JSON.stringify(data) }),
    update: (siteId, id, data) => apiFetch(`/sites/${siteId}/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (siteId, id) => apiFetch(`/sites/${siteId}/contacts/${id}`, { method: 'DELETE' }),
  },

  // Site form templates
  site_forms: {
    list: (siteId) => apiFetch(`/sites/${siteId}/forms`),
    create: (siteId, data) => apiFetch(`/sites/${siteId}/forms`, { method: 'POST', body: JSON.stringify(data) }),
    update: (siteId, id, data) => apiFetch(`/sites/${siteId}/forms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (siteId, id) => apiFetch(`/sites/${siteId}/forms/${id}`, { method: 'DELETE' }),
  },

  // Logo upload
  logo: {
    upload: (siteId, formData) => fetch(API_BASE + `/sites/${siteId}/logo`, { method: 'POST', body: formData }).then(async r => {
      if (!r.ok) { const e = await r.json().catch(() => ({ error: r.statusText })); throw new Error(e.error); }
      return r.json();
    }),
  },

  // Warranty
  warranty: {
    list: () => apiFetch('/warranty'),
    get: (id) => apiFetch(`/warranty/${id}`),
    create: (data) => apiFetch('/warranty', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/warranty/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/warranty/${id}`, { method: 'DELETE' }),
  },
};
