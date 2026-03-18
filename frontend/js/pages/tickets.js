async function renderTickets(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Tickets</h1><div class="page-subtitle">Customer complaints &amp; service orders (Astea)</div></div>
      <button class="btn btn-primary" id="add-ticket-btn">+ New Ticket</button>
    </div>
    <div class="card">
      <div class="toolbar">
        <div class="search-bar"><input id="ticket-search" placeholder="Astea ID, description…"/></div>
        <select id="ticket-status-filter" style="width:160px">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="parts_ordered">Parts Ordered</option>
          <option value="tech_dispatched">Tech Dispatched</option>
          <option value="on_site">On Site</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select id="ticket-type-filter" style="width:160px">
          <option value="">All Types</option>
          <option value="complaint">Complaint</option>
          <option value="warranty">Warranty</option>
          <option value="pm">PM</option>
          <option value="service_order">Service Order</option>
        </select>
        <div class="toolbar-spacer"></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Astea Request ID</th><th>Title</th><th>Site</th><th>Unit</th>
            <th>Type</th><th>Status</th><th>Parts</th><th>Tech</th><th>Opened</th><th>Actions</th>
          </tr></thead>
          <tbody id="tickets-body"><tr><td colspan="10" style="color:var(--text3)">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  let tickets = [], sites = [], units = [];

  async function load() {
    try {
      [tickets, sites, units] = await Promise.all([API.tickets.list(), API.sites.list(), API.units.list()]);
      renderTable(tickets);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  function siteName(id) { return sites.find(s => s.id === id)?.name || '—'; }
  function unitSerial(id) { const u = units.find(u => u.id === id); return u ? serial(u) : '—'; }

  function renderTable(data) {
    const tbody = document.getElementById('tickets-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="10" style="color:var(--text3)">No tickets</td></tr>'; return; }
    tbody.innerHTML = data.map(t => `<tr>
      <td><a onclick="navigate('ticket-detail',{id:'${t.id}',backTo:'tickets'})" style="font-family:monospace;font-size:12px;cursor:pointer">${escHtml(t.astea_request_id || '—')}</a></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.title || '—')}</td>
      <td>${escHtml(siteName(t.site_id))}</td>
      <td style="font-family:monospace;font-size:12px">${escHtml(unitSerial(t.unit_id))}</td>
      <td><span class="badge badge-${t.ticket_type||'complaint'}">${escHtml(t.ticket_type||'complaint')}</span></td>
      <td>${statusBadge(t.status)}</td>
      <td style="text-align:center">${t.parts_ordered ? '<span style="color:var(--green)">✓</span>' : '—'}</td>
      <td style="text-align:center">${t.tech_dispatched ? '<span style="color:var(--green)">✓</span>' : '—'}</td>
      <td style="font-size:12px">${fmt(t.created_at)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-primary" onclick="navigate('ticket-detail',{id:'${t.id}',backTo:'tickets'})">Open</button>
        <button class="btn btn-sm btn-secondary" onclick="deleteTicket('${t.id}')" style="margin-left:4px;color:var(--red)">Delete</button>
      </td>
    </tr>`).join('');
  }

  function filterTickets() {
    const q = document.getElementById('ticket-search').value.toLowerCase();
    const status = document.getElementById('ticket-status-filter').value;
    const type = document.getElementById('ticket-type-filter').value;
    renderTable(tickets.filter(t => {
      if (q && !(t.astea_request_id||'').toLowerCase().includes(q) && !(t.title||'').toLowerCase().includes(q) && !(t.description||'').toLowerCase().includes(q)) return false;
      if (status && t.status !== status) return false;
      if (type && t.ticket_type !== type) return false;
      return true;
    }));
  }

  document.getElementById('ticket-search').addEventListener('input', filterTickets);
  document.getElementById('ticket-status-filter').addEventListener('change', filterTickets);
  document.getElementById('ticket-type-filter').addEventListener('change', filterTickets);
  document.getElementById('add-ticket-btn').addEventListener('click', () => navigate('ticket-detail', { backTo: 'tickets' }));

  window.deleteTicket = async (id) => {
    if (!confirm('Delete this ticket? This cannot be undone.')) return;
    try { await API.tickets.delete(id); toast('Ticket deleted'); await load(); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  await load();
}
