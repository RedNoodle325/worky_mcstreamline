async function renderSiteDetail(container, { id } = {}) {
  if (!id) { navigate('dashboard'); return; }

  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let site, allUnits, tickets, contacts, forms, contractors, campaigns, siteIssues, siteDocs, sycoolSystems, siteNotes, serviceTickets;
  try {
    [site, allUnits, tickets, contacts, forms, contractors, campaigns, siteIssues, siteDocs, sycoolSystems, siteNotes, serviceTickets] = await Promise.all([
      API.sites.get(id),
      API.units.list(),
      API.tickets.list(),
      API.site_contacts.list(id),
      API.site_forms.list(id),
      API.contractors.list(),
      API.campaigns.list(id).catch(() => []),
      API.issues.listSite(id).catch(() => []),
      API.documents.list(id).catch(() => []),
      API.sycool_systems.list(id).catch(() => []),
      API.notes.listSite(id).catch(() => []),
      API.service_tickets.list(id).catch(() => []),
    ]);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error loading site: ${escHtml(e.message)}</div>`;
    return;
  }

  // Commission level helpers — shared by all inner functions
  const isCxComplete = (lvl) => lvl === 'complete' || lvl === 'l3' || lvl === 'L3';
  const isCxStarted  = (lvl) => !!lvl && lvl !== 'none';

  const issuePriorityColor = { critical: 'var(--red)', high: 'var(--orange)', low: 'var(--text3)' };
  const issueStatusColor   = { open: 'var(--red)', in_progress: 'var(--yellow)', closed: 'var(--text3)', work_complete: 'var(--green)', ready_to_inspect: 'var(--accent)' };
  const issueStatusLabel   = { open: 'Open', in_progress: 'In Progress', closed: 'Closed', work_complete: 'Work Complete', ready_to_inspect: 'Ready to Inspect' };
  const NOTE_TYPE_CONFIG   = { meeting: { icon: '👥', label: 'Meeting', color: '#7c3aed' }, phone_call: { icon: '📞', label: 'Phone Call', color: '#2563eb' }, email: { icon: '✉️', label: 'Email', color: '#0891b2' }, note: { icon: '📝', label: 'Note', color: '#6b7280' } };
  const CONTENT_LABELS     = { date:'Date', attendees:'Attendees', agenda:'Agenda', notes:'Notes', actions:'Action Items', with:'With', purpose:'Purpose', to_from:'To / From', subject:'Subject' };
  const contactTypeLabel   = { site_contact: 'Site Contact', munters_employee: 'Munters', contractor: 'Contractor' };
  const contactTypeColor   = { site_contact: '#3b82f6', munters_employee: '#f97316', contractor: '#a855f7' };
  const csTicketStatusColor = { open: 'var(--blue)', in_progress: 'var(--yellow)', complete: 'var(--green)', cancelled: 'var(--text3)' };
  const csTicketStatusLabel = { open: 'Open', in_progress: 'In Progress', complete: 'Complete', cancelled: 'Cancelled' };

  let siteUnits = allUnits.filter(u => u.site_id === id)
    .sort((a, b) => (a.line_number || 0) - (b.line_number || 0));
  const siteTickets = tickets.filter(t => t.site_id === id);
  const openTickets = siteTickets.filter(t => !['resolved', 'closed'].includes(t.status));

  renderPage();
  loadGoogleMap();

  function loadGoogleMap() {
    const addr = [site.address, site.city, site.state, site.zip_code].filter(Boolean).join(', ');
    if (!addr) return;
    const placeholder = document.getElementById('map-placeholder');
    if (!placeholder) return;
    const src = `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&output=embed&z=14`;
    placeholder.outerHTML = `<iframe src="${src}" width="100%" height="280" style="border:0;display:block" loading="lazy"></iframe>`;
  }

  function renderPage() {
    const addr = [site.address, site.city, site.state, site.zip_code].filter(Boolean).join(', ');
    const mapQuery = addr;

    // ── Collapsible card helper ───────────────────────────────────────────────
    function colCard(id, title, rightHtml, bodyHtml, open = false) {
      return `<div class="card" style="margin-bottom:16px">
        <div id="${id}-hdr" onclick="toggleCard('${id}')"
          style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;${open ? 'padding-bottom:12px' : ''}">
          <div style="display:flex;align-items:center;gap:8px">
            <span id="${id}-chev" style="font-size:11px;color:var(--text3);transition:transform .2s;${open ? 'transform:rotate(90deg)' : ''}">▶</span>
            <div class="card-title" style="margin:0">${title}</div>
          </div>
          <div onclick="event.stopPropagation()">${rightHtml || ''}</div>
        </div>
        <div id="${id}-body" style="display:${open ? 'block' : 'none'}">${bodyHtml}</div>
      </div>`;
    }

    // For SyCool sites track 120 systems; for others track individual units
    const hasSyCool = sycoolSystems.length > 0;
    const trackingItems = hasSyCool ? sycoolSystems : siteUnits;
    const completeUnits = hasSyCool
      ? sycoolSystems.filter(s => isCxComplete(s.accu?.commission_level) && isCxComplete(s.crac?.commission_level))
      : siteUnits.filter(u => isCxComplete(u.commission_level));
    const inProgUnits = hasSyCool
      ? sycoolSystems.filter(s => {
          const aOk = isCxComplete(s.accu?.commission_level), cOk = isCxComplete(s.crac?.commission_level);
          const aGo = isCxStarted(s.accu?.commission_level), cGo = isCxStarted(s.crac?.commission_level);
          return (aGo || cGo) && !(aOk && cOk);
        })
      : siteUnits.filter(u => isCxStarted(u.commission_level) && !isCxComplete(u.commission_level));
    const pct = trackingItems.length ? Math.round(completeUnits.length / trackingItems.length * 100) : 0;

    const phaseConfig = {
      production_shipping: { label: 'Production & Shipping',          color: '#6366f1' },
      commissioning_l2:    { label: 'L2 – Pre-Energization',         color: '#f97316' },
      commissioning_l3:    { label: 'L3 – Startup',                  color: '#eab308' },
      commissioning_l4:    { label: 'L4 – Sequence of Operations',   color: '#3b82f6' },
      commissioning_l5:    { label: 'L5 – Integrated Systems Test',  color: '#06b6d4' },
      warranty:            { label: 'Warranty',                       color: 'var(--green)' },
      extended_warranty:   { label: 'Extended Warranty',              color: '#f59e0b' },
      out_of_warranty:     { label: 'Out of Warranty',                color: 'var(--text3)' },
      // legacy
      pre_commissioning:   { label: 'Pre-Commissioning',              color: '#6366f1' },
    };
    const WARRANTY_PHASES = new Set(['warranty','extended_warranty','out_of_warranty']);
    const isWarrantyPhase = WARRANTY_PHASES.has(site.lifecycle_phase);
    const phase = phaseConfig[site.lifecycle_phase || 'production_shipping'] || phaseConfig.production_shipping;

    const siteStatusConfig = {
      normal:       { label: 'Normal',        color: 'var(--green)', desc: 'All systems running normally' },
      open_issues:  { label: 'Open Issues',   color: '#f59e0b',      desc: 'Active issues being tracked' },
      techs_onsite: { label: 'Techs on Site', color: 'var(--blue)',  desc: 'Service technicians currently on site' },
      emergency:    { label: 'Emergency',     color: 'var(--red)',   desc: 'Emergency — immediate attention required' },
    };
    const siteStatus = siteStatusConfig[site.site_status || 'normal'] || siteStatusConfig.normal;

    container.innerHTML = `
      <!-- Header -->
      <div class="page-header" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:16px">
          <button class="btn btn-secondary btn-sm" onclick="navigate('dashboard')">← Dashboard</button>
          ${site.logo_url
            ? `<span style="display:inline-flex;align-items:center;justify-content:center;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;height:32px;box-sizing:border-box"><img src="${escHtml(site.logo_url)}" alt="logo" style="height:20px;max-width:80px;object-fit:contain" onerror="this.parentElement.style.display='none'"></span>`
            : ``
          }
          <div>
            <h1 style="margin:0">${escHtml(site.name || '—')}</h1>
            <div class="page-subtitle">${escHtml([site.city, site.state].filter(Boolean).join(', ') || 'No address set')}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="edit-ui" style="display:contents">
            <button class="btn btn-sm ${site.techs_on_site ? 'btn-success' : 'btn-secondary'}" id="techs-toggle" title="Toggle technicians on site">
              🔧 ${site.techs_on_site ? 'Techs On Site' : 'No Techs On Site'}
            </button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer" title="Upload company logo">
              🖼 Logo
              <input type="file" id="logo-upload" accept="image/*" style="display:none" onchange="uploadLogo(this)">
            </label>
            <button class="btn btn-secondary btn-sm" onclick="navigate('site-form',{id:'${id}',backTo:'site-detail',backParams:{id:'${id}'}})">Edit</button>
          </span>
          <button class="btn btn-secondary btn-sm" onclick="printSiteReport('${id}')">🖨</button>
        </div>
      </div>

      <!-- Site Status Banner -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;background:${siteStatus.color}11;border:1px solid ${siteStatus.color}33;border-radius:10px;padding:12px 18px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span id="site-status-badge" style="background:${siteStatus.color};color:#fff;border-radius:6px;padding:5px 14px;font-size:13px;font-weight:700;white-space:nowrap">${siteStatus.label}</span>
          <span style="background:${phase.color}22;color:${phase.color};border:1px solid ${phase.color}44;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap">${phase.label}</span>
          <span style="font-size:12px;color:var(--text2)">${siteStatus.desc}</span>
          ${isWarrantyPhase ? (() => {
            const today = new Date();
            const warEnd = site.warranty_end_date ? new Date(site.warranty_end_date) : null;
            const extEnd = site.extended_warranty_end ? new Date(site.extended_warranty_end) : null;
            const activeEnd = extEnd || warEnd;
            if (!activeEnd) return '';
            const days = Math.round((activeEnd - today) / 86400000);
            const color = days < 0 ? 'var(--red)' : days < 60 ? 'var(--yellow)' : 'var(--green)';
            const label = days < 0 ? 'Expired' : days === 0 ? 'Expires today' : `${days}d remaining`;
            return `<span style="color:${color};font-size:12px;font-weight:600">⏱ ${label}</span>`;
          })() : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center" class="edit-ui">
          <select id="site-status-select" title="Change site status" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--bg2);color:var(--text1)">
            ${Object.entries(siteStatusConfig).map(([k,v]) => `<option value="${k}" ${(site.site_status||'normal')===k?'selected':''}>${v.label}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-secondary" onclick="navigate('site-form',{id:'${id}',backTo:'site-detail',backParams:{id:'${id}'}})">Edit Phase / Dates</button>
        </div>
      </div>

      <!-- Quick Actions -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn btn-secondary" id="qa-add-issue-btn" style="flex:1;min-width:120px">⚠ Add Issue</button>
        <button class="btn btn-secondary" id="qa-add-ticket-btn" style="flex:1;min-width:120px">🎫 New CS Ticket</button>
        <button class="btn btn-secondary" id="qa-log-contact-btn" style="flex:1;min-width:120px">📞 Log Contact</button>
        <button class="btn btn-secondary" id="qa-add-todo-btn" style="flex:1;min-width:120px">✅ Add Task</button>
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
            ${(site.customer_contact_name || site.customer_contact_phone || site.customer_contact_email) ? `<div>
              <div class="section-title">Primary Contact</div>
              <div style="color:var(--text2)">
                ${site.customer_contact_name ? `<div style="font-weight:500;color:var(--text)">${escHtml(site.customer_contact_name)}</div>` : ''}
                ${site.customer_contact_phone ? `<div style="font-size:12px"><a href="tel:${escHtml(site.customer_contact_phone)}">${escHtml(site.customer_contact_phone)}</a></div>` : ''}
                ${site.customer_contact_email ? `<div style="font-size:12px"><a href="mailto:${escHtml(site.customer_contact_email)}">${escHtml(site.customer_contact_email)}</a></div>` : ''}
              </div>
            </div>` : ''}
            ${(() => {
              const jobNums = [...new Set(
                siteUnits.map(u => u.job_number ? u.job_number.split('-')[0].trim() : null).filter(Boolean)
              )];
              return jobNums.length ? `<div>
                <div class="section-title">Job Numbers</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">
                  ${jobNums.map(j => `<span style="font-family:monospace;font-size:12px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:2px 8px;color:var(--text2)">${escHtml(j)}</span>`).join('')}
                </div>
              </div>` : '';
            })()}
            <div>
              <div class="section-title">Last Contact</div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="color:var(--text2)" id="last-contact-display">${site.last_contact_date ? fmt(site.last_contact_date) : '—'}</span>
                <input type="date" id="last-contact-input" value="${site.last_contact_date ? site.last_contact_date.split('T')[0] : ''}" style="display:none;width:140px" />
                <button class="btn btn-secondary btn-sm edit-ui" id="last-contact-edit-btn">Edit</button>
              </div>
            </div>
          </div>
        </div>
        <div class="card" style="padding:0;overflow:hidden" id="map-card">
          ${mapQuery
            ? `<div id="map-placeholder" style="display:flex;align-items:center;justify-content:center;height:280px;color:var(--text3);font-size:13px">Loading map…</div>`
            : `<div style="display:flex;align-items:center;justify-content:center;height:280px;color:var(--text3)">No address set — add an address to see map</div>`
          }
        </div>
      </div>

      <!-- Issues — starts open, near top -->
      ${colCard('issues-card',
        `Issues <span style="font-weight:400;color:var(--text3)">(${siteIssues.length})</span>${siteIssues.filter(i=>i.status==='open').length > 0 ? `<span style="margin-left:8px;background:var(--red)22;color:var(--red);border:1px solid var(--red)44;border-radius:99px;padding:1px 8px;font-size:11px">${siteIssues.filter(i=>i.status==='open').length} open</span>` : ''}${siteIssues.filter(i=>i.status==='in_progress').length > 0 ? `<span style="margin-left:4px;background:var(--yellow)22;color:var(--yellow);border:1px solid var(--yellow)44;border-radius:99px;padding:1px 8px;font-size:11px">${siteIssues.filter(i=>i.status==='in_progress').length} in progress</span>` : ''}`,
        `<span class="edit-ui" style="display:flex;gap:6px;align-items:center">
          <label class="btn btn-sm btn-secondary" style="cursor:pointer" title="Import issues from CxAlloy Excel export">
            ↑ CxAlloy
            <input type="file" id="cxalloy-import" accept=".xlsx,.xls" style="display:none" onchange="importCxAlloyIssues(this)">
          </label>
          <button class="btn btn-sm btn-primary" id="add-site-issue-btn">+ Add Issue</button>
        </span>`,
        `<div id="site-issues-list" style="margin-top:4px">${renderSiteIssuesList(siteIssues)}</div>`,
        true
      )}

      <!-- Site Todos — starts open, near top -->
      ${colCard('todos-card',
        `To-Do <span style="font-weight:400;color:var(--text3)" id="site-todos-count"></span>`,
        `<button class="btn btn-sm btn-primary" id="add-site-todo-btn">+ Add Task</button>`,
        `<div id="site-todos-list" style="margin-top:4px"><div style="color:var(--text3);font-size:13px">Loading…</div></div>`,
        true
      )}

      <!-- Warranty Info (operational phases) — below Site Info -->
      ${isWarrantyPhase ? colCard('warranty-card',
        `Warranty &amp; Coverage`,
        `<span class="edit-ui"><button class="btn btn-sm btn-secondary" onclick="openEditSiteModal()">✏ Edit</button></span>`,
        `<div class="grid-2" style="gap:12px;margin-top:4px">
          <div>
            <div class="section-title">Warranty Period</div>
            <div style="font-size:13px;color:var(--text2)">
              ${site.warranty_start_date || site.warranty_end_date
                ? `${fmt(site.warranty_start_date) || '?'} → ${fmt(site.warranty_end_date) || '?'}`
                : '<span style="color:var(--text3)">No dates set — edit site to add</span>'}
            </div>
          </div>
          <div>
            <div class="section-title">Extended Warranty</div>
            <div style="font-size:13px;color:var(--text2)">
              ${site.extended_warranty_start || site.extended_warranty_end
                ? `${fmt(site.extended_warranty_start) || '?'} → ${fmt(site.extended_warranty_end) || '?'}`
                : '<span style="color:var(--text3)">—</span>'}
            </div>
          </div>
        </div>
        <div id="warranty-docs-list" style="margin-top:12px">${renderDocsList(siteDocs.filter(d => d.doc_type === 'warranty'), 'warranty')}</div>`
      ) : ''}

      <!-- Contacts + Forms row -->
      ${colCard('contacts-forms-card',
        `Contacts &amp; Forms`,
        `<span class="edit-ui" style="display:flex;gap:6px">
          <button class="btn btn-sm btn-primary" onclick="openContactForm(null)">+ Contact</button>
          <button class="btn btn-sm btn-secondary" onclick="openFormTemplateForm(null)">+ Form</button>
        </span>`,
        `<div class="grid-2" style="gap:16px;margin-top:4px">
          <div>
            <div class="section-title" style="margin-bottom:8px">Contacts</div>
            <div id="contacts-list">${renderContactsList(contacts)}</div>
          </div>
          <div>
            <div class="section-title" style="margin-bottom:8px">Form Templates</div>
            <div id="forms-list">${renderFormsList(forms)}</div>
          </div>
        </div>`
      )}

      <!-- Campaigns -->
      ${colCard('campaigns-card',
        `Campaigns <span style="font-weight:400;color:var(--text3)">(${campaigns.length})</span>`,
        `<span class="edit-ui"><button class="btn btn-sm btn-primary" onclick="openNewCampaignModal()">+ New Campaign</button></span>`,
        `<div id="campaigns-list" style="margin-top:4px">${renderCampaignsList(campaigns)}</div>`
      )}

      <!-- Documents -->
      ${colCard('documents-card',
        `Documents <span style="font-weight:400;color:var(--text3)">(${siteDocs.length})</span>`,
        ``,
        `<div id="docs-tabs" style="display:flex;gap:4px;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px;margin-top:4px">
          ${[['submittal','Submittals'],['bom','BOMs'],['photo','Photos']].map(([type, label]) => {
            const count = siteDocs.filter(d => d.doc_type === type).length;
            return `<button class="docs-tab-btn" data-type="${type}"
              style="padding:5px 14px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                     background:${type==='submittal'?'var(--accent)':'transparent'};
                     color:${type==='submittal'?'#fff':'var(--text2)'};transition:all .15s">
              ${label} <span style="font-weight:400;opacity:.7">${count}</span>
            </button>`;
          }).join('')}
        </div>
        <div id="docs-list">${renderDocsList(siteDocs, 'submittal')}</div>
        <div class="edit-ui" style="margin-top:10px">
          <label class="btn btn-sm btn-primary" style="cursor:pointer" id="doc-upload-label">
            ↑ Upload
            <input type="file" id="doc-file-input" style="display:none" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.csv,.dwg,.docx" onchange="uploadDocument(this)">
          </label>
        </div>`
      )}

      <!-- SyCool Systems -->
      ${sycoolSystems.length > 0 ? colCard('sycool-card',
        `SyCool Systems <span style="font-weight:400;color:var(--text3)">(${sycoolSystems.length})</span>`,
        `<div id="sycool-filter-wrap" style="display:flex;gap:6px;flex-wrap:wrap"></div>`,
        `<div id="sycool-systems-list" style="margin-top:4px">${renderSystemsList(sycoolSystems, null)}</div>`
      ) : ''}

      <!-- Units (all site units, including those in SyCool systems) -->
      ${(() => {
        if (!siteUnits.length) return '';
        return colCard(
          'units-card',
          `Units <span style="font-weight:400;color:var(--text3)">(${siteUnits.length})</span>`,
          `<span class="edit-ui" style="display:flex;gap:8px">
            <label class="btn btn-sm btn-secondary" style="cursor:pointer" title="Import units from Astea CSV">
              ↑ Import CSV
              <input type="file" id="unit-csv-import" accept=".csv,text/csv" style="display:none" onchange="importUnitsFromCSV(this)">
            </label>
            <button class="btn btn-sm btn-primary" onclick="navigate('unit-form',{siteId:'${id}',backTo:'site-detail',backParams:{id:'${id}'}})">+ New Unit</button>
          </span>`,
          `<div id="units-list">${renderUnitsList(siteUnits, siteTickets)}</div>`
          // false = start collapsed
        );
      })()}

      <!-- CS Tickets -->
      ${colCard('cs-tickets-card',
        `CS Tickets <span style="font-weight:400;color:var(--text3)">(${serviceTickets.length})</span>${serviceTickets.filter(t=>t.status==='open').length > 0 ? `<span style="margin-left:8px;background:var(--red)22;color:var(--red);border:1px solid var(--red)44;border-radius:99px;padding:1px 8px;font-size:11px">${serviceTickets.filter(t=>t.status==='open').length} open</span>` : ''}`,
        `<button class="btn btn-sm btn-primary" id="add-cs-ticket-btn">+ New CS Ticket</button>`,
        `<div id="cs-tickets-list" style="margin-top:4px">${renderCsTicketsList(serviceTickets, siteIssues)}</div>`
      )}

      <!-- Contact Log — starts open -->
      ${colCard('contact-log-card',
        `Contact Log <span style="font-weight:400;color:var(--text3)">(${siteNotes.length})</span>`,
        `<div class="edit-ui" style="display:flex;gap:6px;align-items:center">
          <label class="btn btn-sm btn-secondary" style="cursor:pointer;margin:0" title="Import email chain from PDF">
            📧 Import Email
            <input type="file" id="email-pdf-import" accept=".pdf" style="display:none" onchange="importEmailPdf(this)">
          </label>
          <button class="btn btn-sm btn-primary" id="add-site-note-btn">+ Log Contact</button>
        </div>`,
        `<div id="site-notes-list" style="margin-top:4px">${renderSiteNotesList(siteNotes)}</div>`,
        true
      )}

    `;

    // Attach event handlers
    attachSiteDetailHandlers(id, site, contacts, forms, siteUnits, siteTickets, contractors, [], siteIssues);
  }

  // ── Campaigns list ─────────────────────────────────────────────────────────
  function renderCampaignsList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No campaigns yet. Create one to start tracking work across units.</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Type</th><th>Progress</th><th>Started</th><th style="width:80px"></th></tr></thead>
      <tbody>
        ${list.map(c => {
          const pct = c.units_total ? Math.round(c.units_complete / c.units_total * 100) : 0;
          const typeLabel = { pm:'PM', firmware_update:'Firmware', rfe:'RFE', upgrade:'Upgrade', bug_fix:'Bug Fix', other:'Other' }[c.campaign_type] || c.campaign_type;
          return `<tr>
            <td style="font-weight:500">${escHtml(c.name)}</td>
            <td><span style="font-size:11px;color:var(--text2)">${escHtml(typeLabel)}</span></td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;background:var(--bg3);border-radius:99px;height:6px;overflow:hidden;min-width:80px">
                  <div style="height:100%;width:${pct}%;background:${pct===100?'var(--green)':'var(--blue)'};border-radius:99px;transition:width .3s"></div>
                </div>
                <span style="font-size:11px;color:${pct===100?'var(--green)':'var(--text2)'};font-weight:${pct===100?'700':'400'};white-space:nowrap">${c.units_complete}/${c.units_total} · ${pct}%</span>
              </div>
            </td>
            <td style="font-size:12px;color:var(--text2)">${fmt(c.started_at) || '—'}</td>
            <td>
              <button class="btn btn-sm btn-primary"
                onclick="navigate('campaign-detail',{id:'${c.id}',siteId:'${c.site_id}'})">Open</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  // ── SyCool systems list ────────────────────────────────────────────────────
  function renderSystemsList(list, filterHall) {
    const halls = [...new Set(list.map(s => s.data_hall))].sort();
    const filtered = filterHall ? list.filter(s => s.data_hall === filterHall) : list;

    const commBadge = (level) => {
      const map = {
        none:     ['#64748b', 'Not Started'],
        l2:       ['#f97316', 'L2 Pre-Energization'],
        L2:       ['#f97316', 'L2 Pre-Energization'],
        l3:       ['#22c55e', 'L3 Startup'],
        L3:       ['#22c55e', 'L3 Startup'],
        complete: ['#22c55e', 'Complete'],
      };
      const [color, label] = map[level||'none'] || ['#64748b', level||'—'];
      return `<span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700">${label}</span>`;
    };

    const opStatusConfig = {
      operational: { color: 'var(--green)',  label: 'Operational' },
      reduced:     { color: '#f59e0b',        label: 'Reduced' },
      down:        { color: 'var(--red)',     label: 'Down' },
    };
    const opStatusBadge = (unitId, status) => {
      const s = opStatusConfig[status||'operational'] || opStatusConfig.operational;
      return `<span class="edit-ui op-status-btn" data-unit-id="${unitId}" data-status="${status||'operational'}"
        style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer"
        onclick="cycleOpStatus('${unitId}',this)">${s.label}</span>`;
    };

    // Group by data hall
    const byHall = {};
    for (const s of filtered) {
      (byHall[s.data_hall] = byHall[s.data_hall] || []).push(s);
    }

    // Build filter pills (always full list for the buttons)
    const filterPillsHtml = halls.map(h => {
      const active = filterHall === h;
      return `<button onclick="sycoolFilterHall(${filterHall === h ? 'null' : `'${h}'`})"
        style="padding:3px 10px;border-radius:99px;border:1px solid ${active ? 'var(--accent)' : 'var(--border)'};
               background:${active ? 'var(--accent)' : 'transparent'};color:${active ? '#fff' : 'var(--text2)'};
               font-size:11px;font-weight:600;cursor:pointer">${h}</button>`;
    }).join('');
    // Update the filter wrap after DOM settles
    setTimeout(() => {
      const wrap = document.getElementById('sycool-filter-wrap');
      if (wrap) wrap.innerHTML = filterPillsHtml;
    }, 0);

    if (!filtered.length) return '<div style="color:var(--text3);font-size:13px">No systems found</div>';

    let html = '';
    for (const [hall, systems] of Object.entries(byHall)) {
      const complete = systems.filter(s => isCxComplete(s.accu?.commission_level) && isCxComplete(s.crac?.commission_level)).length;
      html += `
        <div style="margin-bottom:18px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--accent)">${escHtml(hall)}</div>
            <div style="font-size:11px;color:var(--text3)">${complete}/${systems.length} complete</div>
          </div>
          <div class="table-wrap"><table>
            <thead><tr>
              <th style="width:110px">System</th>
              <th>ACCU (Condenser)</th>
              <th>CRAC (Evaporator)</th>
              <th style="width:110px">Commissioned</th>
              <th style="width:130px">Status</th>
            </tr></thead>
            <tbody>
              ${systems.map(s => {
                const accu = s.accu;
                const crac = s.crac;
                const accuTag  = accu?.asset_tag || '—';
                const cracTag  = crac?.asset_tag || '—';
                const accuLink = accu ? `onclick="navigate('unit-detail',{id:'${accu.id}',backTo:'${id}'})"` : '';
                const cracLink = crac ? `onclick="navigate('unit-detail',{id:'${crac.id}',backTo:'${id}'})"` : '';
                const isCommissioned = isCxComplete(accu?.commission_level) && isCxComplete(crac?.commission_level);
                const accuId = accu?.id || '';
                const cracId = crac?.id || '';
                const sysOpStatus = accu?.operational_status || 'operational';
                const cxBadge = `<span class="edit-ui sys-cx-btn"
                  data-accu-id="${accuId}" data-crac-id="${cracId}" data-commissioned="${isCommissioned}"
                  onclick="toggleSystemCx('${accuId}','${cracId}',this)"
                  style="background:${isCommissioned?'var(--green)':'var(--text3)'}22;color:${isCommissioned?'var(--green)':'var(--text3)'};
                         border:1px solid ${isCommissioned?'var(--green)':'var(--text3)'}44;border-radius:4px;
                         padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer">
                  ${isCommissioned ? '✓ Done' : 'Not Done'}
                </span>`;
                return `<tr>
                  <td style="font-family:monospace;font-weight:700;font-size:12px;color:var(--text)">${escHtml(s.system_number)}</td>
                  <td><a style="cursor:pointer;font-family:monospace;font-size:12px" ${accuLink}>${escHtml(accuTag)}</a></td>
                  <td><a style="cursor:pointer;font-family:monospace;font-size:12px" ${cracLink}>${escHtml(cracTag)}</a></td>
                  <td>${cxBadge}</td>
                  <td>${accu ? opStatusBadge(accu.id, sysOpStatus) : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>
        </div>`;
    }
    return html;
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
            <td>${commissionBadge(u.commission_level||'none')}${u.rfe_job_number ? ` <span style="background:#a855f722;color:#a855f7;border:1px solid #a855f744;border-radius:4px;padding:1px 5px;font-size:9px;font-weight:700">RFE</span>` : ''}</td>
            <td style="text-align:center">${openCount>0?`<span style="color:var(--red);font-weight:700">${openCount}</span>`:'<span style="color:var(--green)">✓</span>'}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-secondary" onclick="navigate('unit-detail',{id:'${u.id}',backTo:'site-detail',backParams:{id:'${id}'}})">View</button>
              <span class="edit-ui"><button class="btn btn-sm btn-secondary" onclick="navigate('unit-form',{id:'${u.id}',backTo:'site-detail',backParams:{id:'${id}'}})" style="margin-left:4px">Edit</button></span>
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
          <span class="edit-ui">
            <button class="btn btn-sm btn-secondary" style="padding:1px 6px;font-size:11px" onclick="openJobNumberForm('${j.id}')">✎</button>
            <button class="btn btn-sm btn-secondary" style="padding:1px 6px;font-size:11px;color:var(--red)" onclick="deleteJobNumber('${j.id}')">✕</button>
          </span>
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

  function contactTypeBadge(type) {
    const label = contactTypeLabel[type] || type;
    const color = contactTypeColor[type] || '#64748b';
    return `<span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:99px;padding:1px 7px;font-size:10px;font-weight:700;text-transform:uppercase;white-space:nowrap">${escHtml(label)}</span>`;
  }

  function renderContactsList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No contacts added yet</div>';
    // Group by type
    const groups = [
      { key: 'site_contact', label: 'Site Contacts' },
      { key: 'munters_employee', label: 'Munters Employees' },
      { key: 'contractor', label: 'Contractors' },
    ];
    let html = '';
    for (const g of groups) {
      const group = list.filter(c => (c.contact_type || 'site_contact') === g.key);
      if (!group.length) continue;
      const color = contactTypeColor[g.key];
      html += `<div style="margin-bottom:10px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${color};letter-spacing:.05em;margin-bottom:4px">${g.label}</div>
        ${group.map(c => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;color:var(--text)">${escHtml(c.name)}</div>
              ${c.role ? `<div style="font-size:11px;color:var(--text3)">${escHtml(c.role)}</div>` : ''}
            </div>
            <div style="flex:1;min-width:0;font-size:12px">
              ${c.phone ? `<div><a href="tel:${escHtml(c.phone)}">${escHtml(c.phone)}</a></div>` : ''}
              ${c.email ? `<div style="color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="mailto:${escHtml(c.email)}">${escHtml(c.email)}</a></div>` : ''}
            </div>
            <div class="edit-ui" style="display:flex;gap:4px;flex-shrink:0">
              <button class="btn btn-sm btn-secondary" onclick="openContactForm('${c.id}')">Edit</button>
              <button class="btn btn-sm btn-secondary" onclick="deleteContact('${c.id}')" style="color:var(--red)">✕</button>
            </div>
          </div>`).join('')}
      </div>`;
    }
    return html;
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
              <span class="edit-ui">
                <button class="btn btn-sm btn-secondary" onclick="openFormTemplateForm('${f.id}')">Edit</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteFormTemplate('${f.id}')" style="margin-left:4px">✕</button>
              </span>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  // ── CS Tickets list ────────────────────────────────────────────────────────

  function renderCsTicketsList(tickets, issues) {
    if (!tickets.length) return '<div style="color:var(--text3);font-size:13px">No CS tickets yet. Create one to track service orders, parts, and dispatches.</div>';
    const sorted = [...tickets].sort((a, b) => {
      const order = { open: 0, in_progress: 1, complete: 2, cancelled: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    });
    return sorted.map(t => {
      const sc = csTicketStatusColor[t.status] || 'var(--text3)';
      const sl = csTicketStatusLabel[t.status] || t.status || '—';
      const parts = Array.isArray(t.parts_ordered) ? t.parts_ordered : (t.parts_ordered ? JSON.parse(t.parts_ordered) : []);
      const lines = Array.isArray(t.service_lines) ? t.service_lines : (t.service_lines ? JSON.parse(t.service_lines) : []);
      const linkedIssues = issues.filter(i => i.service_ticket_id === t.id);
      return `
      <div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--bg3)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-weight:600;color:var(--text)">${escHtml(t.title)}</span>
              <span style="background:${sc}22;color:${sc};border:1px solid ${sc}44;border-radius:99px;padding:1px 8px;font-size:11px;white-space:nowrap">${sl}</span>
              ${t.c2_number ? `<span style="font-size:11px;color:var(--text3)">C2: <span style="font-family:monospace;color:var(--text2)">${escHtml(t.c2_number)}</span></span>` : ''}
            </div>
            ${t.description ? `<div style="font-size:12px;color:var(--text2);margin-top:3px">${escHtml(t.description)}</div>` : ''}
          </div>
          <span class="edit-ui" style="flex-shrink:0">
            <button class="btn btn-sm btn-secondary" onclick="openCsTicketForm('${t.id}')">Edit</button>
          </span>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px">
          ${lines.length ? `<div>
            <span style="color:var(--text3);font-weight:600;text-transform:uppercase;font-size:10px">Service Lines</span>
            <div style="margin-top:3px;display:flex;flex-direction:column;gap:2px">
              ${lines.map(l => `<span style="font-family:monospace;color:var(--text2)">${escHtml(l.astea_id||'—')}${l.description ? ' — '+escHtml(l.description) : ''}</span>`).join('')}
            </div>
          </div>` : ''}
          ${parts.length ? `<div>
            <span style="color:var(--text3);font-weight:600;text-transform:uppercase;font-size:10px">Parts Ordered</span>
            <div style="margin-top:3px;display:flex;flex-direction:column;gap:2px">
              ${parts.map(p => `<span style="color:var(--text2)">
                ${escHtml(p.description||'—')} × ${p.qty||1}
                ${p.so_number ? `<span style="font-family:monospace;color:var(--text3);margin-left:6px">SO# ${escHtml(p.so_number)}</span>` : ''}
              </span>`).join('')}
            </div>
          </div>` : ''}
          ${linkedIssues.length ? `<div>
            <span style="color:var(--text3);font-weight:600;text-transform:uppercase;font-size:10px">Linked Issues (${linkedIssues.length})</span>
            <div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:4px">
              ${linkedIssues.map(i => `<span style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:11px;font-family:monospace">${escHtml(i.unit_tag||i.title||'issue')}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function renderSiteIssuesList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No issues yet. Add one manually or import from CxAlloy.</div>';

    // Active = open or in_progress; show these first and prominently
    const active  = list.filter(i => i.status === 'open' || i.status === 'in_progress');
    const closed  = list.filter(i => i.status !== 'open' && i.status !== 'in_progress');

    function issueRow(i, showTicket) {
      const pc = issuePriorityColor[i.priority] || 'var(--text3)';
      const sc = issueStatusColor[i.status]     || 'var(--text3)';
      const sl = issueStatusLabel[i.status]     || i.status || '—';
      const ticketLink = showTicket && i.service_ticket_id
        ? `<span style="font-size:10px;font-family:monospace;color:var(--accent)">CS#${i.service_ticket_id.slice(0,6)}</span>`
        : '';
      return `<tr style="cursor:pointer" onclick="openSiteIssueDetail('${i.id}')">
        <td style="font-size:12px;font-family:monospace;color:var(--text2)">${escHtml(i.unit_tag||'—')}</td>
        <td style="font-size:12px;color:var(--text)">
          ${escHtml(i.title||i.cxalloy_issue_id||'—')}
          ${i.description ? `<div style="font-size:11px;color:var(--text3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px">${escHtml(i.description.slice(0,120))}</div>` : ''}
        </td>
        <td style="font-size:11px;color:${pc};font-weight:600">${(i.priority||'—').charAt(0).toUpperCase()+(i.priority||'').slice(1)}</td>
        <td><span style="background:${sc}22;color:${sc};border:1px solid ${sc}44;border-radius:99px;padding:1px 8px;font-size:11px;white-space:nowrap">${sl}</span></td>
        <td>${ticketLink}</td>
        <td onclick="event.stopPropagation()" class="edit-ui"><button class="btn btn-sm btn-secondary" onclick="openSiteIssueEdit('${i.id}')">Edit</button></td>
      </tr>`;
    }

    const thead = `<thead><tr><th>Equipment</th><th>Issue</th><th>Priority</th><th>Status</th><th>CS Ticket</th><th style="width:50px"></th></tr></thead>`;

    let html = '';

    if (active.length) {
      html += `<div class="table-wrap" style="margin-bottom:${closed.length?'16px':'0'}"><table>${thead}<tbody>${active.map(i => issueRow(i, true)).join('')}</tbody></table></div>`;
    } else {
      html += `<div style="color:var(--green);font-size:13px;margin-bottom:${closed.length?'12px':'0'}">✓ No open or in-progress issues</div>`;
    }

    if (closed.length) {
      const preview = closed.slice(0, 10);
      html += `
        <details style="margin-top:4px">
          <summary style="cursor:pointer;font-size:12px;color:var(--text3);user-select:none">
            ${closed.length} resolved / closed issue${closed.length !== 1 ? 's' : ''}
          </summary>
          <div class="table-wrap" style="margin-top:8px"><table>${thead}<tbody>${preview.map(i => issueRow(i, true)).join('')}</tbody></table></div>
          ${closed.length > 10 ? `<div style="font-size:12px;color:var(--text3);margin-top:6px">Showing 10 of ${closed.length} — <a onclick="navigate('issues')" style="cursor:pointer;color:var(--accent)">View all</a></div>` : ''}
        </details>`;
    }

    if (list.length > 25) {
      html += `<div style="font-size:12px;color:var(--text3);margin-top:8px"><a onclick="navigate('issues')" style="cursor:pointer;color:var(--accent)">View all ${list.length} issues →</a></div>`;
    }
    return html;
  }

  // ── Documents list ─────────────────────────────────────────────────────────
  function renderDocsList(docs, activeType) {
    const list = docs.filter(d => d.doc_type === activeType);
    if (!list.length) {
      const label = { submittal: 'submittals', bom: 'BOMs', photo: 'photos' }[activeType] || 'documents';
      return `<div style="color:var(--text3);font-size:13px">No ${label} uploaded yet</div>`;
    }
    const fmtSize = (b) => {
      if (!b) return '';
      if (b < 1024) return `${b} B`;
      if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
      return `${(b/1048576).toFixed(1)} MB`;
    };
    if (activeType === 'photo') {
      return `<div style="display:flex;flex-wrap:wrap;gap:10px">
        ${list.map(d => `
          <div style="position:relative;width:120px">
            <a href="${escHtml(d.url)}" target="_blank" rel="noopener">
              <img src="${escHtml(d.url)}" alt="${escHtml(d.name)}"
                style="width:120px;height:80px;object-fit:cover;border-radius:6px;border:1px solid var(--border);display:block"/>
            </a>
            <div style="font-size:10px;color:var(--text3);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(d.name)}">${escHtml(d.name)}</div>
            <button class="edit-ui" onclick="deleteDocument('${d.id}')" style="position:absolute;top:3px;right:3px;background:#0007;border:none;border-radius:4px;color:#fff;font-size:11px;cursor:pointer;padding:1px 5px;line-height:1.4">✕</button>
          </div>`).join('')}
      </div>`;
    }
    return `<div style="display:flex;flex-direction:column;gap:6px">
      ${list.map(d => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:6px">
          <span style="font-size:18px">${activeType === 'bom' ? '📋' : '📄'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              <a href="${escHtml(d.url)}" target="_blank" rel="noopener" style="color:inherit">${escHtml(d.name)}</a>
            </div>
            <div style="font-size:11px;color:var(--text3)">
              ${d.original_filename ? escHtml(d.original_filename) + ' · ' : ''}${fmtSize(d.file_size)}${d.description ? ' · ' + escHtml(d.description) : ''}
            </div>
          </div>
          <a href="${escHtml(d.url)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary" download>↓</a>
          <button class="btn btn-sm btn-secondary edit-ui" onclick="deleteDocument('${d.id}')" style="color:var(--red)">✕</button>
        </div>`).join('')}
    </div>`;
  }

  // ── Commission progress (replaces COIL/PM grid) ────────────────────────────
  function renderCommissionProgress(items, isSyCool, systems) {
    if (!items.length) return '<div style="color:var(--text3);font-size:13px">No units at this site yet</div>';

    if (isSyCool) {
      // Per-data-hall breakdown for SyCool sites
      const halls = [...new Set(systems.map(s => s.data_hall))].sort();
      const rows = halls.map(hall => {
        const hallSystems = systems.filter(s => s.data_hall === hall);
        const total = hallSystems.length;
        const complete = hallSystems.filter(s => isCxComplete(s.accu?.commission_level) && isCxComplete(s.crac?.commission_level)).length;
        const inProg  = hallSystems.filter(s => {
          const aOk = isCxComplete(s.accu?.commission_level), cOk = isCxComplete(s.crac?.commission_level);
          const aGo = isCxStarted(s.accu?.commission_level), cGo = isCxStarted(s.crac?.commission_level);
          return (aGo || cGo) && !(aOk && cOk);
        }).length;
        const pct = total ? Math.round(complete / total * 100) : 0;
        return `<tr>
          <td style="font-weight:600;font-size:12px">${escHtml(hall)}</td>
          <td style="text-align:center;font-size:12px">${total}</td>
          <td style="text-align:center;color:var(--green);font-weight:600;font-size:12px">${complete}</td>
          <td style="text-align:center;color:var(--yellow);font-size:12px">${inProg}</td>
          <td style="text-align:center;color:var(--text3);font-size:12px">${total - complete - inProg}</td>
          <td style="min-width:120px">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="flex:1;background:var(--bg3);border-radius:99px;height:6px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${pct===100?'var(--green)':'var(--blue)'};border-radius:99px"></div>
              </div>
              <span style="font-size:11px;color:var(--text2);white-space:nowrap">${pct}%</span>
            </div>
          </td>
        </tr>`;
      });
      return `<div class="table-wrap"><table>
        <thead><tr><th>Data Hall</th><th style="text-align:center">Total</th><th style="text-align:center;color:var(--green)">Complete</th><th style="text-align:center;color:var(--yellow)">In Progress</th><th style="text-align:center;color:var(--text3)">Not Started</th><th>Progress</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></div>`;
    }

    // Regular sites: level breakdown pills
    const levels = ['none', 'l2', 'l3'];
    const levelColors = { none: '#64748b', l2: '#f97316', l3: '#22c55e', complete: '#22c55e' };
    const levelLabels = { none: 'Not Started', l2: 'L2 – Pre-Energization', l3: 'L3 – Startup / Complete' };
    const counts = Object.fromEntries(levels.map(l => [l, 0]));
    items.forEach(u => { counts[u.commission_level || 'none']++; });
    const total = items.length;
    const complete = counts['complete'];
    const pct = total ? Math.round(complete / total * 100) : 0;

    return `
      <div style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="flex:1;background:var(--bg3);border-radius:99px;height:8px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${pct===100?'var(--green)':'var(--blue)'};border-radius:99px;transition:width .3s"></div>
          </div>
          <span style="font-size:13px;font-weight:700;color:${pct===100?'var(--green)':'var(--text)'};white-space:nowrap">${complete}/${total} · ${pct}%</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${levels.filter(l => counts[l] > 0).map(l => {
          const pctL = Math.round(counts[l] / total * 100);
          return `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:12px">
            <span style="color:${levelColors[l]};font-weight:700">${levelLabels[l] || l}</span>
            <span style="color:var(--text2);margin-left:6px">${counts[l]} units · ${pctL}%</span>
          </div>`;
        }).join('')}
      </div>`;
  }

  // ── Post-commission ────────────────────────────────────────────────────────
  function renderPostCommission(unitList, ticketList) {
    const completeList = unitList.filter(u => isCxComplete(u.commission_level));
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

  function renderNoteContent(type, raw) {
    if (!raw) return '';
    let fields;
    try { fields = JSON.parse(raw); } catch { return `<div style="white-space:pre-wrap;font-size:13px">${escHtml(raw)}</div>`; }

    // Email chain — special inline thread renderer
    if (fields._type === 'email_chain' && Array.isArray(fields.emails)) {
      return renderEmailChainInline(fields);
    }

    const order = {
      meeting:    ['date','attendees','agenda','notes','actions'],
      phone_call: ['date','with','purpose','notes','actions'],
      email:      ['date','to_from','subject','notes','actions'],
      note:       ['notes'],
    }[type] || Object.keys(fields);
    return order.filter(k => fields[k]).map(k =>
      `<div style="margin-bottom:6px">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.05em">${CONTENT_LABELS[k]||k}</span>
        <div style="font-size:13px;white-space:pre-wrap;margin-top:1px">${escHtml(fields[k])}</div>
      </div>`
    ).join('');
  }

  function renderEmailChainInline(data) {
    const { subject, emails = [], participants = [] } = data;
    const senderColors = ['#7c3aed','#2563eb','#0891b2','#16a34a','#d97706','#dc2626','#db2777'];
    const colorMap = {};
    let colorIdx = 0;
    emails.forEach(e => {
      const key = e.from_name || e.from_email || 'Unknown';
      if (!colorMap[key]) colorMap[key] = senderColors[colorIdx++ % senderColors.length];
    });
    const uid = 'ec-' + Math.random().toString(36).slice(2, 8);
    const threadHtml = emails.map((e, i) => {
      const sender  = e.from_name || e.from_email || 'Unknown';
      const color   = colorMap[sender] || '#64748b';
      const initials = sender.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const isLast  = i === emails.length - 1;
      // Truncate body for inline view
      const body = (e.body || '').trim();
      const short = body.length > 180 ? body.slice(0, 180) + '…' : body;
      return `<div style="display:flex;gap:10px;margin-bottom:${isLast?0:14}px">
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
          <div style="width:30px;height:30px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${initials}</div>
          ${!isLast ? `<div style="width:2px;flex:1;background:var(--border);margin-top:4px"></div>` : ''}
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:2px">
            <span style="font-weight:700;font-size:12px;color:${color}">${escHtml(sender)}</span>
            <span style="font-size:11px;color:var(--text3);white-space:nowrap">${escHtml(e.sent||'')}</span>
          </div>
          <div style="font-size:12px;color:var(--text2);white-space:pre-wrap;line-height:1.45">${escHtml(short)}</div>
        </div>
      </div>`;
    }).join('');

    return `<div id="${uid}">
      <div style="font-size:11px;color:var(--text3);margin-bottom:10px">
        ${emails.length} message${emails.length!==1?'s':''} · ${escHtml(participants.slice(0,4).join(', '))}${participants.length>4?` +${participants.length-4} more`:''}
      </div>
      <div style="border-left:2px solid var(--border);padding-left:12px">${threadHtml}</div>
    </div>`;
  }

  // ── Contact log list ─────────────────────────────────────────────────────────
  function renderSiteNotesList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No contact log yet. Add the first entry.</div>';
    return list.map(n => {
      let fields = null;
      try { fields = JSON.parse(n.content || '{}'); } catch {}
      const isEmailChain = fields?._type === 'email_chain';
      const tc = isEmailChain
        ? { icon: '📧', label: 'Email Chain', color: '#0891b2' }
        : (NOTE_TYPE_CONFIG[n.note_type] || NOTE_TYPE_CONFIG.note);
      const who = !isEmailChain ? (fields?.attendees || fields?.with || fields?.to_from || '') : (fields?.subject || '');
      return `
      <div class="note-item" data-id="${n.id}" style="border:1px solid var(--border);border-left:3px solid ${tc.color};border-radius:8px;padding:12px;margin-bottom:8px;background:var(--bg3)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:700;color:${tc.color};background:${tc.color}18;border:1px solid ${tc.color}44;border-radius:99px;padding:1px 8px">${tc.icon} ${tc.label}</span>
            <span style="font-size:11px;color:var(--text3)">
              ${who ? `<strong style="color:var(--text2)">${escHtml(who)}</strong> · ` : ''}${fmt(n.created_at)}
            </span>
          </div>
          <span class="edit-ui" style="display:flex;gap:6px">
            ${isEmailChain
              ? `<button class="btn btn-sm btn-secondary" onclick="replayEmailChain('${n.id}')">View</button>`
              : `<button class="btn btn-sm btn-secondary" onclick="openSiteNoteModal('${n.id}')">Edit</button>`}
            <button class="btn btn-sm btn-secondary" style="color:var(--red)" onclick="deleteSiteNote('${n.id}')">✕</button>
          </span>
        </div>
        ${renderNoteContent(n.note_type, n.content)}
      </div>`}).join('');
  }

  window.replayEmailChain = (noteId) => {
    const note = siteNotes.find(n => n.id === noteId);
    if (!note) return;
    let data;
    try { data = JSON.parse(note.content); } catch { return; }
    if (typeof openEmailChainPreview === 'function') openEmailChainPreview(data);
  };

  // ── Site documents ───────────────────────────────────────────────────────────
  function renderSiteDocsList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No documents uploaded yet.</div>';
    const icons = { submittal: '📋', bom: '📦', photo: '🖼', default: '📄' };
    return list.map(d => {
      const icon = icons[d.doc_type] || icons.default;
      const size = d.file_size ? (d.file_size > 1048576 ? (d.file_size/1048576).toFixed(1)+' MB' : Math.round(d.file_size/1024)+' KB') : '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:18px">${icon}</span>
        <div style="flex:1;min-width:0">
          <a href="${escHtml(d.url)}" target="_blank" style="font-size:13px;font-weight:600;color:var(--accent);text-decoration:none;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(d.name||d.original_filename||'Document')}</a>
          <div style="font-size:11px;color:var(--text3)">${escHtml(d.doc_type||'')}${size ? ' · '+size : ''}${d.uploaded_at ? ' · '+fmt(d.uploaded_at) : ''}</div>
        </div>
        <span class="edit-ui">
          <button class="btn btn-sm btn-secondary" style="color:var(--red)" onclick="deleteSiteDoc('${d.id}')">✕</button>
        </span>
      </div>`;
    }).join('');
  }

  window.uploadSiteDoc = async (input) => {
    const file = input.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', 'submittal');
    fd.append('name', file.name);
    try {
      toast('Uploading…');
      const doc = await API.documents.upload(siteId, fd);
      siteDocs.unshift(doc);
      document.getElementById('site-docs-list').innerHTML = renderSiteDocsList(siteDocs);
      toast('Uploaded: ' + doc.name);
    } catch (err) { toast('Upload failed: ' + err.message, 'error'); }
    input.value = '';
  };

  window.deleteSiteDoc = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      await API.documents.delete(siteId, docId);
      siteDocs = siteDocs.filter(d => d.id !== docId);
      document.getElementById('site-docs-list').innerHTML = renderSiteDocsList(siteDocs);
      toast('Document deleted');
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  // ── Event handlers ─────────────────────────────────────────────────────────
  function attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList, contractorList, jobNumberList, issueList = []) {

    // ── CS Tickets ────────────────────────────────────────────────────────────
    document.getElementById('add-cs-ticket-btn')?.addEventListener('click', () => openCsTicketForm(null));

    window.openCsTicketForm = (ticketId) => {
      const existing = ticketId ? serviceTickets.find(t => t.id === ticketId) : null;
      const parts = existing?.parts_ordered
        ? (Array.isArray(existing.parts_ordered) ? existing.parts_ordered : JSON.parse(existing.parts_ordered))
        : [];
      const lines = existing?.service_lines
        ? (Array.isArray(existing.service_lines) ? existing.service_lines : JSON.parse(existing.service_lines))
        : [];

      const mid = 'cs-ticket-modal';
      document.getElementById(mid)?.remove();
      const modal = document.createElement('div');
      modal.id = mid;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto';

      function partRowHtml(p, i) {
        return `<div class="part-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <input class="part-desc" placeholder="Part description" value="${escHtml(p.description||'')}" style="flex:1"/>
          <input class="part-qty" type="number" placeholder="Qty" value="${p.qty||1}" style="width:60px"/>
          <input class="part-so" placeholder="SO#" value="${escHtml(p.so_number||'')}" style="width:110px;font-family:monospace"/>
          <button type="button" class="btn btn-secondary btn-sm part-remove" style="padding:4px 8px">✕</button>
        </div>`;
      }
      function lineRowHtml(l, i) {
        return `<div class="line-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <input class="line-astea" placeholder="Astea Request ID" value="${escHtml(l.astea_id||'')}" style="width:160px;font-family:monospace"/>
          <input class="line-desc" placeholder="Description / notes" value="${escHtml(l.description||'')}" style="flex:1"/>
          <button type="button" class="btn btn-secondary btn-sm line-remove" style="padding:4px 8px">✕</button>
        </div>`;
      }

      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:620px;width:100%;margin:auto">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing ? 'Edit CS Ticket' : 'New CS Ticket'}</div>
          <form id="cs-ticket-form">
            <div class="form-grid">
              <div class="form-group full"><label>Title *</label>
                <input name="title" required value="${escHtml(existing?.title||'')}" placeholder="Brief description of the work"/>
              </div>
              <div class="form-group full"><label>Description</label>
                <textarea name="description" rows="2">${escHtml(existing?.description||'')}</textarea>
              </div>
              <div class="form-group"><label>Status</label>
                <select name="status">
                  <option value="open" ${(existing?.status||'open')==='open'?'selected':''}>Open</option>
                  <option value="in_progress" ${existing?.status==='in_progress'?'selected':''}>In Progress</option>
                  <option value="complete" ${existing?.status==='complete'?'selected':''}>Complete</option>
                  <option value="cancelled" ${existing?.status==='cancelled'?'selected':''}>Cancelled</option>
                </select>
              </div>
              <div class="form-group"><label>C2 Number <span style="font-weight:400;color:var(--text3);font-size:11px">(warranty claim)</span></label>
                <input name="c2_number" value="${escHtml(existing?.c2_number||'')}" placeholder="e.g. C2-00123456" style="font-family:monospace"/>
              </div>
            </div>

            <!-- Service Lines -->
            <div style="margin-bottom:16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <label style="font-weight:600;font-size:13px">Service Lines <span style="font-weight:400;color:var(--text3);font-size:11px">(Astea Request IDs)</span></label>
                <button type="button" class="btn btn-secondary btn-sm" id="add-line-btn">+ Add</button>
              </div>
              <div id="lines-list">${lines.map((l,i) => lineRowHtml(l,i)).join('')}</div>
            </div>

            <!-- Parts Ordered -->
            <div style="margin-bottom:16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <label style="font-weight:600;font-size:13px">Parts Ordered</label>
                <button type="button" class="btn btn-secondary btn-sm" id="add-part-btn">+ Add</button>
              </div>
              <div id="parts-list">${parts.map((p,i) => partRowHtml(p,i)).join('')}</div>
            </div>

            <div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px">
              ${existing ? `<button type="button" class="btn btn-secondary" style="color:var(--red)" id="delete-cs-ticket-btn">Delete</button>` : '<span></span>'}
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Create'}</button>
              </div>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);

      // Dynamic rows
      modal.querySelector('#add-part-btn').addEventListener('click', () => {
        const div = document.createElement('div');
        div.innerHTML = partRowHtml({}, modal.querySelectorAll('.part-row').length);
        modal.querySelector('#parts-list').appendChild(div.firstElementChild);
      });
      modal.querySelector('#add-line-btn').addEventListener('click', () => {
        const div = document.createElement('div');
        div.innerHTML = lineRowHtml({}, modal.querySelectorAll('.line-row').length);
        modal.querySelector('#lines-list').appendChild(div.firstElementChild);
      });
      modal.querySelector('#parts-list').addEventListener('click', e => {
        if (e.target.classList.contains('part-remove')) e.target.closest('.part-row').remove();
      });
      modal.querySelector('#lines-list').addEventListener('click', e => {
        if (e.target.classList.contains('line-remove')) e.target.closest('.line-row').remove();
      });

      modal.querySelector('#cs-ticket-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });

        data.parts_ordered = Array.from(modal.querySelectorAll('.part-row')).map(row => ({
          description: row.querySelector('.part-desc').value.trim() || null,
          qty: parseInt(row.querySelector('.part-qty').value) || 1,
          so_number: row.querySelector('.part-so').value.trim() || null,
        })).filter(p => p.description);

        data.service_lines = Array.from(modal.querySelectorAll('.line-row')).map(row => ({
          astea_id: row.querySelector('.line-astea').value.trim() || null,
          description: row.querySelector('.line-desc').value.trim() || null,
        })).filter(l => l.astea_id);

        try {
          let result;
          if (existing) {
            result = await API.service_tickets.update(existing.id, data);
            const idx = serviceTickets.findIndex(t => t.id === existing.id);
            if (idx >= 0) serviceTickets[idx] = result;
          } else {
            result = await API.service_tickets.create(siteId, { ...data, site_id: siteId });
            serviceTickets.unshift(result);
          }
          modal.remove();
          document.getElementById('cs-tickets-list').innerHTML = renderCsTicketsList(serviceTickets, siteIssues);
          attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList, contractorList, jobNumberList, siteIssues);
          toast(existing ? 'CS ticket saved' : 'CS ticket created');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });

      modal.querySelector('#delete-cs-ticket-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this CS ticket?')) return;
        try {
          await API.service_tickets.delete(existing.id);
          serviceTickets = serviceTickets.filter(t => t.id !== existing.id);
          modal.remove();
          document.getElementById('cs-tickets-list').innerHTML = renderCsTicketsList(serviceTickets, siteIssues);
          attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList, contractorList, jobNumberList, siteIssues);
          toast('CS ticket deleted');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });
    };

    // ── Site Todos ────────────────────────────────────────────────────────────
    let siteTodos = [];

    async function loadSiteTodos() {
      try {
        siteTodos = await API.todos.list({ site_id: siteId });
        renderSiteTodos();
      } catch (e) { /* silently skip */ }
    }

    function renderSiteTodos() {
      const el = document.getElementById('site-todos-list');
      const countEl = document.getElementById('site-todos-count');
      if (!el) return;
      const open = siteTodos.filter(t => t.status !== 'done');
      if (countEl) countEl.textContent = open.length ? `(${open.length} open)` : '';
      if (!siteTodos.length) {
        el.innerHTML = '<div style="color:var(--text3);font-size:13px">No tasks yet.</div>';
        return;
      }
      const TODO_PRIORITY_COLORS = { urgent: '#dc2626', high: '#ea580c', normal: '#2563eb', low: '#6b7280' };
      const TODO_STATUS_LABELS   = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
      const TODO_STATUS_COLORS   = { todo: '#6b7280', in_progress: '#d97706', done: '#16a34a' };
      el.innerHTML = siteTodos.map(t => {
        const priColor = TODO_PRIORITY_COLORS[t.priority] || '#2563eb';
        const stLabel  = TODO_STATUS_LABELS[t.status] || t.status;
        const stColor  = TODO_STATUS_COLORS[t.status] || '#6b7280';
        const due = t.due_date ? new Date(t.due_date + 'T00:00:00') : null;
        const overdue = due && due < new Date() && t.status !== 'done';
        const dueStr = due ? due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
        return `<div style="border:1px solid var(--border);border-left:3px solid ${priColor};border-radius:8px;padding:10px 12px;margin-bottom:6px;background:var(--bg3);display:flex;align-items:flex-start;gap:10px;${t.status==='done'?'opacity:0.55':''}">
          <input type="checkbox" style="margin-top:2px;cursor:pointer;width:15px;height:15px;flex-shrink:0" ${t.status==='done'?'checked':''} onchange="toggleSiteTodoDone('${t.id}',this.checked)">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
              <span style="font-size:13px;font-weight:600;${t.status==='done'?'text-decoration:line-through;color:var(--text3)':''}">${escHtml(t.title)}</span>
              <span style="font-size:10px;font-weight:700;color:${stColor};background:${stColor}18;border:1px solid ${stColor}44;border-radius:99px;padding:1px 6px">${stLabel}</span>
            </div>
            ${t.description ? `<div style="font-size:12px;color:var(--text2)">${escHtml(t.description)}</div>` : ''}
            ${dueStr ? `<div style="font-size:11px;color:${overdue?'var(--red)':'var(--text3)'};margin-top:2px">⏰ ${overdue?'Overdue · ':''}${dueStr}</div>` : ''}
          </div>
          <button class="btn btn-sm btn-secondary" onclick="openSiteTodoModal('${t.id}')" style="flex-shrink:0;font-size:11px;padding:3px 8px">Edit</button>
        </div>`;
      }).join('');
    }

    window.toggleSiteTodoDone = async (id, checked) => {
      try {
        const updated = await API.todos.update(id, { status: checked ? 'done' : 'todo' });
        const idx = siteTodos.findIndex(t => t.id === id);
        if (idx >= 0) siteTodos[idx] = updated;
        renderSiteTodos();
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };

    window.openSiteTodoModal = (todoId) => {
      const existing = todoId ? siteTodos.find(t => t.id === todoId) : null;
      const mid = 'site-todo-modal';
      document.getElementById(mid)?.remove();
      const modal = document.createElement('div');
      modal.id = mid;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px';
      const TODO_PRIORITY_OPTS = [['urgent','Urgent'],['high','High'],['normal','Normal'],['low','Low']];
      const TODO_STATUS_OPTS   = [['todo','To Do'],['in_progress','In Progress'],['done','Done']];
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:440px;width:100%">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing ? 'Edit Task' : 'New Task'}</div>
          <form id="site-todo-form">
            <div class="form-group" style="margin-bottom:12px"><label>Task *</label>
              <input name="title" required value="${escHtml(existing?.title||'')}" placeholder="e.g. Complete MSOW"/>
            </div>
            <div class="form-group" style="margin-bottom:12px"><label>Details</label>
              <textarea name="description" rows="2">${escHtml(existing?.description||'')}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
              <div class="form-group"><label>Priority</label>
                <select name="priority">${TODO_PRIORITY_OPTS.map(([v,l])=>`<option value="${v}" ${(existing?.priority||'normal')===v?'selected':''}>${l}</option>`).join('')}</select>
              </div>
              <div class="form-group"><label>Status</label>
                <select name="status">${TODO_STATUS_OPTS.map(([v,l])=>`<option value="${v}" ${(existing?.status||'todo')===v?'selected':''}>${l}</option>`).join('')}</select>
              </div>
              <div class="form-group"><label>Due Date</label>
                <input type="date" name="due_date" value="${existing?.due_date||''}"/>
              </div>
            </div>
            <input type="hidden" name="site_id" value="${siteId}"/>
            <div style="display:flex;justify-content:space-between;gap:8px">
              ${existing ? `<button type="button" class="btn btn-secondary" style="color:var(--red)" id="del-site-todo-btn">Delete</button>` : '<span></span>'}
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add Task'}</button>
              </div>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);

      modal.querySelector('#site-todo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k]==='') data[k]=null; });
        try {
          if (existing) {
            const updated = await API.todos.update(existing.id, data);
            const idx = siteTodos.findIndex(t => t.id === existing.id);
            if (idx >= 0) siteTodos[idx] = updated; else siteTodos.unshift(updated);
          } else {
            const created = await API.todos.create(data);
            siteTodos.unshift(created);
          }
          renderSiteTodos();
          modal.remove();
          toast(existing ? 'Task saved' : 'Task added');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });

      modal.querySelector('#del-site-todo-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this task?')) return;
        try {
          await API.todos.delete(existing.id);
          siteTodos = siteTodos.filter(t => t.id !== existing.id);
          renderSiteTodos();
          modal.remove();
          toast('Task deleted');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });
    };

    document.getElementById('add-site-todo-btn')?.addEventListener('click', () => openSiteTodoModal(null));
    loadSiteTodos();

    // ── Email PDF import ─────────────────────────────────────────────────────
    window.importEmailPdf = async (input) => {
      const file = input.files[0];
      if (!file) return;
      input.value = '';
      const toastId = toast('Parsing email chain…', 'info', 0);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/sites/${siteId}/notes/import-email`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + getAuthToken() },
          body: fd,
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Import failed'); }
        const data = await res.json();
        document.getElementById(toastId)?.remove();
        openEmailChainPreview(data);
      } catch (err) {
        document.getElementById(toastId)?.remove();
        toast('Error: ' + err.message, 'error');
      }
    };

    function openEmailChainPreview(data) {
      const { subject, participants, emails = [] } = data;
      const mid = 'email-chain-preview-modal';
      document.getElementById(mid)?.remove();
      const modal = document.createElement('div');
      modal.id = mid;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px';

      // Assign a color per unique sender
      const senderColors = ['#7c3aed','#2563eb','#0891b2','#16a34a','#d97706','#dc2626','#db2777'];
      const colorMap = {};
      let colorIdx = 0;
      emails.forEach(e => {
        const key = e.from_name || e.from_email || 'Unknown';
        if (!colorMap[key]) colorMap[key] = senderColors[colorIdx++ % senderColors.length];
      });

      function renderEmail(e, idx) {
        const sender = e.from_name || e.from_email || 'Unknown';
        const color  = colorMap[sender] || '#64748b';
        const initials = sender.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const isLast = idx === emails.length - 1;
        return `<div style="display:flex;gap:12px;margin-bottom:${isLast?0:20}px">
          <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
            <div style="width:36px;height:36px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${initials}</div>
            ${!isLast ? `<div style="width:2px;flex:1;background:var(--border);margin-top:6px"></div>` : ''}
          </div>
          <div style="flex:1;min-width:0;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:${isLast?0:4}px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;flex-wrap:wrap">
              <div>
                <span style="font-weight:700;color:${color}">${escHtml(sender)}</span>
                ${e.from_email ? `<span style="font-size:11px;color:var(--text3);margin-left:6px">${escHtml(e.from_email)}</span>` : ''}
              </div>
              <span style="font-size:11px;color:var(--text3);white-space:nowrap">${escHtml(e.sent || '')}</span>
            </div>
            ${e.to   ? `<div style="font-size:11px;color:var(--text3);margin-bottom:2px"><span style="font-weight:600">To:</span> ${escHtml(e.to)}</div>` : ''}
            ${e.cc   ? `<div style="font-size:11px;color:var(--text3);margin-bottom:2px"><span style="font-weight:600">Cc:</span> ${escHtml(e.cc)}</div>` : ''}
            ${e.subject && e.subject !== subject ? `<div style="font-size:11px;color:var(--text3);margin-bottom:6px"><span style="font-weight:600">Re:</span> ${escHtml(e.subject)}</div>` : ''}
            <div style="font-size:13px;color:var(--text);white-space:pre-wrap;margin-top:6px;line-height:1.5">${escHtml(e.body || '')}</div>
          </div>
        </div>`;
      }

      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px;max-width:640px;width:100%;max-height:88vh;display:flex;flex-direction:column">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
            <div>
              <div style="font-size:16px;font-weight:700">📧 ${escHtml(subject)}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:3px">${emails.length} message${emails.length !== 1 ? 's' : ''} · ${escHtml((participants || []).slice(0, 4).join(', '))}${participants?.length > 4 ? ` +${participants.length - 4} more` : ''}</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('${mid}')?.remove()">✕</button>
          </div>
          <div style="overflow-y:auto;flex:1;padding-right:4px">
            ${emails.map((e, i) => renderEmail(e, i)).join('')}
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
            <button class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
            <button class="btn btn-primary" id="save-email-chain-btn">Save to Contact Log</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      modal.querySelector('#save-email-chain-btn').addEventListener('click', async () => {
        try {
          const content = JSON.stringify({ subject, participants, emails, _type: 'email_chain' });
          const note = await API.notes.createSite(siteId, { note_type: 'email', content });
          siteNotes.unshift(note);
          document.getElementById('site-notes-list').innerHTML = renderSiteNotesList(siteNotes);
          modal.remove();
          toast('Email chain saved to contact log');
          // Update last_contact_date
          API.sites.update(siteId, { last_contact_date: new Date().toISOString() }).catch(() => {});
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });
    }

    // ── Site Notes ────────────────────────────────────────────────────────────
    document.getElementById('add-site-note-btn')?.addEventListener('click', () => openSiteNoteModal(null));

    window.openSiteNoteModal = (noteId) => {
      const existing = noteId ? siteNotes.find(n => n.id === noteId) : null;
      const mid = 'site-note-modal';
      document.getElementById(mid)?.remove();
      const modal = document.createElement('div');
      modal.id = mid;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:500px;width:100%">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing ? 'Edit Log Entry' : 'Log Contact'}</div>
          <form id="site-note-form">
            <div style="display:flex;gap:8px;margin-bottom:16px">
              ${[['meeting','👥 Meeting'],['phone_call','📞 Phone Call'],['email','✉️ Email'],['note','📝 Note']].map(([val,label]) =>
                `<label style="flex:1;cursor:pointer">
                  <input type="radio" name="note_type" value="${val}" style="display:none" ${(existing?.note_type||'meeting')===val?'checked':''}>
                  <div class="note-type-btn" data-val="${val}" style="text-align:center;padding:7px 4px;border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;${(existing?.note_type||'meeting')===val?'background:var(--accent);color:#fff;border-color:var(--accent)':''}">${label}</div>
                </label>`
              ).join('')}
            </div>
            <div id="note-template-fields" style="margin-bottom:12px"></div>
            <input type="hidden" name="content" id="note-content-hidden"/>
            <div style="display:flex;justify-content:space-between;gap:8px">
              ${existing ? `<button type="button" class="btn btn-secondary" style="color:var(--red)" id="del-site-note-btn">Delete</button>` : '<span></span>'}
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Log It'}</button>
              </div>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);

      // Template definitions per type
      const NOTE_TEMPLATES = {
        meeting: (vals={}) => `
          <div class="form-group" style="margin-bottom:10px"><label>Date &amp; Time</label>
            <input class="nt-field" data-key="date" type="datetime-local" value="${escHtml(vals.date||new Date().toISOString().slice(0,16))}"/></div>
          <div class="form-group" style="margin-bottom:10px"><label>Attendees</label>
            <input class="nt-field" data-key="attendees" placeholder="e.g. Zak, John Smith (QTS), Jane (Munters)" value="${escHtml(vals.attendees||'')}"/></div>
          <div class="form-group" style="margin-bottom:10px"><label>Agenda</label>
            <textarea class="nt-field" data-key="agenda" rows="2" placeholder="Topics covered…">${escHtml(vals.agenda||'')}</textarea></div>
          <div class="form-group" style="margin-bottom:10px"><label>Notes</label>
            <textarea class="nt-field" data-key="notes" rows="3" placeholder="What was discussed…">${escHtml(vals.notes||'')}</textarea></div>
          <div class="form-group" style="margin-bottom:0"><label>Action Items</label>
            <textarea class="nt-field" data-key="actions" rows="2" placeholder="Owner: task, due date…">${escHtml(vals.actions||'')}</textarea></div>`,
        phone_call: (vals={}) => `
          <div class="form-group" style="margin-bottom:10px"><label>Date &amp; Time</label>
            <input class="nt-field" data-key="date" type="datetime-local" value="${escHtml(vals.date||new Date().toISOString().slice(0,16))}"/></div>
          <div class="form-group" style="margin-bottom:10px"><label>With</label>
            <input class="nt-field" data-key="with" placeholder="Who was on the call?" value="${escHtml(vals.with||'')}"/></div>
          <div class="form-group" style="margin-bottom:10px"><label>Purpose</label>
            <input class="nt-field" data-key="purpose" placeholder="Why did you call?" value="${escHtml(vals.purpose||'')}"/></div>
          <div class="form-group" style="margin-bottom:10px"><label>Notes</label>
            <textarea class="nt-field" data-key="notes" rows="3" placeholder="What was covered…">${escHtml(vals.notes||'')}</textarea></div>
          <div class="form-group" style="margin-bottom:0"><label>Action Items</label>
            <textarea class="nt-field" data-key="actions" rows="2" placeholder="Owner: task, due date…">${escHtml(vals.actions||'')}</textarea></div>`,
        email: (vals={}) => `
          <div class="form-group" style="margin-bottom:10px"><label>Date</label>
            <input class="nt-field" data-key="date" type="date" value="${escHtml(vals.date||new Date().toISOString().slice(0,10))}"/></div>
          <div class="form-group" style="margin-bottom:10px"><label>To / From</label>
            <input class="nt-field" data-key="to_from" placeholder="e.g. Jane Smith → Zak" value="${escHtml(vals.to_from||'')}"/></div>
          <div class="form-group" style="margin-bottom:10px"><label>Subject</label>
            <input class="nt-field" data-key="subject" placeholder="Email subject line" value="${escHtml(vals.subject||'')}"/></div>
          <div class="form-group" style="margin-bottom:10px"><label>Summary</label>
            <textarea class="nt-field" data-key="notes" rows="3" placeholder="Key points from the email…">${escHtml(vals.notes||'')}</textarea></div>
          <div class="form-group" style="margin-bottom:0"><label>Action Items</label>
            <textarea class="nt-field" data-key="actions" rows="2" placeholder="Owner: task, due date…">${escHtml(vals.actions||'')}</textarea></div>`,
        note: (vals={}) => `
          <div class="form-group" style="margin-bottom:0"><label>Notes *</label>
            <textarea class="nt-field" data-key="notes" rows="5" required placeholder="Enter your note…">${escHtml(vals.notes||'')}</textarea></div>`,
      };

      // Parse existing content back into structured fields
      function parseContent(type, raw) {
        if (!raw) return {};
        try { return JSON.parse(raw); } catch {}
        // Legacy plain text — put into notes key
        return { notes: raw };
      }

      function renderTemplate(type) {
        const vals = existing ? parseContent(type, existing.content) : {};
        document.getElementById('note-template-fields').innerHTML = NOTE_TEMPLATES[type]?.(vals) || NOTE_TEMPLATES.note(vals);
      }

      function buildContent() {
        const fields = {};
        modal.querySelectorAll('.nt-field').forEach(el => { if (el.value.trim()) fields[el.dataset.key] = el.value.trim(); });
        return JSON.stringify(fields);
      }

      // Type toggle
      const activeType = existing?.note_type || 'meeting';
      renderTemplate(activeType);

      modal.querySelectorAll('.note-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.note-type-btn').forEach(b => {
            b.style.background = ''; b.style.color = ''; b.style.borderColor = '';
          });
          btn.style.background = 'var(--accent)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--accent)';
          modal.querySelector(`input[value="${btn.dataset.val}"]`).checked = true;
          renderTemplate(btn.dataset.val);
        });
      });

      modal.querySelector('#site-note-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        // Pack structured fields into the hidden content input
        document.getElementById('note-content-hidden').value = buildContent();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k]==='') data[k]=null; });
        try {
          if (existing) {
            const updated = await API.notes.update(existing.id, data);
            const idx = siteNotes.findIndex(n => n.id === existing.id);
            if (idx >= 0) siteNotes[idx] = updated;
          } else {
            const created = await API.notes.createSite(siteId, data);
            siteNotes.unshift(created);
          }
          document.getElementById('site-notes-list').innerHTML = renderSiteNotesList(siteNotes);
          modal.remove();
          toast(existing ? 'Note saved' : 'Note added');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
      modal.querySelector('#del-site-note-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this note?')) return;
        try {
          await API.notes.delete(existing.id);
          siteNotes = siteNotes.filter(n => n.id !== existing.id);
          document.getElementById('site-notes-list').innerHTML = renderSiteNotesList(siteNotes);
          modal.remove();
          toast('Note deleted');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
    };

    window.deleteSiteNote = async (noteId) => {
      if (!confirm('Delete this note?')) return;
      try {
        await API.notes.delete(noteId);
        siteNotes = siteNotes.filter(n => n.id !== noteId);
        document.getElementById('site-notes-list').innerHTML = renderSiteNotesList(siteNotes);
        toast('Note deleted');
      } catch (err) { toast('Error: '+err.message, 'error'); }
    };

    // ── Mass Commissioning Editor ─────────────────────────────────────────────
    document.getElementById('mass-commission-btn')?.addEventListener('click', () => {
      const modalId = 'mass-commission-modal';
      document.getElementById(modalId)?.remove();
      const modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';

      // For SyCool sites show systems; for regular sites show units
      const isSyCoolSite = sycoolSystems.length > 0;

      const sycoolRows = sycoolSystems.map(s => {
        const isComm = isCxComplete(s.accu?.commission_level) && isCxComplete(s.crac?.commission_level);
        return `<tr>
          <td style="font-family:monospace;font-weight:600;font-size:12px">${escHtml(s.system_number)}</td>
          <td style="font-family:monospace;font-size:11px;color:var(--text3)">${escHtml(s.accu?.asset_tag||'—')} / ${escHtml(s.crac?.asset_tag||'—')}</td>
          <td>
            <select class="commission-select" data-accu-id="${s.accu?.id||''}" data-crac-id="${s.crac?.id||''}" style="font-size:12px;padding:3px 6px">
              <option value="none" ${!isComm?'selected':''}>Not Done</option>
              <option value="complete" ${isComm?'selected':''}>Commissioned</option>
            </select>
          </td>
        </tr>`;
      }).join('');

      const unitRows = unitList.map(u => {
        const levels = ['none','l2','l3'];
        const levelColors = { none:'#64748b', l2:'#f97316', l3:'#22c55e', complete:'#22c55e' };
        return `<tr>
          <td style="color:var(--text3)">${u.line_number||'—'}</td>
          <td style="font-family:monospace;font-size:12px">${escHtml(u.serial_number||'—')}</td>
          <td>${unitTypeBadge(u.unit_type)}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(u.model||'—')}</td>
          <td>
            <select data-unit-id="${u.id}" class="commission-select" style="font-size:12px;padding:3px 6px">
              ${levels.map(l => `<option value="${l}" ${(u.commission_level||'none')===l?'selected':''} style="color:${levelColors[l]}">${l}</option>`).join('')}
            </select>
          </td>
        </tr>`;
      }).join('');

      const itemCount = isSyCoolSite ? sycoolSystems.length : unitList.length;
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div style="font-size:16px;font-weight:700;color:var(--text)">
              Mass Edit Commissioning
              <span style="font-size:13px;font-weight:400;color:var(--text3)">(${itemCount} ${isSyCoolSite?'systems':'units'})</span>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm btn-secondary" onclick="massSetAll('${isSyCoolSite?'complete':'complete'}')">✓ Mark All Done</button>
              <button class="btn btn-sm btn-secondary" onclick="massSetAll('none')">✕ Clear All</button>
            </div>
          </div>
          <div class="table-wrap" style="max-height:440px;overflow-y:auto">
            <table>
              ${isSyCoolSite
                ? `<thead><tr><th>System</th><th>ACCU / CRAC</th><th style="width:160px">Commissioned</th></tr></thead><tbody>${sycoolRows}</tbody>`
                : `<thead><tr><th>#</th><th>Serial</th><th>Type</th><th>Model</th><th>Level</th></tr></thead><tbody>${unitRows}</tbody>`
              }
            </table>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
            <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancel</button>
            <button class="btn btn-primary" id="mass-commission-save">Save All</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      window.massSetAll = (level) => {
        modal.querySelectorAll('.commission-select').forEach(sel => { sel.value = level; });
      };

      modal.querySelector('#mass-commission-save').addEventListener('click', async () => {
        const btn = modal.querySelector('#mass-commission-save');
        btn.disabled = true; btn.textContent = 'Saving…';

        let updates = [];
        if (isSyCoolSite) {
          modal.querySelectorAll('.commission-select').forEach(sel => {
            const level = isCxComplete(sel.value) ? 'l3' : 'none';
            if (sel.dataset.accuId) updates.push({ unit_id: sel.dataset.accuId, commission_level: level });
            if (sel.dataset.cracId) updates.push({ unit_id: sel.dataset.cracId, commission_level: level });
          });
        } else {
          updates = [...modal.querySelectorAll('.commission-select')].map(sel => ({
            unit_id: sel.dataset.unitId,
            commission_level: sel.value,
          }));
        }

        try {
          const result = await API.units.bulkCommission(siteId, updates);
          modal.remove();
          // Refresh units and re-render
          const newAll = await API.units.list();
          siteUnits = newAll.filter(u => u.site_id === siteId).sort((a,b)=>(a.line_number||0)-(b.line_number||0));
          const unitListEl = document.getElementById('units-list');
          if (unitListEl) unitListEl.innerHTML = renderUnitsList(siteUnits.filter(u => !u.system_id), siteTickets);
          renderPage();
          toast(`Updated ${result.updated} units`);
        } catch (e) { toast('Error: ' + e.message, 'error'); btn.disabled = false; btn.textContent = 'Save All Changes'; }
      });
    });

    // ── Site Issues handlers ──────────────────────────────────────────────────
    document.getElementById('add-site-issue-btn')?.addEventListener('click', () => {
      openSiteIssueForm(null, siteId, async (newIssue) => {
        siteIssues.unshift(newIssue);
        issueList = siteIssues;
        document.getElementById('site-issues-list').innerHTML = renderSiteIssuesList(siteIssues);
        attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList, contractorList, jobNumberList, siteIssues);
        await autoEscalateSiteStatus(newIssue);
        toast('Issue created');
      });
    });

    window.openSiteIssueDetail = (issueId) => {
      const issue = issueList.find(i => i.id === issueId);
      if (!issue) return;
      const detailId = 'site-issue-detail';
      document.getElementById(detailId)?.remove();
      const sc = { open:'var(--blue)',in_progress:'var(--yellow)',closed:'var(--text3)',work_complete:'var(--green)',ready_to_inspect:'var(--accent)' };
      const sl = { open:'Open',in_progress:'In Progress',closed:'Closed',work_complete:'Work Complete',ready_to_inspect:'Ready to Inspect' };
      const pc = { critical:'var(--red)',high:'var(--orange)',low:'var(--text2)' };
      const modal = document.createElement('div');
      modal.id = detailId;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:640px;width:100%;max-height:85vh;overflow-y:auto">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
            <div>
              <div style="font-family:monospace;font-size:12px;color:var(--text3)">${escHtml(issue.cxalloy_issue_id||'')}</div>
              <div style="font-size:17px;font-weight:700;margin-top:2px">${escHtml(issue.title||'')}</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('${detailId}')?.remove()">✕</button>
          </div>
          <div class="grid-2" style="gap:10px;margin-bottom:14px">
            <div><div class="section-title">Equipment</div><div style="font-family:monospace">${escHtml(issue.unit_tag||'—')}</div></div>
            <div><div class="section-title">Zone</div><div>${escHtml(issue.cx_zone||'—')}</div></div>
            <div><div class="section-title">Priority</div><div style="color:${pc[issue.priority]||'var(--text2)'};font-weight:600">${(issue.priority||'—').charAt(0).toUpperCase()+(issue.priority||'').slice(1)}</div></div>
            <div><div class="section-title">Status</div>
              <span style="background:${(sc[issue.status]||'var(--text3)')}22;color:${sc[issue.status]||'var(--text3)'};border:1px solid ${(sc[issue.status]||'var(--text3)')}44;border-radius:99px;padding:1px 8px;font-size:11px">${sl[issue.status]||issue.status||'—'}</span>
            </div>
            <div><div class="section-title">Issue Type</div><div style="font-size:12px;color:var(--text2)">${escHtml(issue.cx_issue_type||'—')}</div></div>
            <div><div class="section-title">Source</div><div style="font-size:12px;color:var(--text2)">${escHtml(issue.cx_source||'—')}</div></div>
            <div><div class="section-title">Created By</div><div style="font-size:12px;color:var(--text2)">${escHtml(issue.reported_by||'—')}</div></div>
            <div><div class="section-title">Date Created</div><div style="font-size:12px;color:var(--text2)">${fmt(issue.reported_date||issue.created_at)}</div></div>
            ${issue.closed_date?`<div><div class="section-title">Date Closed</div><div style="font-size:12px;color:var(--text2)">${fmt(issue.closed_date)}</div></div>`:''}
          </div>
          ${issue.description?`<div style="margin-bottom:12px"><div class="section-title">Description</div><div style="white-space:pre-wrap;font-size:13px;color:var(--text2);margin-top:4px">${escHtml(issue.description)}</div></div>`:''}
          ${issue.resolution_notes?`<div style="margin-bottom:12px"><div class="section-title">Comments / Resolution</div><div style="white-space:pre-wrap;font-size:12px;color:var(--text2);margin-top:4px;background:var(--bg3);border-radius:6px;padding:10px;max-height:200px;overflow-y:auto">${escHtml(issue.resolution_notes)}</div></div>`:''}
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
            <button class="btn btn-secondary" onclick="document.getElementById('${detailId}')?.remove()">Close</button>
            <button class="btn btn-primary" onclick="document.getElementById('${detailId}')?.remove();openSiteIssueEdit('${issue.id}')">Edit</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    };

    window.openSiteIssueEdit = (issueId) => {
      const issue = issueList.find(i => i.id === issueId);
      if (!issue) return;
      openSiteIssueForm(issue, siteId, async (updated) => {
        const idx = siteIssues.findIndex(i => i.id === issueId);
        if (idx >= 0) siteIssues[idx] = updated;
        issueList = siteIssues;
        document.getElementById('site-issues-list').innerHTML = renderSiteIssuesList(siteIssues);
        attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList, contractorList, jobNumberList, siteIssues);
        await autoEscalateSiteStatus(updated);
        toast('Issue saved');
      }, async () => {
        siteIssues = siteIssues.filter(i => i.id !== issueId);
        issueList = siteIssues;
        document.getElementById('site-issues-list').innerHTML = renderSiteIssuesList(siteIssues);
        attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList, contractorList, jobNumberList, siteIssues);
        toast('Issue deleted');
      });
    };

    // Auto-escalate site status when a non-low issue is open/in-progress
    async function autoEscalateSiteStatus(savedIssue) {
      if (!savedIssue || savedIssue.priority === 'low') return;
      if (['closed','work_complete','ready_to_inspect'].includes(savedIssue.status)) return;
      const current = siteData.site_status || 'normal';
      if (current === 'open_issues') return; // already flagged, nothing to do
      try {
        const updated = await API.sites.update(siteId, { site_status: 'open_issues' });
        siteData.site_status = updated.site_status;
        const bannerBadge = document.getElementById('site-status-badge');
        if (bannerBadge) {
          bannerBadge.textContent = 'Open Issues';
          bannerBadge.style.background = '#f59e0b';
        }
        toast('Site status → Open Issues');
      } catch (e) { /* non-critical, skip */ }
    }

    function openSiteIssueForm(existing, siteid, onSave, onDelete) {
      const modalId = 'site-issue-form-modal';
      document.getElementById(modalId)?.remove();
      const modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
      const issueTypes = ['Incorrect Installation','Damage after Install','Missing Components','Material/Component Failure','Shipping Damage','Documentation Not Complete or Ready','Design Defect/Lack of Design','Other'];
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:540px;width:100%;max-height:85vh;overflow-y:auto">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing?'Edit Issue':'New Issue'}</div>
          <form id="site-issue-form">
            <div class="form-grid">
              <div class="form-group full"><label>Title *</label>
                <input name="title" required value="${escHtml(existing?.title||'')}" placeholder="Brief description"/>
              </div>
              <div class="form-group full"><label>Description</label>
                <textarea name="description" rows="2">${escHtml(existing?.description||'')}</textarea>
              </div>
              <div class="form-group"><label>Equipment Tag</label>
                <input name="unit_tag" value="${escHtml(existing?.unit_tag||'')}" placeholder="e.g. CRAC-DH1300-18"/>
              </div>
              <div class="form-group"><label>Zone</label>
                <input name="cx_zone" value="${escHtml(existing?.cx_zone||'')}" placeholder="e.g. Data Hall 1300"/>
              </div>
              <div class="form-group"><label>Priority</label>
                <select name="priority">
                  <option value="low" ${(existing?.priority||'low')==='low'?'selected':''}>Low</option>
                  <option value="high" ${existing?.priority==='high'?'selected':''}>High</option>
                  <option value="critical" ${existing?.priority==='critical'?'selected':''}>Critical</option>
                </select>
              </div>
              <div class="form-group"><label>Status</label>
                <select name="status">
                  <option value="open" ${(existing?.status||'open')==='open'?'selected':''}>Open</option>
                  <option value="in_progress" ${existing?.status==='in_progress'?'selected':''}>In Progress</option>
                  <option value="work_complete" ${existing?.status==='work_complete'?'selected':''}>Work Complete</option>
                  <option value="ready_to_inspect" ${existing?.status==='ready_to_inspect'?'selected':''}>Ready to Inspect</option>
                  <option value="closed" ${existing?.status==='closed'?'selected':''}>Closed</option>
                </select>
              </div>
              <div class="form-group full"><label>Issue Type</label>
                <select name="cx_issue_type">
                  <option value="">— None —</option>
                  ${issueTypes.map(t=>`<option value="${escHtml(t)}" ${existing?.cx_issue_type===t?'selected':''}>${escHtml(t)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group full"><label>Comments / Resolution</label>
                <textarea name="resolution_notes" rows="3">${escHtml(existing?.resolution_notes||'')}</textarea>
              </div>
              <div class="form-group full"><label>Link to CS Ticket <span style="font-weight:400;color:var(--text3);font-size:11px">(optional)</span></label>
                <select name="service_ticket_id">
                  <option value="">— Not linked —</option>
                  ${serviceTickets.filter(t => t.status !== 'cancelled').map(t =>
                    `<option value="${t.id}" ${existing?.service_ticket_id===t.id?'selected':''}>${escHtml(t.title)}${t.c2_number?' (C2: '+escHtml(t.c2_number)+')':''}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px">
              ${existing?`<button type="button" class="btn btn-secondary" style="color:var(--red)" id="del-issue-btn">Delete</button>`:'<span></span>'}
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">${existing?'Save':'Create'}</button>
              </div>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#site-issue-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k]==='') data[k]=null; });
        try {
          let result;
          if (existing) result = await API.issues.update(existing.id, data);
          else result = await API.issues.create(siteid, { ...data, site_id: siteid });
          modal.remove();
          if (onSave) onSave(result);
        } catch (err) { toast('Error: '+err.message,'error'); }
      });
      modal.querySelector('#del-issue-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this issue?')) return;
        try {
          await API.issues.delete(existing.id);
          modal.remove();
          if (onDelete) onDelete();
        } catch (err) { toast('Error: '+err.message,'error'); }
      });
    }

    // ── Quick Actions ─────────────────────────────────────────────────────────
    document.getElementById('qa-add-issue-btn')?.addEventListener('click', () => {
      document.getElementById('issues-card-body').style.display = 'block';
      document.getElementById('issues-card-chev').style.transform = 'rotate(90deg)';
      document.getElementById('issues-card-hdr').style.paddingBottom = '12px';
      document.getElementById('add-site-issue-btn')?.click();
    });
    document.getElementById('qa-add-ticket-btn')?.addEventListener('click', () => {
      document.getElementById('cs-tickets-card-body').style.display = 'block';
      document.getElementById('cs-tickets-card-chev').style.transform = 'rotate(90deg)';
      document.getElementById('cs-tickets-card-hdr').style.paddingBottom = '12px';
      document.getElementById('add-cs-ticket-btn')?.click();
    });
    document.getElementById('qa-log-contact-btn')?.addEventListener('click', () => {
      document.getElementById('contact-log-card-body').style.display = 'block';
      document.getElementById('contact-log-card-chev').style.transform = 'rotate(90deg)';
      document.getElementById('contact-log-card-hdr').style.paddingBottom = '12px';
      openSiteNoteModal(null);
    });
    document.getElementById('qa-add-todo-btn')?.addEventListener('click', () => {
      document.getElementById('todos-card-body').style.display = 'block';
      document.getElementById('todos-card-chev').style.transform = 'rotate(90deg)';
      document.getElementById('todos-card-hdr').style.paddingBottom = '12px';
      openSiteTodoModal(null);
    });

    window.toggleCard = (id) => {
      const body = document.getElementById(id + '-body');
      const chev = document.getElementById(id + '-chev');
      const hdr  = document.getElementById(id + '-hdr');
      if (!body) return;
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      if (chev) chev.style.transform = open ? 'rotate(90deg)' : '';
      if (hdr)  hdr.style.paddingBottom = open ? '12px' : '';
    };

    window.toggleUnitsSection = () => {
      const body = document.getElementById('units-body');
      const chevron = document.getElementById('units-chevron');
      if (!body) return;
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      chevron.style.transform = open ? 'rotate(90deg)' : '';
    };

    window.toggleCommissioning = () => {
      const body = document.getElementById('commission-body');
      const chevron = document.getElementById('commission-chevron');
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      chevron.style.transform = open ? 'rotate(90deg)' : '';
    };

    // Toggle system-level commissioned status (marks both ACCU and CRAC)
    window.toggleSystemCx = async (accuId, cracId, el) => {
      if (!isAuthenticated()) { showLoginModal(); return; }
      const wasCommissioned = el.dataset.commissioned === 'true';
      const newLevel = wasCommissioned ? 'none' : 'complete';
      const isNow = !wasCommissioned;
      try {
        const updates = [];
        if (accuId) updates.push(API.units.update(accuId, { commission_level: newLevel }));
        if (cracId) updates.push(API.units.update(cracId, { commission_level: newLevel }));
        await Promise.all(updates);
        el.dataset.commissioned = String(isNow);
        el.textContent = isNow ? '✓ Done' : 'Not Done';
        const c = isNow ? 'var(--green)' : 'var(--text3)';
        el.style.background = c + '22'; el.style.color = c; el.style.borderColor = c + '44';
        // Update local cache so progress counts refresh on next renderPage
        for (const sys of sycoolSystems) {
          if (sys.accu?.id === accuId || sys.crac?.id === cracId) {
            if (sys.accu) sys.accu.commission_level = newLevel;
            if (sys.crac) sys.crac.commission_level = newLevel;
          }
        }
        // Refresh progress header counts
        const newComplete = sycoolSystems.filter(s => isCxComplete(s.accu?.commission_level) && isCxComplete(s.crac?.commission_level));
        const total = sycoolSystems.length;
        const newPct = total ? Math.round(newComplete.length / total * 100) : 0;
        const hdr = document.querySelector('#commission-toggle span:last-child');
        if (hdr) hdr.textContent = newPct + '%';
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };

    // Operational status cycle: operational → reduced → down → operational
    const opCycle = ['operational', 'reduced', 'down'];
    window.cycleOpStatus = async (unitId, el) => {
      if (!isAuthenticated()) { showLoginModal(); return; }
      const cur = el.dataset.status || 'operational';
      const next = opCycle[(opCycle.indexOf(cur) + 1) % opCycle.length];
      const cfg = { operational: { color: 'var(--green)', label: 'Operational' }, reduced: { color: '#f59e0b', label: 'Reduced' }, down: { color: 'var(--red)', label: 'Down' } };
      try {
        await API.units.setOperationalStatus(unitId, next);
        const s = cfg[next];
        el.dataset.status = next;
        el.textContent = s.label;
        el.style.background = s.color + '22';
        el.style.color = s.color;
        el.style.borderColor = s.color + '44';
        // Also update sycoolSystems cache
        for (const sys of sycoolSystems) {
          if (sys.accu?.id === unitId) { sys.accu.operational_status = next; break; }
          if (sys.crac?.id === unitId) { sys.crac.operational_status = next; break; }
        }
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };

    // New campaign modal — 2-step: details then unit selection
    window.openNewCampaignModal = () => {
      // Build the list of trackable items (same logic as campaign-detail.js)
      const regularUnits = siteUnits.filter(u => !u.system_id);
      const dataHalls = [...new Set(sycoolSystems.map(s => s.data_hall))].filter(Boolean).sort();
      const hasSyCool  = sycoolSystems.length > 0;

      // Tracking IDs: for SyCool sites use ACCU unit id; for regular use unit id
      const allTrackItems = hasSyCool
        ? sycoolSystems.map(s => ({
            id:    s.accu?.id,
            label: s.system_number,
            hall:  s.data_hall,
          })).filter(s => s.id)
        : regularUnits.map(u => ({
            id:    u.id,
            label: u.asset_tag || u.serial_number || u.id.slice(0,8),
            hall:  u.data_hall || null,
          }));

      let step = 1;   // 1 = details, 2 = unit selection
      let selectedIds = null; // null = all

      const modal = document.createElement('div');
      modal.id = 'new-campaign-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(modal);
      const close = () => modal.remove();

      function renderStep1() {
        modal.innerHTML = `
          <div class="card" style="width:500px;max-width:100%">
            <div class="card-title" style="margin-bottom:4px">New Campaign</div>
            <div style="font-size:12px;color:var(--text3);margin-bottom:16px">Step 1 of 2 — Details</div>
            <div class="form-grid">
              <div class="form-group full"><label>Name *</label><input id="nc-name" placeholder="e.g. Spring PM 2026, Firmware v3.2 Update"/></div>
              <div class="form-group"><label>Type *</label>
                <select id="nc-type">
                  <option value="pm">PM</option>
                  <option value="firmware_update">Firmware Update</option>
                  <option value="rfe">RFE</option>
                  <option value="upgrade">Upgrade</option>
                  <option value="bug_fix">Bug Fix</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group"><label>Start Date</label><input type="date" id="nc-started" value="${new Date().toISOString().split('T')[0]}"/></div>
              <div class="form-group full"><label>Description</label><textarea id="nc-desc" rows="2" placeholder="Brief description of the work being done…"></textarea></div>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
              <button class="btn btn-secondary" id="nc-cancel">Cancel</button>
              <button class="btn btn-primary" id="nc-next">Next: Select Units →</button>
            </div>
          </div>`;
        document.getElementById('nc-cancel').addEventListener('click', close);
        document.getElementById('nc-next').addEventListener('click', () => {
          const name = document.getElementById('nc-name').value.trim();
          if (!name) { toast('Campaign name is required', 'error'); return; }
          renderStep2({
            name,
            campaign_type: document.getElementById('nc-type').value,
            started_at:    document.getElementById('nc-started').value || null,
            description:   document.getElementById('nc-desc').value.trim() || null,
          });
        });
      }

      function renderStep2(details) {
        // Build unit list HTML — grouped by hall for SyCool
        function buildUnitRows(ids) {
          if (hasSyCool) {
            return dataHalls.map(hall => {
              const hallItems = allTrackItems.filter(t => t.hall === hall);
              return `<div style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.05em;padding:6px 0 4px;text-transform:uppercase">${escHtml(hall)}</div>` +
                hallItems.map(t => `
                  <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:13px">
                    <input type="checkbox" class="unit-chk" value="${t.id}" ${ids === null || ids.includes(t.id) ? 'checked' : ''} style="accent-color:var(--accent)">
                    <span style="font-family:monospace">${escHtml(t.label)}</span>
                  </label>`).join('');
            }).join('');
          } else {
            return allTrackItems.map(t => `
              <label style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;font-size:13px">
                <input type="checkbox" class="unit-chk" value="${t.id}" ${ids === null || ids.includes(t.id) ? 'checked' : ''} style="accent-color:var(--accent)">
                <span style="font-family:monospace">${escHtml(t.label)}</span>
              </label>`).join('');
          }
        }

        const totalCount = allTrackItems.length;

        modal.innerHTML = `
          <div class="card" style="width:540px;max-width:100%;max-height:90vh;display:flex;flex-direction:column">
            <div class="card-title" style="margin-bottom:4px">New Campaign — <span style="font-weight:400">${escHtml(details.name)}</span></div>
            <div style="font-size:12px;color:var(--text3);margin-bottom:14px">Step 2 of 2 — Select which units to include</div>

            <!-- Scope selector -->
            <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
              <button class="btn btn-sm btn-secondary scope-btn" data-scope="all" style="background:var(--accent);color:#fff;border-color:var(--accent)">All (${totalCount})</button>
              ${hasSyCool ? dataHalls.map(h => `<button class="btn btn-sm btn-secondary scope-btn" data-scope="hall" data-hall="${escHtml(h)}">${escHtml(h)}</button>`).join('') : ''}
              <button class="btn btn-sm btn-secondary scope-btn" data-scope="none">None</button>
            </div>

            <!-- Search -->
            <input id="unit-search" placeholder="Search units…" style="margin-bottom:8px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:13px;width:100%;box-sizing:border-box">

            <!-- Unit list -->
            <div style="flex:1;overflow-y:auto;max-height:320px;border:1px solid var(--border);border-radius:8px;padding:8px 12px;background:var(--bg3)" id="unit-list-wrap">
              ${buildUnitRows(null)}
            </div>

            <div style="font-size:12px;color:var(--text3);margin-top:8px" id="nc-selection-summary">${totalCount} of ${totalCount} selected</div>

            <div style="display:flex;gap:8px;justify-content:space-between;margin-top:16px">
              <button class="btn btn-secondary" id="nc-back">← Back</button>
              <div style="display:flex;gap:8px">
                <button class="btn btn-secondary" id="nc-cancel2">Cancel</button>
                <button class="btn btn-primary" id="nc-create">Create Campaign</button>
              </div>
            </div>
          </div>`;

        function updateSummary() {
          const checked = [...modal.querySelectorAll('.unit-chk:checked')].map(c => c.value);
          document.getElementById('nc-selection-summary').textContent =
            `${checked.length} of ${totalCount} selected`;
        }

        // Scope buttons
        modal.querySelectorAll('.scope-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            modal.querySelectorAll('.scope-btn').forEach(b => {
              b.style.background = ''; b.style.color = ''; b.style.borderColor = '';
            });
            btn.style.background = 'var(--accent)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--accent)';
            const scope = btn.dataset.scope;
            modal.querySelectorAll('.unit-chk').forEach(chk => {
              if (scope === 'all')  chk.checked = true;
              else if (scope === 'none') chk.checked = false;
              else if (scope === 'hall') {
                // find the item for this checkbox
                const item = allTrackItems.find(t => t.id === chk.value);
                chk.checked = item?.hall === btn.dataset.hall;
              }
            });
            updateSummary();
          });
        });

        // Search filter
        document.getElementById('unit-search').addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase();
          modal.querySelectorAll('#unit-list-wrap label').forEach(lbl => {
            const text = lbl.textContent.toLowerCase();
            lbl.style.display = (!q || text.includes(q)) ? '' : 'none';
          });
        });

        modal.querySelectorAll('.unit-chk').forEach(chk => {
          chk.addEventListener('change', updateSummary);
        });

        document.getElementById('nc-back').addEventListener('click', renderStep1);
        document.getElementById('nc-cancel2').addEventListener('click', close);
        document.getElementById('nc-create').addEventListener('click', async () => {
          const checked = [...modal.querySelectorAll('.unit-chk:checked')].map(c => c.value);
          // null = all selected; otherwise store the array
          const unit_ids = checked.length === totalCount ? null : checked;
          const btn = document.getElementById('nc-create');
          btn.disabled = true; btn.textContent = 'Creating…';
          try {
            await API.campaigns.create(siteId, { ...details, unit_ids });
            campaigns = await API.campaigns.list(siteId);
            document.getElementById('campaigns-list').innerHTML = renderCampaignsList(campaigns);
            toast('Campaign created');
            close();
          } catch (e) { btn.disabled = false; btn.textContent = 'Create Campaign'; toast('Error: ' + e.message, 'error'); }
        });
      }

      renderStep1();
    };

    // Site status quick-change
    document.getElementById('site-status-select')?.addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      try {
        const updated = await API.sites.update(siteId, { site_status: newStatus });
        site = updated;
        siteData.site_status = updated.site_status;
        renderPage();
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });

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

    window.uploadWarrantyDoc = async (input) => {
      const file = input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', 'warranty');
      try {
        const doc = await API.documents.upload(siteId, fd);
        siteDocs.push(doc);
        const el = document.getElementById('warranty-docs-list');
        if (el) el.innerHTML = renderDocsList(siteDocs.filter(d => d.doc_type === 'warranty'), 'warranty');
        toast('Warranty document uploaded');
      } catch (e) { toast('Upload failed: ' + e.message, 'error'); }
    };

    // Edit site — navigates to site-form page
    window.openEditSiteModal = () => navigate('site-form', { id: siteId, backTo: 'site-detail', backParams: { id: siteId } });

    // ── Contacts inline form ──────────────────────────────────────────────────
    function inlineContactForm(existing) {
      const panelId = 'inline-contact-panel';
      document.getElementById(panelId)?.remove();
      const panel = document.createElement('div');
      panel.id = panelId;
      panel.style.cssText = 'background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:16px;margin-top:12px';
      const curType = existing?.contact_type || 'site_contact';
      panel.innerHTML = `
        <div style="font-weight:600;margin-bottom:14px;color:var(--text);font-size:14px">${existing ? 'Edit Contact' : 'Add Contact'}</div>
        <form id="contact-form">
          <div style="margin-bottom:14px">
            <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:6px">Contact Type *</label>
            <div style="display:flex;gap:8px">
              ${[['site_contact','Site Contact'],['munters_employee','Munters Employee'],['contractor','Contractor']].map(([val,lbl]) => {
                const color = contactTypeColor[val];
                return `<label style="flex:1;cursor:pointer">
                  <input type="radio" name="contact_type" value="${val}" ${curType===val?'checked':''} style="display:none" class="ctype-radio">
                  <div class="ctype-btn" data-val="${val}" style="text-align:center;border:2px solid ${curType===val?color:'var(--border)'};border-radius:8px;padding:8px 6px;font-size:12px;font-weight:600;color:${curType===val?color:'var(--text3)'};background:${curType===val?color+'18':'transparent'};transition:all .15s">
                    ${lbl}
                  </div>
                </label>`;
              }).join('')}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div style="grid-column:1/-1">
              <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Name *</label>
              <input name="name" required value="${escHtml(existing?.name||'')}" placeholder="Full name" style="width:100%;box-sizing:border-box"/>
            </div>
            <div>
              <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Role / Title</label>
              <input name="role" value="${escHtml(existing?.role||'')}" placeholder="e.g. Facility Manager" style="width:100%;box-sizing:border-box"/>
            </div>
            <div>
              <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Phone</label>
              <input name="phone" value="${escHtml(existing?.phone||'')}" placeholder="(555) 000-0000" style="width:100%;box-sizing:border-box"/>
            </div>
            <div style="grid-column:1/-1">
              <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Email</label>
              <input name="email" type="email" value="${escHtml(existing?.email||'')}" placeholder="name@company.com" style="width:100%;box-sizing:border-box"/>
            </div>
            <div style="grid-column:1/-1">
              <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Notes</label>
              <textarea name="notes" rows="2" placeholder="Any additional notes…" style="width:100%;box-sizing:border-box">${escHtml(existing?.notes||'')}</textarea>
            </div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('${panelId}')?.remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Add Contact'}</button>
          </div>
        </form>`;
      document.getElementById('contacts-list').after(panel);

      // Radio button visual toggle + Munters email auto-fill
      const nameInput  = panel.querySelector('input[name="name"]');
      const emailInput = panel.querySelector('input[name="email"]');

      function muntersEmailFromName() {
        const typeRadio = panel.querySelector('.ctype-radio:checked');
        if (typeRadio?.value !== 'munters_employee') return;
        if (emailInput.value && emailInput.value !== emailInput.dataset.autoFilled) return; // user typed something else
        const parts = nameInput.value.trim().split(/\s+/);
        if (parts.length >= 2) {
          const suggested = `${parts[0].toLowerCase()}.${parts[parts.length - 1].toLowerCase()}@munters.com`;
          emailInput.value = suggested;
          emailInput.dataset.autoFilled = suggested;
        }
      }

      nameInput.addEventListener('input', muntersEmailFromName);

      panel.querySelectorAll('.ctype-radio').forEach(radio => {
        radio.addEventListener('change', () => {
          panel.querySelectorAll('.ctype-btn').forEach(btn => {
            const val = btn.dataset.val;
            const color = contactTypeColor[val];
            const active = val === radio.value;
            btn.style.borderColor = active ? color : 'var(--border)';
            btn.style.color = active ? color : 'var(--text3)';
            btn.style.background = active ? color + '18' : 'transparent';
          });
          // Auto-fill email when switching to Munters type
          if (radio.value === 'munters_employee') muntersEmailFromName();
          // Clear auto-filled email when switching away
          else if (emailInput.value === emailInput.dataset.autoFilled) {
            emailInput.value = '';
            emailInput.dataset.autoFilled = '';
          }
        });
      });
      panel.querySelector('#contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
        data.contact_type = data.contact_type || 'site_contact';
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

    // ── Documents ─────────────────────────────────────────────────────────────
    let activeDocType = 'submittal';

    document.querySelectorAll('.docs-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeDocType = btn.dataset.type;
        document.querySelectorAll('.docs-tab-btn').forEach(b => {
          const isActive = b.dataset.type === activeDocType;
          b.style.background = isActive ? 'var(--accent)' : 'transparent';
          b.style.color = isActive ? '#fff' : 'var(--text2)';
        });
        document.getElementById('docs-list').innerHTML = renderDocsList(siteDocs, activeDocType);
      });
    });

    // SyCool hall filter
    let _sycoolFilter = null;
    window.sycoolFilterHall = (hall) => {
      _sycoolFilter = hall;
      const el = document.getElementById('sycool-systems-list');
      if (el) el.innerHTML = renderSystemsList(sycoolSystems, hall);
    };

    window.uploadDocument = async (input) => {
      const file = input.files[0];
      if (!file) return;
      input.value = '';

      // Infer doc_type from active tab; for photos allow override by mime
      let docType = activeDocType;
      if (file.type.startsWith('image/') && docType !== 'photo') docType = 'photo';

      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docType);
      fd.append('name', file.name.replace(/\.[^.]+$/, ''));

      const label = document.getElementById('doc-upload-label');
      const orig = label.childNodes[0].textContent;
      label.childNodes[0].textContent = ' Uploading…';
      try {
        const doc = await API.documents.upload(siteId, fd);
        siteDocs = [...siteDocs, doc];
        // Switch to the tab of the uploaded type
        activeDocType = doc.doc_type;
        document.querySelectorAll('.docs-tab-btn').forEach(b => {
          const isActive = b.dataset.type === activeDocType;
          b.style.background = isActive ? 'var(--accent)' : 'transparent';
          b.style.color = isActive ? '#fff' : 'var(--text2)';
          // Update count
          const count = siteDocs.filter(d => d.doc_type === b.dataset.type).length;
          b.innerHTML = `${b.innerHTML.replace(/<span.*<\/span>/, '')} <span style="font-weight:400;opacity:.7">${count}</span>`;
        });
        document.getElementById('docs-list').innerHTML = renderDocsList(siteDocs, activeDocType);
        toast('Document uploaded');
      } catch (e) {
        toast('Upload failed: ' + e.message, 'error');
      } finally {
        label.childNodes[0].textContent = orig;
      }
    };

    window.deleteDocument = async (docId) => {
      if (!confirm('Delete this document?')) return;
      try {
        await API.documents.delete(siteId, docId);
        siteDocs = siteDocs.filter(d => d.id !== docId);
        document.getElementById('docs-list').innerHTML = renderDocsList(siteDocs, activeDocType);
        toast('Document deleted');
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };

    // ── CxAlloy issues import ─────────────────────────────────────────────────
    window.importCxAlloyIssues = async (input) => {
      const file = input.files[0];
      if (!file) return;
      input.value = '';

      if (typeof XLSX === 'undefined') { toast('SheetJS not loaded — check internet connection', 'error'); return; }

      try {
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

        // CxAlloy export: row 0 = title, row 1 = headers, row 2+ = data
        if (raw.length < 3) { toast('File appears empty or unrecognized', 'error'); return; }
        const headers = raw[1].map(h => String(h || '').trim());
        const dataRows = raw.slice(2).filter(r => r.some(v => v != null && v !== ''));

        const h = {};
        headers.forEach((col, i) => { if (col) h[col] = i; });
        const get = (row, col) => { const v = row[h[col]]; return v != null && v !== '' ? String(v).trim() : null; };

        const priorityMap = {
          'Critical': 'critical', 'High': 'high', 'Low': 'low',
          'IST Gating': 'critical', 'Non-critical': 'low',
          'P1 - Critical': 'critical', 'P1 - High': 'high',
          'P2 - Medium': 'high', 'P3 - Low': 'low',
        };
        const statusMap = {
          'Closed': 'closed', 'Open': 'open', 'In Progress': 'in_progress',
          'Ready to Inspect': 'ready_to_inspect', 'Work Complete': 'work_complete',
          'Parts Needed': 'in_progress', 'Awaiting Parts': 'in_progress',
        };

        const issues = dataRows.map(row => {
          const name = get(row, 'Name');
          if (!name) return null;
          const rawDate = (v) => {
            if (!v) return null;
            const d = new Date(v);
            return isNaN(d) ? null : d.toISOString().replace('T', ' ').split('.')[0];
          };
          return {
            cxalloy_issue_id: name,
            title: name,
            description: get(row, 'Description'),
            unit_tag: get(row, 'Asset'),
            priority: priorityMap[get(row, 'Priority')] || 'low',
            status: statusMap[get(row, 'Status')] || 'closed',
            reported_by: get(row, 'Created By'),
            resolution_notes: get(row, 'Comments'),
            closed_date: rawDate(get(row, 'Date Closed')),
            reported_date: rawDate(get(row, 'Date Created')),
            cx_zone: get(row, 'Zone(s)'),
            cx_issue_type: get(row, 'Issue Type'),
            cx_source: get(row, 'Source'),
          };
        }).filter(Boolean);

        if (!issues.length) { toast('No issues found in file', 'error'); return; }

        // Show preview modal
        const modalId = 'cxalloy-import-modal';
        document.getElementById(modalId)?.remove();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';

        const byStatus = issues.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});
        const statusSummary = Object.entries(byStatus).map(([s, n]) => `${n} ${s}`).join(', ');
        const sample = issues.slice(0, 8);

        modal.innerHTML = `
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto">
            <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px">Import CxAlloy Issues</div>
            <div style="font-size:13px;color:var(--text3);margin-bottom:16px">
              Found <strong>${issues.length}</strong> issues from <strong>${escHtml(file.name)}</strong>.<br>
              <span style="color:var(--text2)">${statusSummary}</span><br>
              Existing issues with the same CxAlloy ID will be <strong>overwritten</strong> with the latest data.
            </div>
            <div style="max-height:320px;overflow-y:auto;margin-bottom:16px">
              <table style="width:100%;font-size:12px;border-collapse:collapse">
                <thead><tr style="background:var(--bg3)">
                  <th style="padding:4px 8px;text-align:left">Issue ID</th>
                  <th style="padding:4px 8px;text-align:left">Asset</th>
                  <th style="padding:4px 8px;text-align:left">Zone</th>
                  <th style="padding:4px 8px;text-align:left">Priority</th>
                  <th style="padding:4px 8px;text-align:left">Status</th>
                </tr></thead>
                <tbody>
                  ${sample.map(i => `<tr style="border-top:1px solid var(--border)">
                    <td style="padding:4px 8px;font-family:monospace">${escHtml(i.title)}</td>
                    <td style="padding:4px 8px;color:var(--text2)">${escHtml(i.unit_tag||'—')}</td>
                    <td style="padding:4px 8px;color:var(--text2)">${escHtml(i.cx_zone||'—')}</td>
                    <td style="padding:4px 8px;color:var(--text2)">${escHtml(i.priority||'—')}</td>
                    <td style="padding:4px 8px;color:var(--text2)">${escHtml(i.status||'—')}</td>
                  </tr>`).join('')}
                  ${issues.length > 8 ? `<tr><td colspan="5" style="padding:4px 8px;color:var(--text3);font-style:italic">… and ${issues.length - 8} more</td></tr>` : ''}
                </tbody>
              </table>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancel</button>
              <button class="btn btn-primary" id="confirm-cxalloy-btn">Import ${issues.length} Issues</button>
            </div>
          </div>`;
        document.body.appendChild(modal);

        document.getElementById('confirm-cxalloy-btn').addEventListener('click', async () => {
          const btn = document.getElementById('confirm-cxalloy-btn');
          btn.disabled = true;
          btn.textContent = 'Importing…';
          try {
            const result = await API.tickets.importCxAlloy(siteId, issues);
            modal.remove();
            toast(`Imported ${result.imported} new, ${result.skipped} updated`, 'success');
          } catch (e) {
            btn.disabled = false;
            btn.textContent = `Import ${issues.length} Issues`;
            toast('Import failed: ' + e.message, 'error');
          }
        });

      } catch (err) {
        toast('Error reading file: ' + err.message, 'error');
      }
    };

    // ── Astea CSV import ──────────────────────────────────────────────────────
    window.importUnitsFromCSV = async (input) => {
      const file = input.files[0];
      if (!file) return;
      input.value = '';

      const text = await file.text();
      // Normalize line endings and split into lines
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
      if (lines.length < 2) { toast('CSV appears empty', 'error'); return; }

      // RFC-4180 compliant CSV parser — handles quoted fields with embedded commas/newlines
      function parseCSVLine(line) {
        const fields = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
            else inQ = !inQ;
          } else if (ch === ',' && !inQ) {
            fields.push(cur.trim());
            cur = '';
          } else {
            cur += ch;
          }
        }
        fields.push(cur.trim());
        return fields;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());

      const idx = (name) => headers.indexOf(name);
      const col = (row, name) => {
        const i = idx(name);
        return i >= 0 ? (row[i] || '') : '';
      };

      // Parse rows into objects grouped by serial_no (unit number)
      const rows = lines.slice(1).filter(l => l.trim()).map(parseCSVLine);

      // Astea CSVs have unquoted commas inside description fields (e.g. "SYS500C-01, QTS REL06-1")
      // which shifts subsequent column indices by +1 (or more). We find the serial_no by
      // pattern-matching rather than relying on column position.
      const serialNoPattern = /^\d{5,9}-\d{4}$/;
      const numHeaderCols = headers.length;

      function extractRow(row) {
        const bpartId = row[0] || '';
        // Find serial_no by pattern (always looks like "22366582-0001")
        const serialIdx = row.findIndex(f => serialNoPattern.test(f));
        if (serialIdx < 0) return null;
        const serialNo = row[serialIdx];
        const installDate = row[serialIdx - 1] || ''; // always right before serial
        // descr spans from col 2 up to (but not including) installDate
        const descr = row.slice(2, serialIdx - 1).join(',').trim();
        // status is 5 cols after serial in the original header (col 9 - col 4 = 5)
        const status = row[serialIdx + 5] || '';
        return { bpartId, serialNo, installDate, descr, status };
      }

      // Each CSV row is one physical unit (condenser OR evaporator).
      // Serial = "<system_serial>-COND" or "<system_serial>-EVAP" for uniqueness.
      const units = [];
      for (const row of rows) {
        const extracted = extractRow(row);
        if (!extracted) continue;
        const { bpartId, serialNo, installDate, descr, status } = extracted;
        if (!serialNo || !bpartId) continue;

        // Component type from bpart_id suffix (e.g. "22366582-COND" → "COND")
        const compSuffix = bpartId.split('-').pop().toUpperCase(); // COND or EVAP
        const unitType = compSuffix === 'COND' ? 'condenser' : compSuffix === 'EVAP' ? 'evaporator' : 'evaporative_cooler';

        // Unique serial per component: "22366582-0001-COND"
        const unitSerial = `${serialNo}-${compSuffix}`;

        // Parse install date
        let parsedDate = null;
        if (installDate) {
          const d = new Date(installDate);
          if (!isNaN(d)) parsedDate = d.toISOString().split('T')[0];
        }

        // Model from descr — take everything before the first comma
        const model = (descr || '').split(',')[0].trim() || null;

        // Job number from bpart_id prefix (e.g. "22366582" from "22366582-COND")
        const jobNumber = bpartId.split('-').slice(0, -1).join('-') || null;

        units.push({
          site_id: siteId,
          serial_number: unitSerial,
          _sortJob: jobNumber || '',
          _sortSerial: parseInt(serialNo.split('-').pop(), 10) || 0,
          _sortComp: compSuffix, // COND before EVAP
          model,
          job_number: jobNumber,
          install_date: parsedDate,
          unit_type: unitType,
          status: 'installed',
        });
      }

      if (!units.length) { toast('No units found in CSV', 'error'); return; }

      // Assign sequential line numbers across all units, sorted by job → system serial → component
      // (avoids collisions when multiple job numbers share the same per-job sequence numbers)
      units.sort((a, b) =>
        a._sortJob.localeCompare(b._sortJob) ||
        a._sortSerial - b._sortSerial ||
        a._sortComp.localeCompare(b._sortComp)
      );
      // Offset so imported line numbers follow any already-existing units on this site
      const lineOffset = unitList.length ? Math.max(...unitList.map(u => u.line_number || 0)) : 0;
      units.forEach((u, i) => {
        u.line_number = lineOffset + i + 1;
        delete u._sortJob; delete u._sortSerial; delete u._sortComp;
      });

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
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
            <label style="font-size:13px;font-weight:600;color:var(--text2);white-space:nowrap">Commissioning Status</label>
            <select id="import-commission-level" style="flex:1;max-width:220px">
              <option value="none">None (not started)</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="L4">L4</option>
              <option value="L5">L5</option>
              <option value="complete">Complete</option>
            </select>
            <span style="font-size:12px;color:var(--text3)">Applied to all imported units</span>
          </div>
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
        const commLevel = document.getElementById('import-commission-level')?.value || 'none';
        btn.disabled = true;
        btn.textContent = 'Importing…';
        let imported = 0, failed = 0;
        for (const u of toImport) {
          try { await API.units.create({ ...u, commission_level: commLevel }); imported++; }
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
