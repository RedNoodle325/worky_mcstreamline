async function renderDashboard(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);gap:16px;flex-wrap:wrap">
      <div>
        <h1 style="margin:0;font-size:22px;font-weight:700;color:var(--text)">PM Dashboard</h1>
      </div>
      <div id="dash-stats" style="display:flex;gap:8px;flex:1;justify-content:center"></div>
      <button class="btn btn-secondary btn-sm" onclick="printAllSitesReport()" title="Generate all-sites status report">🖨 Weekly Report</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="card" style="padding:14px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--red);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
          <span>⚠ Critical &amp; High Issues</span>
          <a href="#" onclick="navigate('issues');return false" style="font-size:11px;font-weight:400;color:var(--text3);text-decoration:none">View all →</a>
        </div>
        <div id="dash-critical-issues"><div style="color:var(--text3);font-size:12px">Loading…</div></div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--accent);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
          <span>✅ My To-Do</span>
          <a href="#" onclick="navigate('todos');return false" style="font-size:11px;font-weight:400;color:var(--text3);text-decoration:none">View all →</a>
        </div>
        <div id="dash-todos"><div style="color:var(--text3);font-size:12px">Loading…</div></div>
      </div>
    </div>
    <div id="dash-site-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
      <div style="color:var(--text3);padding:40px">Loading sites…</div>
    </div>`;

  try {
    const [sites, serviceTickets, issues, todos] = await Promise.all([
      API.sites.list(),
      API.service_tickets.listAll().catch(() => []),
      API.issues.listAll().catch(() => []),
      API.todos.list({ status: 'todo' }).catch(() => []),
    ]);

    const openTickets  = serviceTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const openIssues   = issues.filter(i => i.status === 'open' || i.status === 'in_progress').length;
    const sitesStaffed = sites.filter(s => s.techs_on_site).length;

    const stat = (label, value, color, page) => `
      <div onclick="${page ? `navigate('${page}')` : ''}" style="display:flex;align-items:center;gap:10px;padding:7px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;${page ? 'cursor:pointer;' : ''}${color ? `border-left:3px solid ${color};` : ''}">
        <span style="font-size:20px;font-weight:700;color:${color||'var(--text1)'};line-height:1">${value}</span>
        <span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap">${label}</span>
      </div>`;

    document.getElementById('dash-stats').innerHTML =
      stat('Sites', sites.length, null, null) +
      stat('Open Issues', openIssues, openIssues > 0 ? '#d97706' : null, 'issues') +
      stat('CS Tickets', openTickets, openTickets > 0 ? '#2563eb' : null, 'service-tickets') +
      (sitesStaffed ? stat('Techs On Site', sitesStaffed, '#16a34a', null) : '');

    // ── Critical & High Issues widget ─────────────────────────────────────────
    const criticalIssues = issues
      .filter(i => (i.priority === 'critical' || i.priority === 'high') && (i.status === 'open' || i.status === 'in_progress'))
      .sort((a, b) => (a.priority === 'critical' ? 0 : 1) - (b.priority === 'critical' ? 0 : 1));

    const siteMap = Object.fromEntries(sites.map(s => [s.id, s.name]));
    const priColor = { critical: '#dc2626', high: '#ea580c' };
    const stColor  = { open: '#dc2626', in_progress: '#d97706' };
    const stLabel  = { open: 'Open', in_progress: 'In Progress' };

    document.getElementById('dash-critical-issues').innerHTML = criticalIssues.length
      ? criticalIssues.slice(0, 8).map(i => `
          <div onclick="navigate('site-detail',{id:'${i.site_id}'})" style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer" title="Go to site">
            <span style="flex-shrink:0;width:6px;height:6px;border-radius:50%;background:${priColor[i.priority]};margin-top:5px"></span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(i.title||'Untitled')}</div>
              <div style="font-size:11px;color:var(--text3)">${escHtml(siteMap[i.site_id]||'Unknown')}${i.unit_tag ? ' · ' + escHtml(i.unit_tag) : ''}</div>
            </div>
            <span style="flex-shrink:0;font-size:10px;font-weight:700;color:${stColor[i.status]||'var(--text3)'};white-space:nowrap">${stLabel[i.status]||i.status}</span>
          </div>`)
          .join('') + (criticalIssues.length > 8 ? `<div style="font-size:11px;color:var(--text3);padding-top:6px;text-align:center">+ ${criticalIssues.length - 8} more</div>` : '')
      : '<div style="color:var(--text3);font-size:12px;padding:8px 0">No critical or high issues 🎉</div>';

    // ── Todos widget ──────────────────────────────────────────────────────────
    const todoPriColor = { urgent: '#dc2626', high: '#ea580c', normal: '#2563eb', low: '#6b7280' };
    const inProgressTodos = await API.todos.list({ status: 'in_progress' }).catch(() => []);
    const allOpenTodos = [...inProgressTodos, ...todos]
      .sort((a, b) => {
        const order = { urgent: 0, high: 1, normal: 2, low: 3 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      });

    document.getElementById('dash-todos').innerHTML = allOpenTodos.length
      ? allOpenTodos.slice(0, 8).map(t => {
          const due = t.due_date ? new Date(t.due_date + 'T00:00:00') : null;
          const overdue = due && due < new Date() && t.status !== 'done';
          return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
            <span style="flex-shrink:0;width:6px;height:6px;border-radius:50%;background:${todoPriColor[t.priority]||'#6b7280'};margin-top:5px"></span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.title)}</div>
              ${t.site_id ? `<div style="font-size:11px;color:var(--text3)">${escHtml(siteMap[t.site_id]||'')}</div>` : ''}
            </div>
            ${overdue ? `<span style="flex-shrink:0;font-size:10px;font-weight:700;color:var(--red);white-space:nowrap">Overdue</span>` :
              due ? `<span style="flex-shrink:0;font-size:10px;color:var(--text3);white-space:nowrap">${due.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>` : ''}
          </div>`;
        }).join('') + (allOpenTodos.length > 8 ? `<div style="font-size:11px;color:var(--text3);padding-top:6px;text-align:center">+ ${allOpenTodos.length - 8} more</div>` : '')
      : '<div style="color:var(--text3);font-size:12px;padding:8px 0">Nothing on the list — enjoy it while it lasts 👌</div>';

    renderSiteCards(sites, serviceTickets);
  } catch (e) {
    toast('Failed to load dashboard: ' + e.message, 'error');
  }
}

