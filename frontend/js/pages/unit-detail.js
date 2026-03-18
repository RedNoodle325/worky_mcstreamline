async function renderUnitDetail(container, { id, backTo } = {}) {
  if (!id) { navigate('units'); return; }

  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let unit, comm, allTickets, sites;
  try {
    [unit, comm, allTickets, sites] = await Promise.all([
      API.units.get(id),
      API.commissioning.get(id),
      API.tickets.list(),
      API.sites.list(),
    ]);
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
        <div style="display:flex;gap:8px">
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
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">Commissioning Progress</div>
          <div id="comm-track">
            ${renderCommTrack(comm, levels)}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px" id="comm-buttons">
            ${renderCommButtons(comm, levels, id)}
          </div>
        </div>
      </div>

      <!-- Open Tickets -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title">Issues / Tickets
            ${openTickets.length > 0 ? `<span style="margin-left:8px;background:var(--red)22;color:var(--red);border:1px solid var(--red)44;border-radius:99px;padding:1px 8px;font-size:11px">${openTickets.length} open</span>` : ''}
          </div>
          <button class="btn btn-sm btn-primary" onclick="openNewTicketModal()">+ New Ticket</button>
        </div>
        ${renderTicketsTable(unitTickets)}
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
      return `<button class="btn btn-sm ${done ? 'btn-secondary' : 'btn-primary'}"
        onclick="toggleCommLevel(${l.n},'${unitId}',${!done})">
        ${done ? `↩ Undo L${l.n}` : `✓ Complete L${l.n}`}
      </button>`;
    }).join('');
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

  // ── Handlers ───────────────────────────────────────────────────────────────
  function attachUnitDetailHandlers(unitId, unitData, commData, lvls, siteList) {

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

    window.openEditUnitModal = () => {
      showUnitForm(unitData, siteList, async () => {
        unit = await API.units.get(unitId);
        renderPage();
      });
    };

    window.openNewTicketModal = () => {
      openModal('New Ticket', `
        <form id="ticket-form">
          <div class="form-grid">
            <div class="form-group full"><label>Title *</label><input name="title" required placeholder="Brief description…"/></div>
            <div class="form-group full"><label>Description</label><textarea name="description" placeholder="Details…"></textarea></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Ticket</button>
          </div>
        </form>`);

      document.getElementById('ticket-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
        data.unit_id = unitId;
        data.site_id = unitData.site_id;
        try {
          await API.tickets.create(data);
          closeModal();
          allTickets = await API.tickets.list();
          const updatedUnitTickets = allTickets.filter(t => t.unit_id === unitId);
          const tbody = container.querySelector('.card:last-child .table-wrap');
          const fallback = container.querySelector('.card:last-child div[style*="No tickets"]');
          const target = tbody || fallback;
          if (target) target.outerHTML = renderTicketsTable(updatedUnitTickets);
          toast('Ticket created');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });
    };
  }
}
