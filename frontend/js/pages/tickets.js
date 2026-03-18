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
      <td><a onclick="showTicketDetail('${t.id}')" style="font-family:monospace;font-size:12px">${escHtml(t.astea_request_id || '—')}</a></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.title || '—')}</td>
      <td>${escHtml(siteName(t.site_id))}</td>
      <td style="font-family:monospace;font-size:12px">${escHtml(unitSerial(t.unit_id))}</td>
      <td><span class="badge badge-${t.ticket_type||'complaint'}">${escHtml(t.ticket_type||'complaint')}</span></td>
      <td>${statusBadge(t.status)}</td>
      <td style="text-align:center">${t.parts_ordered ? '✓' : '—'}</td>
      <td style="text-align:center">${t.tech_dispatched ? '✓' : '—'}</td>
      <td style="font-size:12px">${fmt(t.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="showTicketDetail('${t.id}')">Detail</button>
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
  document.getElementById('add-ticket-btn').addEventListener('click', () => showTicketForm(null, sites, units, load));

  window.showTicketDetail = (id) => {
    const t = tickets.find(x => x.id === id);
    if (!t) return;
    openModal(`Ticket: ${t.astea_request_id || t.title}`, `
      <div class="grid-2" style="gap:12px">
        <div><div class="section-title">Astea Request ID</div>
          <div style="font-family:monospace;font-size:15px;color:var(--text)">${escHtml(t.astea_request_id || '—')}</div>
        </div>
        <div><div class="section-title">Line #</div><div style="color:var(--text2)">${t.ticket_line_number || 1}</div></div>
        <div><div class="section-title">Status</div>${statusBadge(t.status)}</div>
        <div><div class="section-title">Type</div><span class="badge badge-${t.ticket_type||'complaint'}">${t.ticket_type||'complaint'}</span></div>
        <div><div class="section-title">Reported By</div><div style="color:var(--text2)">${escHtml(t.reported_by_type||'—')}</div></div>
        <div><div class="section-title">Site</div><div style="color:var(--text2)">${escHtml(siteName(t.site_id))}</div></div>
        <div><div class="section-title">Unit</div><div style="font-family:monospace;color:var(--text2)">${escHtml(unitSerial(t.unit_id))}</div></div>
        <div><div class="section-title">Opened</div><div style="color:var(--text2)">${fmt(t.created_at)}</div></div>
        <div class="full"><div class="section-title">Description</div><div style="color:var(--text2);white-space:pre-wrap">${escHtml(t.description||'—')}</div></div>
        ${t.resolution ? `<div class="full"><div class="section-title">Resolution</div><div style="color:var(--text2);white-space:pre-wrap">${escHtml(t.resolution)}</div></div>` : ''}
        <div style="display:flex;gap:8px;align-items:center">
          <span style="color:var(--text2);font-size:12px">Parts Ordered:</span>
          <strong style="color:${t.parts_ordered?'var(--green)':'var(--text3)'}">${t.parts_ordered?'Yes':'No'}</strong>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="color:var(--text2);font-size:12px">Tech Dispatched:</span>
          <strong style="color:${t.tech_dispatched?'var(--green)':'var(--text3)'}">${t.tech_dispatched?'Yes':'No'}</strong>
        </div>
      </div>
      <div class="section-title" style="margin-top:16px">Quick Status Update</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
        ${['open','parts_ordered','tech_dispatched','on_site','resolved','closed'].map(s =>
          `<button class="btn btn-sm ${t.status===s?'btn-primary':'btn-secondary'}" onclick="setTicketStatus('${t.id}','${s}')">${s.replace('_',' ')}</button>`
        ).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-sm ${t.parts_ordered?'btn-success':'btn-secondary'}" onclick="toggleTicketFlag('${t.id}','parts_ordered',${!t.parts_ordered})">
          ${t.parts_ordered?'✓':''} Parts Ordered
        </button>
        <button class="btn btn-sm ${t.tech_dispatched?'btn-success':'btn-secondary'}" onclick="toggleTicketFlag('${t.id}','tech_dispatched',${!t.tech_dispatched})">
          ${t.tech_dispatched?'✓':''} Tech Dispatched
        </button>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="editCurrentTicket()">Edit</button>
      </div>`);

    window.editCurrentTicket = () => { showTicketForm(t, sites, units, load); closeModal(); };

    window.setTicketStatus = async (ticketId, status) => {
      try {
        await API.tickets.update(ticketId, { status });
        toast('Status updated to: ' + status);
        closeModal(); await load();
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };
    window.toggleTicketFlag = async (ticketId, field, value) => {
      try {
        await API.tickets.update(ticketId, { [field]: value });
        toast(`${field.replace('_',' ')} ${value?'marked':'cleared'}`);
        closeModal(); await load();
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };
  };

  window.showTicketForm = (t, s, u, cb) => showTicketFormImpl(t, s||sites, u||units, cb||load);

  await load();
}

function showTicketFormImpl(ticket, sites, units, onSave) {
  const editing = !!ticket?.id;
  openModal(editing ? 'Edit Ticket' : 'New Ticket', `
    <form id="ticket-form">
      <div class="form-grid">
        <div class="form-group"><label>Astea Request ID</label>
          <input name="astea_request_id" placeholder="CS260317XXXX@@1" value="${escHtml(ticket?.astea_request_id||'')}"/>
        </div>
        <div class="form-group"><label>Line Number</label>
          <input name="ticket_line_number" type="number" min="1" max="100" value="${ticket?.ticket_line_number||1}"/>
        </div>
        <div class="form-group"><label>Site *</label>
          <select name="site_id" required>
            <option value="">— Select Site —</option>
            ${sites.map(s => `<option value="${s.id}" ${s.id===ticket?.site_id?'selected':''}>${escHtml(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Unit (optional)</label>
          <select name="unit_id">
            <option value="">— No specific unit —</option>
            ${units.map(u => `<option value="${u.id}" ${u.id===ticket?.unit_id?'selected':''}>${escHtml(serial(u))} – ${escHtml(u.unit_type||'')}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Ticket Type</label>
          <select name="ticket_type">
            <option value="complaint" ${ticket?.ticket_type==='complaint'?'selected':''}>Complaint</option>
            <option value="service_order" ${ticket?.ticket_type==='service_order'?'selected':''}>Service Order</option>
            <option value="warranty" ${ticket?.ticket_type==='warranty'?'selected':''}>Warranty</option>
            <option value="pm" ${ticket?.ticket_type==='pm'?'selected':''}>Preventive Maintenance</option>
          </select>
        </div>
        <div class="form-group"><label>Reported By</label>
          <select name="reported_by_type">
            <option value="technician" ${ticket?.reported_by_type==='technician'?'selected':''}>Technician</option>
            <option value="site_representative" ${ticket?.reported_by_type==='site_representative'?'selected':''}>Site Representative</option>
            <option value="internal" ${ticket?.reported_by_type==='internal'?'selected':''}>Internal</option>
          </select>
        </div>
        <div class="form-group full"><label>Title *</label><input name="title" required value="${escHtml(ticket?.title||'')}"/></div>
        <div class="form-group full"><label>Description</label><textarea name="description">${escHtml(ticket?.description||'')}</textarea></div>
        ${editing ? `<div class="form-group full"><label>Resolution Notes</label><textarea name="resolution">${escHtml(ticket?.resolution||'')}</textarea></div>` : ''}
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save' : 'Open Ticket'}</button>
      </div>
    </form>`);

  document.getElementById('ticket-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.ticket_line_number = parseInt(data.ticket_line_number) || 1;
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      if (editing) await API.tickets.update(ticket.id, data);
      else await API.tickets.create(data);
      toast(editing ? 'Ticket updated' : 'Ticket opened');
      closeModal(); onSave();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
