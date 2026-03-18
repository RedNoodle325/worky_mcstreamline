async function printSiteReport(siteId) {
  let site, units, tickets;
  try {
    [site, units, tickets] = await Promise.all([
      API.sites.get(siteId),
      API.units.list(),
      API.tickets.list(),
    ]);
  } catch (e) {
    toast('Failed to load report data: ' + e.message, 'error');
    return;
  }

  const siteUnits = units
    .filter(u => u.site_id === siteId)
    .sort((a, b) => (a.line_number || 0) - (b.line_number || 0));

  const siteTickets = tickets.filter(t => t.site_id === siteId);
  const openTickets = siteTickets.filter(t => !['resolved', 'closed'].includes(t.status));

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const address = [site.address, site.city, site.state, site.zip_code].filter(Boolean).join(', ') || '—';

  // Commission level counts
  const levels = ['none', 'L1', 'L2', 'L3', 'L4', 'L5', 'complete'];
  const counts = {};
  levels.forEach(l => counts[l] = 0);
  siteUnits.forEach(u => { counts[u.commission_level || 'none']++; });
  const total = siteUnits.length;
  const done = counts['complete'];
  const pct = total ? Math.round(done / total * 100) : 0;

  // Unit grid — rows of 20
  const maxLine = siteUnits.length ? Math.max(...siteUnits.map(u => u.line_number || 1)) : 0;
  const byLine = {};
  siteUnits.forEach(u => { byLine[u.line_number] = u; });

  function coilLevel(u) {
    const lvl = u?.commission_level;
    if (!lvl || lvl === 'none') return 'none';
    if (lvl === 'complete') return 'complete';
    return parseInt(lvl.replace('L', '')) >= 3 ? 'complete' : 'progress';
  }

  function dotSvg(state) {
    if (state === 'complete') return `<div class="dot dot-green">✓</div>`;
    if (state === 'progress') return `<div class="dot dot-orange"></div>`;
    return `<div class="dot dot-empty"></div>`;
  }

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function unitGridHtml() {
    if (!maxLine) return '<p style="color:#888;font-size:12px">No units on record.</p>';
    const cols = maxLine;
    const nums = Array.from({ length: cols }, (_, i) => i + 1);
    return `
      <div class="unit-grid-wrap">
        <table class="unit-grid-table">
          <thead>
            <tr>
              <th class="row-label"></th>
              ${nums.map(n => `<th class="col-num">${n}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="row-label">COIL</td>
              ${nums.map(n => `<td>${dotSvg(byLine[n] ? coilLevel(byLine[n]) : 'none')}</td>`).join('')}
            </tr>
            <tr>
              <td class="row-label">PM</td>
              ${nums.map(n => {
                const u = byLine[n];
                const lvl = u?.commission_level || 'none';
                const state = lvl === 'complete' ? 'complete' : lvl === 'none' ? 'none' : 'progress';
                return `<td>${dotSvg(state)}</td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  const statusColors = {
    open: '#e74c3c',
    parts_ordered: '#f39c12',
    tech_dispatched: '#9b59b6',
    on_site: '#e67e22',
    resolved: '#27ae60',
    closed: '#95a5a6',
  };

  function issueRowsHtml() {
    if (!openTickets.length) return '<tr><td colspan="4" style="color:#888;text-align:center;padding:12px">No open issues</td></tr>';
    return openTickets.map((t, i) => {
      const color = statusColors[t.status] || '#888';
      const u = units.find(u => u.id === t.unit_id);
      const unitLabel = u ? (u.job_number && u.line_number != null ? `${u.job_number}-${u.line_number}` : u.serial_number || '—') : '—';
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(unitLabel)}</td>
        <td>${esc(t.title || t.description || '—')}</td>
        <td><span class="status-pill" style="background:${color}22;color:${color};border:1px solid ${color}55">${(t.status||'open').replace(/_/g,' ')}</span></td>
      </tr>`;
    }).join('');
  }

  const levelColors = { none:'#95a5a6', L1:'#3498db', L2:'#8e44ad', L3:'#c0392b', L4:'#e67e22', L5:'#27ae60', complete:'#27ae60' };
  const progressRowsHtml = levels.filter(l => counts[l] > 0 || l === 'complete').map(l => {
    const c = counts[l];
    const bar = total ? Math.round(c / total * 100) : 0;
    return `<tr>
      <td style="font-weight:600;color:${levelColors[l]}">${l === 'none' ? 'Not Started' : l === 'complete' ? 'Complete' : l}</td>
      <td style="text-align:right">${c}</td>
      <td style="width:120px">
        <div class="prog-bar"><div class="prog-fill" style="width:${bar}%;background:${levelColors[l]}"></div></div>
      </td>
      <td style="text-align:right;color:#888">${bar}%</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(site.name)} — Site Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }

  /* ── Header ── */
  .report-header {
    background: #1a2340; color: #fff;
    display: flex; align-items: center; gap: 16px;
    padding: 12px 20px;
  }
  .rh-logo {
    width: 32px; height: 32px; background: #2563eb; border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 16px;
  }
  .rh-title { flex: 1; font-size: 18px; font-weight: 800; letter-spacing: 0.06em; text-align: center; }
  .rh-date { font-size: 10px; color: #aab; text-align: right; white-space: nowrap; }
  .rh-blocks { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px; width: 28px; height: 28px; }
  .rh-blocks span { border-radius: 2px; }

  /* ── Body ── */
  .report-body { padding: 14px 20px; display: flex; flex-direction: column; gap: 12px; }

  /* ── Info + Progress row ── */
  .top-row { display: grid; grid-template-columns: 1fr 1fr 160px; gap: 12px; }
  .section { border: 1px solid #dde; border-radius: 6px; padding: 10px 12px; }
  .section-head {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
    color: #fff; background: #1a2340; margin: -10px -12px 8px; padding: 5px 12px; border-radius: 5px 5px 0 0;
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .info-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 1px; }
  .info-val { font-size: 11px; color: #1a1a2e; }

  /* ── Stats ── */
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .stat-box { background: #f5f7fa; border: 1px solid #dde; border-radius: 5px; padding: 8px; text-align: center; }
  .stat-num { font-size: 20px; font-weight: 800; }
  .stat-lbl { font-size: 9px; text-transform: uppercase; color: #888; margin-top: 2px; }

  /* ── Unit grid ── */
  .unit-grid-wrap { overflow-x: auto; }
  .unit-grid-table { border-collapse: collapse; }
  .unit-grid-table th, .unit-grid-table td { padding: 1px 1px; text-align: center; vertical-align: middle; }
  .col-num { font-size: 9px; color: #888; font-weight: 600; width: 20px; min-width: 20px; }
  .row-label { font-size: 9px; font-weight: 700; color: #444; text-align: right; padding-right: 5px; width: 32px; white-space: nowrap; }
  .dot {
    width: 16px; height: 16px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 8px; font-weight: 700; margin: 1px auto;
  }
  .dot-green  { background: #27ae60; color: #fff; }
  .dot-orange { background: #f39c12; color: #fff; }
  .dot-empty  { background: transparent; border: 1.5px solid #ccd; }

  /* ── Legend ── */
  .legend { display: flex; gap: 12px; align-items: center; font-size: 10px; color: #555; }
  .legend-item { display: flex; align-items: center; gap: 5px; }

  /* ── Progress table ── */
  .prog-bar { background: #eee; border-radius: 3px; height: 6px; overflow: hidden; }
  .prog-fill { height: 6px; border-radius: 3px; }
  .prog-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .prog-table td { padding: 4px 6px; border-bottom: 1px solid #eee; }
  .prog-table tr:last-child td { border-bottom: none; }

  /* ── Issue table ── */
  .issue-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .issue-table th { text-align: left; padding: 5px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; border-bottom: 2px solid #dde; }
  .issue-table td { padding: 5px 8px; border-bottom: 1px solid #eee; color: #333; vertical-align: top; }
  .issue-table tr:last-child td { border-bottom: none; }
  .status-pill { display: inline-block; padding: 1px 6px; border-radius: 99px; font-size: 9px; font-weight: 700; text-transform: uppercase; white-space: nowrap; }

  /* ── Print ── */
  @media print {
    body { font-size: 10px; }
    @page { size: letter landscape; margin: 0.4in; }
  }
</style>
</head>
<body>

<div class="report-header">
  <div class="rh-logo">M</div>
  <div class="rh-title">${esc(site.name).toUpperCase()} — SITE STATUS REPORT</div>
  <div class="rh-blocks">
    <span style="background:#e74c3c"></span>
    <span style="background:#2ecc71"></span>
    <span style="background:#3498db"></span>
    <span style="background:#f39c12"></span>
  </div>
  <div class="rh-date">Generated<br>${today}</div>
</div>

<div class="report-body">

  <!-- Top row: Site info | Progress | Stats -->
  <div class="top-row">
    <div class="section">
      <div class="section-head">Site Information</div>
      <div class="info-grid">
        <div>
          <div class="info-label">Address</div>
          <div class="info-val">${esc(address)}</div>
        </div>
        <div>
          <div class="info-label">Contact Phone</div>
          <div class="info-val">${esc(site.customer_contact_phone || '—')}</div>
        </div>
        <div>
          <div class="info-label">Contact Email</div>
          <div class="info-val">${esc(site.customer_contact_email || '—')}</div>
        </div>
        <div>
          <div class="info-label">Access Requirements</div>
          <div class="info-val" style="white-space:pre-wrap">${esc(site.access_requirements || '—')}</div>
        </div>
        ${site.notes ? `<div style="grid-column:1/-1"><div class="info-label">Notes</div><div class="info-val">${esc(site.notes)}</div></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-head">Commissioning Progress</div>
      <table class="prog-table">
        <tbody>
          ${progressRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="section" style="display:flex;flex-direction:column;gap:8px">
      <div class="section-head">Summary</div>
      <div class="stats-row" style="grid-template-columns:1fr 1fr">
        <div class="stat-box">
          <div class="stat-num" style="color:#27ae60">${done}</div>
          <div class="stat-lbl">Complete</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:#1a2340">${total}</div>
          <div class="stat-lbl">Total Units</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:#e74c3c">${openTickets.length}</div>
          <div class="stat-lbl">Open Issues</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:#2563eb">${pct}%</div>
          <div class="stat-lbl">Done</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Unit grid -->
  <div class="section">
    <div class="section-head" style="display:flex;justify-content:space-between;align-items:center">
      <span>Unit Status Grid</span>
      <span style="font-size:9px;font-weight:400;color:#aab">
        <span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#27ae60"></span> Complete
        </span>
        <span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f39c12"></span> In Progress
        </span>
        <span style="display:inline-flex;align-items:center;gap:4px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1.5px solid #ccd"></span> Not Started
        </span>
      </span>
    </div>
    ${unitGridHtml()}
  </div>

  <!-- Open issues -->
  <div class="section">
    <div class="section-head">Open Issues (${openTickets.length})</div>
    <table class="issue-table">
      <thead>
        <tr><th>#</th><th>Unit</th><th>Description</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${issueRowsHtml()}
      </tbody>
    </table>
  </div>

</div>

<script>window.onload = () => window.print();</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('Pop-up blocked — please allow pop-ups for this site', 'error'); return; }
  w.document.write(html);
  w.document.close();
}
