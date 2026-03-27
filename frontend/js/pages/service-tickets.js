async function renderServiceTickets(container) {
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let tickets, issues, sites, lineLinks;
  try {
    [tickets, issues, sites, lineLinks] = await Promise.all([
      API.service_tickets.listAll(),
      API.issues.listAll().catch(() => []),
      API.sites.list(),
      API.issueLineLinks.listAll().catch(() => []),
    ]);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`;
    return;
  }

  // Build lookup: order_id → [{ linkId, issue }]
  function buildLineLinkMap() {
    const map = {};
    for (const link of lineLinks) {
      if (!map[link.order_id]) map[link.order_id] = [];
      const issue = issues.find(i => i.id === link.issue_id);
      if (issue) map[link.order_id].push({ linkId: link.id, ticketId: link.service_ticket_id, issue });
    }
    return map;
  }
  let lineLinkMap = buildLineLinkMap();

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]));

  const STATUS_OPTS = [
    { val: 'open',        label: 'Open',        color: 'var(--blue)'   },
    { val: 'in_progress', label: 'In Progress',  color: 'var(--yellow)' },
    { val: 'complete',    label: 'Complete',     color: 'var(--green)'  },
    { val: 'cancelled',   label: 'Cancelled',    color: 'var(--text3)'  },
  ];

  let filterSite = '', filterStatuses = new Set(), searchText = '';

  function filtered() {
    return tickets.filter(t => {
      if (filterSite && t.site_id !== filterSite) return false;
      if (filterStatuses.size && !filterStatuses.has(t.status || 'open')) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const parts  = Array.isArray(t.parts_ordered) ? t.parts_ordered : [];
        const lines  = Array.isArray(t.service_lines)  ? t.service_lines  : [];
        const soNums = parts.map(p => p.so_number || '').join(' ');
        const asteas = lines.map(l => l.astea_id || '').join(' ');
        if (!(
          (t.title || '').toLowerCase().includes(q) ||
          (t.c2_number || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          soNums.toLowerCase().includes(q) ||
          asteas.toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  }

  function statusBadge(s) {
    const cfg = STATUS_OPTS.find(o => o.val === s) || STATUS_OPTS[0];
    return `<span style="background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}44;border-radius:99px;padding:1px 8px;font-size:11px;white-space:nowrap">${cfg.label}</span>`;
  }

  function render() {
    const list = filtered();
    const counts = {};
    STATUS_OPTS.forEach(s => { counts[s.val] = tickets.filter(t => t.status === s.val).length; });

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:20px">
        <div>
          <h1 style="margin:0">CS Tickets</h1>
          <div class="page-subtitle">${counts.open || 0} open tickets</div>
        </div>
        <span class="edit-ui" style="display:flex;gap:8px">
          <label class="btn btn-secondary" style="cursor:pointer" title="Import CS tickets from Astea XML export">
            ↑ Import XML
            <input type="file" id="xml-import-input" accept=".xml,text/xml" style="display:none" onchange="importXmlTickets(this)">
          </label>
          <button class="btn btn-primary" id="new-st-btn">+ New CS Ticket</button>
        </span>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:16px;padding:12px 16px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <input id="st-search" placeholder="Search title, C2#, SO#, Astea ID…" value="${escHtml(searchText)}"
            style="width:240px" oninput="stSearch(this.value)"/>
          <select id="st-filter-site" onchange="stFilterSite(this.value)" style="max-width:180px">
            <option value="">All Sites</option>
            ${sites.map(s => `<option value="${s.id}" ${filterSite === s.id ? 'selected' : ''}>${escHtml(s.name)}</option>`).join('')}
          </select>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Status:</span>
            ${STATUS_OPTS.map(s => {
              const active = filterStatuses.has(s.val);
              return `<button onclick="stToggleStatus('${s.val}')"
                style="padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid ${s.color};
                       background:${active ? s.color : 'transparent'};color:${active ? '#fff' : s.color};transition:all .15s;white-space:nowrap">
                ${s.label} <span style="opacity:.7">${counts[s.val] || 0}</span>
              </button>`;
            }).join('')}
            ${filterStatuses.size ? `<button onclick="stClearStatus()" style="padding:3px 8px;border-radius:99px;font-size:11px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer">✕ Clear</button>` : ''}
          </div>
          <span style="color:var(--text3);font-size:12px;margin-left:auto">${list.length} shown</span>
        </div>
      </div>

      <!-- Ticket list -->
      <div id="st-list">
        ${list.length === 0
          ? `<div class="card" style="color:var(--text3);text-align:center;padding:40px">No CS tickets match your filters</div>`
          : list.map(t => renderTicketRow(t)).join('')
        }
      </div>`;

    document.getElementById('new-st-btn')?.addEventListener('click', () => openStModal(null));
    document.getElementById('st-search')?.addEventListener('input', e => { searchText = e.target.value; render(); });
  }

  function lineStatusColor(s) {
    if (!s) return 'var(--text3)';
    const lower = s.toLowerCase();
    if (lower.includes('invoiced') || lower.includes('closed') || lower.includes('complete')) return 'var(--green)';
    if (lower.includes('assigned') || lower.includes('entry') || lower.includes('glovia')) return 'var(--yellow)';
    return 'var(--blue)';
  }

  function isLineClosed(s) {
    if (!s) return false;
    const lower = s.toLowerCase();
    return lower.includes('invoiced') || lower.includes('closed') || lower.includes('complete') || lower.includes('released');
  }

  function renderTicketRow(t) {
    const site = siteMap[t.site_id];
    const parts = Array.isArray(t.parts_ordered) ? t.parts_ordered : [];
    const lines = Array.isArray(t.service_lines)  ? t.service_lines  : [];
    const linked = issues.filter(i => i.service_ticket_id === t.id);
    const uid = t.id.slice(0,8);

    // Count line statuses
    const closedLines = lines.filter(l => isLineClosed(l.status)).length;
    const openLines = lines.length - closedLines;
    const linesSummary = lines.length > 1
      ? `<span style="font-size:11px;color:var(--text3)">${lines.length} lines${closedLines ? ` · <span style="color:var(--green)">${closedLines} done</span>` : ''}</span>`
      : '';

    const thStyle = 'padding:5px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3)';

    const linesHtml = lines.length ? lines.map((l, i) => {
      const sc = lineStatusColor(l.status);
      const closed = isLineClosed(l.status);
      const lineId = l.order_id || `Line ${l.line_no || i+1}`;
      const partInfo = [l.part_number, l.description].filter(Boolean).join(' · ') || '—';
      const scope = l.problem_desc || l.activity_group || '—';
      const orderType = l.order_type || '';
      const typeLabel = orderType === 'field_quote' ? 'Quote'
        : orderType === 'helpdesk_order' ? 'Helpdesk'
        : orderType === 'sale_quotation' ? 'Sale Quote'
        : '';
      const linkedToLine = l.order_id ? (lineLinkMap[l.order_id] || []) : [];
      const issueChips = linkedToLine.map(ll =>
        `<span style="display:inline-flex;align-items:center;gap:3px;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:10px;white-space:nowrap" title="${escHtml(ll.issue.title || '')}">
          <span style="font-family:monospace;color:var(--accent)">${escHtml(ll.issue.unit_tag || ll.issue.title?.slice(0,20) || '—')}</span>
          <button onclick="event.stopPropagation();stUnlinkIssue('${ll.linkId}','${t.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0 2px" title="Unlink">✕</button>
        </span>`
      ).join('');
      const assignBtn = l.order_id
        ? `<button onclick="event.stopPropagation();stShowIssuePicker('${t.id}','${escHtml(l.order_id)}')" style="background:none;border:1px dashed var(--border);border-radius:4px;padding:1px 6px;font-size:10px;color:var(--text3);cursor:pointer;white-space:nowrap" title="Link issue to this line">+ Issue</button>`
        : '';
      return `<tr style="border-bottom:1px solid var(--border);${closed ? 'opacity:.5' : ''}" data-line-closed="${closed}">
        <td style="padding:6px 8px;font-family:monospace;font-size:11px;color:var(--accent);white-space:nowrap">${escHtml(lineId)}${typeLabel ? `<br><span style="font-size:9px;color:var(--text3);font-family:inherit">${typeLabel}</span>` : ''}</td>
        <td style="padding:6px 8px;font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(partInfo)}">${escHtml(partInfo)}</td>
        <td style="padding:6px 8px;font-size:12px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(scope)}">${escHtml(scope)}</td>
        <td style="padding:6px 8px;font-size:11px;color:var(--text3);white-space:nowrap">${escHtml(l.serial_number || '—')}</td>
        <td style="padding:6px 8px;white-space:nowrap"><span style="background:${sc}22;color:${sc};border:1px solid ${sc}44;border-radius:99px;padding:1px 7px;font-size:10px;font-weight:600">${escHtml(l.status || '—')}</span></td>
        <td style="padding:6px 8px;font-size:11px;color:var(--text3);white-space:nowrap">${escHtml(l.technician || '—')}</td>
        <td style="padding:6px 8px;white-space:nowrap"><div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center">${issueChips}${assignBtn}</div></td>
      </tr>`;
    }).join('') : '';

    return `
    <div style="border:1px solid var(--border);border-radius:8px;margin-bottom:10px;background:var(--bg2);overflow:hidden">
      <div style="padding:14px 16px;cursor:pointer" onclick="openStModal('${t.id}')">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
              <span style="font-weight:600;font-size:14px;color:var(--text)">${escHtml(t.title)}</span>
              ${statusBadge(t.status)}
              ${t.c2_number ? `<span style="font-size:11px;color:var(--text3)"><span style="font-family:monospace;color:var(--accent)">${escHtml(t.c2_number)}</span></span>` : ''}
              ${linesSummary}
            </div>
            <div style="display:flex;gap:12px;font-size:12px;color:var(--text3);flex-wrap:wrap">
              ${site ? `<span>📍 <a onclick="event.stopPropagation();navigate('site-detail',{id:'${site.id}'})" style="cursor:pointer;color:var(--text2)">${escHtml(site.name)}</a></span>` : (t.site_company_id ? `<span style="color:var(--text3);font-size:11px">${escHtml(t.site_company_id)}</span>` : '')}
              ${t.open_date ? `<span>${fmt(t.open_date)}</span>` : `<span>${fmt(t.created_at)}</span>`}
              ${t.ticket_type ? `<span style="color:var(--text3)">${escHtml(t.ticket_type)}</span>` : ''}
            </div>
            ${t.description ? `<div style="font-size:12px;color:var(--text2);margin-top:4px;max-width:700px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.description)}</div>` : ''}
          </div>
        </div>
      </div>
      ${lines.length > 0 ? `
      <div style="border-top:1px solid var(--border)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0 16px">
          <div onclick="stToggleLines('${uid}')" style="padding:8px 0;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;user-select:none">
            <span id="st-chev-${uid}" style="font-size:10px;transition:transform .15s">▶</span>
            Service Lines (${lines.length})
          </div>
          ${closedLines > 0 ? `<label style="font-size:10px;color:var(--text3);display:flex;align-items:center;gap:4px;cursor:pointer;user-select:none">
            <input type="checkbox" onchange="stToggleArchived('${uid}',this.checked)" style="width:12px;height:12px"> Hide archived (${closedLines})
          </label>` : ''}
        </div>
        <div id="st-lines-${uid}" style="display:none;overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:var(--bg);border-bottom:1px solid var(--border)">
              <th style="${thStyle}">Order ID</th>
              <th style="${thStyle}">Parts</th>
              <th style="${thStyle}">Scope / Activity</th>
              <th style="${thStyle}">Serial</th>
              <th style="${thStyle}">Status</th>
              <th style="${thStyle}">Tech</th>
              <th style="${thStyle}">Issues</th>
            </tr></thead>
            <tbody>${linesHtml}</tbody>
          </table>
        </div>
      </div>` : ''}
    </div>`;
  }

  // ── Create / Edit modal ────────────────────────────────────────────────────
  function openStModal(ticketId) {
    const existing = ticketId ? tickets.find(t => t.id === ticketId) : null;
    const parts = existing?.parts_ordered
      ? (Array.isArray(existing.parts_ordered) ? existing.parts_ordered : [])
      : [];
    const lines = existing?.service_lines
      ? (Array.isArray(existing.service_lines) ? existing.service_lines : [])
      : [];

    const mid = 'st-modal';
    document.getElementById(mid)?.remove();
    const modal = document.createElement('div');
    modal.id = mid;
    modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto';

    function partRowHtml(p) {
      return `<div class="part-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input class="part-desc" placeholder="Part description" value="${escHtml(p.description || '')}" style="flex:1"/>
        <input class="part-qty" type="number" placeholder="Qty" value="${p.qty || 1}" style="width:60px"/>
        <input class="part-so" placeholder="SO#" value="${escHtml(p.so_number || '')}" style="width:120px;font-family:monospace"/>
        <button type="button" class="btn btn-secondary btn-sm part-remove" style="padding:4px 8px">✕</button>
      </div>`;
    }
    function lineRowHtml(l) {
      return `<div class="line-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input class="line-astea" placeholder="Astea Request ID" value="${escHtml(l.astea_id || '')}" style="width:170px;font-family:monospace"/>
        <input class="line-desc" placeholder="Description / notes" value="${escHtml(l.description || '')}" style="flex:1"/>
        <button type="button" class="btn btn-secondary btn-sm line-remove" style="padding:4px 8px">✕</button>
      </div>`;
    }

    const linkedIssues = existing ? issues.filter(i => i.service_ticket_id === existing.id) : [];

    modal.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:680px;width:100%;margin:auto">
        <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing ? 'Edit CS Ticket' : 'New CS Ticket'}</div>
        <form id="st-form">
          <div class="form-grid">
            <div class="form-group full"><label>Title *</label>
              <input name="title" required value="${escHtml(existing?.title || '')}" placeholder="Brief description of the work"/>
            </div>
            <div class="form-group full"><label>Description</label>
              <textarea name="description" rows="2">${escHtml(existing?.description || '')}</textarea>
            </div>
            ${!existing ? `
            <div class="form-group full"><label>Site *</label>
              <select name="site_id" required>
                <option value="">— Select site —</option>
                ${sites.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('')}
              </select>
            </div>` : `<div style="font-size:12px;color:var(--text3);margin-bottom:8px">Site: <strong style="color:var(--text2)">${escHtml(siteMap[existing.site_id]?.name || '—')}</strong></div>`}
            <div class="form-group"><label>Status</label>
              <select name="status">
                ${STATUS_OPTS.map(o => `<option value="${o.val}" ${(existing?.status || 'open') === o.val ? 'selected' : ''}>${o.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>C2 Number <span style="font-weight:400;color:var(--text3);font-size:11px">(warranty claim)</span></label>
              <input name="c2_number" value="${escHtml(existing?.c2_number || '')}" placeholder="e.g. C2-00123456" style="font-family:monospace"/>
            </div>
          </div>

          <!-- Service Lines -->
          <div style="margin:8px 0 16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <label style="font-weight:600;font-size:13px">Service Lines <span style="font-weight:400;color:var(--text3);font-size:11px">(Astea Request IDs / tech dispatches)</span></label>
              <button type="button" class="btn btn-secondary btn-sm" id="st-add-line-btn">+ Add</button>
            </div>
            <div id="st-lines-list">${lines.map(l => lineRowHtml(l)).join('')}</div>
          </div>

          <!-- Parts Ordered -->
          <div style="margin-bottom:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <label style="font-weight:600;font-size:13px">Parts Ordered</label>
              <button type="button" class="btn btn-secondary btn-sm" id="st-add-part-btn">+ Add</button>
            </div>
            <div id="st-parts-list">${parts.map(p => partRowHtml(p)).join('')}</div>
          </div>

          <!-- Scope of Work -->
          <div style="margin-bottom:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <label style="font-weight:600;font-size:13px">Scope of Work</label>
              <div style="display:flex;gap:6px">
                <select id="st-scope-template" style="font-size:11px;padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:var(--bg);color:var(--text)">
                  <option value="">— Insert template —</option>
                  <option value="warranty_repair">Warranty Repair</option>
                  <option value="warranty_startup">Warranty - 90 Day Startup</option>
                  <option value="pm_service">PM Service Visit</option>
                  <option value="emergency_repair">Emergency Repair</option>
                  <option value="parts_replacement">Parts Replacement</option>
                  <option value="troubleshoot">Troubleshoot &amp; Diagnose</option>
                  <option value="commissioning">Commissioning / Startup</option>
                  <option value="inspection">Inspection</option>
                </select>
                <button type="button" class="btn btn-secondary btn-sm" id="st-copy-scope" title="Copy to clipboard" style="padding:3px 8px;font-size:11px">📋 Copy</button>
              </div>
            </div>
            <textarea id="st-scope-text" rows="5" style="width:100%;font-size:12px;line-height:1.5;font-family:inherit;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);resize:vertical" placeholder="Describe the scope of work for this ticket…">${escHtml(existing?.scope_of_work || '')}</textarea>
          </div>

          ${linkedIssues.length ? `
          <div style="margin-bottom:16px;padding:10px 12px;background:var(--bg3);border-radius:8px">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text3);margin-bottom:6px">Linked Issues (${linkedIssues.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${linkedIssues.map(i => `<span style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:12px">
                <span style="font-family:monospace">${escHtml(i.unit_tag || '—')}</span>
                <span style="color:var(--text3);margin-left:4px">${escHtml(i.title || '')}</span>
              </span>`).join('')}
            </div>
          </div>` : ''}

          <div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px">
            ${existing ? `<button type="button" class="btn btn-secondary" style="color:var(--red)" id="st-delete-btn">Delete</button>` : '<span></span>'}
            <div style="display:flex;gap:8px">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Create Ticket'}</button>
            </div>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);

    // Dynamic rows
    modal.querySelector('#st-add-part-btn').addEventListener('click', () => {
      const div = document.createElement('div');
      div.innerHTML = partRowHtml({});
      modal.querySelector('#st-parts-list').appendChild(div.firstElementChild);
    });
    modal.querySelector('#st-add-line-btn').addEventListener('click', () => {
      const div = document.createElement('div');
      div.innerHTML = lineRowHtml({});
      modal.querySelector('#st-lines-list').appendChild(div.firstElementChild);
    });
    modal.querySelector('#st-parts-list').addEventListener('click', e => {
      if (e.target.classList.contains('part-remove')) e.target.closest('.part-row').remove();
    });
    modal.querySelector('#st-lines-list').addEventListener('click', e => {
      if (e.target.classList.contains('line-remove')) e.target.closest('.line-row').remove();
    });

    // Scope of work templates
    const scopeTemplates = {
      warranty_repair: `SCOPE OF WORK: WARRANTY REPAIR\n\nUnit(s): [Tag / Serial]\nSite: [Site Name]\n\n1. Mobilize technician to site\n2. Diagnose reported issue(s)\n3. Perform warranty repair / replacement of defective component(s)\n4. Verify unit operation post-repair\n5. Complete service report and documentation\n\nParts Required:\n- [Part # / Description]\n\nEstimated Duration: [X] day(s)`,
      warranty_startup: `SCOPE OF WORK: WARRANTY - 90 DAY STARTUP\n\nUnit(s): [Tag / Serial]\nSite: [Site Name]\n\n1. Mobilize technician to site\n2. Perform 90-day startup inspection per Munters checklist\n3. Verify all mechanical and electrical connections\n4. Check refrigerant levels and system pressures\n5. Commission controls and verify setpoints\n6. Document all readings and observations\n7. Address any punch-list items\n\nEstimated Duration: [X] day(s)`,
      pm_service: `SCOPE OF WORK: PREVENTIVE MAINTENANCE\n\nUnit(s): [Tag / Serial]\nSite: [Site Name]\n\n1. Mobilize technician to site\n2. Perform PM inspection per Munters maintenance checklist\n3. Inspect and clean coils, filters, drain pans\n4. Check belts, bearings, and motor condition\n5. Verify refrigerant charge and system pressures\n6. Inspect electrical connections and controls\n7. Document all readings and recommendations\n\nEstimated Duration: [X] day(s)`,
      emergency_repair: `SCOPE OF WORK: EMERGENCY REPAIR\n\nUnit(s): [Tag / Serial]\nSite: [Site Name]\nPriority: URGENT\n\n1. Mobilize technician to site ASAP\n2. Diagnose failure / alarm condition\n3. Perform emergency repair to restore unit operation\n4. Verify unit is operating within spec\n5. Document root cause and corrective action\n6. Recommend follow-up actions if needed\n\nParts Required:\n- [Part # / Description]\n\nEstimated Duration: [X] day(s)`,
      parts_replacement: `SCOPE OF WORK: PARTS REPLACEMENT\n\nUnit(s): [Tag / Serial]\nSite: [Site Name]\n\n1. Mobilize technician to site\n2. Replace the following component(s):\n   - [Part # / Description]\n3. Verify proper installation and operation\n4. Run unit through full cycle and check performance\n5. Complete service report\n\nParts Required:\n- [Part # / Description / Qty]\n\nEstimated Duration: [X] day(s)`,
      troubleshoot: `SCOPE OF WORK: TROUBLESHOOT & DIAGNOSE\n\nUnit(s): [Tag / Serial]\nSite: [Site Name]\n\nReported Issue: [Description of problem]\n\n1. Mobilize technician to site\n2. Review unit history and reported symptoms\n3. Perform systematic troubleshooting\n4. Identify root cause of issue\n5. Provide repair recommendation and parts list\n6. Complete diagnostic report\n\nEstimated Duration: [X] day(s)`,
      commissioning: `SCOPE OF WORK: COMMISSIONING / STARTUP\n\nUnit(s): [Tag / Serial]\nSite: [Site Name]\n\n1. Mobilize technician to site\n2. Verify all mechanical and electrical installation per Munters specs\n3. Perform pre-startup checks (power, piping, controls)\n4. Energize unit and perform initial startup\n5. Commission controls — verify setpoints, alarms, and sequences\n6. Record all startup readings and parameters\n7. Train site personnel on basic operation\n8. Complete commissioning report and documentation\n\nEstimated Duration: [X] day(s)`,
      inspection: `SCOPE OF WORK: INSPECTION\n\nUnit(s): [Tag / Serial]\nSite: [Site Name]\n\n1. Mobilize technician to site\n2. Perform visual and operational inspection of unit(s)\n3. Document current condition, readings, and observations\n4. Identify any deficiencies or required repairs\n5. Provide written inspection report with photos\n6. Recommend corrective actions and timeline\n\nEstimated Duration: [X] day(s)`,
    };
    modal.querySelector('#st-scope-template')?.addEventListener('change', (e) => {
      const tmpl = scopeTemplates[e.target.value];
      if (!tmpl) return;
      const ta = modal.querySelector('#st-scope-text');
      if (!ta) return;
      // If textarea is empty, replace. If not, append.
      if (ta.value.trim()) {
        ta.value += '\n\n' + tmpl;
      } else {
        ta.value = tmpl;
      }
      e.target.value = '';
    });
    modal.querySelector('#st-copy-scope')?.addEventListener('click', () => {
      const ta = modal.querySelector('#st-scope-text');
      if (!ta || !ta.value.trim()) { toast('Nothing to copy', 'error'); return; }
      navigator.clipboard.writeText(ta.value).then(() => toast('Scope copied to clipboard'));
    });

    modal.querySelector('#st-form').addEventListener('submit', async (e) => {
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

      // Scope of work
      const scopeVal = modal.querySelector('#st-scope-text')?.value?.trim() || null;
      data.scope_of_work = scopeVal;

      try {
        let result;
        if (existing) {
          result = await API.service_tickets.update(existing.id, data);
          const idx = tickets.findIndex(t => t.id === existing.id);
          if (idx >= 0) tickets[idx] = result;
        } else {
          result = await API.service_tickets.create(data.site_id, { ...data });
          tickets.unshift(result);
        }
        modal.remove();
        toast(existing ? 'CS ticket saved' : 'CS ticket created');
        render();
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });

    modal.querySelector('#st-delete-btn')?.addEventListener('click', async () => {
      if (!confirm('Delete this CS ticket?')) return;
      try {
        await API.service_tickets.delete(existing.id);
        tickets = tickets.filter(t => t.id !== existing.id);
        modal.remove();
        toast('CS ticket deleted');
        render();
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });
  }

  window.openStModal    = openStModal;
  window.stSearch       = (val) => { searchText = val; render(); };
  window.stFilterSite   = (val) => { filterSite = val; render(); };
  window.stToggleStatus = (val) => { filterStatuses.has(val) ? filterStatuses.delete(val) : filterStatuses.add(val); render(); };
  window.stClearStatus  = ()    => { filterStatuses.clear(); render(); };
  window.stToggleLines  = (uid) => {
    const wrap = document.getElementById('st-lines-' + uid);
    const chev = document.getElementById('st-chev-' + uid);
    if (!wrap) return;
    const open = wrap.style.display === 'none';
    wrap.style.display = open ? '' : 'none';
    if (chev) chev.style.transform = open ? 'rotate(90deg)' : '';
  };
  window.stToggleArchived = (uid, hide) => {
    const wrap = document.getElementById('st-lines-' + uid);
    if (!wrap) return;
    wrap.querySelectorAll('tr[data-line-closed="true"]').forEach(row => {
      row.style.display = hide ? 'none' : '';
    });
  };

  // ── Issue ↔ Line linking ──────────────────────────────────────────────────
  window.stUnlinkIssue = async (linkId, ticketId) => {
    try {
      await API.issueLineLinks.delete(ticketId, linkId);
      lineLinks = lineLinks.filter(l => l.id !== linkId);
      lineLinkMap = buildLineLinkMap();
      render();
      toast('Issue unlinked');
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  window.stShowIssuePicker = (ticketId, orderId) => {
    // Remove any existing picker
    document.getElementById('st-issue-picker')?.remove();

    const ticket = tickets.find(t => t.id === ticketId);
    // Show issues for the same site, or all if no site
    const siteIssues = ticket?.site_id
      ? issues.filter(i => i.site_id === ticket.site_id)
      : issues;
    // Filter out already-linked issues for this line
    const alreadyLinked = new Set((lineLinkMap[orderId] || []).map(ll => ll.issue.id));
    const available = siteIssues.filter(i => !alreadyLinked.has(i.id));

    const picker = document.createElement('div');
    picker.id = 'st-issue-picker';
    picker.style.cssText = 'position:fixed;inset:0;background:#0006;z-index:1100;display:flex;align-items:center;justify-content:center;padding:20px';
    picker.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px;max-width:500px;width:100%;max-height:80vh;display:flex;flex-direction:column">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px">Link Issue to <span style="font-family:monospace;color:var(--accent)">${escHtml(orderId)}</span></div>
        <input id="st-issue-picker-search" placeholder="Search issues…" style="margin-bottom:10px;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-size:13px"/>
        <div id="st-issue-picker-list" style="overflow-y:auto;flex:1;min-height:100px;max-height:50vh">
          ${available.length === 0 ? '<div style="color:var(--text3);text-align:center;padding:20px;font-size:12px">No available issues for this site</div>' : ''}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px">
          <button class="btn btn-secondary" onclick="document.getElementById('st-issue-picker')?.remove()">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(picker);
    picker.addEventListener('click', e => { if (e.target === picker) picker.remove(); });

    function renderPickerList(filter) {
      const q = (filter || '').toLowerCase();
      const filtered = available.filter(i => {
        if (!q) return true;
        return (i.title || '').toLowerCase().includes(q)
          || (i.unit_tag || '').toLowerCase().includes(q)
          || (i.description || '').toLowerCase().includes(q);
      });
      const list = document.getElementById('st-issue-picker-list');
      if (!list) return;
      if (filtered.length === 0) {
        list.innerHTML = '<div style="color:var(--text3);text-align:center;padding:20px;font-size:12px">No matching issues</div>';
        return;
      }
      list.innerHTML = filtered.slice(0, 50).map(i => {
        const statusColor = i.status === 'open' ? 'var(--blue)' : i.status === 'resolved' ? 'var(--green)' : 'var(--yellow)';
        return `<div class="st-issue-pick-row" data-issue-id="${i.id}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--border);cursor:pointer;border-radius:6px;transition:background .1s"
          onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''"
          onclick="stLinkIssue('${ticketId}','${escHtml(orderId)}','${i.id}')">
          <span style="font-family:monospace;font-size:11px;color:var(--accent);min-width:80px">${escHtml(i.unit_tag || '—')}</span>
          <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(i.title || '—')}</span>
          <span style="font-size:10px;color:${statusColor};border:1px solid ${statusColor}44;background:${statusColor}22;padding:1px 6px;border-radius:99px">${escHtml(i.status || 'open')}</span>
        </div>`;
      }).join('');
    }
    renderPickerList('');
    document.getElementById('st-issue-picker-search')?.addEventListener('input', e => renderPickerList(e.target.value));
    document.getElementById('st-issue-picker-search')?.focus();
  };

  window.stLinkIssue = async (ticketId, orderId, issueId) => {
    try {
      const link = await API.issueLineLinks.create(ticketId, { issue_id: issueId, order_id: orderId });
      lineLinks.push(link);
      lineLinkMap = buildLineLinkMap();
      document.getElementById('st-issue-picker')?.remove();
      render();
      toast('Issue linked');
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  window.importXmlTickets = async (input) => {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    toast('Importing XML…');

    try {
      const token = getAuthToken ? getAuthToken() : null;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/service-tickets/import-xml', {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();

      // Show result modal
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
      const actionColor = { created: '#16a34a', updated: '#2563eb', skipped: '#6b7280' };
      const rows = result.tickets.map(t => `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:6px 8px;font-family:monospace;font-size:11px">${escHtml(t.request_id)}</td>
          <td style="padding:6px 8px;font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.title)}</td>
          <td style="padding:6px 8px;font-size:11px;color:var(--text3)">${escHtml(t.site_name || '—')}</td>
          <td style="padding:6px 8px;font-size:11px;color:var(--text3)">${escHtml(t.serial_number || '—')}</td>
          <td style="padding:6px 8px">
            <span style="background:${actionColor[t.action] || '#6b7280'}22;color:${actionColor[t.action] || '#6b7280'};border:1px solid ${actionColor[t.action] || '#6b7280'}44;border-radius:99px;padding:1px 8px;font-size:10px;font-weight:600">${t.action}</span>
          </td>
        </tr>`).join('');

      modal.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:780px;width:100%;max-height:85vh;overflow-y:auto">
          <div style="font-size:16px;font-weight:700;margin-bottom:4px">Import Complete</div>
          <div style="font-size:13px;color:var(--text3);margin-bottom:16px">
            ${result.total} tickets processed from <strong>${escHtml(file.name)}</strong> ·
            <span style="color:#16a34a">${result.created} created</span> ·
            <span style="color:#2563eb">${result.updated} updated</span>
            ${result.unmatched ? ` · <span style="color:#d97706">${result.unmatched} unmatched site</span>` : ''}
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)">
                <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3)">Request ID</th>
                <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3)">Title</th>
                <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3)">Site</th>
                <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3)">Serial</th>
                <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3)">Action</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:16px">
            <button class="btn btn-primary" onclick="this.closest('[style*=fixed]').remove();renderServiceTickets(document.getElementById('page-container'))">Done</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) { modal.remove(); renderServiceTickets(document.getElementById('page-container')); } });
    } catch (e) {
      toast('Import failed: ' + e.message, 'error');
    }
  };

  render();
}
