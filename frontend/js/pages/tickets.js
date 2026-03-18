async function renderTickets(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Tickets</h1><div class="page-subtitle">Customer complaints &amp; service orders (Astea)</div></div>
      <button class="btn btn-primary" id="add-ticket-btn">+ New Ticket</button>
    </div>
    <div class="card">
      <div class="toolbar">
        <div class="search-bar"><input id="ticket-search" placeholder="Request ID, summary…"/></div>
        <select id="ticket-status-filter" style="width:150px">
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
          <option value="cs_ticket">CS Ticket</option>
          <option value="parts_order">Parts Order</option>
          <option value="service_line">Service Line</option>
        </select>
        <div class="toolbar-spacer"></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Request ID</th><th>Type</th><th>Summary</th><th>Site</th><th>Status</th><th>Opened</th><th>Actions</th>
          </tr></thead>
          <tbody id="tickets-body"><tr><td colspan="7" style="color:var(--text3)">Loading…</td></tr></tbody>
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

  const typeLabels = { cs_ticket: 'CS Ticket', parts_order: 'Parts Order', service_line: 'Service Line' };
  const typeBadgeStyle = {
    cs_ticket: 'background:#1e3a5f;color:#60a5fa',
    parts_order: 'background:#431407;color:#fb923c',
    service_line: 'background:#14532d;color:#4ade80',
  };

  function renderTable(data) {
    const tbody = document.getElementById('tickets-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text3)">No tickets</td></tr>'; return; }
    tbody.innerHTML = data.map(t => {
      const tStyle = typeBadgeStyle[t.ticket_type] || 'background:var(--bg3);color:var(--text2)';
      const summary = t.ticket_type === 'service_line' ? (t.scope || t.title || '—')
                    : t.ticket_type === 'parts_order' ? (t.unit_tag ? `Unit: ${t.unit_tag}` : t.title || '—')
                    : (t.description || t.title || '—');
      return `<tr>
        <td><a onclick="navigate('ticket-detail',{id:'${t.id}',backTo:'tickets'})" style="font-family:monospace;font-size:12px;cursor:pointer">${escHtml(t.astea_request_id || '—')}</a></td>
        <td><span class="badge" style="${tStyle}">${typeLabels[t.ticket_type]||t.ticket_type||'—'}</span></td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${escHtml(summary)}</td>
        <td style="font-size:12px">${escHtml(siteName(t.site_id))}</td>
        <td>${statusBadge(t.status)}</td>
        <td style="font-size:12px">${fmt(t.created_at)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-sm btn-primary" onclick="navigate('ticket-detail',{id:'${t.id}',backTo:'tickets'})">Open</button>
          <button class="btn btn-sm btn-secondary" onclick="deleteTicket('${t.id}')" style="margin-left:4px;color:var(--red)">✕</button>
        </td>
      </tr>`;
    }).join('');
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
