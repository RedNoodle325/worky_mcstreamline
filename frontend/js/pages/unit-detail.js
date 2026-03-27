async function renderUnitDetail(container, { id, backTo } = {}) {
  if (!id) { navigate('units'); return; }

  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let unit, comm, allTickets, sites, programs, unitCampaigns, unitIssues, unitNotes, unitMaterials, unitComponents;
  try {
    [unit, comm, allTickets, sites, programs, unitIssues, unitNotes, unitMaterials, unitComponents] = await Promise.all([
      API.units.get(id),
      API.commissioning.get(id),
      API.tickets.list(),
      API.sites.list(),
      API.unit_programs.list(id).catch(() => []),
      API.issues.listUnit(id).catch(() => []),
      API.notes.listUnit(id).catch(() => []),
      API.materials.list(id).catch(() => []),
      API.components.list(id).catch(() => []),
    ]);
    // Load campaigns for this unit's site
    unitCampaigns = unit.site_id
      ? await API.campaigns.list(unit.site_id).catch(() => [])
      : [];
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error loading unit: ${escHtml(e.message)}</div>`;
    return;
  }

  const site = sites.find(s => s.id === unit.site_id);
  const unitTickets = allTickets.filter(t => t.unit_id === id);
  const openTickets = unitTickets.filter(t => !['resolved', 'closed'].includes(t.status));

  const levels = [
    { n: 1, label: 'L1', desc: 'Delivery / Set in Place' },
    { n: 2, label: 'L2', desc: 'Pre-Energization Inspections' },
    { n: 3, label: 'L3', desc: 'Unit Startup' },
    { n: 4, label: 'L4', desc: 'SOO / BMS P2P Verification' },
    { n: 5, label: 'L5', desc: 'Integrated Systems Test' },
  ];

  renderPage();

  function renderPage() {
    const backLabel = site ? site.name : 'Units';
    const backNav = backTo ? () => navigate('site-detail', { id: backTo }) : () => navigate('units');

    const today = new Date();
    let warStatus = '—', warColor = 'var(--text3)';
    if (unit.warranty_end_date) {
      const warEnd = new Date(unit.warranty_end_date);
      const daysLeft = Math.round((warEnd - today) / 86400000);
      if (daysLeft < 0) { warStatus = 'Expired'; warColor = 'var(--red)'; }
      else if (daysLeft < 30) { warStatus = `${daysLeft} days left`; warColor = 'var(--yellow)'; }
      else { warStatus = fmt(unit.warranty_end_date) + ' (Active)'; warColor = 'var(--green)'; }
    }

    container.innerHTML = `
      <!-- Header -->
      <div class="page-header" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-secondary btn-sm" id="back-btn">← ${escHtml(backLabel)}</button>
          <div>
            <h1 style="margin:0;font-family:monospace">${escHtml(serial(unit))}</h1>
            <div class="page-subtitle">
              ${unitTypeBadge(unit.unit_type)}
              ${unit.model ? `<span style="margin-left:8px;color:var(--text2)">${escHtml(unit.model)}</span>` : ''}
              ${site ? `<span style="margin-left:8px;color:var(--text3)">@ ${escHtml(site.name)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="edit-ui" style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="openEditUnitModal()">Edit Unit</button>
        </div>
      </div>

      <!-- Top row: Info + Commission -->
      <div class="grid-2" style="gap:16px;margin-bottom:16px">
        <!-- Unit Info -->
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Unit Information</div>
          <div class="grid-2" style="gap:8px">
            <div>
              <div class="section-title">Job / Line</div>
              <div style="font-family:monospace;font-size:16px;color:var(--text)">${escHtml(serial(unit))}</div>
            </div>
            <div>
              <div class="section-title">Commission Level</div>
              <div>${commissionBadge(unit.commission_level)}</div>
            </div>
            <div>
              <div class="section-title">Site</div>
              <div style="color:var(--text2)">${site ? `<a onclick="navigate('site-detail',{id:'${site.id}'})" style="cursor:pointer">${escHtml(site.name)}</a>` : '—'}</div>
            </div>
            <div>
              <div class="section-title">Unit Type</div>
              <div>${unitTypeBadge(unit.unit_type)}</div>
            </div>
            <div>
              <div class="section-title">Model</div>
              <div style="color:var(--text2)">${escHtml(unit.model || '—')}</div>
            </div>
            <div>
              <div class="section-title">Description</div>
              <div style="color:var(--text2);font-size:12px">${escHtml(unit.description || '—')}</div>
            </div>
            <div>
              <div class="section-title">Warranty Start</div>
              <div style="color:var(--text2)">${fmt(unit.warranty_start_date)}</div>
            </div>
            <div>
              <div class="section-title">Warranty End</div>
              <div style="color:${warColor};font-weight:600">${warStatus}</div>
            </div>
            ${unit.notes ? `<div class="full">
              <div class="section-title">Notes</div>
              <div style="color:var(--text2);white-space:pre-wrap;font-size:12px">${escHtml(unit.notes)}</div>
            </div>` : ''}
          </div>
        </div>

        <!-- Commissioning Progress -->
        ${(() => {
          const allDone = comm && levels.every(l => comm[`l${l.n}_completed`]);
          const startOpen = !allDone;
          return `<div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none" onclick="toggleCommTrack()">
              <div style="display:flex;align-items:center;gap:10px">
                <span id="comm-track-chev" style="font-size:12px;color:var(--text3);transition:transform .2s;${startOpen?'transform:rotate(90deg)':''}">▶</span>
                <div class="card-title" style="margin:0">Commissioning Progress</div>
              </div>
              ${allDone
                ? `<span style="font-size:12px;font-weight:600;color:var(--green)">✓ All Levels Complete</span>`
                : `<span style="font-size:12px;color:var(--text3)">${levels.filter(l=>comm?.[`l${l.n}_completed`]).length}/${levels.length} complete</span>`}
            </div>
            <div id="comm-track-body" style="display:${startOpen?'block':'none'};margin-top:16px">
              <div id="comm-track">${renderCommTrack(comm, levels)}</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px" id="comm-buttons">${renderCommButtons(comm, levels, id)}</div>
            </div>
          </div>`;
        })()}
      </div>

      <!-- Service Tickets -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Service Tickets
            ${openTickets.length > 0 ? `<span style="margin-left:8px;background:var(--red)22;color:var(--red);border:1px solid var(--red)44;border-radius:99px;padding:1px 8px;font-size:11px">${openTickets.length} open</span>` : ''}
          </div>
          <span class="edit-ui"><button class="btn btn-sm btn-primary" onclick="openNewTicketModal()">+ New Ticket</button></span>
        </div>
        ${renderTicketsTable(unitTickets)}
      </div>

      <!-- Programs -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Programs / Firmware</div>
          <span class="edit-ui"><button class="btn btn-sm btn-primary" onclick="openProgramModal(null)">+ Add Program</button></span>
        </div>
        <div id="programs-list">${renderProgramsList(programs)}</div>
      </div>

      <!-- Campaigns -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Site Campaigns</div>
          ${unit.site_id ? `<button class="btn btn-sm btn-secondary" onclick="navigate('site-detail',{id:'${unit.site_id}'})">View All</button>` : ''}
        </div>
        <div id="campaigns-list">${renderUnitCampaigns(unitCampaigns)}</div>
      </div>

      <!-- Component History -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Component History <span style="font-weight:400;color:var(--text3)">(${unitComponents.length})</span></div>
          <span class="edit-ui"><button class="btn btn-sm btn-primary" id="add-component-btn">+ Add Component</button></span>
        </div>
        <div id="components-list">${renderComponentsList(unitComponents)}</div>
      </div>

      <!-- Notes -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Notes <span style="font-weight:400;color:var(--text3)">(${unitNotes.length})</span></div>
          <button class="btn btn-sm btn-primary" id="add-unit-note-btn">+ Add Note</button>
        </div>
        <div id="unit-notes-list">${renderNotesList(unitNotes)}</div>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => {
      if (backTo) navigate('site-detail', { id: backTo });
      else navigate('units');
    });

    attachUnitDetailHandlers(id, unit, comm, levels, sites);
  }

  // ── Commission track ───────────────────────────────────────────────────────
  function renderCommTrack(c, lvls) {
    if (!c) return '<div style="color:var(--text3)">No commissioning record</div>';
    return `<div class="commission-track">
      ${lvls.map(l => {
        const done = c[`l${l.n}_completed`];
        const date = c[`l${l.n}_date`];
        const by = c[`l${l.n}_completed_by`];
        return `<div class="commission-step ${done ? 'done' : ''}" style="flex:1;text-align:center">
          <div class="step-check">${done ? '✓' : l.label}</div>
          <div class="step-label">${l.label}</div>
          <div class="step-label" style="font-size:10px;color:${done ? 'var(--green)' : 'var(--text3)'};margin-top:2px">${done ? (fmt(date) || '—') : l.desc}</div>
          ${done && by ? `<div style="font-size:10px;color:var(--text3)">by ${escHtml(by)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  function renderCommButtons(c, lvls, unitId) {
    if (!c) return '';
    return lvls.map(l => {
      const done = c[`l${l.n}_completed`];
      return `<button class="btn btn-sm edit-ui ${done ? 'btn-secondary' : 'btn-primary'}"
        onclick="toggleCommLevel(${l.n},'${unitId}',${!done})">
        ${done ? `↩ Undo L${l.n}` : `✓ Complete L${l.n}`}
      </button>`;
    }).join('');
  }

  // ── Programs list ─────────────────────────────────────────────────────────
  function renderProgramsList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No programs recorded. Add the first one.</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>Controller</th><th>Program</th><th>Version</th><th>Install Date</th><th>Notes</th><th style="width:80px"></th></tr></thead>
      <tbody>
        ${list.map(p => `<tr>
          <td style="font-weight:500">${escHtml(p.controller_name)}</td>
          <td style="font-family:monospace;font-size:12px">${escHtml(p.program_name)}</td>
          <td><span style="background:var(--bg3);padding:1px 6px;border-radius:4px;font-size:11px;font-family:monospace">${escHtml(p.version || '—')}</span></td>
          <td style="font-size:12px;color:var(--text2)">${fmt(p.install_date)}</td>
          <td style="font-size:12px;color:var(--text2);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.notes || '—')}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="openProgramModal('${p.id}')">Edit</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  // ── Unit campaigns list ────────────────────────────────────────────────────
  function renderUnitCampaigns(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No campaigns for this site yet.</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>Campaign</th><th>Type</th><th>Progress</th><th style="width:80px"></th></tr></thead>
      <tbody>
        ${list.map(c => {
          const pct = c.units_total ? Math.round(c.units_complete / c.units_total * 100) : 0;
          return `<tr>
            <td style="font-weight:500">${escHtml(c.name)}</td>
            <td><span style="font-size:11px;color:var(--text2)">${escHtml((c.campaign_type||'').replace(/_/g,' '))}</span></td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;background:var(--bg3);border-radius:99px;height:6px;overflow:hidden;min-width:80px">
                  <div style="height:100%;width:${pct}%;background:${pct===100?'var(--green)':'var(--blue)'};border-radius:99px"></div>
                </div>
                <span style="font-size:11px;color:var(--text2);white-space:nowrap">${c.units_complete}/${c.units_total}</span>
              </div>
            </td>
            <td>
              <button class="btn btn-sm btn-secondary"
                onclick="navigate('campaign-detail',{id:'${c.id}',siteId:'${c.site_id}'})">Open</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  // ── Unit issues list ───────────────────────────────────────────────────────
  const uiStatusColor = { open:'var(--blue)',in_progress:'var(--yellow)',closed:'var(--text3)',work_complete:'var(--green)',ready_to_inspect:'var(--accent)' };
  const uiStatusLabel = { open:'Open',in_progress:'In Progress',closed:'Closed',work_complete:'Work Complete',ready_to_inspect:'Ready to Inspect' };
  const uiPriorityColor = { critical:'var(--red)',high:'var(--orange)',low:'var(--text2)' };

  function renderUnitIssuesList(list) {
    if (!list.length) return `<div style="color:var(--text3);font-size:13px">No commissioning issues linked to this unit yet. Issues are linked when they reference this unit's ID.</div>`;
    return `<div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Type</th><th>Created</th><th style="width:60px"></th></tr></thead>
      <tbody>
        ${list.map(i => {
          const sc = uiStatusColor[i.status]||'var(--text3)';
          const sl = uiStatusLabel[i.status]||i.status||'—';
          const pc = uiPriorityColor[i.priority]||'var(--text3)';
          return `<tr>
            <td style="font-family:monospace;font-size:11px;color:var(--text3)">${escHtml(i.cxalloy_issue_id||'—')}</td>
            <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(i.title||'—')}</td>
            <td style="color:${pc};font-size:11px;font-weight:600">${(i.priority||'—').charAt(0).toUpperCase()+(i.priority||'').slice(1)}</td>
            <td><span style="background:${sc}22;color:${sc};border:1px solid ${sc}44;border-radius:99px;padding:1px 6px;font-size:10px;white-space:nowrap">${sl}</span></td>
            <td style="font-size:11px;color:var(--text3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(i.cx_issue_type||'—')}</td>
            <td style="font-size:12px;color:var(--text3)">${fmt(i.reported_date||i.created_at)}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="openUnitIssueEdit('${i.id}')">Edit</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  // ── Tickets table ─────────────────────────────────────────────────────────
  function renderTicketsTable(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No tickets for this unit</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>Title</th><th>Status</th><th>Created</th></tr></thead>
      <tbody>
        ${list.map(t => `<tr>
          <td>${escHtml(t.title || t.description || '—')}</td>
          <td>${statusBadge(t.status)}</td>
          <td style="font-size:12px;color:var(--text2)">${fmt(t.created_at)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  // ── Notes list ─────────────────────────────────────────────────────────────
  function renderNotesList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No notes yet. Add the first one.</div>';
    return list.map(n => `
      <div class="note-item" data-id="${n.id}" style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;background:var(--bg3)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:11px;color:var(--text3)">
            ${n.author ? `<strong style="color:var(--text2)">${escHtml(n.author)}</strong> · ` : ''}
            ${fmt(n.created_at)}${n.updated_at !== n.created_at ? ' (edited)' : ''}
          </div>
          <span class="edit-ui" style="display:flex;gap:6px">
            <button class="btn btn-sm btn-secondary" onclick="openNoteModal('unit','${n.id}')">Edit</button>
            <button class="btn btn-sm btn-secondary" style="color:var(--red)" onclick="deleteNote('unit','${n.id}')">✕</button>
          </span>
        </div>
        <div style="white-space:pre-wrap;font-size:13px;color:var(--text)">${escHtml(n.content)}</div>
      </div>`).join('');
  }

  // ── Component History ──────────────────────────────────────────────────────
  function renderComponentsList(list) {
    if (!list.length) return '<div style="color:var(--text3);font-size:13px">No components added yet. Click "+ Add Component" to track a part on this unit.</div>';
    return list.map(c => `
      <div class="component-card" data-id="${c.id}" style="border:1px solid var(--border);border-radius:8px;margin-bottom:12px;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg3);cursor:pointer" onclick="toggleComponentUpdates('${c.id}')">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:13px;font-weight:600;color:var(--text)">${escHtml(c.name)}</span>
            ${c.model ? `<span style="font-size:11px;color:var(--text3);font-family:monospace">${escHtml(c.model)}</span>` : ''}
            ${c.serial_number ? `<span style="font-size:11px;color:var(--text3)">S/N: ${escHtml(c.serial_number)}</span>` : ''}
            ${c.installed_date ? `<span style="font-size:11px;color:var(--text3)">Installed: ${fmt(c.installed_date)}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="edit-ui" style="display:flex;gap:6px">
              <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openComponentUpdateModal('${c.id}',null)">+ Update</button>
              <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();openComponentModal('${c.id}')">Edit</button>
              <button class="btn btn-sm btn-secondary" style="color:var(--red)" onclick="event.stopPropagation();deleteComponent('${c.id}')">✕</button>
            </span>
            <span style="color:var(--text3);font-size:12px" id="comp-arrow-${c.id}">▼</span>
          </div>
        </div>
        ${c.notes ? `<div style="padding:6px 14px;font-size:11px;color:var(--text3);border-bottom:1px solid var(--border)">${escHtml(c.notes)}</div>` : ''}
        <div id="comp-updates-${c.id}" style="padding:0 14px 8px">
          <div style="color:var(--text3);font-size:12px;padding:10px 0">Loading updates…</div>
        </div>
      </div>`).join('');
  }

  function renderUpdatesList(updates, compId) {
    if (!updates.length) return '<div style="color:var(--text3);font-size:12px;padding:8px 0">No updates yet — click "+ Update" to log work done.</div>';
    return updates.map(u => `
      <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)22">
        <div style="flex:1">
          <div style="font-size:12px;white-space:pre-wrap;color:var(--text)">${escHtml(u.description)}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:3px">
            ${u.date ? fmt(u.date) + ' · ' : ''}${u.performed_by ? escHtml(u.performed_by) : ''}
          </div>
        </div>
        <span class="edit-ui" style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn btn-sm btn-secondary" onclick="openComponentUpdateModal('${compId}','${u.id}')">Edit</button>
          <button class="btn btn-sm btn-secondary" style="color:var(--red)" onclick="deleteComponentUpdate('${compId}','${u.id}')">✕</button>
        </span>
      </div>`).join('');
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function attachUnitDetailHandlers(unitId, unitData, commData, lvls, siteList) {

    // ── Commissioning toggle ───────────────────────────────────────────────────
    window.toggleCommTrack = () => {
      const body = document.getElementById('comm-track-body');
      const chev = document.getElementById('comm-track-chev');
      if (!body) return;
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      if (chev) chev.style.transform = open ? 'rotate(90deg)' : '';
    };

    // ── Unit-level Issues ─────────────────────────────────────────────────────
    document.getElementById('add-unit-issue-btn')?.addEventListener('click', () => {
      openUnitIssueForm(null, unitId, unitData.site_id, async (created) => {
        unitIssues.unshift(created);
        document.getElementById('unit-issues-list').innerHTML = renderUnitIssuesList(unitIssues);
        toast('Issue created');
      });
    });

    window.openUnitIssueEdit = (issueId) => {
      const issue = unitIssues.find(i => i.id === issueId);
      if (!issue) return;
      openUnitIssueForm(issue, unitId, unitData.site_id, async (updated) => {
        const idx = unitIssues.findIndex(i => i.id === issueId);
        if (idx >= 0) unitIssues[idx] = updated;
        document.getElementById('unit-issues-list').innerHTML = renderUnitIssuesList(unitIssues);
        toast('Issue saved');
      }, async () => {
        unitIssues = unitIssues.filter(i => i.id !== issueId);
        document.getElementById('unit-issues-list').innerHTML = renderUnitIssuesList(unitIssues);
        toast('Issue deleted');
      });
    };

    function openUnitIssueForm(existing, uid, siteId, onSave, onDelete) {
      const modalId = 'unit-issue-modal';
      document.getElementById(modalId)?.remove();
      const modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
      const issueTypes = ['Incorrect Installation','Damage after Install','Missing Components','Material/Component Failure','Shipping Damage','Documentation Not Complete or Ready','Design Defect/Lack of Design','Other'];
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing?'Edit Issue':'New Commissioning Issue'}</div>
          <form id="unit-issue-form">
            <div class="form-grid">
              <div class="form-group full"><label>Title *</label>
                <input name="title" required value="${escHtml(existing?.title||'')}" placeholder="Brief description"/>
              </div>
              <div class="form-group full"><label>Description</label>
                <textarea name="description" rows="2">${escHtml(existing?.description||'')}</textarea>
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
            </div>
            <div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px">
              ${existing?`<button type="button" class="btn btn-secondary" style="color:var(--red)" id="del-unit-issue-btn">Delete</button>`:'<span></span>'}
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">${existing?'Save':'Create'}</button>
              </div>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#unit-issue-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k]==='') data[k]=null; });
        try {
          let result;
          if (existing) result = await API.issues.update(existing.id, data);
          else result = await API.issues.create(siteId, { ...data, site_id: siteId, unit_id: uid });
          modal.remove();
          if (onSave) onSave(result);
        } catch (err) { toast('Error: '+err.message,'error'); }
      });
      modal.querySelector('#del-unit-issue-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this issue?')) return;
        try {
          await API.issues.delete(existing.id);
          modal.remove();
          if (onDelete) onDelete();
        } catch (err) { toast('Error: '+err.message,'error'); }
      });
    }

    window.toggleCommLevel = async (level, uid, completed) => {
      try {
        const updated = await API.commissioning.updateLevel(uid, {
          level, completed,
          date: completed ? new Date().toISOString().split('T')[0] : null,
        });
        comm = updated;
        unit = await API.units.get(unitId);
        document.getElementById('comm-track').innerHTML = renderCommTrack(comm, lvls);
        document.getElementById('comm-buttons').innerHTML = renderCommButtons(comm, lvls, uid);
        toast(`L${level} ${completed ? 'completed' : 'reset'}`);
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };

    window.openProgramModal = (programId) => {
      const p = programId ? programs.find(x => x.id === programId) : null;
      const modalHtml = `
        <div id="prog-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center">
          <div class="card" style="width:480px;max-width:95vw">
            <div class="card-title" style="margin-bottom:16px">${p ? 'Edit Program' : 'Add Program'}</div>
            <div class="form-grid">
              <div class="form-group"><label>Controller Name *</label><input id="pm-ctrl" value="${escHtml(p?.controller_name||'')}" placeholder="e.g. Main Controller"/></div>
              <div class="form-group"><label>Program Name *</label><input id="pm-prog" value="${escHtml(p?.program_name||'')}" placeholder="e.g. ICS_MAIN"/></div>
              <div class="form-group"><label>Version</label><input id="pm-ver" value="${escHtml(p?.version||'')}" placeholder="e.g. v3.2.1"/></div>
              <div class="form-group"><label>Install Date</label><input type="date" id="pm-date" value="${p?.install_date||''}"/></div>
              <div class="form-group full"><label>Notes</label><textarea id="pm-notes" rows="2">${escHtml(p?.notes||'')}</textarea></div>
            </div>
            <div style="display:flex;gap:8px;justify-content:space-between;margin-top:16px">
              <div>
                ${p ? `<button class="btn btn-sm" style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44" id="pm-delete">Delete</button>` : ''}
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-secondary" id="pm-cancel">Cancel</button>
                <button class="btn btn-primary" id="pm-save">Save</button>
              </div>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modal = document.getElementById('prog-modal');
      const close = () => modal.remove();
      document.getElementById('pm-cancel').addEventListener('click', close);
      document.getElementById('pm-save').addEventListener('click', async () => {
        const data = {
          controller_name: document.getElementById('pm-ctrl').value.trim(),
          program_name:    document.getElementById('pm-prog').value.trim(),
          version:         document.getElementById('pm-ver').value.trim() || null,
          install_date:    document.getElementById('pm-date').value || null,
          notes:           document.getElementById('pm-notes').value.trim() || null,
        };
        if (!data.controller_name || !data.program_name) { toast('Controller name and program name are required', 'error'); return; }
        try {
          if (p) {
            const updated = await API.unit_programs.update(unitId, p.id, data);
            const idx = programs.findIndex(x => x.id === p.id);
            if (idx >= 0) programs[idx] = updated;
          } else {
            const created = await API.unit_programs.create(unitId, data);
            programs.push(created);
          }
          document.getElementById('programs-list').innerHTML = renderProgramsList(programs);
          toast(p ? 'Program updated' : 'Program added');
          close();
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
      if (p) {
        document.getElementById('pm-delete').addEventListener('click', async () => {
          if (!confirm('Delete this program record?')) return;
          try {
            await API.unit_programs.delete(unitId, p.id);
            programs = programs.filter(x => x.id !== p.id);
            document.getElementById('programs-list').innerHTML = renderProgramsList(programs);
            toast('Program deleted');
            close();
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      }
    };

    // ── Notes handlers ────────────────────────────────────────────────────────
    document.getElementById('add-unit-note-btn')?.addEventListener('click', () => openNoteModal('unit', null));

    window.openNoteModal = (ctx, noteId) => {
      const existing = noteId ? unitNotes.find(n => n.id === noteId) : null;
      const mid = 'unit-note-modal';
      document.getElementById(mid)?.remove();
      const modal = document.createElement('div');
      modal.id = mid;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:500px;width:100%">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing ? 'Edit Note' : 'Add Note'}</div>
          <form id="note-form">
            <div class="form-group" style="margin-bottom:12px"><label>Author (optional)</label>
              <input name="author" value="${escHtml(existing?.author||'')}" placeholder="Your name"/>
            </div>
            <div class="form-group" style="margin-bottom:16px"><label>Note *</label>
              <textarea name="content" rows="5" required placeholder="Enter your note…">${escHtml(existing?.content||'')}</textarea>
            </div>
            <div style="display:flex;justify-content:space-between;gap:8px">
              ${existing ? `<button type="button" class="btn btn-secondary" style="color:var(--red)" id="del-note-btn">Delete</button>` : '<span></span>'}
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add Note'}</button>
              </div>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#note-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k]==='') data[k]=null; });
        try {
          if (existing) {
            const updated = await API.notes.update(existing.id, data);
            const idx = unitNotes.findIndex(n => n.id === existing.id);
            if (idx >= 0) unitNotes[idx] = updated;
          } else {
            const created = await API.notes.createUnit(unitId, data);
            unitNotes.unshift(created);
          }
          document.getElementById('unit-notes-list').innerHTML = renderNotesList(unitNotes);
          document.querySelector('.card-title + *')?.closest('.card')?.querySelector('.card-title span')?.textContent;
          modal.remove();
          toast(existing ? 'Note saved' : 'Note added');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
      modal.querySelector('#del-note-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this note?')) return;
        try {
          await API.notes.delete(existing.id);
          unitNotes = unitNotes.filter(n => n.id !== existing.id);
          document.getElementById('unit-notes-list').innerHTML = renderNotesList(unitNotes);
          modal.remove();
          toast('Note deleted');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
    };

    window.deleteNote = async (ctx, noteId) => {
      if (!confirm('Delete this note?')) return;
      try {
        await API.notes.delete(noteId);
        unitNotes = unitNotes.filter(n => n.id !== noteId);
        document.getElementById('unit-notes-list').innerHTML = renderNotesList(unitNotes);
        toast('Note deleted');
      } catch (err) { toast('Error: '+err.message, 'error'); }
    };

    // ── Material handlers ─────────────────────────────────────────────────────
    document.getElementById('add-material-btn')?.addEventListener('click', () => openMaterialModal(null));

    window.openMaterialModal = (matId) => {
      const existing = matId ? unitMaterials.find(m => m.id === matId) : null;
      const mid = 'material-modal';
      document.getElementById(mid)?.remove();
      const modal = document.createElement('div');
      modal.id = mid;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:520px;width:100%">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing ? 'Edit Material' : 'Add Material'}</div>
          <form id="mat-form">
            <div class="form-grid">
              <div class="form-group"><label>Part Number</label>
                <input name="part_number" value="${escHtml(existing?.part_number||'')}" placeholder="e.g. P-12345"/>
              </div>
              <div class="form-group"><label>Quantity</label>
                <input name="quantity" type="number" min="1" value="${existing?.quantity||1}"/>
              </div>
              <div class="form-group full"><label>Description *</label>
                <input name="description" required value="${escHtml(existing?.description||'')}" placeholder="What was used or installed"/>
              </div>
              <div class="form-group"><label>Date</label>
                <input name="date" type="date" value="${existing?.date||''}"/>
              </div>
              <div class="form-group full"><label>Notes</label>
                <textarea name="notes" rows="2">${escHtml(existing?.notes||'')}</textarea>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px">
              ${existing ? `<button type="button" class="btn btn-secondary" style="color:var(--red)" id="del-mat-btn">Delete</button>` : '<span></span>'}
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add'}</button>
              </div>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#mat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k]==='') data[k]=null; });
        if (data.quantity) data.quantity = parseInt(data.quantity, 10);
        try {
          if (existing) {
            const updated = await API.materials.update(unitId, existing.id, data);
            const idx = unitMaterials.findIndex(m => m.id === existing.id);
            if (idx >= 0) unitMaterials[idx] = updated;
          } else {
            const created = await API.materials.create(unitId, data);
            unitMaterials.unshift(created);
          }
          document.getElementById('materials-list').innerHTML = renderMaterialsList(unitMaterials);
          modal.remove();
          toast(existing ? 'Material saved' : 'Material added');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
      modal.querySelector('#del-mat-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this material record?')) return;
        try {
          await API.materials.delete(unitId, existing.id);
          unitMaterials = unitMaterials.filter(m => m.id !== existing.id);
          document.getElementById('materials-list').innerHTML = renderMaterialsList(unitMaterials);
          modal.remove();
          toast('Deleted');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
    };

    // ── Component handlers ────────────────────────────────────────────────────
    document.getElementById('add-component-btn')?.addEventListener('click', () => openComponentModal(null));

    // Cache for component updates
    const compUpdatesCache = {};

    window.toggleComponentUpdates = async (compId) => {
      const el = document.getElementById(`comp-updates-${compId}`);
      const arrow = document.getElementById(`comp-arrow-${compId}`);
      if (!el) return;
      const isOpen = el.getAttribute('data-open') === '1';
      if (isOpen) {
        el.style.display = 'none';
        el.setAttribute('data-open', '0');
        if (arrow) arrow.textContent = '▼';
      } else {
        el.style.display = 'block';
        el.setAttribute('data-open', '1');
        if (arrow) arrow.textContent = '▲';
        if (!compUpdatesCache[compId]) {
          try {
            compUpdatesCache[compId] = await API.components.listUpdates(compId);
          } catch { compUpdatesCache[compId] = []; }
        }
        el.innerHTML = renderUpdatesList(compUpdatesCache[compId], compId);
        applyAuthState();
      }
    };

    // Auto-open all component update panels on load
    unitComponents.forEach(c => {
      API.components.listUpdates(c.id).then(updates => {
        compUpdatesCache[c.id] = updates;
        const el = document.getElementById(`comp-updates-${c.id}`);
        if (el) { el.innerHTML = renderUpdatesList(updates, c.id); el.setAttribute('data-open','1'); applyAuthState(); }
        const arrow = document.getElementById(`comp-arrow-${c.id}`);
        if (arrow) arrow.textContent = '▲';
      }).catch(() => {});
    });

    window.openComponentModal = (compId) => {
      const existing = compId ? unitComponents.find(c => c.id === compId) : null;
      const mid = 'comp-modal';
      document.getElementById(mid)?.remove();
      const modal = document.createElement('div');
      modal.id = mid;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:520px;width:100%">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing ? 'Edit Component' : 'Add Component'}</div>
          <form id="comp-form">
            <div class="form-grid">
              <div class="form-group full"><label>Component Name *</label>
                <input name="name" required value="${escHtml(existing?.name||'')}" placeholder="e.g. Compressor, Evaporator Coil, Filter Drier"/>
              </div>
              <div class="form-group"><label>Model</label>
                <input name="model" value="${escHtml(existing?.model||'')}" placeholder="Model number"/>
              </div>
              <div class="form-group"><label>Serial Number</label>
                <input name="serial_number" value="${escHtml(existing?.serial_number||'')}" placeholder="S/N"/>
              </div>
              <div class="form-group"><label>Installed Date</label>
                <input name="installed_date" type="date" value="${existing?.installed_date||''}"/>
              </div>
              <div class="form-group full"><label>Notes</label>
                <textarea name="notes" rows="2" placeholder="Any additional info about this component">${escHtml(existing?.notes||'')}</textarea>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px">
              ${existing ? `<button type="button" class="btn btn-secondary" style="color:var(--red)" id="del-comp-btn">Delete Component</button>` : '<span></span>'}
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add'}</button>
              </div>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#comp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k]==='') data[k]=null; });
        try {
          if (existing) {
            const updated = await API.components.update(unitId, existing.id, data);
            const idx = unitComponents.findIndex(c => c.id === existing.id);
            if (idx >= 0) unitComponents[idx] = updated;
          } else {
            const created = await API.components.create(unitId, data);
            unitComponents.push(created);
          }
          document.getElementById('components-list').innerHTML = renderComponentsList(unitComponents);
          // Re-populate cached updates
          unitComponents.forEach(c => {
            if (compUpdatesCache[c.id]) {
              const el = document.getElementById(`comp-updates-${c.id}`);
              if (el) { el.innerHTML = renderUpdatesList(compUpdatesCache[c.id], c.id); el.setAttribute('data-open','1'); applyAuthState(); }
              const arrow = document.getElementById(`comp-arrow-${c.id}`);
              if (arrow) arrow.textContent = '▲';
            }
          });
          applyAuthState();
          modal.remove();
          toast(existing ? 'Component saved' : 'Component added');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
      modal.querySelector('#del-comp-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this component and all its updates?')) return;
        try {
          await API.components.delete(unitId, existing.id);
          unitComponents = unitComponents.filter(c => c.id !== existing.id);
          delete compUpdatesCache[existing.id];
          document.getElementById('components-list').innerHTML = renderComponentsList(unitComponents);
          modal.remove();
          toast('Component deleted');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
    };

    window.deleteComponent = async (compId) => {
      if (!confirm('Delete this component and all its updates?')) return;
      try {
        await API.components.delete(unitId, compId);
        unitComponents = unitComponents.filter(c => c.id !== compId);
        delete compUpdatesCache[compId];
        document.getElementById('components-list').innerHTML = renderComponentsList(unitComponents);
        toast('Component deleted');
      } catch (err) { toast('Error: '+err.message, 'error'); }
    };

    window.openComponentUpdateModal = (compId, updateId) => {
      const existing = updateId ? (compUpdatesCache[compId]||[]).find(u => u.id === updateId) : null;
      const mid = 'comp-update-modal';
      document.getElementById(mid)?.remove();
      const modal = document.createElement('div');
      modal.id = mid;
      modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px';
      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:500px;width:100%">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing ? 'Edit Update' : 'Log Update'}</div>
          <form id="cup-form">
            <div class="form-grid">
              <div class="form-group full"><label>What was done *</label>
                <textarea name="description" rows="4" required placeholder="Describe the work, repair, replacement, or observation…">${escHtml(existing?.description||'')}</textarea>
              </div>
              <div class="form-group"><label>Date</label>
                <input name="date" type="date" value="${existing?.date||new Date().toISOString().slice(0,10)}"/>
              </div>
              <div class="form-group"><label>Performed By</label>
                <input name="performed_by" value="${escHtml(existing?.performed_by||'')}" placeholder="Technician name"/>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px">
              ${existing ? `<button type="button" class="btn btn-secondary" style="color:var(--red)" id="del-cup-btn">Delete</button>` : '<span></span>'}
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Log Update'}</button>
              </div>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#cup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k]==='') data[k]=null; });
        try {
          if (!compUpdatesCache[compId]) compUpdatesCache[compId] = [];
          if (existing) {
            const updated = await API.components.updateUpdate(compId, existing.id, data);
            const idx = compUpdatesCache[compId].findIndex(u => u.id === existing.id);
            if (idx >= 0) compUpdatesCache[compId][idx] = updated;
          } else {
            const created = await API.components.createUpdate(compId, data);
            compUpdatesCache[compId].unshift(created);
          }
          const el = document.getElementById(`comp-updates-${compId}`);
          if (el) { el.innerHTML = renderUpdatesList(compUpdatesCache[compId], compId); applyAuthState(); }
          modal.remove();
          toast(existing ? 'Update saved' : 'Update logged');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
      modal.querySelector('#del-cup-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this update?')) return;
        try {
          await API.components.deleteUpdate(compId, existing.id);
          compUpdatesCache[compId] = (compUpdatesCache[compId]||[]).filter(u => u.id !== existing.id);
          const el = document.getElementById(`comp-updates-${compId}`);
          if (el) { el.innerHTML = renderUpdatesList(compUpdatesCache[compId], compId); applyAuthState(); }
          modal.remove();
          toast('Update deleted');
        } catch (err) { toast('Error: '+err.message, 'error'); }
      });
    };

    window.deleteComponentUpdate = async (compId, updateId) => {
      if (!confirm('Delete this update?')) return;
      try {
        await API.components.deleteUpdate(compId, updateId);
        compUpdatesCache[compId] = (compUpdatesCache[compId]||[]).filter(u => u.id !== updateId);
        const el = document.getElementById(`comp-updates-${compId}`);
        if (el) { el.innerHTML = renderUpdatesList(compUpdatesCache[compId], compId); applyAuthState(); }
        toast('Update deleted');
      } catch (err) { toast('Error: '+err.message, 'error'); }
    };

    window.openEditUnitModal = () => {
      // backTo is the site ID when coming from site-detail, or falsy when coming from units list
      if (backTo) {
        navigate('unit-form', { id: unitId, backTo: 'site-detail', backParams: { id: backTo } });
      } else {
        navigate('unit-form', { id: unitId, backTo: 'units', backParams: {} });
      }
    };

    window.openNewTicketModal = () => {
      navigate('ticket-detail', {
        backTo: 'unit-detail',
        backParams: { id: unitId, backTo, backParams: backTo === 'site-detail' ? { id: unitData.site_id } : {} },
        prefillSiteId: unitData.site_id,
        prefillUnitId: unitId,
      });
    };
  }
}
