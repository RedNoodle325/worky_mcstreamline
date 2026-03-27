// ── API Client ────────────────────────────────────────────────────────────
const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const method  = (options.method || 'GET').toUpperCase();
  const isWrite = method !== 'GET';

  if (isWrite && !isAuthenticated()) {
    showLoginPage('Your session has expired. Please sign in again.');
    throw new Error('Authentication required');
  }

  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (isAuthenticated()) headers['Authorization'] = 'Bearer ' + getAuthToken();

  const url = API_BASE + path;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    showLoginPage('Your session has expired. Please sign in again.');
    throw new Error('Authentication required');
  }
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
    importCsv: (siteId, formData) => fetch(API_BASE + `/sites/${siteId}/units/import`, { method: 'POST', body: formData }).then(async r => {
      if (!r.ok) { const e = await r.json().catch(() => ({ error: r.statusText })); throw new Error(e.error || `HTTP ${r.status}`); }
      return r.json();
    }),
    bulkCommission: (siteId, updates) => apiFetch(`/sites/${siteId}/units/commission-bulk`, { method: 'PUT', body: JSON.stringify({ updates }) }),
    setOperationalStatus: (unitId, status) => apiFetch(`/units/${unitId}/operational-status`, { method: 'PUT', body: JSON.stringify({ operational_status: status }) }),
  },

  // Tickets
  tickets: {
    list: (params = {}) => apiFetch('/tickets?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/tickets/${id}`),
    create: (data) => apiFetch('/tickets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/tickets/${id}`, { method: 'DELETE' }),
    importCxAlloy: (siteId, issues) => apiFetch(`/sites/${siteId}/issues/import-cxalloy`, { method: 'POST', body: JSON.stringify({ issues }) }),
  },

  // Issues (commissioning issues)
  issues: {
    listAll:    ()              => apiFetch('/issues'),
    listSite:   (siteId)       => apiFetch(`/sites/${siteId}/issues`),
    listUnit:   (unitId)       => apiFetch(`/units/${unitId}/issues`),
    create:     (siteId, data) => apiFetch(`/sites/${siteId}/issues`, { method: 'POST', body: JSON.stringify(data) }),
    update:     (id, data)     => apiFetch(`/issues/${id}`, { method: 'PUT',  body: JSON.stringify(data) }),
    delete:     (id)           => apiFetch(`/issues/${id}`, { method: 'DELETE' }),
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
    upload: async (siteId, formData) => {
      if (!isAuthenticated()) { showLoginPage('Session expired'); throw new Error('Authentication required'); }
      const r = await fetch(API_BASE + `/sites/${siteId}/logo`, { method: 'POST', body: formData, headers: { 'Authorization': 'Bearer ' + getAuthToken() } });
      if (!r.ok) { const e = await r.json().catch(() => ({ error: r.statusText })); throw new Error(e.error); }
      return r.json();
    },
  },

  // Site documents (submittals, BOMs, photos)
  documents: {
    list:   (siteId)        => apiFetch(`/sites/${siteId}/documents`),
    upload: async (siteId, fd) => {
      if (!isAuthenticated()) { showLoginPage('Session expired'); throw new Error('Authentication required'); }
      const r = await fetch(API_BASE + `/sites/${siteId}/documents`, { method: 'POST', body: fd, headers: { 'Authorization': 'Bearer ' + getAuthToken() } });
      if (!r.ok) { const e = await r.json().catch(() => ({ error: r.statusText })); throw new Error(e.error || `HTTP ${r.status}`); }
      return r.json();
    },
    delete: (siteId, docId) => apiFetch(`/sites/${siteId}/documents/${docId}`, { method: 'DELETE' }),
  },

  // Campaigns
  campaigns: {
    list:      (siteId)           => apiFetch(`/sites/${siteId}/campaigns`),
    create:    (siteId, data)     => apiFetch(`/sites/${siteId}/campaigns`,        { method: 'POST',   body: JSON.stringify(data) }),
    update:    (siteId, id, data) => apiFetch(`/sites/${siteId}/campaigns/${id}`,  { method: 'PUT',    body: JSON.stringify(data) }),
    delete:    (siteId, id)       => apiFetch(`/sites/${siteId}/campaigns/${id}`,  { method: 'DELETE' }),
    getStatus: (campaignId)       => apiFetch(`/campaigns/${campaignId}/status`),
    setStatus: (campaignId, data) => apiFetch(`/campaigns/${campaignId}/status`,   { method: 'PUT',    body: JSON.stringify(data) }),
  },

  // Unit programs
  unit_programs: {
    list:   (unitId)           => apiFetch(`/units/${unitId}/programs`),
    create: (unitId, data)     => apiFetch(`/units/${unitId}/programs`,            { method: 'POST',   body: JSON.stringify(data) }),
    update: (unitId, id, data) => apiFetch(`/units/${unitId}/programs/${id}`,      { method: 'PUT',    body: JSON.stringify(data) }),
    delete: (unitId, id)       => apiFetch(`/units/${unitId}/programs/${id}`,      { method: 'DELETE' }),
  },

  // SyCool systems
  sycool_systems: {
    list:   (siteId)       => apiFetch(`/sites/${siteId}/systems`),
    get:    (id)           => apiFetch(`/systems/${id}`),
    create: (siteId, data) => apiFetch(`/sites/${siteId}/systems`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data)     => apiFetch(`/systems/${id}`, { method: 'PUT',  body: JSON.stringify(data) }),
    delete: (id)           => apiFetch(`/systems/${id}`, { method: 'DELETE' }),
  },

  // Warranty
  warranty: {
    list: () => apiFetch('/warranty'),
    get: (id) => apiFetch(`/warranty/${id}`),
    create: (data) => apiFetch('/warranty', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/warranty/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/warranty/${id}`, { method: 'DELETE' }),
  },

  // Service tickets (CS tickets)
  service_tickets: {
    listAll: ()            => apiFetch(`/service-tickets`),
    list:   (siteId)       => apiFetch(`/sites/${siteId}/service-tickets`),
    get:    (id)           => apiFetch(`/service-tickets/${id}`),
    create: (siteId, data) => apiFetch(`/sites/${siteId}/service-tickets`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data)     => apiFetch(`/service-tickets/${id}`, { method: 'PUT',  body: JSON.stringify(data) }),
    delete: (id)           => apiFetch(`/service-tickets/${id}`, { method: 'DELETE' }),
  },

  // Issue ↔ service-line links
  issueLineLinks: {
    listAll:    ()              => apiFetch('/issue-line-links'),
    listTicket: (ticketId)      => apiFetch(`/service-tickets/${ticketId}/line-links`),
    create:     (ticketId, data)=> apiFetch(`/service-tickets/${ticketId}/line-links`, { method: 'POST', body: JSON.stringify(data) }),
    bulkLink:   (ticketId, data)=> apiFetch(`/service-tickets/${ticketId}/line-links/bulk`, { method: 'POST', body: JSON.stringify(data) }),
    delete:     (ticketId, linkId) => apiFetch(`/service-tickets/${ticketId}/line-links/${linkId}`, { method: 'DELETE' }),
  },

  // Todos
  todos: {
    list:   (params = {}) => apiFetch('/todos?' + new URLSearchParams(params)),
    create: (data)        => apiFetch('/todos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data)    => apiFetch(`/todos/${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
    delete: (id)          => apiFetch(`/todos/${id}`, { method: 'DELETE' }),
  },

  // Notes
  notes: {
    listSite:   (siteId)       => apiFetch(`/sites/${siteId}/notes`),
    listUnit:   (unitId)       => apiFetch(`/units/${unitId}/notes`),
    search:     (params = {})  => apiFetch('/notes/search?' + new URLSearchParams(params)),
    createSite: (siteId, data) => apiFetch(`/sites/${siteId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
    createUnit: (unitId, data) => apiFetch(`/units/${unitId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
    update:     (id, data)     => apiFetch(`/notes/${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
    delete:     (id)           => apiFetch(`/notes/${id}`, { method: 'DELETE' }),
  },

  // Material history
  materials: {
    list:   (unitId)           => apiFetch(`/units/${unitId}/materials`),
    create: (unitId, data)     => apiFetch(`/units/${unitId}/materials`,          { method: 'POST',   body: JSON.stringify(data) }),
    update: (unitId, id, data) => apiFetch(`/units/${unitId}/materials/${id}`,    { method: 'PUT',    body: JSON.stringify(data) }),
    delete: (unitId, id)       => apiFetch(`/units/${unitId}/materials/${id}`,    { method: 'DELETE' }),
  },

  // Technicians
  technicians: {
    list:   ()          => apiFetch('/technicians'),
    create: (data)      => apiFetch('/technicians',      { method: 'POST',   body: JSON.stringify(data) }),
    update: (id, data)  => apiFetch(`/technicians/${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
    delete: (id)        => apiFetch(`/technicians/${id}`, { method: 'DELETE' }),
  },

  // Job Schedule / Dispatch
  schedule: {
    listJobs:    ()                    => apiFetch('/job-schedule'),
    createJob:   (data)                => apiFetch('/job-schedule',                                { method: 'POST',   body: JSON.stringify(data) }),
    updateJob:   (id, data)            => apiFetch(`/job-schedule/${id}`,                          { method: 'PUT',    body: JSON.stringify(data) }),
    deleteJob:   (id)                  => apiFetch(`/job-schedule/${id}`,                          { method: 'DELETE' }),
    listJobTechs: (jobId)              => apiFetch(`/job-schedule/${jobId}/techs`),
    assignTech:  (jobId, technicianId) => apiFetch(`/job-schedule/${jobId}/techs`,                 { method: 'POST',   body: JSON.stringify({ technician_id: technicianId }) }),
    removeTech:  (jobId, techId)       => apiFetch(`/job-schedule/${jobId}/techs/${techId}`,       { method: 'DELETE' }),
    techsForSite: (siteId)             => apiFetch(`/dispatch/techs-for-site/${siteId}`),
  },

  // Users
  users: {
    list: () => apiFetch('/users'),
  },

  // MSOW drafts
  msow: {
    list:   (params = {}) => apiFetch('/msow-drafts?' + new URLSearchParams(params)),
    get:    (id)          => apiFetch(`/msow-drafts/${id}`),
    create: (data)        => apiFetch('/msow-drafts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data)    => apiFetch(`/msow-drafts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id)          => apiFetch(`/msow-drafts/${id}`, { method: 'DELETE' }),
  },

  // Unit components
  components: {
    list:   (unitId)           => apiFetch(`/units/${unitId}/components`),
    create: (unitId, data)     => apiFetch(`/units/${unitId}/components`,         { method: 'POST',   body: JSON.stringify(data) }),
    update: (unitId, id, data) => apiFetch(`/units/${unitId}/components/${id}`,   { method: 'PUT',    body: JSON.stringify(data) }),
    delete: (unitId, id)       => apiFetch(`/units/${unitId}/components/${id}`,   { method: 'DELETE' }),
    listUpdates:   (compId)           => apiFetch(`/components/${compId}/updates`),
    createUpdate:  (compId, data)     => apiFetch(`/components/${compId}/updates`,          { method: 'POST',   body: JSON.stringify(data) }),
    updateUpdate:  (compId, id, data) => apiFetch(`/components/${compId}/updates/${id}`,    { method: 'PUT',    body: JSON.stringify(data) }),
    deleteUpdate:  (compId, id)       => apiFetch(`/components/${compId}/updates/${id}`,    { method: 'DELETE' }),
  },
};
