async function renderIssues(container) {
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let issues, sites;
  try {
    [issues, sites] = await Promise.all([API.issues.listAll(), API.sites.list()]);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`;
    return;
  }

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]));

  // Filter state — default to showing active (open + in_progress) only
  let filterSite = '', filterStatuses = new Set(['open', 'in_progress']), filterPriority = '', searchText = '';

  function filtered() {
    return issues.filter(i => {
      if (filterSite && i.site_id !== filterSite) return false;
      if (filterStatuses.size && !filterStatuses.has(i.status || 'open')) return false;
      if (filterPriority && i.priority !== filterPriority) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!(
          (i.title || '').toLowerCase().includes(q) ||
          (i.unit_tag || '').toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  }

  const priorityColor = { critical: 'var(--red)', high: 'var(--orange)', low: 'var(--text2)', '': 'var(--text3)' };
  const statusColor   = { open: 'var(--red)', in_progress: 'var(--yellow)', closed: 'var(--text3)', work_complete: 'var(--green)', ready_to_inspect: 'var(--accent)' };
  const statusLabel   = { open: 'Open', in_progress: 'In Progress', closed: 'Closed', work_complete: 'Work Complete', ready_to_inspect: 'Ready to Inspect' };
  const priorityLabel = { critical: 'Critical', high: 'High', low: 'Low' };

  function priorityBadge(p) {
    const c = priorityColor[p] || 'var(--text3)';
    return `<span style="color:${c};font-weight:600;font-size:11px">${priorityLabel[p] || p || '—'}</span>`;
  }
  function statusBadgeI(s) {
    const c = statusColor[s] || 'var(--text3)';
    const l = statusLabel[s] || s || '—';
    return `<span style="background:${c}22;color:${c};border:1px solid ${c}44;border-radius:99px;padding:1px 8px;font-size:11px;white-space:nowrap">${l}</span>`;
  }

  const STATUS_OPTS = [
    { val: 'open',             label: 'Open',             color: 'var(--red)'    },
    { val: 'in_progress',      label: 'In Progress',      color: 'var(--yellow)' },
    { val: 'work_complete',    label: 'Work Complete',    color: 'var(--green)'  },
    { val: 'ready_to_inspect', label: 'Ready to Inspect', color: 'var(--accent)' },
    { val: 'closed',           label: 'Closed',           color: 'var(--text3)'  },
  ];

  let expandedId = null;

  function render() {
    const list = filtered();
    const counts = {};
    STATUS_OPTS.forEach(s => { counts[s.val] = issues.filter(i => i.status === s.val).length; });

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:20px">
        <div>
          <h1 style="margin:0">Issues</h1>
          <div class="page-subtitle">${issues.length} total · ${counts.open||0} open · ${counts.closed||0} closed</div>
        </div>
        <button class="btn btn-primary" id="new-issue-btn">+ New Issue</button>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:16px;padding:12px 16px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <input id="issues-search" placeholder="Search…" value="${escHtml(searchText)}"
            style="width:180px" oninput="issuesSearch(this.value)"/>
          <select id="filter-site" onchange="issuesFilter('site',this.value)" style="max-width:160px">
            <option value="">All Sites</option>
            ${sites.map(s => `<option value="${s.id}" ${filterSite===s.id?'selected':''}>${escHtml(s.name)}</option>`).join('')}
          </select>
          <select id="filter-priority" onchange="issuesFilter('priority',this.value)">
            <option value="">All Priorities</option>
            <option value="critical" ${filterPriority==='critical'?'selected':''}>Critical</option>
            <option value="high"     ${filterPriority==='high'?'selected':''}>High</option>
            <option value="low"      ${filterPriority==='low'?'selected':''}>Low</option>
          </select>
          <!-- Multi-status toggles -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Status:</span>
            ${STATUS_OPTS.map(s => {
              const active = filterStatuses.has(s.val);
              return `<button onclick="issuesToggleStatus('${s.val}')"
                style="padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid ${s.color};
                       background:${active ? s.color : 'transparent'};color:${active ? '#fff' : s.color};transition:all .15s;white-space:nowrap">
                ${s.label} <span style="opacity:.7">${counts[s.val]||0}</span>
              </button>`;
            }).join('')}
            ${filterStatuses.size ? `<button onclick="issuesClearStatus()" style="padding:3px 8px;border-radius:99px;font-size:11px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer">✕ Clear</button>` : ''}
          </div>
          <span style="color:var(--text3);font-size:12px;margin-left:auto">${list.length} shown</span>
        </div>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Issue ID</th>
              <th>Site</th>
              <th>Equipment</th>
              <th style="min-width:200px">Description</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th style="width:60px"></th>
            </tr></thead>
            <tbody>
              ${list.length === 0
                ? `<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:32px">No issues match your filters</td></tr>`
                : list.flatMap(i => {
                    const site = siteMap[i.site_id];
                    const isOpen = expandedId === i.id;
                    const priColor = { critical:'var(--red)', high:'var(--orange)', low:'var(--text2)' };
                    const row = `<tr style="cursor:pointer;${isOpen ? 'background:var(--bg3);' : ''}" onclick="issueRowClick('${i.id}')">
                      <td style="font-family:monospace;font-size:12px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(i.title||'')}">
                        <span style="font-size:10px;color:var(--text3);margin-right:5px;transition:transform .15s;display:inline-block;transform:${isOpen?'rotate(90deg)':'rotate(0deg)'}">▶</span>${escHtml(i.cxalloy_issue_id || i.title || '—')}
                      </td>
                      <td style="font-size:12px;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        ${site ? `<a onclick="event.stopPropagation();navigate('site-detail',{id:'${site.id}'})" style="cursor:pointer">${escHtml(site.name)}</a>` : '—'}
                      </td>
                      <td style="font-family:monospace;font-size:12px;color:var(--text2)">${escHtml(i.unit_tag||'—')}</td>
                      <td style="max-width:260px">
                        ${i.description
                          ? `<span style="font-size:12px;color:var(--text3);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4">${escHtml(i.description)}</span>`
                          : '<span style="color:var(--text3);font-size:11px">—</span>'}
                      </td>
                      <td>${priorityBadge(i.priority)}</td>
                      <td>${statusBadgeI(i.status)}</td>
                      <td style="font-size:12px;color:var(--text3)">${fmt(i.reported_date || i.created_at)}</td>
                      <td onclick="event.stopPropagation()" class="edit-ui">
                        <button class="btn btn-sm btn-secondary" onclick="openIssueModal('${i.id}')">Edit</button>
                      </td>
                    </tr>`;
                    const detail = isOpen ? `<tr style="background:var(--bg3)">
                      <td colspan="8" style="padding:0 16px 16px 32px;border-bottom:2px solid var(--border)">
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px 20px;padding-top:12px;margin-bottom:${i.description||i.resolution_notes?'12px':'0'}">
                          ${i.cx_issue_type ? `<div><div class="section-title">Issue Type</div><div style="font-size:12px;color:var(--text2)">${escHtml(i.cx_issue_type)}</div></div>` : ''}
                          ${i.cx_zone ? `<div><div class="section-title">Zone</div><div style="font-size:12px;color:var(--text2)">${escHtml(i.cx_zone)}</div></div>` : ''}
                          ${i.cx_source ? `<div><div class="section-title">Source</div><div style="font-size:12px;color:var(--text2)">${escHtml(i.cx_source)}</div></div>` : ''}
                          ${i.reported_by ? `<div><div class="section-title">Reported By</div><div style="font-size:12px;color:var(--text2)">${escHtml(i.reported_by)}</div></div>` : ''}
                          ${i.closed_date ? `<div><div class="section-title">Closed</div><div style="font-size:12px;color:var(--text2)">${fmt(i.closed_date)}</div></div>` : ''}
                        </div>
                        ${i.description ? `<div style="margin-bottom:8px"><div class="section-title">Description</div><div style="white-space:pre-wrap;font-size:13px;color:var(--text2);margin-top:3px">${escHtml(i.description)}</div></div>` : ''}
                        ${i.resolution_notes ? `<div><div class="section-title">Comments / Resolution</div><div style="white-space:pre-wrap;font-size:12px;color:var(--text2);margin-top:3px;background:var(--bg2);border-radius:6px;padding:8px 10px">${escHtml(i.resolution_notes)}</div></div>` : ''}
                      </td>
                    </tr>` : '';
                    return [row, detail];
                  }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('new-issue-btn')?.addEventListener('click', () => openNewIssueModal(sites));
  }

  window.issuesSearch = (val) => { searchText = val; render(); };
  window.issuesFilter = (key, val) => {
    if (key === 'site') filterSite = val;
    else if (key === 'priority') filterPriority = val;
    render();
  };
  window.issuesToggleStatus = (val) => {
    if (filterStatuses.has(val)) filterStatuses.delete(val);
    else filterStatuses.add(val);
    render();
  };
  window.issuesClearStatus = () => { filterStatuses.clear(); render(); };

  window.issueRowClick = (id) => {
    expandedId = expandedId === id ? null : id;
    render();
  };

  window.openIssueModal = (id) => {
    const issue = issues.find(i => i.id === id);
    if (issue) openEditIssueModal(issue, async (updated) => {
      const idx = issues.findIndex(i => i.id === id);
      if (idx >= 0) issues[idx] = updated;
      render();
    }, async () => {
      issues = issues.filter(i => i.id !== id);
      render();
    });
  };

  window.openNewIssueModal = (siteList) => {
    const modalId = 'new-issue-modal';
    document.getElementById(modalId)?.remove();
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
    modal.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:560px;width:100%;max-height:85vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:16px">New Issue</div>
        <form id="new-issue-form">
          <div class="form-grid">
            <div class="form-group full"><label>Site *</label>
              <select name="site_id" required>
                <option value="">— Select Site —</option>
                ${siteList.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group full"><label>Title *</label>
              <input name="title" required placeholder="Brief description of the issue"/>
            </div>
            <div class="form-group full"><label>Description</label>
              <textarea name="description" rows="3" placeholder="Details…"></textarea>
            </div>
            <div class="form-group"><label>Equipment Tag</label>
              <input name="unit_tag" placeholder="e.g. CRAC-DH1300-18"/>
            </div>
            <div class="form-group"><label>Zone</label>
              <input name="cx_zone" placeholder="e.g. Data Hall 1300"/>
            </div>
            <div class="form-group"><label>Priority</label>
              <select name="priority">
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div class="form-group"><label>Issue Type</label>
              <select name="cx_issue_type">
                <option value="">— None —</option>
                <option value="Incorrect Installation">Incorrect Installation</option>
                <option value="Damage after Install">Damage after Install</option>
                <option value="Missing Components">Missing Components</option>
                <option value="Material/Component Failure">Material/Component Failure</option>
                <option value="Shipping Damage">Shipping Damage</option>
                <option value="Documentation Not Complete or Ready">Documentation Not Complete</option>
                <option value="Design Defect/Lack of Design">Design Defect</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group full"><label>Comments / Resolution</label>
              <textarea name="resolution_notes" rows="2" placeholder="Notes on resolution…"></textarea>
            </div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Issue</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#new-issue-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
      const siteId = data.site_id;
      delete data.site_id;
      try {
        const created = await API.issues.create(siteId, { ...data, site_id: siteId });
        issues.unshift(created);
        modal.remove();
        render();
        toast('Issue created');
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });
  };

  function openEditIssueModal(issue, onSave, onDelete) {
    const modalId = 'edit-issue-modal';
    document.getElementById(modalId)?.remove();
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
    modal.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:540px;width:100%;max-height:85vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:16px">Edit Issue</div>
        <form id="edit-issue-form">
          <div class="form-grid">
            <div class="form-group full"><label>Title</label>
              <input name="title" value="${escHtml(issue.title||'')}"/>
            </div>
            <div class="form-group full"><label>Description</label>
              <textarea name="description" rows="3">${escHtml(issue.description||'')}</textarea>
            </div>
            <div class="form-group"><label>Equipment Tag</label>
              <input name="unit_tag" value="${escHtml(issue.unit_tag||'')}"/>
            </div>
            <div class="form-group"><label>Zone</label>
              <input name="cx_zone" value="${escHtml(issue.cx_zone||'')}"/>
            </div>
            <div class="form-group"><label>Priority</label>
              <select name="priority">
                <option value="low" ${issue.priority==='low'?'selected':''}>Low</option>
                <option value="high" ${issue.priority==='high'?'selected':''}>High</option>
                <option value="critical" ${issue.priority==='critical'?'selected':''}>Critical</option>
              </select>
            </div>
            <div class="form-group"><label>Status</label>
              <select name="status">
                <option value="open" ${issue.status==='open'?'selected':''}>Open</option>
                <option value="in_progress" ${issue.status==='in_progress'?'selected':''}>In Progress</option>
                <option value="work_complete" ${issue.status==='work_complete'?'selected':''}>Work Complete</option>
                <option value="ready_to_inspect" ${issue.status==='ready_to_inspect'?'selected':''}>Ready to Inspect</option>
                <option value="closed" ${issue.status==='closed'?'selected':''}>Closed</option>
              </select>
            </div>
            <div class="form-group full"><label>Issue Type</label>
              <select name="cx_issue_type">
                <option value="">— None —</option>
                ${['Incorrect Installation','Damage after Install','Missing Components','Material/Component Failure','Shipping Damage','Documentation Not Complete or Ready','Design Defect/Lack of Design','Other'].map(t =>
                  `<option value="${escHtml(t)}" ${issue.cx_issue_type===t?'selected':''}>${escHtml(t)}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group full"><label>Comments / Resolution</label>
              <textarea name="resolution_notes" rows="3">${escHtml(issue.resolution_notes||'')}</textarea>
            </div>
          </div>
          <div style="display:flex;gap:8px;justify-content:space-between;margin-top:16px">
            <button type="button" class="btn btn-secondary" style="color:var(--red)" id="delete-issue-btn">Delete</button>
            <div style="display:flex;gap:8px">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#edit-issue-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
      try {
        const updated = await API.issues.update(issue.id, data);
        modal.remove();
        toast('Issue saved');
        if (onSave) onSave(updated);
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });
    modal.querySelector('#delete-issue-btn').addEventListener('click', async () => {
      if (!confirm('Delete this issue?')) return;
      try {
        await API.issues.delete(issue.id);
        modal.remove();
        toast('Issue deleted');
        if (onDelete) onDelete();
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });
  }

  render();
}
