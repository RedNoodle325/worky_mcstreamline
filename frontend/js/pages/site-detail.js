async function renderSiteDetail(container, { id } = {}) {
  if (!id) { navigate('sites'); return; }

  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let site, units, tickets, contacts, forms;
  try {
    [site, units, tickets, contacts, forms] = await Promise.all([
      API.sites.get(id),
      API.units.list(),
      API.tickets.list(),
      API.site_contacts.list(id),
      API.site_forms.list(id),
    ]);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error loading site: ${escHtml(e.message)}</div>`;
    return;
  }

  const siteUnits = units.filter(u => u.site_id === id)
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
        <div style="display:flex;gap:8px;align-items:center">
          <label class="btn btn-secondary btn-sm" style="cursor:pointer" title="Upload company logo">
            🖼 Logo
            <input type="file" id="logo-upload" accept="image/*" style="display:none" onchange="uploadLogo(this)">
          </label>
          <button class="btn btn-secondary btn-sm" onclick="openEditSiteModal()">Edit Site</button>
          <button class="btn btn-secondary btn-sm" onclick="printSiteReport('${id}')">🖨 Report</button>
        </div>
      </div>

      <!-- Top row: Info + Map -->
      <div class="grid-2" style="gap:16px;margin-bottom:16px">
        <div class="card">
          <div class="card-title">Site Information</div>
          <div class="grid-2" style="gap:8px;margin-top:8px">
            <div>
              <div class="section-title">Site Address</div>
              <div style="color:var(--text2)">${escHtml(addr || '—')}</div>
            </div>
            <div>
              <div class="section-title">Shipping Address</div>
              <div style="color:var(--text2)">${escHtml([site.shipping_address_street, site.shipping_address_city, site.shipping_address_state, site.shipping_address_zip].filter(Boolean).join(', ') || '—')}</div>
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
    attachSiteDetailHandlers(id, site, contacts, forms, siteUnits, siteTickets);
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
  function attachSiteDetailHandlers(siteId, siteData, contactList, formList, unitList, ticketList) {

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

    // Edit site
    window.openEditSiteModal = () => showSiteForm(siteData, async () => {
      try {
        site = await API.sites.get(siteId);
        renderPage();
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });

    // Contacts
    window.openContactForm = (contactId) => {
      const existing = contactId ? contactList.find(c => c.id === contactId) : null;
      openModal(existing ? 'Edit Contact' : 'New Contact', `
        <form id="contact-form">
          <div class="form-grid">
            <div class="form-group full"><label>Name *</label><input name="name" required value="${escHtml(existing?.name || '')}"/></div>
            <div class="form-group"><label>Role / Title</label><input name="role" value="${escHtml(existing?.role || '')}"/></div>
            <div class="form-group"><label>Phone</label><input name="phone" value="${escHtml(existing?.phone || '')}"/></div>
            <div class="form-group full"><label>Email</label><input name="email" type="email" value="${escHtml(existing?.email || '')}"/></div>
            <div class="form-group full"><label>Notes</label><textarea name="notes">${escHtml(existing?.notes || '')}</textarea></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add Contact'}</button>
          </div>
        </form>`);

      document.getElementById('contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
        try {
          if (existing) await API.site_contacts.update(siteId, contactId, data);
          else await API.site_contacts.create(siteId, data);
          closeModal();
          contacts = await API.site_contacts.list(siteId);
          contactList = contacts;
          document.getElementById('contacts-list').innerHTML = renderContactsList(contacts);
          attachSiteDetailHandlers(siteId, siteData, contacts, formList, unitList, ticketList);
          toast(existing ? 'Contact updated' : 'Contact added');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });
    };

    window.deleteContact = async (contactId) => {
      if (!confirm('Delete this contact?')) return;
      try {
        await API.site_contacts.delete(siteId, contactId);
        contacts = await API.site_contacts.list(siteId);
        contactList = contacts;
        document.getElementById('contacts-list').innerHTML = renderContactsList(contacts);
        attachSiteDetailHandlers(siteId, siteData, contacts, formList, unitList, ticketList);
        toast('Contact deleted');
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };

    // Form templates
    window.openFormTemplateForm = (formId) => {
      const existing = formId ? formList.find(f => f.id === formId) : null;
      openModal(existing ? 'Edit Form Template' : 'New Form Template', `
        <form id="form-template-form">
          <div class="form-grid">
            <div class="form-group full"><label>Name *</label><input name="name" required value="${escHtml(existing?.name || '')}"/></div>
            <div class="form-group full"><label>Description</label><input name="description" value="${escHtml(existing?.description || '')}"/></div>
            <div class="form-group"><label>Category</label>
              <select name="category">
                <option value="general" ${(existing?.category||'general')==='general'?'selected':''}>General</option>
                <option value="safety" ${existing?.category==='safety'?'selected':''}>Safety</option>
                <option value="permit" ${existing?.category==='permit'?'selected':''}>Permit</option>
                <option value="orientation" ${existing?.category==='orientation'?'selected':''}>Orientation</option>
                <option value="checklist" ${existing?.category==='checklist'?'selected':''}>Checklist</option>
              </select>
            </div>
            <div class="form-group full"><label>URL / Link</label><input name="url" type="url" value="${escHtml(existing?.url || '')}" placeholder="https://…"/></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add Form'}</button>
          </div>
        </form>`);

      document.getElementById('form-template-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
        try {
          if (existing) await API.site_forms.update(siteId, formId, data);
          else await API.site_forms.create(siteId, data);
          closeModal();
          forms = await API.site_forms.list(siteId);
          formList = forms;
          document.getElementById('forms-list').innerHTML = renderFormsList(forms);
          attachSiteDetailHandlers(siteId, siteData, contactList, forms, unitList, ticketList);
          toast(existing ? 'Form updated' : 'Form added');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });
    };

    window.deleteFormTemplate = async (formId) => {
      if (!confirm('Delete this form template?')) return;
      try {
        await API.site_forms.delete(siteId, formId);
        forms = await API.site_forms.list(siteId);
        formList = forms;
        document.getElementById('forms-list').innerHTML = renderFormsList(forms);
        attachSiteDetailHandlers(siteId, siteData, contactList, forms, unitList, ticketList);
        toast('Form deleted');
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };
  }
}
