async function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <div class="page-subtitle">Munters PM Overview</div>
      </div>
    </div>
    <div class="stat-grid" id="dash-stats">
      <div class="stat-card"><div class="stat-label">Open Tickets</div><div class="stat-value blue" id="s-open">…</div></div>
      <div class="stat-card"><div class="stat-label">Parts Ordered</div><div class="stat-value yellow" id="s-parts">…</div></div>
      <div class="stat-card"><div class="stat-label">Tech Dispatched</div><div class="stat-value" id="s-disp">…</div></div>
      <div class="stat-card"><div class="stat-label">Sites</div><div class="stat-value" id="s-sites">…</div></div>
      <div class="stat-card"><div class="stat-label">Units</div><div class="stat-value" id="s-units">…</div></div>
      <div class="stat-card"><div class="stat-label">Commissioning</div><div class="stat-value green" id="s-comm">…</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">Recent Tickets</div>
        <div id="dash-tickets"><div style="color:var(--text3);padding:12px 0">Loading…</div></div>
      </div>
      <div class="card">
        <div class="card-title">Commissioning Progress</div>
        <div id="dash-commissioning"><div style="color:var(--text3);padding:12px 0">Loading…</div></div>
      </div>
    </div>`;

  try {
    const [tickets, sites, units] = await Promise.all([
      API.tickets.list(),
      API.sites.list(),
      API.units.list(),
    ]);

    // Stats
    const open = tickets.filter(t => !['resolved','closed'].includes(t.status));
    document.getElementById('s-open').textContent = open.length;
    document.getElementById('s-parts').textContent = tickets.filter(t => t.parts_ordered && t.status !== 'closed').length;
    document.getElementById('s-disp').textContent = tickets.filter(t => t.tech_dispatched && t.status !== 'closed').length;
    document.getElementById('s-sites').textContent = sites.length;
    document.getElementById('s-units').textContent = units.length;
    document.getElementById('s-comm').textContent = units.filter(u => u.commission_level === 'complete' || u.commission_level === 'L5').length + ' done';

    // Recent tickets table
    const recent = tickets.slice(0, 8);
    document.getElementById('dash-tickets').innerHTML = recent.length === 0
      ? '<div style="color:var(--text3);padding:12px 0">No tickets</div>'
      : `<div class="table-wrap"><table>
          <thead><tr><th>Astea ID</th><th>Site</th><th>Status</th><th>Type</th></tr></thead>
          <tbody>${recent.map(t => `<tr>
            <td><a onclick="navigate('tickets')">${escHtml(t.astea_request_id || '—')}</a></td>
            <td>${escHtml(t.site_id || '—')}</td>
            <td>${statusBadge(t.status)}</td>
            <td><span class="badge badge-${t.ticket_type||'complaint'}">${escHtml(t.ticket_type||'complaint')}</span></td>
          </tr>`).join('')}</tbody>
        </table></div>`;

    // Commission summary
    const levels = ['none','L1','L2','L3','L4','L5','complete'];
    const grouped = {};
    levels.forEach(l => grouped[l] = 0);
    units.forEach(u => { const l = u.commission_level || 'none'; grouped[l] = (grouped[l]||0)+1; });
    document.getElementById('dash-commissioning').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
        ${levels.filter(l => grouped[l] > 0).map(l => `
          <div style="display:flex;align-items:center;gap:10px">
            ${commissionBadge(l)}
            <div style="flex:1;background:var(--bg3);border-radius:4px;height:8px">
              <div style="width:${Math.round(grouped[l]/units.length*100)||0}%;height:8px;background:var(--accent);border-radius:4px"></div>
            </div>
            <span style="color:var(--text3);font-size:12px;min-width:24px">${grouped[l]}</span>
          </div>`).join('')}
      </div>`;
  } catch (e) {
    toast('Failed to load dashboard: ' + e.message, 'error');
  }
}
