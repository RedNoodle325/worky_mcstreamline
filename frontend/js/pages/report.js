async function printAllSitesReport() {
  toast('Building report…');

  let sites, issues, notesRaw, users;
  try {
    [sites, issues, notesRaw, users] = await Promise.all([
      API.sites.list(),
      API.issues.listAll().catch(() => []),
      API.notes.search({}).catch(() => []),
      API.users.list().catch(() => []),
    ]);
  } catch (e) {
    toast('Failed to load report data: ' + e.message, 'error');
    return;
  }

  const detailSites = sites;

  // Fetch per-site detail data for qualifying sites in parallel
  const siteDetailData = {};
  if (detailSites.length) {
    await Promise.all(detailSites.map(async s => {
      const [campaigns, systems] = await Promise.all([
        API.campaigns.list(s.id).catch(() => []),
        API.sycool_systems.list(s.id).catch(() => []),
      ]);
      siteDetailData[s.id] = { campaigns, systems };
    }));
  }

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtDate(dt) { if (!dt) return '—'; return new Date(dt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
  function fmtShort(dt) { if (!dt) return '—'; return new Date(dt).toLocaleDateString('en-US',{month:'short',day:'numeric'}); }

  // Note cutoff: start of last calendar week (Mon)
  const now = new Date();
  const todayDay = now.getDay();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - ((todayDay + 6) % 7));
  startOfThisWeek.setHours(0,0,0,0);
  const noteCutoff = new Date(startOfThisWeek);
  noteCutoff.setDate(startOfThisWeek.getDate() - 7);

  const recentNotes = notesRaw.filter(n => n.created_at && new Date(n.created_at) >= noteCutoff);
  const today = now.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const SITE_STATUS = {
    normal:        { label:'Normal',        color:'#16a34a', bg:'#dcfce7' },
    open_issues:   { label:'Open Issues',   color:'#d97706', bg:'#fef9c3' },
    techs_onsite:  { label:'Techs on Site', color:'#2563eb', bg:'#dbeafe' },
    emergency:     { label:'Emergency',     color:'#dc2626', bg:'#fee2e2' },
  };
  const PHASE_LABEL = {
    production_shipping: 'Production & Shipping',
    commissioning_l2:    'L2 – Pre-Energization',
    commissioning_l3:    'L3 – Startup',
    commissioning_l4:    'L4 – Seq. of Operations',
    commissioning_l5:    'L5 – IST',
    warranty:            'Warranty',
    extended_warranty:   'Extended Warranty',
    out_of_warranty:     'Out of Warranty',
    pre_commissioning:   'Pre-Commissioning', // legacy
  };

  // ── Shared helpers ──────────────────────────────────────────────────────────
  const ISSUES_PRINT_LIMIT = 10;
  function issueRows(openIssues) {
    if (!openIssues.length) return `<tr><td colspan="4" style="padding:6px 8px;color:#aaa;font-size:10px;text-align:center">No open issues</td></tr>`;
    const visible = openIssues.slice(0, ISSUES_PRINT_LIMIT);
    const overflow = openIssues.length - visible.length;
    const rows = visible.map(i => {
      const priColor = {critical:'#dc2626',high:'#ea580c',low:'#6b7280'}[i.priority]||'#6b7280';
      const stColor  = {open:'#dc2626',in_progress:'#d97706',work_complete:'#16a34a',ready_to_inspect:'#7c3aed',closed:'#6b7280'}[i.status]||'#6b7280';
      const stLabel  = {open:'Open',in_progress:'In Progress',work_complete:'Work Complete',ready_to_inspect:'Ready to Inspect',closed:'Closed'}[i.status]||i.status;
      return `<tr>
        <td style="font-family:monospace;font-size:9px;color:#6b7280;padding:3px 8px;white-space:nowrap">${esc(i.unit_tag||'—')}</td>
        <td style="padding:3px 8px;font-size:10px">${esc(i.title||i.description||'—')}</td>
        <td style="padding:3px 8px;white-space:nowrap"><span style="color:${priColor};font-size:9px;font-weight:700">${(i.priority||'').toUpperCase()||'—'}</span></td>
        <td style="padding:3px 8px;white-space:nowrap"><span style="background:${stColor}18;color:${stColor};border:1px solid ${stColor}44;border-radius:99px;padding:1px 6px;font-size:9px;font-weight:600">${stLabel}</span></td>
      </tr>`;
    }).join('');
    const moreRow = overflow > 0
      ? `<tr><td colspan="4" style="padding:4px 8px;font-size:9px;color:#6b7280;font-style:italic;text-align:center;border-top:1px solid #e5e7eb">+ ${overflow} more issue${overflow>1?'s':''} — see full site report</td></tr>`
      : '';
    return rows + moreRow;
  }

  function renderNoteText(raw) {
    if (!raw) return '—';
    try {
      const obj = JSON.parse(raw);
      if (obj._type === 'email_chain') {
        const subject = obj.subject || 'Email Chain';
        const count = Array.isArray(obj.emails) ? obj.emails.length : '?';
        return `📧 <em>${esc(subject)}</em> · ${count} messages`;
      }
      if (obj.date && obj.attendees) {
        const actions = (obj.actions || obj.agenda || '').slice(0, 100);
        return `📋 <strong>Meeting</strong> · ${esc(obj.attendees.slice(0,60))}${obj.attendees.length>60?'…':''}${actions ? ` — ${esc(actions)}` : ''}`;
      }
      if (obj.to_from && obj.notes) {
        return `📞 <strong>${esc(obj.to_from)}</strong>: ${esc(String(obj.notes).slice(0,120))}${String(obj.notes).length>120?'…':''}`;
      }
      // Generic JSON — show values as plain text
      const text = Object.values(obj).filter(v => typeof v === 'string').join(' · ').slice(0, 150);
      return esc(text) || esc(raw.slice(0, 120));
    } catch {
      return esc((raw||'').slice(0, 150));
    }
  }

  function noteRows(siteNotes) {
    if (!siteNotes.length) return `<tr><td colspan="3" style="padding:6px 8px;color:#aaa;font-size:10px;text-align:center">No recent notes</td></tr>`;
    return siteNotes.map(n => {
      const author = n.author_name || n.created_by_name || '—';
      return `<tr>
      <td style="padding:3px 8px;white-space:nowrap;font-size:9px;color:#6b7280;vertical-align:top">${fmtShort(n.created_at)}</td>
      <td style="padding:3px 8px;white-space:nowrap;font-size:9px;color:#6b7280;vertical-align:top">${esc(author)}</td>
      <td style="padding:3px 8px;font-size:10px;max-width:340px;line-height:1.4">${renderNoteText(n.content)}</td>
    </tr>`;
    }).join('');
  }

  // ── PAGE 1: All-sites summary ───────────────────────────────────────────────
  const PM_COLORS = ['#2563eb','#16a34a','#d97706','#7c3aed','#db2777','#0891b2'];

  function buildPmTrackerHtml() {
    // Group sites by PM
    const pmMap = {};
    for (const site of sites) {
      const pmId = site.project_manager_id || '__none__';
      if (!pmMap[pmId]) pmMap[pmId] = [];
      pmMap[pmId].push(site);
    }

    const pmEntries = Object.entries(pmMap).sort(([a],[b]) => {
      if (a === '__none__') return 1;
      if (b === '__none__') return -1;
      const nameA = (users.find(u => u.id === a)?.display_name || '').toLowerCase();
      const nameB = (users.find(u => u.id === b)?.display_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return pmEntries.map(([pmId, pmSites], idx) => {
      const user = users.find(u => u.id === pmId);
      const pmName = user?.display_name || user?.email || 'Unassigned';
      const initials = pmName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const color = PM_COLORS[idx % PM_COLORS.length];

      // Active first, inactive dimmed
      const sorted = [...pmSites].sort((a,b) => (b.active?1:0)-(a.active?1:0));

      const rows = sorted.map(site => {
        const statusCfg = SITE_STATUS[site.site_status||'normal'] || SITE_STATUS.normal;
        const phase = PHASE_LABEL[site.lifecycle_phase] || site.lifecycle_phase || '—';
        const openCount = issues.filter(i => i.site_id === site.id && i.status === 'open').length;
        const inProgCount = issues.filter(i => i.site_id === site.id && i.status === 'in_progress').length;
        const location = [site.city, site.state].filter(Boolean).join(', ') || site.address || '—';
        const latestNote = recentNotes.filter(n => n.site_id === site.id).sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
        const updateText = latestNote
          ? renderNoteText(latestNote.content)
          : '<span style="color:#9ca3af;font-style:italic">No update this week</span>';
        const issueStr = (openCount+inProgCount) > 0
          ? `${openCount ? `<span style="color:#dc2626;font-weight:700">${openCount} open</span>` : ''}${openCount&&inProgCount?' · ':''}${inProgCount ? `<span style="color:#d97706">${inProgCount} in-prog</span>` : ''}`
          : `<span style="color:#9ca3af">—</span>`;
        const opacity = site.active === false ? '0.55' : '1';

        return `<tr style="border-bottom:1px solid #f3f4f6;opacity:${opacity}">
          <td style="padding:4px 8px;font-family:monospace;font-size:9px;color:#6b7280;white-space:nowrap">${esc(site.project_number||'—')}</td>
          <td style="padding:4px 8px;font-weight:700;font-size:10px;white-space:nowrap">${esc(site.name||site.project_name||'—')}</td>
          <td style="padding:4px 8px;font-size:9px;color:#6b7280;white-space:nowrap">${esc(location)}</td>
          <td style="padding:4px 8px;font-size:9px;color:#6b7280;white-space:nowrap">${esc(phase)}</td>
          <td style="padding:4px 8px;white-space:nowrap"><span style="background:${statusCfg.color}18;color:${statusCfg.color};border:1px solid ${statusCfg.color}44;border-radius:99px;padding:1px 6px;font-size:9px;font-weight:600">${statusCfg.label}</span></td>
          <td style="padding:4px 8px;font-size:9px;white-space:nowrap">${issueStr}</td>
          <td style="padding:4px 8px;font-size:10px;max-width:260px">${updateText}</td>
        </tr>`;
      }).join('');

      return `
        <div style="margin-bottom:14px;border-left:3px solid ${color};padding-left:10px">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
            <div style="width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${initials}</div>
            <span style="font-size:11px;font-weight:700;color:#111827">${esc(pmName)}</span>
            <span style="font-size:9px;color:#6b7280">${pmSites.length} site${pmSites.length!==1?'s':''}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;font-size:10px">
            <thead>
              <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
                <th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">Project #</th>
                <th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">Site</th>
                <th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">Location</th>
                <th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">Phase</th>
                <th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">Status</th>
                <th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">Issues</th>
                <th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">This Week's Update</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');
  }

  function summaryPage() {
    const totalOpen = issues.filter(i => i.status !== 'closed').length;
    const pmTrackerHtml = buildPmTrackerHtml();

    const siteTableRows = sites.map(site => {
      const statusCfg  = SITE_STATUS[site.site_status||'normal']||SITE_STATUS.normal;
      const strictOpenCount = issues.filter(i => i.site_id === site.id && i.status === 'open').length;
      const inProgCount     = issues.filter(i => i.site_id === site.id && i.status === 'in_progress').length;
      const phase           = PHASE_LABEL[site.lifecycle_phase]||site.lifecycle_phase||'—';
      const lastC           = site.last_contact_date ? fmtShort(site.last_contact_date) : '—';

      const issueCell = (strictOpenCount + inProgCount) > 0
        ? `${strictOpenCount ? `<span style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:99px;padding:1px 7px;font-size:9px;font-weight:700">${strictOpenCount} open</span> ` : ''}${inProgCount ? `<span style="background:#fef9c3;color:#d97706;border:1px solid #fde68a;border-radius:99px;padding:1px 7px;font-size:9px;font-weight:700">${inProgCount} in-prog</span>` : ''}`
        : `<span style="color:#9ca3af;font-size:9px">—</span>`;

      return `<tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:5px 10px;white-space:nowrap">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusCfg.color};margin-right:5px;vertical-align:middle"></span>
          <span style="font-weight:700;font-size:11px">${esc(site.name||'—')}</span>
        </td>
        <td style="padding:5px 10px;white-space:nowrap">
          <span style="background:${statusCfg.color}18;color:${statusCfg.color};border:1px solid ${statusCfg.color}44;border-radius:99px;padding:1px 7px;font-size:9px;font-weight:700">${statusCfg.label}</span>
        </td>
        <td style="padding:5px 10px;font-size:9px;color:#6b7280;white-space:nowrap">${esc(phase)}</td>
        <td style="padding:5px 10px">${issueCell}</td>
        <td style="padding:5px 10px;font-size:9px;color:#6b7280;white-space:nowrap">${lastC}</td>
      </tr>`;
    }).join('');

    return `
    <!-- HEADER -->
    <div style="background:#1e3a5f;color:#fff;padding:12px 24px;display:flex;align-items:center;gap:14px;border-bottom:3px solid #2563eb">
      <div style="width:32px;height:32px;background:#2563eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0">M</div>
      <div>
        <div style="font-size:15px;font-weight:800;letter-spacing:.04em">ALL SITES STATUS REPORT</div>
        <div style="font-size:10px;color:#93c5fd;margin-top:2px">Munters Field Services · ${today}</div>
      </div>
      <div style="flex:1"></div>
      <div style="text-align:right;font-size:10px;color:#93c5fd">
        Week of: <strong style="color:#fff">${fmtShort(noteCutoff)} – ${fmtShort(now)}</strong>
      </div>
    </div>

    <!-- STATS BAR -->
    <div style="display:flex;gap:20px;margin:12px 24px;padding:8px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;align-items:center">
      ${Object.entries(SITE_STATUS).map(([key,cfg]) => {
        const count = sites.filter(s => (s.site_status||'normal') === key).length;
        if (!count) return '';
        return `<div style="text-align:center"><div style="font-size:18px;font-weight:800;color:${cfg.color}">${count}</div><div style="font-size:8px;text-transform:uppercase;color:#6b7280">${cfg.label}</div></div>`;
      }).join('')}
      <div style="width:1px;background:#e5e7eb;align-self:stretch;margin:0 4px"></div>
      <div style="text-align:center"><div style="font-size:18px;font-weight:800;color:#dc2626">${totalOpen}</div><div style="font-size:8px;text-transform:uppercase;color:#6b7280">Open Issues</div></div>
      <div style="text-align:center"><div style="font-size:18px;font-weight:800;color:#111827">${sites.length}</div><div style="font-size:8px;text-transform:uppercase;color:#6b7280">Total Sites</div></div>
    </div>

    <!-- PM PROJECT TRACKER -->
    <div style="margin: 12px 24px 0">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:8px;letter-spacing:.06em">
        PM Project Tracker — Week of ${fmtShort(noteCutoff)} – ${fmtShort(now)}
      </div>
      ${pmTrackerHtml}
    </div>

    <!-- WEEKLY NOTES -->
    <div style="margin:14px 24px 0">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px;letter-spacing:.06em">Weekly Notes</div>
      <div class="no-print" style="font-size:9px;color:#9ca3af;margin-bottom:4px">Type your notes below — they will appear when printed.</div>
      <div id="weekly-notes-box"
           contenteditable="true"
           style="min-height:100px;border:1px solid #d1d5db;border-radius:6px;padding:10px 12px;font-size:11px;line-height:1.6;color:#111827;outline:none;font-family:'Segoe UI',system-ui,sans-serif"
           data-placeholder="Click here to type your weekly notes…"></div>
    </div>`;
  }

  // ── Per-site detail pages ───────────────────────────────────────────────────
  function detailPage(site) {
    const statusCfg  = SITE_STATUS[site.site_status||'normal']||SITE_STATUS.normal;
    const phase      = PHASE_LABEL[site.lifecycle_phase]||site.lifecycle_phase||'—';
    const openIssues = issues.filter(i => i.site_id === site.id && i.status !== 'closed');
    const siteNotes  = recentNotes.filter(n => n.site_id === site.id);
    const { campaigns = [], systems = [] } = siteDetailData[site.id] || {};

    // Commissioning progress
    const hasSyCool  = systems.length > 0;
    function sysLevel(s) {
      const a = s.accu?.commission_level||'none', c = s.crac?.commission_level||'none';
      if (a==='complete'&&c==='complete') return 'complete';
      if (a==='none'&&c==='none') return 'none';
      return 'in_progress';
    }
    const trackItems = hasSyCool ? systems : [];
    const total   = trackItems.length;
    const done    = hasSyCool ? systems.filter(s=>sysLevel(s)==='complete').length : 0;
    const inProg  = hasSyCool ? systems.filter(s=>sysLevel(s)==='in_progress').length : 0;
    const pct     = total ? Math.round(done/total*100) : 0;

    // Warranty countdown
    const todayD = new Date(); todayD.setHours(0,0,0,0);
    const warEnd = site.warranty_end_date ? new Date(site.warranty_end_date) : null;
    const extEnd = site.extended_warranty_end ? new Date(site.extended_warranty_end) : null;
    const activeEnd = extEnd||warEnd;
    const warDays = activeEnd ? Math.round((activeEnd-todayD)/86400000) : null;

    // Campaign rows — show only latest, unless multiple are in progress
    const inProgressCamps = campaigns.filter(c => c.status === 'in_progress' || (c.units_total && c.units_complete < c.units_total && c.units_complete > 0));
    const displayCamps = inProgressCamps.length > 1
      ? inProgressCamps
      : campaigns.length ? [campaigns[campaigns.length - 1]] : [];
    const campHtml = displayCamps.length
      ? displayCamps.map(c => {
          const cappedComplete = Math.min(c.units_complete, c.units_total);
          const p = c.units_total ? Math.round(cappedComplete/c.units_total*100) : 0;
          const col = p===100?'#16a34a':'#2563eb';
          return `<tr>
            <td style="padding:4px 8px;font-size:10px">${esc(c.name)}</td>
            <td style="padding:4px 8px;font-size:9px;color:#6b7280">${c.campaign_type||''}</td>
            <td style="padding:4px 8px;text-align:right;font-size:10px">${cappedComplete}/${c.units_total}</td>
            <td style="padding:4px 8px;width:80px">
              <div style="background:#e5e7eb;border-radius:3px;height:5px;overflow:hidden">
                <div style="height:5px;width:${p}%;background:${col};border-radius:3px"></div>
              </div>
            </td>
            <td style="padding:4px 8px;text-align:right;color:${col};font-weight:700;font-size:10px">${p}%</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="5" style="padding:6px 8px;color:#aaa;font-size:10px;text-align:center">No campaigns</td></tr>`;
    const campLabel = displayCamps.length > 1 ? `Campaigns (${displayCamps.length} in progress)` : displayCamps.length === 1 ? `Latest Campaign` : `Campaigns`;

    // Hall breakdown for SyCool
    const hallHtml = hasSyCool ? (() => {
      const halls = [...new Set(systems.map(s=>s.data_hall))].sort();
      return halls.map(h => {
        const hs = systems.filter(s=>s.data_hall===h);
        const hd = hs.filter(s=>sysLevel(s)==='complete').length;
        const hp = hs.length ? Math.round(hd/hs.length*100) : 0;
        const col = hp===100?'#16a34a':hp>0?'#2563eb':'#6b7280';
        return `<tr>
          <td style="padding:4px 8px;font-weight:600;font-size:10px">${esc(h)}</td>
          <td style="padding:4px 8px;text-align:center;font-size:10px">${hs.length}</td>
          <td style="padding:4px 8px;text-align:center;color:#16a34a;font-weight:600;font-size:10px">${hd}</td>
          <td style="padding:4px 8px;text-align:center;color:#6b7280;font-size:10px">${hs.length-hd}</td>
          <td style="padding:4px 8px;width:80px">
            <div style="background:#e5e7eb;border-radius:3px;height:5px;overflow:hidden">
              <div style="height:5px;width:${hp}%;background:${col};border-radius:3px"></div>
            </div>
          </td>
          <td style="padding:4px 8px;text-align:right;color:${col};font-weight:700;font-size:10px">${hp}%</td>
        </tr>`;
      }).join('');
    })() : '';

    const addr = [site.address, site.city, site.state, site.zip_code].filter(Boolean).join(', ') || '—';

    return `
    <!-- HEADER -->
    <div style="background:${statusCfg.bg};border-bottom:3px solid ${statusCfg.color};padding:12px 24px;display:flex;align-items:center;gap:14px">
      <div style="width:32px;height:32px;background:#1e3a5f;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0">M</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:16px;font-weight:800;color:#111827">${esc(site.name||'—')}</span>
          <span style="background:${statusCfg.color};color:#fff;border-radius:99px;padding:3px 10px;font-size:10px;font-weight:700">${statusCfg.label}</span>
          <span style="background:#1e3a5f18;color:#1e3a5f;border:1px solid #1e3a5f33;border-radius:99px;padding:2px 9px;font-size:9px;font-weight:600">${phase}</span>
          ${site.techs_on_site ? `<span style="background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:99px;padding:2px 8px;font-size:9px;font-weight:600">🔧 Techs On Site</span>` : ''}
        </div>
        <div style="font-size:9px;color:#6b7280;margin-top:4px">${esc(addr)}</div>
      </div>
      <div style="text-align:right;font-size:9px;color:#6b7280">
        <div>${today}</div>
        ${site.last_contact_date ? `<div style="margin-top:3px">Last contact: ${fmtDate(site.last_contact_date)}</div>` : ''}
        ${warDays !== null ? `<div style="margin-top:3px;font-weight:700;color:${warDays<0?'#dc2626':warDays<60?'#d97706':'#16a34a'}">${warDays<0?'Warranty expired':'⏱ '+warDays+'d warranty remaining'}</div>` : ''}
      </div>
    </div>

    <div style="padding:14px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px">

      <!-- LEFT: open issues + notes -->
      <div style="display:flex;flex-direction:column;gap:12px">

        <!-- Open Issues -->
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;break-inside:avoid;page-break-inside:avoid">
          <div style="background:#1e3a5f;color:#fff;padding:5px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">
            Open Issues (${openIssues.length})
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Equipment</th>
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Description</th>
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Priority</th>
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Status</th>
            </tr></thead>
            <tbody>${issueRows(openIssues)}</tbody>
          </table>
        </div>

        <!-- Recent Notes -->
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;break-inside:avoid;page-break-inside:avoid">
          <div style="background:#1e3a5f;color:#fff;padding:5px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">
            Recent Notes (${siteNotes.length})
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Date</th>
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Author</th>
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Note</th>
            </tr></thead>
            <tbody>${noteRows(siteNotes)}</tbody>
          </table>
        </div>

      </div>

      <!-- RIGHT: commissioning / campaigns -->
      <div style="display:flex;flex-direction:column;gap:12px">

        ${hasSyCool && site.lifecycle_phase === 'pre_commissioning' ? `
        <!-- Commissioning Progress -->
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;break-inside:avoid;page-break-inside:avoid">
          <div style="background:#1e3a5f;color:#fff;padding:5px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:flex;justify-content:space-between">
            <span>Commissioning Progress</span>
            <span style="color:${pct===100?'#4ade80':'#93c5fd'}">${pct}%</span>
          </div>
          <div style="padding:10px 12px">
            <div style="display:flex;gap:12px;font-size:10px;margin-bottom:8px">
              <span style="color:#16a34a;font-weight:600">✓ ${done} complete</span>
              ${inProg>0?`<span style="color:#d97706">⟳ ${inProg} in progress</span>`:''}
              <span style="color:#6b7280">○ ${total-done-inProg} not started</span>
              <span style="font-weight:700;color:#111827">/ ${total} total</span>
            </div>
            <div style="background:#e5e7eb;border-radius:3px;height:8px;overflow:hidden">
              <div style="height:8px;width:${pct}%;background:${pct===100?'#16a34a':'#2563eb'};border-radius:3px"></div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb">
            <thead><tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Hall</th>
              <th style="padding:4px 8px;font-size:9px;text-align:center;color:#6b7280">Total</th>
              <th style="padding:4px 8px;font-size:9px;text-align:center;color:#16a34a">Done</th>
              <th style="padding:4px 8px;font-size:9px;text-align:center;color:#6b7280">Remaining</th>
              <th style="padding:4px 8px" colspan="2"></th>
            </tr></thead>
            <tbody>${hallHtml}</tbody>
          </table>
        </div>` : ''}

        <!-- Campaigns -->
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;break-inside:avoid;page-break-inside:avoid">
          <div style="background:#1e3a5f;color:#fff;padding:5px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">
            ${campLabel}
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Name</th>
              <th style="padding:4px 8px;font-size:9px;text-align:left;color:#6b7280">Type</th>
              <th style="padding:4px 8px;font-size:9px;text-align:right;color:#6b7280">Progress</th>
              <th style="padding:4px 8px" colspan="2"></th>
            </tr></thead>
            <tbody>${campHtml}</tbody>
          </table>
        </div>

        <!-- Site info -->
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;break-inside:avoid;page-break-inside:avoid">
          <div style="background:#1e3a5f;color:#fff;padding:5px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Site Info</div>
          <div style="padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:10px">
            <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase">Contact</div><div>${esc(site.customer_contact_name||'—')}</div></div>
            <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase">Phone</div><div>${esc(site.customer_contact_phone||'—')}</div></div>
            ${site.warranty_start_date||site.warranty_end_date ? `<div style="grid-column:1/-1"><div style="font-size:9px;color:#6b7280;text-transform:uppercase">Warranty</div><div>${fmtDate(site.warranty_start_date)} → ${fmtDate(site.warranty_end_date)}</div></div>` : ''}
            ${site.access_requirements ? `<div style="grid-column:1/-1"><div style="font-size:9px;color:#6b7280;text-transform:uppercase">Access</div><div style="white-space:pre-wrap">${esc(site.access_requirements)}</div></div>` : ''}
          </div>
        </div>

      </div>
    </div>`;
  }

  // ── Assemble HTML ───────────────────────────────────────────────────────────
  const detailPagesHtml = detailSites.map((site, idx) =>
    `<div style="${idx === 0 ? 'page-break-before:always;' : ''}break-inside:avoid;page-break-inside:avoid;margin-bottom:18px">${detailPage(site)}</div>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>All Sites Report — ${today}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI', system-ui, sans-serif; font-size:11px; color:#111827; background:#fff; }
  #weekly-notes-box:empty:before { content:attr(data-placeholder); color:#9ca3af; pointer-events:none; }
  #weekly-notes-box:focus { border-color:#2563eb !important; box-shadow:0 0 0 2px #2563eb22; }
  #print-btn {
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:#2563eb; color:#fff; border:none; border-radius:8px;
    padding:10px 22px; font-size:13px; font-weight:700; cursor:pointer;
    box-shadow:0 4px 12px #2563eb44;
  }
  #print-btn:hover { background:#1d4ed8; }
  @media print {
    @page { size:letter portrait; margin:0.35in; }
    body { font-size:10px; }
    #print-btn { display:none !important; }
    .no-print { display:none !important; }
    #weekly-notes-box { border:1px solid #e5e7eb !important; box-shadow:none !important; }
  }
</style>
</head>
<body>

  <!-- PAGE 1: Summary -->
  ${summaryPage()}

  <!-- DETAIL PAGES -->
  ${detailPagesHtml}

<button id="print-btn" onclick="window.print()">🖨 Print Report</button>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('Pop-up blocked — allow pop-ups and try again', 'error'); return; }
  w.document.write(html);
  w.document.close();
}

async function printSiteReport(siteId) {
  let site, units, tickets, campaigns, systems;
  try {
    [site, units, tickets, campaigns, systems] = await Promise.all([
      API.sites.get(siteId),
      API.units.list(),
      API.tickets.list(),
      API.campaigns.list(siteId).catch(() => []),
      API.sycool_systems.list(siteId).catch(() => []),
    ]);
  } catch (e) {
    toast('Failed to load report data: ' + e.message, 'error');
    return;
  }

  const siteUnits    = units.filter(u => u.site_id === siteId);
  const siteTickets  = tickets.filter(t => t.site_id === siteId);
  const openTickets  = siteTickets.filter(t => !['resolved','closed'].includes(t.status));
  const hasSystems   = systems.length > 0;

  // For SyCool sites track systems; for regular sites track units
  const trackItems   = hasSystems ? systems : siteUnits;
  const total        = trackItems.length;
  const itemLabel    = hasSystems ? 'Systems' : 'Units';

  // Commission progress — for systems count complete when both ACCU and CRAC are complete
  function systemLevel(sys) {
    const al = sys.accu?.commission_level || 'none';
    const cl = sys.crac?.commission_level || 'none';
    if (al === 'complete' && cl === 'complete') return 'complete';
    if (al === 'none' && cl === 'none') return 'none';
    return 'in_progress';
  }

  const done = hasSystems
    ? systems.filter(s => systemLevel(s) === 'complete').length
    : siteUnits.filter(u => u.commission_level === 'complete').length;
  const inProg = hasSystems
    ? systems.filter(s => systemLevel(s) === 'in_progress').length
    : siteUnits.filter(u => u.commission_level && u.commission_level !== 'none' && u.commission_level !== 'complete').length;
  const notStarted = total - done - inProg;
  const pct = total ? Math.round(done / total * 100) : 0;

  const today   = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const address = [site.address, site.city, site.state, site.zip_code].filter(Boolean).join(', ') || '—';

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ── Campaign rows ──────────────────────────────────────────────────────────
  const campaignHtml = campaigns.length
    ? campaigns.map(c => {
        const cappedC = Math.min(c.units_complete, c.units_total);
        const p = c.units_total ? Math.round(cappedC / c.units_total * 100) : 0;
        const color = p === 100 ? '#16a34a' : '#2563eb';
        const typeLabel = {pm:'PM',firmware_update:'Firmware',rfe:'RFE',upgrade:'Upgrade',bug_fix:'Bug Fix',other:'Other'}[c.campaign_type] || c.campaign_type;
        return `<tr>
          <td>${esc(c.name)}</td>
          <td style="color:#888">${typeLabel}</td>
          <td style="text-align:right;white-space:nowrap">${cappedC}/${c.units_total}</td>
          <td style="width:90px">
            <div style="background:#e5e7eb;border-radius:3px;height:5px;overflow:hidden">
              <div style="height:5px;width:${p}%;background:${color};border-radius:3px"></div>
            </div>
          </td>
          <td style="text-align:right;color:${color};font-weight:700">${p}%</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="color:#aaa;text-align:center;padding:10px 0">No campaigns</td></tr>`;

  // ── Open ticket rows ───────────────────────────────────────────────────────
  const statusColors = { open:'#dc2626', parts_ordered:'#d97706', tech_dispatched:'#7c3aed', on_site:'#ea580c', resolved:'#16a34a', closed:'#6b7280' };
  const ticketHtml = openTickets.length
    ? openTickets.slice(0, 30).map((t, i) => {
        const color = statusColors[t.status] || '#6b7280';
        const u = units.find(u => u.id === t.unit_id);
        const unitLabel = u ? (u.asset_tag || (u.job_number && u.line_number != null ? `${u.job_number}-${u.line_number}` : u.serial_number)) : '—';
        return `<tr>
          <td style="color:#aaa">${i+1}</td>
          <td style="font-family:monospace;font-size:10px">${esc(unitLabel||'—')}</td>
          <td>${esc(t.title || t.description || '—')}</td>
          <td><span style="background:${color}18;color:${color};border:1px solid ${color}44;border-radius:99px;padding:1px 7px;font-size:9px;font-weight:700;white-space:nowrap">${(t.status||'open').replace(/_/g,' ')}</span></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="color:#aaa;text-align:center;padding:14px 0">No open issues</td></tr>`;

  // ── Systems by data hall (SyCool only) ────────────────────────────────────
  function hallBreakdownHtml() {
    if (!hasSystems) return '';
    const halls = [...new Set(systems.map(s => s.data_hall))].sort();
    const rows = halls.map(h => {
      const hSystems = systems.filter(s => s.data_hall === h);
      const hDone    = hSystems.filter(s => systemLevel(s) === 'complete').length;
      const hInProg  = hSystems.filter(s => systemLevel(s) === 'in_progress').length;
      const hPct     = hSystems.length ? Math.round(hDone / hSystems.length * 100) : 0;
      const color    = hPct === 100 ? '#16a34a' : hPct > 0 ? '#2563eb' : '#6b7280';
      return `<tr>
        <td style="font-weight:700">${esc(h)}</td>
        <td style="text-align:center">${hSystems.length}</td>
        <td style="text-align:center;color:#16a34a;font-weight:600">${hDone}</td>
        <td style="text-align:center;color:#d97706">${hInProg}</td>
        <td style="text-align:center;color:#6b7280">${hSystems.length - hDone - hInProg}</td>
        <td style="width:100px">
          <div style="background:#e5e7eb;border-radius:3px;height:6px;overflow:hidden">
            <div style="height:6px;width:${hPct}%;background:${color};border-radius:3px"></div>
          </div>
        </td>
        <td style="text-align:right;color:${color};font-weight:700">${hPct}%</td>
      </tr>`;
    });
    return `
      <div class="section" style="margin-top:0">
        <div class="section-head">SyCool Systems by Data Hall</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb">
              <th style="text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;color:#888">Hall</th>
              <th style="text-align:center;padding:5px 8px;font-size:9px;text-transform:uppercase;color:#888">Total</th>
              <th style="text-align:center;padding:5px 8px;font-size:9px;text-transform:uppercase;color:#16a34a">Complete</th>
              <th style="text-align:center;padding:5px 8px;font-size:9px;text-transform:uppercase;color:#d97706">In Progress</th>
              <th style="text-align:center;padding:5px 8px;font-size:9px;text-transform:uppercase;color:#6b7280">Not Started</th>
              <th style="padding:5px 8px" colspan="2"></th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(site.name)} — Site Report</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI', system-ui, sans-serif; font-size:11px; color:#111827; background:#fff; }

  /* Header */
  .header {
    background:#1e3a5f; color:#fff;
    padding:14px 24px;
    display:flex; align-items:center; gap:16px;
    border-bottom:3px solid #2563eb;
  }
  .header-logo {
    width:36px; height:36px; background:#2563eb; border-radius:6px;
    display:flex; align-items:center; justify-content:center;
    font-size:18px; font-weight:900; color:#fff; flex-shrink:0;
  }
  .header-title { flex:1; font-size:16px; font-weight:800; letter-spacing:0.04em; }
  .header-sub { font-size:10px; color:#93c5fd; margin-top:2px; font-weight:400; letter-spacing:0; }
  .header-date { font-size:10px; color:#93c5fd; text-align:right; }

  /* Body */
  .body { padding:16px 24px; display:flex; flex-direction:column; gap:14px; }

  /* Sections */
  .section { border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
  .section-head {
    background:#1e3a5f; color:#fff;
    font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;
    padding:6px 12px;
  }
  .section-body { padding:12px; }

  /* Top grid */
  .top-grid { display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:14px; }

  /* Info grid */
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 20px; }
  .lbl { font-size:9px; text-transform:uppercase; letter-spacing:0.05em; color:#6b7280; margin-bottom:2px; }
  .val { font-size:11px; color:#111827; line-height:1.4; }

  /* Stat tiles */
  .stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .stat-tile {
    border:1px solid #e5e7eb; border-radius:6px; padding:10px 8px;
    text-align:center; background:#f9fafb;
  }
  .stat-n { font-size:24px; font-weight:800; line-height:1; }
  .stat-l { font-size:9px; text-transform:uppercase; color:#6b7280; margin-top:4px; letter-spacing:0.05em; }

  /* Progress bar */
  .prog-bar { background:#e5e7eb; border-radius:3px; height:6px; overflow:hidden; margin-top:4px; }
  .prog-fill { height:6px; border-radius:3px; }

  /* Campaign table */
  .camp-table { width:100%; border-collapse:collapse; font-size:11px; }
  .camp-table td { padding:5px 8px; border-bottom:1px solid #f3f4f6; }
  .camp-table tr:last-child td { border-bottom:none; }

  /* Issue table */
  .issue-table { width:100%; border-collapse:collapse; font-size:11px; }
  .issue-table th { text-align:left; padding:6px 8px; font-size:9px; text-transform:uppercase; letter-spacing:0.05em; color:#6b7280; border-bottom:2px solid #e5e7eb; }
  .issue-table td { padding:6px 8px; border-bottom:1px solid #f3f4f6; color:#374151; vertical-align:top; }
  .issue-table tr:last-child td { border-bottom:none; }

  @media print {
    @page { size:letter landscape; margin:0.35in; }
    body { font-size:10px; }
    .header-title { font-size:14px; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-logo">M</div>
  <div>
    <div class="header-title">${esc(site.name).toUpperCase()}</div>
    <div class="header-sub">Site Status Report</div>
  </div>
  <div style="flex:1"></div>
  <div class="header-date">Generated<br><strong>${today}</strong></div>
</div>

<div class="body">

  <!-- Top row -->
  <div class="top-grid">

    <!-- Site info -->
    <div class="section">
      <div class="section-head">Site Information</div>
      <div class="section-body">
        <div class="info-grid">
          <div>
            <div class="lbl">Address</div>
            <div class="val">${esc(address)}</div>
          </div>
          <div>
            <div class="lbl">Primary Contact</div>
            <div class="val">${esc(site.customer_contact_name || '—')}</div>
          </div>
          <div>
            <div class="lbl">Phone</div>
            <div class="val">${esc(site.customer_contact_phone || '—')}</div>
          </div>
          <div>
            <div class="lbl">Email</div>
            <div class="val">${esc(site.customer_contact_email || '—')}</div>
          </div>
          ${site.access_requirements ? `<div style="grid-column:1/-1">
            <div class="lbl">Access Requirements</div>
            <div class="val">${esc(site.access_requirements)}</div>
          </div>` : ''}
          ${site.required_paperwork ? `<div style="grid-column:1/-1">
            <div class="lbl">Required Paperwork</div>
            <div class="val">${esc(site.required_paperwork)}</div>
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="section">
      <div class="section-head">Summary</div>
      <div class="section-body">
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-n" style="color:#16a34a">${done}</div>
            <div class="stat-l">Complete</div>
          </div>
          <div class="stat-tile">
            <div class="stat-n" style="color:#1e3a5f">${total}</div>
            <div class="stat-l">Total ${itemLabel}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-n" style="color:#dc2626">${openTickets.length}</div>
            <div class="stat-l">Open Tickets</div>
          </div>
          <div class="stat-tile">
            <div class="stat-n" style="color:${pct===100?'#16a34a':'#2563eb'}">${pct}%</div>
            <div class="stat-l">Done</div>
          </div>
        </div>
        <div style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-bottom:4px">
            <span>Overall progress</span><span style="font-weight:700;color:${pct===100?'#16a34a':'#2563eb'}">${pct}%</span>
          </div>
          <div class="prog-bar">
            <div class="prog-fill" style="width:${pct}%;background:${pct===100?'#16a34a':'#2563eb'}"></div>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px;font-size:10px">
            <span style="color:#16a34a">● ${done} complete</span>
            ${inProg > 0 ? `<span style="color:#d97706">● ${inProg} in progress</span>` : ''}
            <span style="color:#6b7280">● ${notStarted} not started</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Campaigns -->
    <div class="section">
      <div class="section-head">Campaign Progress</div>
      <div class="section-body" style="padding:8px 0">
        <table class="camp-table">
          <tbody>${campaignHtml}</tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- Data hall breakdown (SyCool sites only) -->
  ${hallBreakdownHtml()}

  <!-- Open tickets -->
  <div class="section">
    <div class="section-head">Open Tickets (${openTickets.length})</div>
    <table class="issue-table">
      <thead><tr><th>#</th><th>Unit</th><th>Description</th><th>Status</th></tr></thead>
      <tbody>${ticketHtml}</tbody>
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
