// Campaign detail — per-unit completion checklist
// navigate('campaign-detail', { id: campaignId, siteId })

const CAMPAIGN_TYPE_LABELS = {
  pm:              'PM',
  firmware_update: 'Firmware Update',
  rfe:             'RFE',
  upgrade:         'Upgrade',
  bug_fix:         'Bug Fix',
  other:           'Other',
};

function campaignTypeBadge(type) {
  const colors = {
    pm:              'var(--blue)',
    firmware_update: 'var(--purple)',
    rfe:             'var(--orange)',
    upgrade:         'var(--green)',
    bug_fix:         'var(--red)',
    other:           'var(--text3)',
  };
  const c = colors[type] || 'var(--text3)';
  const label = CAMPAIGN_TYPE_LABELS[type] || type;
  return `<span style="background:${c}22;color:${c};border:1px solid ${c}44;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:600">${escHtml(label)}</span>`;
}

async function renderCampaignDetail(container, { id: campaignId, siteId } = {}) {
  if (!campaignId || !siteId) { navigate('dashboard'); return; }

  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let campaigns, siteUnits, statuses, sycoolSystems;
  try {
    [[...campaigns], siteUnits, statuses, sycoolSystems] = await Promise.all([
      API.campaigns.list(siteId),
      API.units.list({ site_id: siteId }),
      API.campaigns.getStatus(campaignId),
      API.sycool_systems.list(siteId).catch(() => []),
    ]);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`;
    return;
  }

  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Campaign not found.</div>`;
    return;
  }

  // Build status lookup: unit_id → status row
  const statusMap = {};
  statuses.forEach(s => { statusMap[s.unit_id] = s; });

  // Separate: regular units (no system) vs SyCool systems
  const regularUnits = siteUnits.filter(u => !u.system_id);

  // Build checklist items: regular units + one entry per SyCool system (tracked via ACCU unit_id)
  // Each system entry: { trackingId: accu.id, label: system_number, dataHall, isSyCool: true }
  const systemItems = sycoolSystems.map(sys => {
    const accu = sys.accu;
    return {
      trackingId: accu ? accu.id : null,
      label: sys.system_number,
      dataHall: sys.data_hall,
      isSyCool: true,
      accuTag: accu ? accu.asset_tag || accu.serial_number : '—',
      cracTag: sys.crac ? sys.crac.asset_tag || sys.crac.serial_number : '—',
    };
  }).filter(s => s.trackingId);

  // All possible trackable items
  const allPossibleItems = [
    ...regularUnits.map(u => ({ trackingId: u.id, isSyCool: false, unit: u })),
    ...systemItems,
  ];

  // Filter by campaign.unit_ids if set
  const unitIdSet = campaign.unit_ids
    ? new Set(Array.isArray(campaign.unit_ids) ? campaign.unit_ids : Object.values(campaign.unit_ids))
    : null;
  const allItems = unitIdSet
    ? allPossibleItems.filter(item => unitIdSet.has(item.trackingId))
    : allPossibleItems;

  const totalCount = allItems.length;

  function completeCount() {
    return allItems.filter(item => statusMap[item.trackingId]?.completed).length;
  }

  function renderProgress() {
    const done = completeCount();
    const pct = totalCount ? Math.round(done / totalCount * 100) : 0;
    return { done, pct };
  }

  function updateProgressBar() {
    const { done, pct } = renderProgress();
    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    const pctEl = document.getElementById('progress-pct');
    if (bar) bar.style.width = pct + '%';
    if (bar) bar.style.background = pct === 100 ? 'var(--green)' : 'var(--blue)';
    if (label) label.textContent = `${done} / ${totalCount} complete`;
    if (pctEl) { pctEl.textContent = pct + '%'; pctEl.style.color = pct === 100 ? 'var(--green)' : 'var(--blue)'; }
  }

  // Group system items by data hall for the checklist (only halls present in filtered allItems)
  const filteredSystemItems = allItems.filter(i => i.isSyCool);
  const halls = [...new Set(filteredSystemItems.map(s => s.dataHall))].sort();

  function renderTable() {
    if (!allItems.length) return '<div style="color:var(--text3);font-size:13px;padding:12px 0">No units on this site yet.</div>';

    // If site has SyCool systems, group checklist by data hall then regular units
    let rows = '';

    if (sycoolSystems.length > 0) {
      // SyCool systems section grouped by data hall (filtered to campaign scope)
      halls.forEach(hall => {
        const hallSystems = filteredSystemItems.filter(s => s.dataHall === hall);
        rows += `<tr>
          <td colspan="6" style="background:var(--bg3);font-size:11px;font-weight:700;color:var(--text3);padding:6px 12px;letter-spacing:.05em">${escHtml(hall)}</td>
        </tr>`;
        rows += hallSystems.map(s => renderSystemRow(s)).join('');
      });

      // Regular units section (filtered to campaign scope)
      const filteredRegularItems = allItems.filter(i => !i.isSyCool);
      if (filteredRegularItems.length > 0) {
        rows += `<tr>
          <td colspan="6" style="background:var(--bg3);font-size:11px;font-weight:700;color:var(--text3);padding:6px 12px;letter-spacing:.05em">OTHER UNITS</td>
        </tr>`;
        rows += filteredRegularItems.map(i => renderUnitRow(i.unit)).join('');
      }
    } else {
      const filteredRegularItems = allItems.filter(i => !i.isSyCool);
      rows = filteredRegularItems.map(i => renderUnitRow(i.unit)).join('');
    }

    return `<div class="table-wrap"><table>
      <thead>
        <tr>
          <th style="width:40px">Done</th>
          <th>${sycoolSystems.length > 0 ? 'System' : 'Serial / Unit'}</th>
          <th>${sycoolSystems.length > 0 ? 'ACCU / CRAC' : 'Type'}</th>
          <th>Completed By</th>
          <th>Notes</th>
          <th style="width:100px"></th>
        </tr>
      </thead>
      <tbody id="campaign-unit-rows">${rows}</tbody>
    </table></div>`;
  }

  function renderSystemRow(s) {
    const status = statusMap[s.trackingId];
    const done = !!status?.completed;
    const rowId = `row-${s.trackingId}`;
    return `<tr id="${rowId}" style="${done ? 'opacity:0.6' : ''}">
      <td style="text-align:center">
        <span style="font-size:18px;color:${done ? 'var(--green)' : 'var(--border)'}">
          ${done ? '✓' : '○'}
        </span>
      </td>
      <td style="font-family:monospace;font-size:13px;font-weight:600">${escHtml(s.label)}</td>
      <td style="font-size:11px;color:var(--text3)">${escHtml(s.accuTag)} / ${escHtml(s.cracTag)}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(status?.completed_by || '—')}</td>
      <td style="font-size:12px;color:var(--text2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          title="${escHtml(status?.notes || '')}">${escHtml(status?.notes || '—')}</td>
      <td>
        <button class="btn btn-sm ${done ? 'btn-secondary' : 'btn-primary'} edit-ui"
          onclick="toggleItemStatus('${s.trackingId}', ${!done})">
          ${done ? 'Undo' : 'Mark Done'}
        </button>
      </td>
    </tr>`;
  }

  function renderUnitRow(u) {
    const s = statusMap[u.id];
    const done = !!s?.completed;
    const rowId = `row-${u.id}`;
    const label = u.serial_number || (u.job_number && u.line_number != null
      ? `${u.job_number}-${String(u.line_number).padStart(4,'0')}` : u.id.slice(0,8));
    return `<tr id="${rowId}" style="${done ? 'opacity:0.6' : ''}">
      <td style="text-align:center">
        <span style="font-size:18px;color:${done ? 'var(--green)' : 'var(--border)'}">
          ${done ? '✓' : '○'}
        </span>
      </td>
      <td style="font-family:monospace;font-size:13px">${escHtml(label)}</td>
      <td>${unitTypeBadge(u.unit_type)}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(s?.completed_by || '—')}</td>
      <td style="font-size:12px;color:var(--text2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          title="${escHtml(s?.notes || '')}">${escHtml(s?.notes || '—')}</td>
      <td>
        <button class="btn btn-sm ${done ? 'btn-secondary' : 'btn-primary'} edit-ui"
          onclick="toggleItemStatus('${u.id}', ${!done})">
          ${done ? 'Undo' : 'Mark Done'}
        </button>
      </td>
    </tr>`;
  }

  const { done: initialDone, pct: initialPct } = renderProgress();

  container.innerHTML = `
    <div class="page-header" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-secondary btn-sm" id="back-btn">← Site</button>
        <div>
          <h1 style="margin:0;display:flex;align-items:center;gap:8px">
            ${escHtml(campaign.name)}
            ${campaignTypeBadge(campaign.campaign_type)}
          </h1>
          <div class="page-subtitle">${escHtml(campaign.description || '')}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-secondary edit-ui" id="mark-all-btn">✓ Mark All Done</button>
        <button class="btn btn-sm btn-secondary edit-ui" id="edit-campaign-btn">Edit</button>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div id="progress-label" style="font-weight:600;font-size:14px">${initialDone} / ${totalCount} complete</div>
        <div id="progress-pct" style="font-size:20px;font-weight:700;color:${initialPct === 100 ? 'var(--green)' : 'var(--blue)'}">${initialPct}%</div>
      </div>
      <div style="background:var(--bg3);border-radius:99px;height:10px;overflow:hidden">
        <div id="progress-bar" style="height:100%;width:${initialPct}%;background:${initialPct === 100 ? 'var(--green)' : 'var(--blue)'};border-radius:99px;transition:width .3s"></div>
      </div>
      <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:var(--text3)">
        ${campaign.started_at ? `<span>Started: ${fmt(campaign.started_at)}</span>` : ''}
        ${campaign.completed_at ? `<span>Completed: ${fmt(campaign.completed_at)}</span>` : ''}
      </div>
    </div>

    <!-- Checklist -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="card-title">${sycoolSystems.length > 0 ? 'System Checklist' : 'Unit Checklist'}</div>
        <div style="font-size:12px;color:var(--text3)">${totalCount} ${sycoolSystems.length > 0 ? 'systems' : 'units'}</div>
      </div>
      <div id="checklist-wrap">${renderTable()}</div>
      ${unitIdSet ? `<div style="font-size:11px;color:var(--text3);margin-top:8px">Showing ${allItems.length} of ${allPossibleItems.length} total units — <a onclick="document.getElementById('edit-campaign-btn').click()" style="color:var(--accent);cursor:pointer">change scope</a></div>` : ''}
    </div>

    <!-- Edit campaign modal -->
    <div id="edit-campaign-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;padding:16px">
      <div class="card" style="width:540px;max-width:100%;max-height:90vh;overflow-y:auto">
        <div class="card-title" style="margin-bottom:16px">Edit Campaign</div>
        <div class="form-grid">
          <div class="form-group full"><label>Name</label><input id="ec-name" value="${escHtml(campaign.name)}"/></div>
          <div class="form-group"><label>Type</label>
            <select id="ec-type">
              ${Object.entries(CAMPAIGN_TYPE_LABELS).map(([v,l]) => `<option value="${v}" ${campaign.campaign_type===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Started</label><input type="date" id="ec-started" value="${campaign.started_at || ''}"/></div>
          <div class="form-group"><label>Completed</label><input type="date" id="ec-completed" value="${campaign.completed_at || ''}"/></div>
          <div class="form-group full"><label>Description</label><textarea id="ec-desc" rows="2">${escHtml(campaign.description || '')}</textarea></div>
        </div>

        <!-- Unit selection -->
        <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Unit Scope</div>
          <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap" id="ec-scope-btns">
            ${(() => {
              const halls = [...new Set(sycoolSystems.map(s => s.data_hall))].filter(Boolean).sort();
              return `<button class="btn btn-sm btn-secondary ec-scope" data-scope="all">All (${allPossibleItems.length})</button>` +
                (halls.length ? halls.map(h => `<button class="btn btn-sm btn-secondary ec-scope" data-scope="hall" data-hall="${escHtml(h)}">${escHtml(h)}</button>`).join('') : '') +
                `<button class="btn btn-sm btn-secondary ec-scope" data-scope="none">None</button>`;
            })()}
          </div>
          <input id="ec-unit-search" placeholder="Search units…" style="margin-bottom:8px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:13px;width:100%;box-sizing:border-box">
          <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px 12px;background:var(--bg3)" id="ec-unit-list">
            ${(() => {
              const currentIds = unitIdSet;
              return allPossibleItems.map(item => {
                const lbl = item.isSyCool ? item.label : (item.unit?.asset_tag || item.unit?.serial_number || item.trackingId.slice(0,8));
                const hall = item.isSyCool ? item.dataHall : (item.unit?.data_hall || '');
                const checked = currentIds === null || currentIds.has(item.trackingId) ? 'checked' : '';
                return `<label style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;font-size:13px" data-hall="${escHtml(hall||'')}">
                  <input type="checkbox" class="ec-unit-chk" value="${item.trackingId}" ${checked} style="accent-color:var(--accent)">
                  <span style="font-family:monospace">${escHtml(lbl)}</span>
                  ${hall ? `<span style="font-size:10px;color:var(--text3)">${escHtml(hall)}</span>` : ''}
                </label>`;
              }).join('');
            })()}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:6px" id="ec-unit-summary"></div>
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-secondary" id="ec-cancel">Cancel</button>
          <button class="btn btn-primary" id="ec-save">Save</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => navigate('site-detail', { id: siteId }));

  // Toggle one item (unit or system-via-ACCU)
  window.toggleItemStatus = async (trackingId, completed) => {
    const completedBy = completed ? (prompt('Your name (optional):') || null) : null;
    try {
      const updated = await API.campaigns.setStatus(campaignId, {
        unit_id: trackingId,
        completed,
        completed_by: completedBy,
      });
      statusMap[trackingId] = updated;

      // Re-render just that row
      const sysItem = systemItems.find(s => s.trackingId === trackingId);
      const unitItem = regularUnits.find(u => u.id === trackingId);
      const row = document.getElementById(`row-${trackingId}`);
      if (row) {
        if (sysItem) row.outerHTML = renderSystemRow(sysItem);
        else if (unitItem) row.outerHTML = renderUnitRow(unitItem);
      }

      updateProgressBar();
      toast(`${completed ? '✓' : '○'} ${completed ? 'Marked complete' : 'Reset'}`);
      const done = completeCount();
      if (done === totalCount && totalCount > 0) toast('🎉 All complete!', 'success');
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  // Mark all done
  document.getElementById('mark-all-btn').addEventListener('click', async () => {
    if (!confirm(`Mark all ${totalCount} items as complete?`)) return;
    const name = prompt('Your name (optional):') || null;
    try {
      for (const item of allItems) {
        if (!statusMap[item.trackingId]?.completed) {
          const s = await API.campaigns.setStatus(campaignId, {
            unit_id: item.trackingId,
            completed: true,
            completed_by: name,
          });
          statusMap[item.trackingId] = s;
        }
      }
      toast('All items marked complete');
      navigate('campaign-detail', { id: campaignId, siteId });
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });

  // Edit modal
  const editModal = document.getElementById('edit-campaign-modal');

  function ecUpdateSummary() {
    const checked = editModal.querySelectorAll('.ec-unit-chk:checked');
    const total   = allPossibleItems.length;
    const el = document.getElementById('ec-unit-summary');
    if (el) el.textContent = `${checked.length} of ${total} selected`;
  }

  document.getElementById('edit-campaign-btn').addEventListener('click', () => {
    editModal.style.display = 'flex';
    ecUpdateSummary();
  });
  document.getElementById('ec-cancel').addEventListener('click', () => {
    editModal.style.display = 'none';
  });

  // Scope quick-select buttons
  editModal.querySelectorAll('.ec-scope').forEach(btn => {
    btn.addEventListener('click', () => {
      editModal.querySelectorAll('.ec-scope').forEach(b => {
        b.style.background = ''; b.style.color = ''; b.style.borderColor = '';
      });
      btn.style.background = 'var(--accent)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--accent)';
      const scope = btn.dataset.scope;
      editModal.querySelectorAll('.ec-unit-chk').forEach(chk => {
        if (scope === 'all')  chk.checked = true;
        else if (scope === 'none') chk.checked = false;
        else if (scope === 'hall') {
          const item = allPossibleItems.find(t => t.trackingId === chk.value);
          chk.checked = (item?.dataHall || item?.unit?.data_hall) === btn.dataset.hall;
        }
      });
      ecUpdateSummary();
    });
  });

  // Unit search
  document.getElementById('ec-unit-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    editModal.querySelectorAll('#ec-unit-list label').forEach(lbl => {
      lbl.style.display = (!q || lbl.textContent.toLowerCase().includes(q)) ? '' : 'none';
    });
  });

  editModal.querySelectorAll('.ec-unit-chk').forEach(chk => {
    chk.addEventListener('change', ecUpdateSummary);
  });

  document.getElementById('ec-save').addEventListener('click', async () => {
    const checked = [...editModal.querySelectorAll('.ec-unit-chk:checked')].map(c => c.value);
    const total   = allPossibleItems.length;
    const unit_ids = checked.length === total ? null : checked;
    const data = {
      name:          document.getElementById('ec-name').value.trim() || undefined,
      campaign_type: document.getElementById('ec-type').value || undefined,
      description:   document.getElementById('ec-desc').value.trim() || null,
      started_at:    document.getElementById('ec-started').value || null,
      completed_at:  document.getElementById('ec-completed').value || null,
      unit_ids,
    };
    try {
      await API.campaigns.update(siteId, campaignId, data);
      toast('Campaign updated');
      navigate('campaign-detail', { id: campaignId, siteId });
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });
}