const SITE_STATUS_CONFIG = {
  normal:        { label: 'Normal',        color: '#16a34a' },
  open_issues:   { label: 'Open Issues',   color: '#d97706' },
  techs_onsite:  { label: 'Techs on Site', color: '#2563eb' },
  emergency:     { label: 'Emergency',     color: '#dc2626' },
};

function renderSiteCards(sites, serviceTickets) {
  const el = document.getElementById('dash-site-cards');
  if (!sites.length) {
    el.innerHTML = `<div style="color:var(--text3);padding:40px;grid-column:1/-1;text-align:center">
      No sites yet. <a href="#" onclick="navigate('site-form')" style="color:var(--accent)">Add a site</a>
    </div>`;
    return;
  }

  el.innerHTML = sites.map(site => {
    const statusCfg = SITE_STATUS_CONFIG[site.site_status || 'normal'] || SITE_STATUS_CONFIG.normal;

    // CS ticket indicator — any open or in-progress tickets for this site
    const siteTickets   = serviceTickets.filter(t => t.site_id === site.id);
    const hasOpenTicket = siteTickets.some(t => t.status === 'open' || t.status === 'in_progress');

    // Phase badge from site lifecycle phase
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const phase  = site.lifecycle_phase || 'production_shipping';
    const warEnd = site.warranty_end_date     ? new Date(site.warranty_end_date)     : null;
    const extEnd = site.extended_warranty_end ? new Date(site.extended_warranty_end) : null;
    const PHASE_BADGE = {
      production_shipping: { label: 'Production & Shipping', color: '#6366f1' },
      commissioning_l2:    { label: 'L2 Pre-Energization', color: '#f97316' },
      commissioning_l3:    { label: 'L3 Startup', color: '#eab308' },
      commissioning_l4:    { label: 'L4 SOO/TAB/BMS', color: '#3b82f6' },
      commissioning_l5:    { label: 'L5 IST', color: '#06b6d4' },
      pre_commissioning:   { label: 'Pre-Commissioning', color: '#6366f1' }, // legacy
    };
    let warrantyBadge = '';
    if (phase === 'warranty' || phase === 'extended_warranty') {
      const end  = extEnd || warEnd;
      const days = end ? Math.round((end - today) / 86400000) : null;
      const label = days != null
        ? `${phase === 'extended_warranty' ? 'Ext. ' : ''}Warranty · ${days >= 0 ? days + 'd left' : 'expired'}`
        : `${phase === 'extended_warranty' ? 'Ext. ' : ''}Warranty`;
      const col = (days != null && days < 0) ? '#dc2626' : '#16a34a';
      warrantyBadge = `<span style="background:${col}1a;color:${col};border:1px solid ${col}55;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:600">${label}</span>`;
    } else if (phase === 'out_of_warranty') {
      warrantyBadge = `<span style="background:#dc26261a;color:#dc2626;border:1px solid #dc262655;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:600">Out of Warranty</span>`;
    } else if (PHASE_BADGE[phase]) {
      const pb = PHASE_BADGE[phase];
      warrantyBadge = `<span style="background:${pb.color}1a;color:${pb.color};border:1px solid ${pb.color}55;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:600">${pb.label}</span>`;
    }

    const lastContact = site.last_contact_date
      ? new Date(site.last_contact_date).toLocaleDateString()
      : null;

    const logoHtml = site.logo_url
      ? `<span style="display:inline-flex;align-items:center;justify-content:center;background:#fff;border-radius:6px;padding:3px 6px;height:30px;box-sizing:border-box"><img src="${escHtml(site.logo_url)}" style="height:22px;max-width:72px;object-fit:contain" onerror="this.parentElement.style.display='none'" /></span>`
      : '';

    return `
    <div class="dash-site-card" style="cursor:pointer;border-left:4px solid ${statusCfg.color};padding:0;overflow:hidden" onclick="navigate('site-detail',{id:'${site.id}'})">

      <!-- Status header — main focus -->
      <div style="background:${statusCfg.color}1a;border-bottom:2px solid ${statusCfg.color}55;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${statusCfg.color};flex-shrink:0"></span>
          <span style="font-weight:700;font-size:13px;color:${statusCfg.color}">${statusCfg.label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${site.techs_on_site ? `<span style="background:#2563eb1a;color:#2563eb;border:1px solid #2563eb55;border-radius:99px;padding:1px 7px;font-size:11px;font-weight:600">🔧 On Site</span>` : ''}
          ${logoHtml}
        </div>
      </div>

      <!-- Site name + indicators -->
      <div style="padding:12px 14px">
        <div style="font-weight:700;font-size:15px;color:var(--text);margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${escHtml(site.name || '—')}
        </div>

        <!-- Badges row -->
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          ${warrantyBadge}
          ${hasOpenTicket
            ? `<span style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:600">🎫 Open Ticket</span>`
            : ''}
        </div>

        <!-- Footer -->
        <div style="font-size:11px;color:var(--text3)">
          ${lastContact ? '📞 ' + lastContact : 'No contact logged'}
        </div>
      </div>
    </div>`;
  }).join('');
}
