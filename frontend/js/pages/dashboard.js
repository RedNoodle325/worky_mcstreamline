async function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header" style="margin-bottom:20px">
      <div>
        <h1 style="font-size:20px;font-weight:800;letter-spacing:0.06em">MUNTERS PM DASHBOARD</h1>
        <div class="page-subtitle" id="dash-subtitle">Loading…</div>
      </div>
    </div>
    <div id="dash-site-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">
      <div style="color:var(--text3);padding:40px">Loading sites…</div>
    </div>`;

  try {
    const [sites, units, tickets] = await Promise.all([
      API.sites.list(),
      API.units.list(),
      API.tickets.list(),
    ]);

    const openTickets = tickets.filter(t => !['resolved','closed'].includes(t.status||'')).length;
    const sitesOnline = sites.filter(s => s.techs_on_site).length;
    document.getElementById('dash-subtitle').textContent =
      `${sites.length} site${sites.length!==1?'s':''} · ${units.length} units · ${openTickets} open ticket${openTickets!==1?'s':''}${sitesOnline?' · '+sitesOnline+' site'+(sitesOnline!==1?'s':'')+' staffed':''}`;

    renderSiteCards(sites, units, tickets);
  } catch (e) {
    toast('Failed to load dashboard: ' + e.message, 'error');
  }
}

function renderSiteCards(sites, units, tickets) {
  const el = document.getElementById('dash-site-cards');
  if (!sites.length) {
    el.innerHTML = `<div style="color:var(--text3);padding:40px;grid-column:1/-1;text-align:center">
      No sites yet. <a href="#" onclick="navigate('site-form')" style="color:var(--accent)">Add a site</a>
    </div>`;
    return;
  }

  el.innerHTML = sites.map(site => {
    const siteUnits = units.filter(u => u.site_id === site.id)
      .sort((a,b) => (a.line_number||0) - (b.line_number||0));
    const siteTickets = tickets.filter(t => t.site_id === site.id);

    const openCount = siteTickets.filter(t => t.status === 'open').length;
    const inProgCount = siteTickets.filter(t => ['parts_ordered','tech_dispatched','on_site'].includes(t.status||'')).length;
    const resolvedCount = siteTickets.filter(t => t.status === 'resolved').length;

    // Units with any open/in-progress tickets
    const unitsWithIssues = new Set(siteTickets.filter(t => !['resolved','closed'].includes(t.status||'')).map(t=>t.unit_id).filter(Boolean)).size;

    // Commission dot grid
    const maxLine = siteUnits.length ? Math.max(...siteUnits.map(u=>u.line_number||1), 10) : 10;
    const cols = Math.min(maxLine, 20);
    const byLine = {};
    siteUnits.forEach(u => { byLine[u.line_number] = u; });
    const nums = Array.from({length: cols}, (_,i)=>i+1);

    const coilLevel = (u) => {
      const lvl = u?.commission_level;
      if (!lvl || lvl==='none') return 'none';
      if (lvl==='complete') return 'complete';
      const n = parseInt(lvl.replace('L',''));
      return n >= 3 ? 'complete' : 'progress';
    };

    const lastContact = site.last_contact_date
      ? new Date(site.last_contact_date).toLocaleDateString()
      : null;

    const techsBadge = site.techs_on_site
      ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#14532d44;color:#4ade80;border:1px solid #4ade8044;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:600">🔧 On Site</span>`
      : '';

    const logoHtml = site.logo_url
      ? `<img src="${escHtml(site.logo_url)}" style="height:28px;max-width:80px;object-fit:contain;border-radius:3px" />`
      : '';

    return `
    <div class="dash-site-card" style="cursor:pointer" onclick="navigate('site-detail',{id:'${site.id}'})">
      <div class="dash-site-name" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(site.name||'—')}</span>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          ${logoHtml}
          ${techsBadge}
        </div>
      </div>

      <!-- Issue summary bar -->
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1;background:var(--bg3);border-radius:6px;padding:7px 8px;text-align:center;border-top:2px solid var(--red)">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:2px">Open</div>
          <div style="font-size:20px;font-weight:800;color:${openCount>0?'var(--red)':'var(--text3)'}">${openCount}</div>
        </div>
        <div style="flex:1;background:var(--bg3);border-radius:6px;padding:7px 8px;text-align:center;border-top:2px solid var(--orange)">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:2px">In Progress</div>
          <div style="font-size:20px;font-weight:800;color:${inProgCount>0?'var(--orange)':'var(--text3)'}">${inProgCount}</div>
        </div>
        <div style="flex:1;background:var(--bg3);border-radius:6px;padding:7px 8px;text-align:center;border-top:2px solid var(--green)">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:2px">Resolved</div>
          <div style="font-size:20px;font-weight:800;color:${resolvedCount>0?'var(--green)':'var(--text3)'}">${resolvedCount}</div>
        </div>
      </div>

      <!-- Commission dot grid -->
      <div style="overflow-x:auto;margin-bottom:8px">
        <div style="display:flex;align-items:center;margin-bottom:2px">
          <div class="dash-row-label">COIL</div>
          ${nums.map(n => {
            const u = byLine[n];
            const lvl = u ? coilLevel(u) : 'none';
            const cls = lvl==='complete'?'dot-complete':lvl==='progress'?'dot-progress':'dot-none';
            return `<div class="unit-dot ${cls}" title="${u?serial(u):'#'+n}">${lvl==='complete'?'✓':''}</div>`;
          }).join('')}
        </div>
        <div style="display:flex;align-items:center">
          <div class="dash-row-label">PM</div>
          ${nums.map(n => {
            const u = byLine[n];
            const lvl = u?.commission_level||'none';
            const cls = lvl==='complete'?'dot-complete':(lvl&&lvl!=='none')?'dot-progress':'dot-none';
            return `<div class="unit-dot ${cls}" title="${u?serial(u):'#'+n}">${lvl==='complete'?'✓':''}</div>`;
          }).join('')}
        </div>
      </div>

      <!-- Footer meta -->
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text3);border-top:1px solid var(--border);padding-top:7px;margin-top:4px">
        <span>${siteUnits.length} unit${siteUnits.length!==1?'s':''}${unitsWithIssues?' · <span style="color:var(--orange)">'+unitsWithIssues+' affected</span>':''}</span>
        <span>${lastContact ? '📞 '+lastContact : '<span style="color:var(--text3)">No contact logged</span>'}</span>
      </div>
    </div>`;
  }).join('');
}
