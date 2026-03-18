async function renderSiteDetail(container, { id } = {}) {
  if (!id) { navigate('sites'); return; }

  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let site, allUnits, tickets, contacts, forms, contractors, jobNumbers;
  try {
    [site, allUnits, tickets, contacts, forms, contractors, jobNumbers] = await Promise.all([
      API.sites.get(id),
      API.units.list(),
      API.tickets.list(),
      API.site_contacts.list(id),
      API.site_forms.list(id),
      API.contractors.list(),
      API.site_job_numbers.list(id),
    ]);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error loading site: ${escHtml(e.message)}</div>`;
    return;
  }

  let siteUnits = allUnits.filter(u => u.site_id === id)
    .sort((a, b) => (a.line_number || 0) - (b.line_number || 0));
  const siteTickets = tickets.filter(t => t.site_id === id);
  const openTickets = siteTickets.filter(t => !['resolved', 'closed'].includes(t.status));

  renderPage();

  function renderPage() {
    const addr = [site.address, site.city, site.state, site.zip_code].filter(Boolean).join(', ');
    const mapQuery = encodeURIComponent(addr || (site.name || ''));
    const mapSrc = mapQuery
      ? `https://maps.google.com/maps?q=${mapQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`
      : '';

    const completeUnits = siteUnits.filter(u => u.commission_level === 'complete');
    const inProgUnits = siteUnits.filter(u => u.commission_level && u.commission_level !== 'none' && u.commission_level !== 'complete');
    const pct = siteUnits.length ? Math.round(completeUnits.length / siteUnits.length * 100) : 0;

    container.innerHTML = `
      <!-- Header -->
      <div class="page-header" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:16px">
          <button class="btn btn-secondary btn-sm" onclick="navigate('sites')">← Sites</button>
          ${site.logo_url
            ? `<img src="${escHtml(site.logo_url)}" alt="logo" style="height:40px;object-fit:contain;border-radius:4px">`
            : `<div style="width:40px;height:40px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;display:grid;place-items:center;color:var(--text3);font-size:10px;text-align:center;cursor:pointer" onclick="document.getElementById('logo-upload').click()" title="Upload logo">LOGO</div>`
          }
          <div>
            <h1 style="margin:0">${escHtml(site.name || '—')}</h1>
            <div class="page-subtitle">${escHtml([site.city, site.state].filter(Boolean).join(', ') || 'No address set')}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-sm ${site.techs_on_site ? 'btn-success' : 'btn-secondary'}" id="techs-toggle" title="Toggle technicians on site">
            🔧 ${site.techs_on_site ? 'Techs On Site' : 'No Techs On Site'}
          </button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer" title="Upload company logo">
            🖼 Logo
            <input type="file" id="logo-upload" accept="image/*" style="display:none" onchange="uploadLogo(this)">
          </label>
          <button class="btn btn-secondary btn-sm" onclick="navigate('site-form',{id:'${id}',backTo:'site-detail',backParams:{id:'${id}'}})">Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="printSiteReport('${id}')">🖨</button>
        </div>
      </div>

      <!-- Top row: Info + Map -->
      <div class="grid-2" style="gap:16px;margin-bottom:16px">
        <div class="card">
          <div class="card-title">Site Information</div>
          <div class="grid-2" style="gap:8px;margin-top:8px">
            <div>
              <div class="section-title">Shipping Address</div>
              ${site.shipping_name
                ? `<div style="font-weight:600;color:var(--text)">${escHtml(site.shipping_name)}</div>`
                : `<div style="color:var(--red);font-size:12px">⚠ No shipping name set</div>`}
              ${site.shipping_contact_name || site.shipping_contact_phone
                ? `<div style="font-size:12px;color:var(--text2);margin-top:2px">
                     ${site.shipping_contact_name ? escHtml(site.shipping_contact_name) : ''}
                     ${site.shipping_contact_phone ? `<a href="tel:${escHtml(site.shipping_contact_phone)}" style="margin-left:6px">${escHtml(site.shipping_contact_phone)}</a>` : ''}
                   </div>`
                : ''}
              <div style="color:var(--text2);margin-top:2px">${escHtml([site.shipping_address_street, site.shipping_address_city, site.shipping_address_state, site.shipping_address_zip].filter(Boolean).join(', ') || '—')}</div>
            </div>
            <div>
              <div class="section-title">Site Address</div>
              <div style="color:var(--text2)">${escHtml(addr || '—')}</div>
            </div>
            <div>
              <div class="section-title">Access Requirements</div>
              <div style="color:var(--text2);white-space:pre-wrap;font-size:12px">${escHtml(site.access_requirements || '—')}</div>
            </div>
            <div>
              <div class="section-title">Required Paperwork</div>
              <div style="color:var(--text2);white-space:pre-wrap;font-size:12px">${escHtml(site.required_paperwork || '—')}</div>
            </div>
            ${site.orientation_info ? `<div class="full">
              <div class="section-title">Orientation / Safety</div>
              <div style="color:var(--text2);white-space:pre-wrap;font-size:12px">${escHtml(site.orientation_info)}</div>
            </div>` : ''}
            ${site.notes ? `<div class="full">
              <div class="section-title">Notes</div>
              <div style="color:var(--text2);white-space:pre-wrap;font-size:12px">${escHtml(site.notes)}</div>
            </div>` : ''}
            <div>
              <div class="section-title">Last Contact</div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="color:var(--text2)" id="last-contact-display">${site.last_contact_date ? fmt(site.last_contact_date) : '—'}</span>
                <input type="date" id="last-contact-input" value="${site.last_contact_date ? site.last_contact_date.split('T')[0] : ''}" style="display:none;width:140px" />
                <button class="btn btn-secondary btn-sm" id="last-contact-edit-btn">Edit</button>
              </div>
            </div>
          </div>
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          ${mapSrc
            ? `<iframe src="${mapSrc}" width="100%" height="100%" style="border:0;min-height:280px;display:block" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
            : `<div style="display:flex;align-items:center;justify-content:center;height:280px;color:var(--text3)">No address set — add an address to see map</div>`
          }
        </div>
      </div>

      <!-- Contacts + Forms row -->
      <div class="grid-2" style="gap:16px;margin-bottom:16px">
        <!-- Contacts -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div class="card-title">Contacts</div>
            <button class="btn btn-sm btn-primary" onclick="openContactForm(null)">+ Add</button>
          </div>
          <div id="contacts-list">${renderContactsList(contacts)}</div>
        </div>

        <!-- Form Templates -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div class="card-title">Form Templates</div>
            <button class="btn btn-sm btn-primary" onclick="openFormTemplateForm(null)">+ Add</button>
          </div>
          <div id="forms-list">${renderFormsList(forms)}</div>
        </div>
      </div>

      <!-- Job Numbers -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Job Numbers</div>
          <button class="btn btn-sm btn-primary" onclick="openJobNumberForm(null)">+ Add</button>
        </div>
        <div id="job-numbers-list">${renderJobNumbersList(jobNumbers)}</div>
      </div>

      <!-- Units -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Units <span style="font-weight:400;color:var(--text3)">(${siteUnits.length})</span></div>
          <div style="display:flex;gap:8px">
            <label class="btn btn-sm btn-secondary" style="cursor:pointer" title="Import units from Astea CSV">
              ↑ Import CSV
              <input type="file" id="unit-csv-import" accept=".csv,text/csv" style="display:none" onchange="importUnitsFromCSV(this)">
            </label>
            <button class="btn btn-sm btn-primary" onclick="navigate('unit-form',{siteId:'${id}',backTo:'site-detail',backParams:{id:'${id}'}})">+ New Unit</button>
          </div>
        </div>
        <div id="units-list">${renderUnitsList(siteUnits, siteTickets)}</div>
      </div>

      <!-- Contractors -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Contractors</div>
          <button class="btn btn-sm btn-secondary" onclick="navigate('contacts')">Manage All</button>
        </div>
        ${renderContractorsList(contractors)}
      </div>

      <!-- Commission Snapshot -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Commissioning Snapshot</div>
          <div style="display:flex;gap:16px;font-size:12px;color:var(--text2)">
            <span>${completeUnits.length}/${siteUnits.length} complete</span>
            <span style="color:var(--green);font-weight:600">${pct}%</span>
          </div>
        </div>
        ${renderCommissionGrid(siteUnits)}
        ${renderCommissionBreakdown(siteUnits)}
      </div>

      <!-- Post-Commission Status -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Post-Commission Status</div>
          <div style="font-size:12px;color:var(--text2)">${completeUnits.length} units commissioned · ${openTickets.length} open issues</div>
        </div>
        ${renderPostCommission(siteUnits, siteTickets)}
      </div>
    `;

    // Attach event handlers
    attachSiteDetailHandlers(id, site, contacts, forms, siteUnits, siteTickets, contractors, jobNumbers);
  }

  // ── Units list ─────────────────────────────────────────────────────────────
  function renderUnitsList(unitList, ticketList) {
    if (!unitList.length) return '<div style="color:var(--text3);font-size:13px">No units yet</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Tag / Job</th><th>Type</th><th>Model</th><th>Commission</th><th>Open Issues</th><th></th></tr></thead>
      <tbody>
        ${unitList.map(u => {
          const openCount = ticketList.filter(t => t.unit_id === u.id && !['resolved','closed'].includes(t.status||'')).length;
          return `<tr>
            <td style="color:var(--text3)">${u.line_number||'—'}</td>
            <td><a onclick="navigate('unit-detail',{id:'${u.id}',backTo:'site-detail',backParams:{id:'${id}'}})" style="cursor:pointer;font-family:monospace">${escHtml(serial(u))}</a></td>
            <td>${unitTypeBadge(u.unit_type)}</td>
            <td style="font-size:12px;color:var(--text2)">${escHtml(u.model||'—')}</td>
            <td>${commissionBadge(u.commission_level||'none')}</td>
            <td style="text-align:center">${openCount>0?`<span style="color:var(--red);font-weight:700">${openCount}</span>`:'<span style="color:var(--green)">✓</span>'}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-secondary" onclick="navigate('unit-detail',{id:'${u.id}',backTo:'site-detail',backParams:{id:'${id}'}})">View</button>
              <button class="btn btn-sm btn-secondary" onclick="navigate('unit-form',{id:'${u.id}',backTo:'site-detail',backParams:{id:'${id}'}})" style="margin-left:4px">Edit</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  // ── Job numbers list ───────────────────────────────────────────────────────
  function renderJobNumbersList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No job numbers added yet</div>';
    return `<div style="display:flex;flex-wrap:wrap;gap:8px">
      ${list.map(j => `
        <div style="display:inline-flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:5px 10px">
          ${j.is_primary ? `<span style="color:var(--accent);font-size:10px;font-weight:700;text-transform:uppercase">PRIMARY</span>` : ''}
          <span style="font-family:monospace;font-weight:600;color:var(--text)">${escHtml(j.job_number)}</span>
          ${j.description ? `<span style="font-size:11px;color:var(--text3)">${escHtml(j.description)}</span>` : ''}
          <button class="btn btn-sm btn-secondary" style="padding:1px 6px;font-size:11px" onclick="openJobNumberForm('${j.id}')">✎</button>
          <button class="btn btn-sm btn-secondary" style="padding:1px 6px;font-size:11px;color:var(--red)" onclick="deleteJobNumber('${j.id}')">✕</button>
        </div>`).join('')}
    </div>`;
  }

  // ── Contractors list (read-only on site page) ───────────────────────────────
  function renderContractorsList(list) {
    if (!list.length) return `<div style="color:var(--text3);font-size:13px">No contractors yet. <a href="#" onclick="navigate('contacts')" style="color:var(--accent)">Add from Contacts</a></div>`;
    const active = list.filter(c => c.active !== false);
    return `<div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Company</th><th>Phone</th><th>Certifications</th><th></th></tr></thead>
      <tbody>
        ${active.slice(0,8).map(c => `<tr>
          <td>${escHtml(c.name||'—')}</td>
          <td style="color:var(--text2)">${escHtml(c.company||'—')}</td>
          <td style="font-size:12px">${c.phone?`<a href="tel:${escHtml(c.phone)}">${escHtml(c.phone)}</a>`:'—'}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(c.certifications||'—')}</td>
          <td><button class="btn btn-sm btn-secondary" onclick="navigate('contractor-detail',{id:'${c.id}'})">Edit</button></td>
        </tr>`).join('')}
        ${active.length > 8 ? `<tr><td colspan="5" style="color:var(--text3);font-size:12px">+ ${active.length-8} more — <a onclick="navigate('contacts')" style="color:var(--accent);cursor:pointer">view all</a></td></tr>` : ''}
      </tbody>
    </table></div>`;
  }

  // ── Contacts list ─────────────────────────────────────────────────────────
  function renderContactsList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No contacts yet</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th><th></th></tr></thead>
      <tbody>
        ${list.map(c => `<tr>
          <td style="font-weight:500">${escHtml(c.name)}</td>
          <td style="color:var(--text2);font-size:12px">${escHtml(c.role || '—')}</td>
          <td style="font-size:12px">${c.phone ? `<a href="tel:${escHtml(c.phone)}">${escHtml(c.phone)}</a>` : '—'}</td>
          <td style="font-size:12px">${c.email ? `<a href="mailto:${escHtml(c.email)}">${escHtml(c.email)}</a>` : '—'}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-sm btn-secondary" onclick="openContactForm('${c.id}')">Edit</button>
            <button class="btn btn-sm btn-secondary" onclick="deleteContact('${c.id}')" style="margin-left:4px">✕</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  // ── Forms list ────────────────────────────────────────────────────────────
  function renderFormsList(list) {
    const catColors = { safety: '#ef4444', permit: '#f97316', orientation: '#a855f7', checklist: '#3b82f6', general: '#64748b' };
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No form templates yet</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Category</th><th>Link</th><th></th></tr></thead>
      <tbody>
        ${list.map(f => {
          const color = catColors[f.category] || '#64748b';
          return `<tr>
            <td style="font-weight:500">${escHtml(f.name)}${f.description ? `<div style="font-size:11px;color:var(--text3)">${escHtml(f.description)}</div>` : ''}</td>
            <td><span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:99px;padding:1px 8px;font-size:11px;font-weight:600;text-transform:uppercase">${escHtml(f.category || 'general')}</span></td>
            <td style="font-size:12px">${f.url ? `<a href="${escHtml(f.url)}" target="_blank" rel="noopener">Open ↗</a>` : '—'}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-secondary" onclick="openFormTemplateForm('${f.id}')">Edit</button>
              <button class="btn btn-sm btn-secondary" onclick="deleteFormTemplate('${f.id}')" style="margin-left:4px">✕</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  // ── Commission grid ────────────────────────────────────────────────────────
  function renderCommissionGrid(unitList) {
    if (!unitList.length) return '<div style="color:var(--text3);font-size:13px">No units at this site</div>';
    const maxLine = Math.max(...unitList.map(u => u.line_number || 1));
    const byLine = {};
    unitList.forEach(u => { byLine[u.line_number] = u; });
    const nums = Array.from({ length: maxLine }, (_, i) => i + 1);

    const coilLevel = (u) => {
      const lvl = u?.commission_level;
      if (!lvl || lvl === 'none') return 'none';
      if (lvl === 'complete') return 'complete';
      return parseInt(lvl.replace('L', '')) >= 3 ? 'complete' : 'progress';
    };

    const dot = (state, unitId) => {
      const cls = state === 'complete' ? 'dot-complete' : state === 'progress' ? 'dot-progress' : 'dot-none';
      const content = state === 'complete' ? '✓' : '';
      const click = unitId ? `onclick="navigate('unit-detail',{id:'${unitId}',backTo:'${id}'})"` : '';
      return `<div class="unit-dot ${cls}" ${click} style="${unitId ? 'cursor:pointer' : ''}" title="${unitId ? 'View unit' : ''}">${content}</div>`;
    };

    return `
      <div class="dash-unit-grid" style="overflow-x:auto;margin-bottom:8px">
        <div class="dash-unit-header">
          <div class="dash-row-label"></div>
          ${nums.map(n => `<div class="dash-col-num">${n}</div>`).join('')}
        </div>
        <div class="dash-unit-row">
          <div class="dash-row-label">COIL</div>
          ${nums.map(n => dot(byLine[n] ? coilLevel(byLine[n]) : 'none', byLine[n]?.id)).join('')}
        </div>
        <div class="dash-unit-row">
          <div class="dash-row-label">PM</div>
          ${nums.map(n => {
            const u = byLine[n];
            const lvl = u?.commission_level || 'none';
            const state = lvl === 'complete' ? 'complete' : lvl === 'none' ? 'none' : 'progress';
            return dot(state, u?.id);
          }).join('')}
        </div>
      </div>
      <div style="display:flex;gap:16px;font-size:11px;color:var(--text3);margin-top:4px">
        <span><span class="unit-dot dot-complete" style="display:inline-flex;width:12px;height:12px;font-size:8px;vertical-align:middle;margin-right:4px">✓</span>Complete</span>
        <span><span class="unit-dot dot-progress" style="display:inline-flex;width:12px;height:12px;vertical-align:middle;margin-right:4px"></span>In Progress</span>
        <span><span class="unit-dot dot-none" style="display:inline-flex;width:12px;height:12px;vertical-align:middle;margin-right:4px"></span>Not Started</span>
        <span style="margin-left:8px;color:var(--accent)">Click a dot to open the unit</span>
      </div>`;
  }

  function renderCommissionBreakdown(unitList) {
    if (!unitList.length) return '';
    const levels = ['none', 'L1', 'L2', 'L3', 'L4', 'L5', 'complete'];
    const levelColors = { none: '#64748b', L1: '#3b82f6', L2: '#8b5cf6', L3: '#c0392b', L4: '#f97316', L5: '#22c55e', complete: '#22c55e' };
    const counts = {};
    levels.forEach(l => counts[l] = 0);
    unitList.forEach(u => { counts[u.commission_level || 'none']++; });
    const total = unitList.length;

    return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      ${levels.filter(l => counts[l] > 0).map(l => {
        const pct = Math.round(counts[l] / total * 100);
        return `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:12px">
          <span style="color:${levelColors[l]};font-weight:700">${l === 'none' ? 'Not Started' : l === 'complete' ? 'Complete' : l}</span>
          <span style="color:var(--text2);margin-left:6px">${counts[l]} units · ${pct}%</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── Post-commission ────────────────────────────────────────────────────────
  function renderPostCommission(unitList, ticketList) {
    const completeList = unitList.filter(u => u.commission_level === 'complete');
    if (!completeList.length) {
      return '<div style="color:var(--text3);font-size:13px">No commissioned units yet</div>';
    }
    const today = new Date();

    const rows = completeList.map(u => {
      const unitTickets = ticketList.filter(t => t.unit_id === u.id && !['resolved', 'closed'].includes(t.status));
      const warEnd = u.warranty_end_date ? new Date(u.warranty_end_date) : null;
      let warStatus = '—', warColor = 'var(--text3)';
      if (warEnd) {
        const daysLeft = Math.round((warEnd - today) / 86400000);
        if (daysLeft < 0) { warStatus = 'Expired'; warColor = 'var(--red)'; }
        else if (daysLeft < 30) { warStatus = `${daysLeft}d left`; warColor = 'var(--yellow)'; }
        else { warStatus = fmt(u.warranty_end_date); warColor = 'var(--green)'; }
      }
      return `<tr>
        <td><a onclick="navigate('unit-detail',{id:'${u.id}',backTo:'${id}'})" style="cursor:pointer;font-family:monospace">${escHtml(serial(u))}</a></td>
        <td>${unitTypeBadge(u.unit_type)}</td>
        <td style="font-size:12px;color:var(--text2)">${escHtml(u.model || '—')}</td>
        <td style="font-size:12px">${fmt(u.warranty_start_date)}</td>
        <td style="font-size:12px;color:${warColor};font-weight:${warEnd ? '600' : '400'}">${warStatus}</td>
        <td style="text-align:center">${unitTickets.length > 0
          ? `<span style="color:var(--red);font-weight:700">${unitTickets.length}</span>`
          : '<span style="color:var(--green)">✓</span>'}</td>
      </tr>`;
    });

    return `<div class="table-wrap"><table>
      <thead><tr><th>Unit</th><th>Type</th><th>Model</th><th>Warranty Start</th><th>Warranty End</th><th>Open Issues</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>`;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────
  function attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList, contractorList, jobNumberList) {

    // Techs on site toggle
    document.getElementById('techs-toggle')?.addEventListener('click', async () => {
      try {
        const updated = await API.sites.update(siteId, { techs_on_site: !siteData.techs_on_site });
        site = updated;
        siteData.techs_on_site = updated.techs_on_site;
        toast('Updated: ' + (updated.techs_on_site ? 'Techs on site' : 'No techs on site'));
        renderPage();
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });

    // Last contact date inline edit
    document.getElementById('last-contact-edit-btn')?.addEventListener('click', function() {
      const display = document.getElementById('last-contact-display');
      const input = document.getElementById('last-contact-input');
      if (input.style.display === 'none') {
        input.style.display = 'inline-block';
        display.style.display = 'none';
        this.textContent = 'Save';
      } else {
        API.sites.update(siteId, { last_contact_date: input.value || null }).then(updated => {
          site = updated;
          siteData.last_contact_date = updated.last_contact_date;
          display.textContent = updated.last_contact_date ? fmt(updated.last_contact_date) : '—';
          input.style.display = 'none';
          display.style.display = 'inline';
          this.textContent = 'Edit';
          toast('Last contact date saved');
        }).catch(e => toast('Error: ' + e.message, 'error'));
      }
    });

    // Logo upload
    window.uploadLogo = async (input) => {
      const file = input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('logo', file);
      try {
        const updated = await API.logo.upload(siteId, fd);
        site = updated;
        toast('Logo updated');
        renderPage();
      } catch (e) { toast('Logo upload failed: ' + e.message, 'error'); }
    };

    // Edit site — navigates to site-form page
    window.openEditSiteModal = () => navigate('site-form', { id: siteId, backTo: 'site-detail', backParams: { id: siteId } });

    // ── Contacts inline form ──────────────────────────────────────────────────
    function inlineContactForm(existing) {
      const panelId = 'inline-contact-panel';
      // Remove any existing panel
      document.getElementById(panelId)?.remove();
      const panel = document.createElement('div');
      panel.id = panelId;
      panel.style.cssText = 'background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:16px;margin-top:12px';
      panel.innerHTML = `
        <div style="font-weight:600;margin-bottom:12px;color:var(--text)">${existing ? 'Edit Contact' : 'Add Contact'}</div>
        <form id="contact-form">
          <div class="form-grid">
            <div class="form-group full"><label>Name *</label><input name="name" required value="${escHtml(existing?.name||'')}"/></div>
            <div class="form-group"><label>Role / Title</label><input name="role" value="${escHtml(existing?.role||'')}"/></div>
            <div class="form-group"><label>Phone</label><input name="phone" value="${escHtml(existing?.phone||'')}"/></div>
            <div class="form-group full"><label>Email</label><input name="email" type="email" value="${escHtml(existing?.email||'')}"/></div>
            <div class="form-group full"><label>Notes</label><textarea name="notes" rows="2">${escHtml(existing?.notes||'')}</textarea></div>
          </div>
          <div class="form-actions" style="margin-top:8px">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('${panelId}')?.remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add Contact'}</button>
          </div>
        </form>`;
      document.getElementById('contacts-list').after(panel);
      panel.querySelector('#contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
        try {
          if (existing) await API.site_contacts.update(siteId, existing.id, data);
          else await API.site_contacts.create(siteId, data);
          panel.remove();
          contacts = await API.site_contacts.list(siteId);
          contactList = contacts;
          document.getElementById('contacts-list').innerHTML = renderContactsList(contacts);
          attachSiteDetailHandlers(siteId, siteData, contacts, formList, unitList, ticketList, contractorList, jobNumberList);
          toast(existing ? 'Contact updated' : 'Contact added');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });
      panel.querySelector('input').focus();
    }

    window.openContactForm = (contactId) => {
      inlineContactForm(contactId ? contactList.find(c => c.id === contactId) : null);
    };

    window.deleteContact = async (contactId) => {
      if (!confirm('Delete this contact?')) return;
      try {
        await API.site_contacts.delete(siteId, contactId);
        contacts = await API.site_contacts.list(siteId);
        contactList = contacts;
        document.getElementById('contacts-list').innerHTML = renderContactsList(contacts);
        attachSiteDetailHandlers(siteId, siteData, contacts, formList, unitList, ticketList, contractorList, jobNumberList);
        toast('Contact deleted');
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };

    // ── Form templates inline form ────────────────────────────────────────────
    function inlineFormPanel(existing) {
      const panelId = 'inline-form-panel';
      document.getElementById(panelId)?.remove();
      const panel = document.createElement('div');
      panel.id = panelId;
      panel.style.cssText = 'background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:16px;margin-top:12px';
      panel.innerHTML = `
        <div style="font-weight:600;margin-bottom:12px;color:var(--text)">${existing ? 'Edit Form Template' : 'Add Form Template'}</div>
        <form id="form-template-form">
          <div class="form-grid">
            <div class="form-group full"><label>Name *</label><input name="name" required value="${escHtml(existing?.name||'')}"/></div>
            <div class="form-group full"><label>Description</label><input name="description" value="${escHtml(existing?.description||'')}"/></div>
            <div class="form-group"><label>Category</label>
              <select name="category">
                <option value="general" ${(existing?.category||'general')==='general'?'selected':''}>General</option>
                <option value="safety" ${existing?.category==='safety'?'selected':''}>Safety</option>
                <option value="permit" ${existing?.category==='permit'?'selected':''}>Permit</option>
                <option value="orientation" ${existing?.category==='orientation'?'selected':''}>Orientation</option>
                <option value="checklist" ${existing?.category==='checklist'?'selected':''}>Checklist</option>
              </select>
            </div>
            <div class="form-group full"><label>URL / Link</label><input name="url" type="url" value="${escHtml(existing?.url||'')}" placeholder="https://…"/></div>
          </div>
          <div class="form-actions" style="margin-top:8px">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('${panelId}')?.remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add Form'}</button>
          </div>
        </form>`;
      document.getElementById('forms-list').after(panel);
      panel.querySelector('#form-template-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
        try {
          if (existing) await API.site_forms.update(siteId, existing.id, data);
          else await API.site_forms.create(siteId, data);
          panel.remove();
          forms = await API.site_forms.list(siteId);
          formList = forms;
          document.getElementById('forms-list').innerHTML = renderFormsList(forms);
          attachSiteDetailHandlers(siteId, siteData, contactList, forms, unitList, ticketList, contractorList, jobNumberList);
          toast(existing ? 'Form updated' : 'Form added');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });
      panel.querySelector('input').focus();
    }

    window.openFormTemplateForm = (formId) => {
      inlineFormPanel(formId ? formList.find(f => f.id === formId) : null);
    };

    window.deleteFormTemplate = async (formId) => {
      if (!confirm('Delete this form template?')) return;
      try {
        await API.site_forms.delete(siteId, formId);
        forms = await API.site_forms.list(siteId);
        formList = forms;
        document.getElementById('forms-list').innerHTML = renderFormsList(forms);
        attachSiteDetailHandlers(siteId, siteData, contactList, forms, unitList, ticketList, contractorList, jobNumberList);
        toast('Form deleted');
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };

    // ── Job numbers inline form ───────────────────────────────────────────────
    function inlineJobNumberPanel(existing) {
      const panelId = 'inline-job-number-panel';
      document.getElementById(panelId)?.remove();
      const panel = document.createElement('div');
      panel.id = panelId;
      panel.style.cssText = 'background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:16px;margin-top:12px';
      panel.innerHTML = `
        <div style="font-weight:600;margin-bottom:12px;color:var(--text)">${existing ? 'Edit Job Number' : 'Add Job Number'}</div>
        <form id="job-number-form">
          <div class="form-grid">
            <div class="form-group"><label>Job Number *</label><input name="job_number" required value="${escHtml(existing?.job_number||'')}" placeholder="e.g. 22366582"/></div>
            <div class="form-group"><label>Description</label><input name="description" value="${escHtml(existing?.description||'')}" placeholder="e.g. Phase 1 REL06"/></div>
            <div class="form-group full"><label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" name="is_primary" ${existing?.is_primary?'checked':''} style="width:auto"/>
              Primary Job Number
            </label></div>
          </div>
          <div class="form-actions" style="margin-top:8px">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('${panelId}')?.remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add'}</button>
          </div>
        </form>`;
      document.getElementById('job-numbers-list').after(panel);
      panel.querySelector('#job-number-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
          job_number: fd.get('job_number'),
          description: fd.get('description') || null,
          is_primary: fd.get('is_primary') === 'on',
        };
        try {
          if (existing) await API.site_job_numbers.update(siteId, existing.id, data);
          else await API.site_job_numbers.create(siteId, data);
          panel.remove();
          jobNumbers = await API.site_job_numbers.list(siteId);
          jobNumberList = jobNumbers;
          document.getElementById('job-numbers-list').innerHTML = renderJobNumbersList(jobNumbers);
          attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList, contractorList, jobNumbers);
          toast(existing ? 'Job number updated' : 'Job number added');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });
      panel.querySelector('input').focus();
    }

    window.openJobNumberForm = (jobId) => {
      inlineJobNumberPanel(jobId ? jobNumberList.find(j => j.id === jobId) : null);
    };

    window.deleteJobNumber = async (jobId) => {
      if (!confirm('Delete this job number?')) return;
      try {
        await API.site_job_numbers.delete(siteId, jobId);
        jobNumbers = await API.site_job_numbers.list(siteId);
        jobNumberList = jobNumbers;
        document.getElementById('job-numbers-list').innerHTML = renderJobNumbersList(jobNumbers);
        attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList, contractorList, jobNumbers);
        toast('Job number deleted');
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };

    // ── Astea CSV import ──────────────────────────────────────────────────────
    window.importUnitsFromCSV = async (input) => {
      const file = input.files[0];
      if (!file) return;
      input.value = '';

      const text = await file.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) { toast('CSV appears empty', 'error'); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

      const idx = (name) => headers.indexOf(name);
      const col = (row, name) => {
        const i = idx(name);
        if (i < 0) return '';
        return row[i]?.trim().replace(/^"|"$/g, '') || '';
      };

      // Parse rows into objects grouped by serial_no (unit number)
      const rows = lines.slice(1).filter(l => l.trim()).map(line => {
        // Simple CSV split — handles unquoted fields
        const parts = line.split(',');
        return parts;
      });

      // Group by serial_no; each unit = one serial_no, may have COND and EVAP rows
      const bySerial = {};
      for (const row of rows) {
        const bpartId = col(row, 'bpart_id');       // e.g. 22366582-COND
        const serialNo = col(row, 'serial_no');     // e.g. 22366582-0001
        const installDate = col(row, 'install_date');
        const descr = col(row, 'descr');
        const status = col(row, 'status');

        if (!serialNo) continue;

        if (!bySerial[serialNo]) bySerial[serialNo] = { serialNo, rows: [] };
        bySerial[serialNo].rows.push({ bpartId, installDate, descr, status });
      }

      const units = Object.values(bySerial).map(({ serialNo, rows }) => {
        // Extract line number from serial (last 4 digits after last -)
        const linePart = serialNo.split('-').pop();
        const lineNumber = parseInt(linePart, 10) || null;

        // Use COND row for model/install date (shipped from VA), fallback to first row
        const condRow = rows.find(r => r.bpartId.endsWith('-COND'));
        const firstRow = rows[0];
        const mainRow = condRow || firstRow;

        // Parse install date
        let installDate = null;
        const rawDate = mainRow.installDate;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d)) installDate = d.toISOString().split('T')[0];
        }

        // Model from descr (take the model part before the comma)
        const descr = mainRow.descr || '';
        const model = descr.split(',')[0].trim();

        // Job number from bpart_id prefix (e.g. "22366582" from "22366582-COND")
        const jobNumber = mainRow.bpartId.split('-').slice(0, -1).join('-') || null;

        return {
          site_id: siteId,
          serial_number: serialNo,
          line_number: lineNumber,
          model: model || null,
          job_number: jobNumber,
          install_date: installDate,
          unit_type: 'evaporative_cooler',
          status: 'installed',
        };
      });

      if (!units.length) { toast('No units found in CSV', 'error'); return; }

      // Show preview modal
      const existing = new Set(unitList.map(u => u.serial_number));
      const toImport = units.filter(u => !existing.has(u.serial_number));
      const skipped = units.length - toImport.length;

      const modalId = 'csv-import-modal';
      document.getElementById(modalId)?.remove();
      const modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:680px;width:100%;max-height:80vh;overflow-y:auto">
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px">Import Units from Astea CSV</div>
          <div style="font-size:13px;color:var(--text3);margin-bottom:16px">
            Found <strong>${units.length}</strong> unique serial numbers.
            ${skipped > 0 ? `<span style="color:var(--orange)"> ${skipped} already exist and will be skipped.</span>` : ''}
            <strong style="color:var(--green)">${toImport.length} will be imported.</strong>
          </div>
          ${toImport.length === 0 ? '<div style="color:var(--text3)">Nothing new to import.</div>' : `
          <div style="max-height:300px;overflow-y:auto;margin-bottom:16px">
            <table style="width:100%;font-size:12px;border-collapse:collapse">
              <thead><tr style="background:var(--bg3)">
                <th style="padding:4px 8px;text-align:left">Serial No</th>
                <th style="padding:4px 8px;text-align:left">Line #</th>
                <th style="padding:4px 8px;text-align:left">Job #</th>
                <th style="padding:4px 8px;text-align:left">Model</th>
                <th style="padding:4px 8px;text-align:left">Install Date</th>
              </tr></thead>
              <tbody>
                ${toImport.map(u => `<tr style="border-top:1px solid var(--border)">
                  <td style="padding:4px 8px;font-family:monospace">${escHtml(u.serial_number)}</td>
                  <td style="padding:4px 8px;color:var(--text2)">${u.line_number ?? '—'}</td>
                  <td style="padding:4px 8px;color:var(--text2);font-family:monospace">${escHtml(u.job_number||'—')}</td>
                  <td style="padding:4px 8px;color:var(--text2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(u.model||'—')}</td>
                  <td style="padding:4px 8px;color:var(--text2)">${u.install_date||'—'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancel</button>
            <button class="btn btn-primary" id="confirm-import-btn">Import ${toImport.length} Units</button>
          </div>`}
          ${toImport.length === 0 ? `<div class="form-actions"><button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Close</button></div>` : ''}
        </div>`;
      document.body.appendChild(modal);

      document.getElementById('confirm-import-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('confirm-import-btn');
        btn.disabled = true;
        btn.textContent = 'Importing…';
        let imported = 0, failed = 0;
        for (const u of toImport) {
          try { await API.units.create(u); imported++; }
          catch (e) { failed++; console.warn('Failed to import', u.serial_number, e); }
        }
        modal.remove();
        // Refresh units
        const newAllUnits = await API.units.list();
        siteUnits = newAllUnits.filter(u => u.site_id === siteId)
          .sort((a, b) => (a.line_number || 0) - (b.line_number || 0));
        document.getElementById('units-list').innerHTML = renderUnitsList(siteUnits, siteTickets);
        attachSiteDetailHandlers(siteId, siteData, contactList, formList, siteUnits, ticketList, contractorList, jobNumberList);
        toast(`Imported ${imported} units${failed > 0 ? `, ${failed} failed` : ''}`, failed > 0 ? 'error' : 'success');
      });
    };
  }
}
