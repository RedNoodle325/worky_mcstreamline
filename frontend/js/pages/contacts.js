async function renderContacts(container) {
  container.innerHTML = `
    <div class="page-header" style="margin-bottom:20px">
      <div>
        <h1>Contacts</h1>
        <div class="page-subtitle">All contacts across sites and contractors</div>
      </div>
      <button class="btn btn-primary" id="add-contact-btn">+ Add Contact</button>
    </div>
    <div id="contacts-body"><div style="color:var(--text3);padding:40px;text-align:center">Loading…</div></div>`;

  try {
    const [contractors, sites, siteContactsNested] = await Promise.all([
      API.contractors.list(),
      API.sites.list(),
      API.sites.list().then(ss =>
        Promise.all(ss.map(s =>
          API.site_contacts.list(s.id).then(cs => cs.map(c => ({...c, site_name: s.name || s.project_name || s.project_number || s.id})))
        ))
      ).then(arr => arr.flat()),
    ]);

    // Normalize everything into one list
    const allContacts = [
      ...contractors.map(c => ({
        _type: 'contractor',
        _id: c.id,
        name: c.contact_name || c.company_name || '—',
        title: c.title || '—',
        company: c.company_name || '—',
        phone: c.phone || '—',
        email: c.email || null,
        extra: c.region || '',
        is_active: c.is_active !== false,
      })),
      ...siteContactsNested.map(c => ({
        _type: 'site_contact',
        _id: c.id,
        _site_id: c.site_id,
        name: c.name || '—',
        title: c.role || '—',
        company: c.site_name || '—',
        phone: c.phone || '—',
        email: c.email || null,
        extra: '',
        is_active: true,
      })),
    ];

    // Sort by name
    allContacts.sort((a, b) => a.name.localeCompare(b.name));

    document.getElementById('contacts-body').innerHTML = allContacts.length === 0
      ? `<div class="card" style="color:var(--text3);padding:40px;text-align:center">No contacts yet. Click "+ Add Contact" to get started.</div>`
      : `<div class="card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title / Role</th>
                  <th>Company / Site</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th class="edit-ui"></th>
                </tr>
              </thead>
              <tbody>
                ${allContacts.map(c => `
                  <tr style="${!c.is_active ? 'opacity:0.5' : ''}">
                    <td style="font-weight:500">${escHtml(c.name)}</td>
                    <td style="color:var(--text2);font-size:13px">${escHtml(c.title)}</td>
                    <td>${escHtml(c.company)}${c.extra ? `<span style="font-size:11px;color:var(--text3);margin-left:6px">${escHtml(c.extra)}</span>` : ''}</td>
                    <td>${escHtml(c.phone)}</td>
                    <td style="font-size:13px">${c.email ? `<a href="mailto:${escHtml(c.email)}" style="color:var(--accent)">${escHtml(c.email)}</a>` : '—'}</td>
                    <td class="edit-ui" style="white-space:nowrap">
                      ${c._type === 'contractor'
                        ? `<button class="btn btn-secondary btn-sm" onclick="navigate('contractor-detail',{id:'${c._id}'})">Edit</button>`
                        : `<button class="btn btn-secondary btn-sm" onclick="navigate('site-detail',{id:'${c._site_id}'})">Site</button>`
                      }
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

    // Add Contact button — creates a contractor record
    document.getElementById('add-contact-btn').addEventListener('click', () => {
      const modalHtml = `
        <div id="add-contact-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center">
          <div class="card" style="width:480px;max-width:95vw">
            <div class="card-title" style="margin-bottom:16px">Add Contact</div>
            <div class="form-grid">
              <div class="form-group full"><label>Name *</label><input id="ac-name" placeholder="Full name"/></div>
              <div class="form-group"><label>Title / Role</label><input id="ac-title" placeholder="e.g. Facility Manager"/></div>
              <div class="form-group"><label>Company</label><input id="ac-company" placeholder="Company name"/></div>
              <div class="form-group"><label>Phone</label><input id="ac-phone" placeholder="(555) 000-0000"/></div>
              <div class="form-group full"><label>Email</label><input id="ac-email" type="email" placeholder="name@company.com"/></div>
              <div class="form-group"><label>Region / Area</label><input id="ac-region" placeholder="e.g. Southeast"/></div>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
              <button class="btn btn-secondary" id="ac-cancel">Cancel</button>
              <button class="btn btn-primary" id="ac-save">Add Contact</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modal = document.getElementById('add-contact-modal');
      const close = () => modal.remove();
      document.getElementById('ac-cancel').addEventListener('click', close);
      document.getElementById('ac-save').addEventListener('click', async () => {
        const name = document.getElementById('ac-name').value.trim();
        if (!name) { toast('Name is required', 'error'); return; }
        const data = {
          contact_name: name,
          title:        document.getElementById('ac-title').value.trim() || null,
          company_name: document.getElementById('ac-company').value.trim() || null,
          phone:        document.getElementById('ac-phone').value.trim() || null,
          email:        document.getElementById('ac-email').value.trim() || null,
          region:       document.getElementById('ac-region').value.trim() || null,
        };
        try {
          await API.contractors.create(data);
          toast('Contact added');
          close();
          renderContacts(container);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
      document.getElementById('ac-name').focus();
    });

  } catch (e) {
    document.getElementById('contacts-body').innerHTML = `<div style="color:var(--red);padding:20px">Error: ${escHtml(e.message)}</div>`;
  }
}
