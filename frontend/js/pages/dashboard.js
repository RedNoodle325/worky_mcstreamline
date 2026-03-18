async function renderDashboard(container) {
  container.innerHTML = `
    <div class="dash-header">
      <div class="dash-header-logo">M</div>
      <div class="dash-header-title">MUNTERS PM DASHBOARD</div>
      <div class="dash-header-blocks">
        <span style="background:#e74c3c"></span>
        <span style="background:#2ecc71"></span>
        <span style="background:#3498db"></span>
        <span style="background:#f39c12"></span>
      </div>
    </div>

    <div id="dash-site-grids" class="dash-site-grids">
      <div style="color:var(--text3);padding:16px">Loading sites…</div>
    </div>

    <div class="dash-bottom">
      <div class="dash-bottom-left">
        <div id="dash-schedule-card" class="card" style="min-height:200px">
          <div style="color:var(--text3)">Loading schedule…</div>
        </div>
      </div>
      <div class="dash-bottom-right">
        <div style="display:flex;gap:14px;margin-bottom:14px">
          <div class="card" style="flex:1">
            <div class="card-title" style="margin-bottom:12px">Overall Progress</div>
            <div id="dash-progress"></div>
          </div>
          <div class="card" style="width:130px">
            <div class="card-title" style="margin-bottom:12px">Legend</div>
            <div class="dash-legend">
              <div class="dash-legend-row"><span class="unit-dot dot-none"></span> Not Started</div>
              <div class="dash-legend-row"><span class="unit-dot dot-progress"></span> In Progress</div>
              <div class="dash-legend-row"><span class="unit-dot dot-complete">✓</span> Complete</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div id="dash-issue-log"></div>
        </div>
      </div>
    </div>`;

  try {
    const [tickets, sites, units] = await Promise.all([
      API.tickets.list(),
      API.sites.list(),
      API.units.list(),
    ]);

    renderSiteGrids(sites, units);
    renderOverallProgress(units);
    renderIssueLog(tickets, sites, units);
    renderScheduleCard(sites, units);
  } catch (e) {
    toast('Failed to load dashboard: ' + e.message, 'error');
  }
}

function dotClass(level) {
  if (!level || level === 'none') return 'dot-none';
  if (level === 'complete') return 'dot-complete';
  return 'dot-progress';
}

function dotContent(level) {
  return level === 'complete' ? '✓' : '';
}

