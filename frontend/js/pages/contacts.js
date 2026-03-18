async function renderContacts(container) {
  container.innerHTML = `
    <div class="page-header" style="margin-bottom:20px">
      <div>
        <h1>Contacts</h1>
        <div class="page-subtitle">Contractors &amp; site contacts</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('contractor-detail')">+ New Contractor</button>
    </div>
    <div id="contacts-body"><div style="color:var(--text3);padding:40px;text-align:center">Loading…</div></div>`;

  try {
    const [contractors, sites, siteContacts] = await Promise.all([
      API.contractors.list(),
      API.sites.list(),
      // Load all site contacts by fetching per site in parallel
      API.sites.list().then(ss => Promise.all(ss.map(s => API.site_contacts.list(s.id).then(cs => cs.map(c => ({...c, site_name: s.name})))))).then(arr => arr.flat()),
    ]);

    const siteMap = {};
    sites.forEach(s => { siteMap[s.id] = s; });

    document.getElementById('contacts-body').innerHTML = `
      <!-- Contractors -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="card-title" style="margin:0">Contractors</div>
        </div>
        ${contractors.length === 0
          ? `<div style="color:var(--text3);padding:12px 0">No contractors yet.</div>`
          : `<div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Company</th><th>Phone</th><th>Email</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  ${contractors.map(c => `
                    <tr>
                      <td><a onclick="navigate('contractor-detail',{id:'${c.id}'})" style="cursor:pointer">${escHtml(c.name||'—')}</a></td>
                      <td>${escHtml(c.company||'—')}</td>
                      <td>${escHtml(c.phone||'—')}</td>
                      <td>${escHtml(c.email||'—')}</td>
                      <td><span class="badge ${c.active===false?'badge-closed':'badge-resolved'}">${c.active===false?'Inactive':'Active'}</span></td>
                      <td><button class="btn btn-secondary btn-sm" onclick="navigate('contractor-detail',{id:'${c.id}'})">Edit</button></td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>`}
      </div>

      <!-- Site Contacts -->
      <div class="card">
        <div class="card-title" style="margin-bottom:12px">Site Contacts</div>
        ${siteContacts.length === 0
          ? `<div style="color:var(--text3);padding:12px 0">No site contacts yet. Add them from the site detail page.</div>`
          : `<div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Role</th><th>Site</th><th>Phone</th><th>Email</th></tr>
                </thead>
                <tbody>
                  ${siteContacts.map(c => `
                    <tr>
                      <td>${escHtml(c.name||'—')}</td>
                      <td>${escHtml(c.role||'—')}</td>
                      <td><a onclick="navigate('site-detail',{id:'${c.site_id}'})" style="cursor:pointer;color:var(--accent)">${escHtml(c.site_name||'—')}</a></td>
                      <td>${escHtml(c.phone||'—')}</td>
                      <td>${escHtml(c.email||'—')}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>`}
      </div>`;
  } catch (e) {
    document.getElementById('contacts-body').innerHTML = `<div style="color:var(--red);padding:20px">Error: ${escHtml(e.message)}</div>`;
  }
}