function renderSiteGrids(sites, units) {
  const el = document.getElementById('dash-site-grids');
  if (!sites.length) {
    el.innerHTML = '<div style="color:var(--text3);padding:16px">No sites found</div>';
    return;
  }

  // Layout: 3 per row
  const rows = [];
  for (let i = 0; i < sites.length; i += 3) rows.push(sites.slice(i, i + 3));

  el.innerHTML = rows.map(row => `
    <div class="dash-site-row">
      ${row.map(site => {
        const siteUnits = units.filter(u => u.site_id === site.id)
          .sort((a, b) => (a.line_number || 0) - (b.line_number || 0));
        const maxLine = siteUnits.length ? Math.max(...siteUnits.map(u => u.line_number || 1)) : 10;
        const cols = Math.max(maxLine, 10);
        const byLine = {};
        siteUnits.forEach(u => { byLine[u.line_number] = u; });

        const nums = Array.from({length: cols}, (_, i) => i + 1);

        // COIL: complete if L3+ or complete
        // PM: direct from commission_level
        const coilLevel = (u) => {
          const lvl = u?.commission_level;
          if (!lvl || lvl === 'none') return 'none';
          if (lvl === 'complete') return 'complete';
          const n = parseInt(lvl.replace('L',''));
          return n >= 3 ? 'complete' : 'progress';
        };

        return `
          <div class="dash-site-card">
            <div class="dash-site-name">${escHtml(site.name || site.project_name || '—')}</div>
            <div class="dash-unit-grid">
              <div class="dash-unit-header">
                <div class="dash-row-label"></div>
                ${nums.map(n => `<div class="dash-col-num">${n}</div>`).join('')}
              </div>
              <div class="dash-unit-row">
                <div class="dash-row-label">COIL</div>
                ${nums.map(n => {
                  const u = byLine[n];
                  const lvl = u ? coilLevel(u) : 'none';
                  return `<div class="unit-dot ${lvl === 'none' ? 'dot-none' : lvl === 'complete' ? 'dot-complete' : 'dot-progress'}">${lvl === 'complete' ? '✓' : ''}</div>`;
                }).join('')}
              </div>
              <div class="dash-unit-row">
                <div class="dash-row-label">PM</div>
                ${nums.map(n => {
                  const u = byLine[n];
                  const lvl = u?.commission_level || 'none';
                  return `<div class="unit-dot ${dotClass(lvl)}">${dotContent(lvl)}</div>`;
                }).join('')}
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`).join('');
}

function renderOverallProgress(units) {
  const total = units.length;
  const complete = units.filter(u => u.commission_level === 'complete').length;
  const inProgress = units.filter(u => u.commission_level && u.commission_level !== 'none' && u.commission_level !== 'complete').length;
  const notStarted = total - complete - inProgress;
  const pct = total ? Math.round(complete / total * 100) : 0;

  document.getElementById('dash-progress').innerHTML = `
    <table class="dash-progress-table">
      <thead>
        <tr><th>Item</th><th>Done</th><th>PCT</th></tr>
      </thead>
      <tbody>
        <tr class="dash-progress-section"><td colspan="3">PM Commissioning</td></tr>
        <tr><td style="padding-left:12px">Complete</td><td>${complete}</td><td>${pct}%</td></tr>
        <tr><td style="padding-left:12px">In Progress</td><td>${inProgress}</td><td>${total ? Math.round(inProgress/total*100) : 0}%</td></tr>
        <tr><td style="padding-left:12px">Not Started</td><td>${notStarted}</td><td>${total ? Math.round(notStarted/total*100) : 0}%</td></tr>
        <tr class="dash-progress-total"><td>Total Units</td><td>${total}</td><td>${pct}%</td></tr>
      </tbody>
    </table>`;
}

function renderIssueLog(tickets, sites, units) {
  const open = tickets.filter(t => t.status === 'open').length;
  const inProg = tickets.filter(t => ['parts_ordered','tech_dispatched','on_site'].includes(t.status)).length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;
  const closed = tickets.filter(t => t.status === 'closed').length;

  const siteMap = {};
  sites.forEach(s => { siteMap[s.id] = s.name || s.project_name || '—'; });
  const unitMap = {};
  units.forEach(u => { unitMap[u.id] = u; });

  const statusColor = {
    'open': '#e74c3c',
    'parts_ordered': '#f39c12',
    'tech_dispatched': '#9b59b6',
    'on_site': '#f39c12',
    'resolved': '#2ecc71',
    'closed': '#64748b',
  };

  const recent = tickets.slice(0, 20);

  document.getElementById('dash-issue-log').innerHTML = `
    <div class="card-title" style="margin-bottom:12px">Issue Log</div>
    <div class="dash-issue-summary">
      <div class="dash-issue-count" style="border-top:3px solid #e74c3c">
        <div class="dic-label">Open</div>
        <div class="dic-value" style="color:#e74c3c">${open}</div>
      </div>
      <div class="dash-issue-count" style="border-top:3px solid #f39c12">
        <div class="dic-label">In Progress</div>
        <div class="dic-value" style="color:#f39c12">${inProg}</div>
      </div>
      <div class="dash-issue-count" style="border-top:3px solid #2ecc71">
        <div class="dic-label">Resolved</div>
        <div class="dic-value" style="color:#2ecc71">${resolved}</div>
      </div>
      <div class="dash-issue-count" style="border-top:3px solid #64748b">
        <div class="dic-label">Closed</div>
        <div class="dic-value" style="color:#64748b">${closed}</div>
      </div>
    </div>
    ${recent.length === 0 ? '<div style="color:var(--text3);padding:12px 0">No issues logged</div>' : `
    <div class="table-wrap" style="margin-top:12px">
      <table class="dash-issue-table">
        <thead>
          <tr><th>#</th><th>Site</th><th>Unit</th><th>Description</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${recent.map((t, i) => {
            const u = unitMap[t.unit_id];
            const unitLabel = u ? serial(u) : (t.unit_id ? '—' : '—');
            const color = statusColor[t.status] || '#64748b';
            return `<tr>
              <td>${i + 1}</td>
              <td style="font-size:12px">${escHtml(siteMap[t.site_id] || '—')}</td>
              <td style="font-family:monospace;font-size:12px">${escHtml(unitLabel)}</td>
              <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.title || t.description || '—')}</td>
              <td><span class="dash-status-pill" style="background:${color}20;color:${color};border:1px solid ${color}40">${(t.status||'open').replace('_',' ')}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`}`;
}

function renderScheduleCard(sites, units) {
  // Build a simple "units by site" summary as a schedule-like table
  const el = document.getElementById('dash-schedule-card');

  const levelOrder = ['none','L1','L2','L3','L4','L5','complete'];
  const rows = sites.map(site => {
    const siteUnits = units.filter(u => u.site_id === site.id);
    const counts = {};
    levelOrder.forEach(l => counts[l] = 0);
    siteUnits.forEach(u => { counts[u.commission_level || 'none']++; });
    return { site, counts, total: siteUnits.length };
  });

  el.innerHTML = `
    <div class="card-title" style="margin-bottom:12px">Commissioning by Site</div>
    <div class="table-wrap">
      <table class="dash-schedule-table">
        <thead>
          <tr>
            <th>Site</th>
            <th>Units</th>
            ${levelOrder.map(l => `<th style="text-align:center">${l === 'none' ? '–' : l}</th>`).join('')}
            <th>% Done</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({site, counts, total}) => {
            const done = counts['complete'];
            const pct = total ? Math.round(done / total * 100) : 0;
            return `<tr>
              <td>${escHtml(site.name || site.project_name || '—')}</td>
              <td>${total}</td>
              ${levelOrder.map(l => `<td style="text-align:center;color:${counts[l]>0?'var(--text)':'var(--text3)'}">${counts[l] || '—'}</td>`).join('')}
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="flex:1;background:var(--bg3);border-radius:3px;height:6px">
                    <div style="width:${pct}%;height:6px;background:var(--green);border-radius:3px"></div>
                  </div>
                  <span style="font-size:11px;color:var(--text3);min-width:28px">${pct}%</span>
                </div>
              </td>
            </tr>`;
          }).join('')}
          ${rows.length === 0 ? '<tr><td colspan="10" style="color:var(--text3)">No sites</td></tr>' : ''}
        </tbody>
      </table>
    </div>`;
}
