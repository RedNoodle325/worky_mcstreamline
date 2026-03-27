// ── Schedule / Dispatch Page ───────────────────────────────────────────────

async function renderSchedule(params = {}) {
  const container = document.getElementById('page-container');

  container.innerHTML = `
    <style>
      .schedule-layout {
        display: grid;
        grid-template-columns: 380px 1fr;
        gap: 20px;
        align-items: start;
      }
      .job-queue-panel {
        background: var(--bg2);
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
      }
      .assignment-panel {
        background: var(--bg2);
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
        position: sticky;
        top: 16px;
      }
      .panel-header {
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .panel-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
      }
      .filter-tabs {
        display: flex;
        gap: 0;
        border-bottom: 1px solid var(--border);
        padding: 0 16px;
        background: var(--bg);
      }
      .filter-tab {
        padding: 8px 12px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text3);
        cursor: pointer;
        border: none;
        background: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: color .15s, border-color .15s;
        white-space: nowrap;
      }
      .filter-tab.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
      }
      .filter-tab:hover:not(.active) { color: var(--text2); }
      .job-list {
        overflow-y: auto;
        max-height: calc(100vh - 200px);
      }
      .job-card {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        transition: background .12s;
        border-left: 3px solid transparent;
      }
      .job-card:hover { background: var(--bg3, var(--bg)); }
      .job-card.selected {
        background: var(--accent)11;
        border-left-color: var(--accent);
      }
      .job-card-top {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
        flex-wrap: wrap;
      }
      .job-card-name {
        font-weight: 700;
        font-size: 13px;
        color: var(--text);
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .job-card-site {
        font-size: 11px;
        color: var(--text3);
        margin-bottom: 5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .job-card-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        font-size: 11px;
        color: var(--text3);
      }
      .pri-badge {
        font-size: 9px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
        letter-spacing: .04em;
        text-transform: uppercase;
        flex-shrink: 0;
      }
      .type-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 99px;
        white-space: nowrap;
      }
      .pm-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--accent);
        color: #fff;
        font-size: 9px;
        font-weight: 800;
        flex-shrink: 0;
      }
      .assign-section-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: var(--text3);
        padding: 12px 16px 6px;
      }
      .tech-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--border);
        transition: background .1s;
      }
      .tech-row:hover { background: var(--bg3, var(--bg)); }
      .avail-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .dist-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 99px;
        background: var(--bg);
        border: 1px solid var(--border);
        color: var(--text2);
        white-space: nowrap;
      }
      .empty-state {
        padding: 60px 24px;
        text-align: center;
        color: var(--text3);
      }
      .empty-state-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }
      .empty-state-msg {
        font-size: 13px;
        font-weight: 600;
      }
      .empty-state-sub {
        font-size: 11px;
        margin-top: 6px;
        color: var(--text3);
      }
      .tech-search {
        padding: 8px 16px;
        border-bottom: 1px solid var(--border);
      }
      .tech-search input {
        width: 100%;
        padding: 7px 10px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-size: 12px;
      }
      .tech-list {
        overflow-y: auto;
        max-height: 420px;
      }
      .assigned-list {
        min-height: 40px;
      }
      .no-assigned {
        padding: 12px 16px;
        font-size: 12px;
        color: var(--text3);
        font-style: italic;
      }
      @media (max-width: 900px) {
        .schedule-layout {
          grid-template-columns: 1fr;
        }
        .assignment-panel { position: static; }
      }
    </style>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);gap:16px;flex-wrap:wrap">
      <div>
        <h1 style="margin:0;font-size:22px;font-weight:700;color:var(--text)">Schedule</h1>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">Dispatch &amp; Job Assignment</div>
      </div>
      <span class="edit-ui">
        <button class="btn btn-primary" id="sched-new-job-btn">+ New Job</button>
      </span>
    </div>

    <div class="schedule-layout">
      <!-- Left: Job Queue -->
      <div class="job-queue-panel">
        <div class="panel-header">
          <span class="panel-title">Job Queue</span>
          <span id="sched-job-count" style="font-size:11px;color:var(--text3)">Loading…</span>
        </div>
        <div class="filter-tabs" id="sched-filter-tabs">
          <button class="filter-tab active" data-filter="all">All</button>
          <button class="filter-tab" data-filter="this_week">This Week</button>
          <button class="filter-tab" data-filter="next_week">Next Week</button>
          <button class="filter-tab" data-filter="upcoming">Upcoming</button>
        </div>
        <div class="job-list" id="sched-job-list">
          <div style="padding:40px;text-align:center;color:var(--text3);font-size:13px">Loading jobs…</div>
        </div>
      </div>

      <!-- Right: Assignment Panel -->
      <div class="assignment-panel" id="sched-assign-panel">
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-msg">Select a job to assign technicians</div>
          <div class="empty-state-sub">Click any job in the queue to manage assignments</div>
        </div>
      </div>
    </div>`;

  // ── State ────────────────────────────────────────────────────────────────
  let allJobs = [];
  let allSites = [];
  let allTechs = [];
  let allUsers = [];
  let selectedJobId = null;
  let assignedTechs = [];
  let techsForSite = [];
  let techSearchQuery = '';
  let techVisibleCount = 20;
  let activeFilter = 'all';

  // ── Priority config ──────────────────────────────────────────────────────
  const PRI_CONFIG = {
    1: { label: 'CRITICAL', bg: '#dc2626', color: '#fff' },
    2: { label: 'HIGH',     bg: '#ea580c', color: '#fff' },
    3: { label: 'MEDIUM',   bg: '#2563eb', color: '#fff' },
    4: { label: 'LOW',      bg: '#6b7280', color: '#fff' },
    5: { label: 'BACKLOG',  bg: '#374151', color: '#9ca3af' },
  };

  const TYPE_CONFIG = {
    'PM Warranty':          { bg: '#dcfce7', color: '#16a34a' },
    'EXT Warranty':         { bg: '#bbf7d0', color: '#15803d' },
    'Startup':              { bg: '#dbeafe', color: '#1d4ed8' },
    'Startup and Warranty': { bg: '#ede9fe', color: '#7c3aed' },
    'Billable':             { bg: '#fef9c3', color: '#a16207' },
    'Special Project':      { bg: '#fce7f3', color: '#be185d' },
    'Sales Concession':     { bg: '#ffedd5', color: '#c2410c' },
    'Training':             { bg: '#e0f2fe', color: '#0369a1' },
    'Pre-startup':          { bg: '#f0fdf4', color: '#166534' },
    'Weekend Support':      { bg: '#fdf4ff', color: '#7e22ce' },
  };

  const STATUS_CONFIG = {
    scheduled:   { label: 'Scheduled',   color: '#2563eb' },
    in_progress: { label: 'In Progress', color: '#d97706' },
    complete:    { label: 'Complete',    color: '#16a34a' },
    cancelled:   { label: 'Cancelled',   color: '#6b7280' },
  };

  // ── Week helpers ─────────────────────────────────────────────────────────
  function getWeekBounds(offsetWeeks = 0) {
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day + 6) % 7) + offsetWeeks * 7);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return { start: mon, end: sun };
  }

  function filterJobs(jobs, filter) {
    if (filter === 'all') return jobs;
    const now = new Date();
    if (filter === 'this_week') {
      const { start, end } = getWeekBounds(0);
      return jobs.filter(j => {
        const d = j.start_date ? new Date(j.start_date) : null;
        return d && d >= start && d <= end;
      });
    }
    if (filter === 'next_week') {
      const { start, end } = getWeekBounds(1);
      return jobs.filter(j => {
        const d = j.start_date ? new Date(j.start_date) : null;
        return d && d >= start && d <= end;
      });
    }
    if (filter === 'upcoming') {
      const { end } = getWeekBounds(1);
      return jobs.filter(j => {
        const d = j.start_date ? new Date(j.start_date) : null;
        return d && d > end;
      });
    }
    return jobs;
  }

  function sortJobs(jobs) {
    return [...jobs].sort((a, b) => {
      const pa = a.priority || 5, pb = b.priority || 5;
      if (pa !== pb) return pa - pb;
      const da = a.start_date || '', db = b.start_date || '';
      return da < db ? -1 : da > db ? 1 : 0;
    });
  }

  // ── Render helpers ───────────────────────────────────────────────────────
  function fmtDateShort(dt) {
    if (!dt) return '—';
    return new Date(dt + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function pmInitials(userId) {
    const u = allUsers.find(u => u.id === userId);
    if (!u) return '?';
    const parts = (u.name || u.username || '?').split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (u.name || u.username || '?').slice(0, 2).toUpperCase();
  }

  function renderJobCard(job) {
    const site = allSites.find(s => s.id === job.site_id);
    const siteName = site ? escHtml(site.name) : '<span style="color:var(--text3)">Unknown Site</span>';
    const pri = PRI_CONFIG[job.priority] || PRI_CONFIG[5];
    const typeCfg = TYPE_CONFIG[job.job_type] || { bg: '#e5e7eb', color: '#374151' };
    const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
    const selected = job.id === selectedJobId;
    const techCount = job._techCount || 0;

    return `<div class="job-card${selected ? ' selected' : ''}"
      onclick="schedSelectJob('${job.id}')"
      data-job-id="${job.id}">
      <div class="job-card-top">
        <span class="pri-badge" style="background:${pri.bg};color:${pri.color}">${pri.label}</span>
        <span class="job-card-name">${escHtml(job.job_name || job.name || 'Untitled Job')}</span>
        <span class="edit-ui" onclick="event.stopPropagation();schedOpenJobModal('${job.id}')"
          style="cursor:pointer;color:var(--text3);font-size:14px;padding:0 2px;line-height:1" title="Edit job">✏</span>
      </div>
      <div class="job-card-site">${siteName}</div>
      <div class="job-card-meta">
        ${job.job_type ? `<span class="type-badge" style="background:${typeCfg.bg};color:${typeCfg.color}">${escHtml(job.job_type)}</span>` : ''}
        <span style="background:${statusCfg.color}22;color:${statusCfg.color};border:1px solid ${statusCfg.color}44;font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px">${statusCfg.label}</span>
        <span style="flex:1"></span>
        ${job.start_date ? `<span>${fmtDateShort(job.start_date)}${job.end_date ? ' → ' + fmtDateShort(job.end_date) : ''}</span>` : ''}
        ${job.pm_user_id ? `<span class="pm-badge" title="PM">${escHtml(pmInitials(job.pm_user_id))}</span>` : ''}
        ${techCount > 0 ? `<span style="font-size:10px;color:var(--text3)">${techCount} tech${techCount !== 1 ? 's' : ''}</span>` : ''}
      </div>
    </div>`;
  }

  function renderJobList() {
    const el = document.getElementById('sched-job-list');
    const jobs = sortJobs(filterJobs(allJobs, activeFilter));

    document.getElementById('sched-job-count').textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;

    if (!jobs.length) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-msg">No jobs${activeFilter !== 'all' ? ' in this period' : ''}</div>
        <div class="empty-state-sub">Add a job with the "+ New Job" button</div>
      </div>`;
      return;
    }
    el.innerHTML = jobs.map(renderJobCard).join('');
  }

  // ── Assignment panel ─────────────────────────────────────────────────────
  function renderAssignmentPanel() {
    const panel = document.getElementById('sched-assign-panel');
    if (!selectedJobId) {
      panel.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-msg">Select a job to assign technicians</div>
        <div class="empty-state-sub">Click any job in the queue to manage assignments</div>
      </div>`;
      return;
    }

    const job = allJobs.find(j => j.id === selectedJobId);
    if (!job) { panel.innerHTML = '<div class="empty-state"><div class="empty-state-msg">Job not found</div></div>'; return; }

    const site = allSites.find(s => s.id === job.site_id);

    // Filter available techs
    const assignedIds = new Set(assignedTechs.map(t => t.technician_id || t.id));

    let filteredAvail = techsForSite.filter(t => !assignedIds.has(t.id));
    if (techSearchQuery) {
      const q = techSearchQuery.toLowerCase();
      filteredAvail = filteredAvail.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.city || '').toLowerCase().includes(q) ||
        (t.state || '').toLowerCase().includes(q)
      );
    }
    const visibleTechs = filteredAvail.slice(0, techVisibleCount);
    const hasMore = filteredAvail.length > techVisibleCount;

    const assignedHtml = assignedTechs.length
      ? assignedTechs.map(at => {
          // Find the full tech record
          const tech = allTechs.find(t => t.id === (at.technician_id || at.id)) || at;
          const loc = [tech.city, tech.state].filter(Boolean).join(', ') || '—';
          return `<div class="tech-row">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:12px;color:var(--text)">${escHtml(tech.name || '—')}</div>
              <div style="font-size:10px;color:var(--text3)">${escHtml(loc)}</div>
            </div>
            <button class="btn btn-sm edit-ui" onclick="schedRemoveTech('${at.id || at.technician_id}')"
              style="color:var(--red);border-color:var(--red);background:transparent;padding:2px 8px;font-size:11px"
              title="Remove">×</button>
          </div>`;
        }).join('')
      : `<div class="no-assigned">No technicians assigned yet</div>`;

    const availHtml = visibleTechs.map(tech => {
      const loc = [tech.city, tech.state].filter(Boolean).join(', ') || '—';
      const hasLoc = tech.latitude != null && tech.longitude != null;
      const dist = tech._distance;
      const dotColor = !hasLoc ? '#6b7280' : (dist != null && dist < 200) ? '#22c55e' : '#eab308';
      const distLabel = dist != null ? `${Math.round(dist)} mi` : '—';

      return `<div class="tech-row">
        <span class="avail-dot" style="background:${dotColor}" title="${!hasLoc ? 'No location data' : dist != null && dist < 200 ? 'Available' : 'Check schedule'}"></span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:12px;color:var(--text)">${escHtml(tech.name || '—')}</div>
          <div style="font-size:10px;color:var(--text3)">${escHtml(loc)}</div>
        </div>
        <span class="dist-badge">${distLabel}</span>
        <button class="btn btn-sm btn-primary edit-ui" onclick="schedAssignTech('${tech.id}')"
          style="padding:3px 10px;font-size:11px">+ Assign</button>
      </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${escHtml(job.job_name || job.name || 'Job')}</div>
          ${site ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">${escHtml(site.name)}</div>` : ''}
        </div>
        <button class="btn btn-sm btn-secondary edit-ui" onclick="schedOpenJobModal('${job.id}')" style="font-size:11px">✏ Edit</button>
      </div>

      <div class="assign-section-title">Assigned Techs (${assignedTechs.length})</div>
      <div class="assigned-list" id="sched-assigned-list">${assignedHtml}</div>

      <div class="assign-section-title" style="padding-top:16px;display:flex;align-items:center;justify-content:space-between">
        <span>Available Technicians</span>
        <span style="font-size:10px;color:var(--text3);font-weight:400;text-transform:none;letter-spacing:0">${filteredAvail.length} found</span>
      </div>
      <div class="tech-search">
        <input id="sched-tech-search" placeholder="Search by name or location…" value="${escHtml(techSearchQuery)}" />
      </div>
      <div class="tech-list" id="sched-tech-list">
        ${availHtml || '<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px">No available technicians found</div>'}
        ${hasMore ? `<div style="padding:10px;text-align:center"><button class="btn btn-secondary btn-sm" onclick="schedLoadMoreTechs()" style="font-size:11px">Load ${Math.min(20, filteredAvail.length - techVisibleCount)} more…</button></div>` : ''}
      </div>`;

    document.getElementById('sched-tech-search')?.addEventListener('input', e => {
      techSearchQuery = e.target.value;
      techVisibleCount = 20;
      renderAssignmentPanel();
    });
  }

  // ── Exposed globals ──────────────────────────────────────────────────────
  window.schedSelectJob = async (jobId) => {
    selectedJobId = jobId;
    techSearchQuery = '';
    techVisibleCount = 20;
    renderJobList();

    const job = allJobs.find(j => j.id === jobId);

    // Load assigned techs + techs sorted by distance for this site
    try {
      const [assigned, siteTechs] = await Promise.all([
        API.schedule.listJobTechs(jobId).catch(() => []),
        job?.site_id
          ? API.schedule.techsForSite(job.site_id).catch(() => allTechs)
          : Promise.resolve(allTechs),
      ]);
      assignedTechs = assigned;
      techsForSite = siteTechs;
    } catch (e) {
      assignedTechs = [];
      techsForSite = allTechs;
    }

    renderAssignmentPanel();
  };

  window.schedRemoveTech = async (assignmentId) => {
    if (!selectedJobId) return;
    try {
      await API.schedule.removeTech(selectedJobId, assignmentId);
      toast('Technician removed');
      // Reload assigned
      assignedTechs = await API.schedule.listJobTechs(selectedJobId).catch(() => []);
      // Update tech count on job
      const job = allJobs.find(j => j.id === selectedJobId);
      if (job) job._techCount = assignedTechs.length;
      renderJobList();
      renderAssignmentPanel();
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  };

  window.schedAssignTech = async (techId) => {
    if (!selectedJobId) return;
    try {
      await API.schedule.assignTech(selectedJobId, techId);
      toast('Technician assigned');
      assignedTechs = await API.schedule.listJobTechs(selectedJobId).catch(() => []);
      const job = allJobs.find(j => j.id === selectedJobId);
      if (job) job._techCount = assignedTechs.length;
      renderJobList();
      renderAssignmentPanel();
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  };

  window.schedLoadMoreTechs = () => {
    techVisibleCount += 20;
    renderAssignmentPanel();
  };

  // ── Job Modal ────────────────────────────────────────────────────────────
  window.schedOpenJobModal = (jobId = null) => {
    const job = jobId ? allJobs.find(j => j.id === jobId) : null;
    const isEdit = !!job;
    const title = isEdit ? 'Edit Job' : 'New Job';

    const siteOptions = allSites.map(s =>
      `<option value="${s.id}"${job?.site_id === s.id ? ' selected' : ''}>${escHtml(s.name)}</option>`
    ).join('');

    const pmOptions = allUsers.map(u =>
      `<option value="${u.id}"${job?.pm_user_id === u.id ? ' selected' : ''}>${escHtml(u.name || u.username || u.email || String(u.id))}</option>`
    ).join('');

    const JOB_TYPES = ['PM Warranty', 'EXT Warranty', 'Startup', 'Startup and Warranty', 'Billable', 'Special Project', 'Sales Concession', 'Training', 'Pre-startup', 'Weekend Support'];
    const typeOptions = JOB_TYPES.map(t =>
      `<option value="${t}"${job?.job_type === t ? ' selected' : ''}>${t}</option>`
    ).join('');

    const priorityOptions = [
      ['1','1 — Critical'],['2','2 — High'],['3','3 — Medium'],['4','4 — Low'],['5','5 — Backlog']
    ].map(([v, l]) =>
      `<option value="${v}"${String(job?.priority) === v ? ' selected' : ''}>${l}</option>`
    ).join('');

    const statusOptions = [
      ['scheduled','Scheduled'],['in_progress','In Progress'],['complete','Complete'],['cancelled','Cancelled']
    ].map(([v, l]) =>
      `<option value="${v}"${job?.status === v ? ' selected' : ''}>${l}</option>`
    ).join('');

    const fld = (label, html) => `<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:600;color:var(--text2);margin-bottom:4px">${label}</label>${html}</div>`;
    const inp = (name, val, placeholder = '', required = false) =>
      `<input name="${name}" value="${escHtml(val || '')}" placeholder="${placeholder}"${required ? ' required' : ''}
       style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px" />`;
    const sel = (name, opts, extra = '') =>
      `<select name="${name}" ${extra} style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px"><option value="">—</option>${opts}</select>`;

    const formHtml = `
      <form id="sched-job-form" style="max-height:70vh;overflow-y:auto;padding-right:4px">
        ${fld('Job Name *', inp('name', job?.job_name || job?.name, 'Enter job name', true))}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${fld('Site', sel('site_id', siteOptions))}
          ${fld('Job Type', sel('job_type', typeOptions))}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${fld('Priority', sel('priority', priorityOptions))}
          ${fld('Status', sel('status', statusOptions))}
        </div>
        ${fld('Contract Number', inp('contract_number', job?.contract_number, 'e.g. C-12345'))}
        ${fld('PM', sel('pm_user_id', pmOptions))}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${fld('Start Date', `<input name="start_date" type="date" value="${job?.start_date || ''}" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px" />`)}
          ${fld('End Date', `<input name="end_date" type="date" value="${job?.end_date || ''}" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px" />`)}
        </div>
        ${fld('Notes', `<textarea name="notes" rows="3" placeholder="Optional notes…" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;resize:vertical">${escHtml(job?.notes || '')}</textarea>`)}
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;gap:8px">
          ${isEdit ? `<button type="button" class="btn btn-sm edit-ui" onclick="schedDeleteJob('${job.id}')" style="color:var(--red);border-color:var(--red);background:transparent">Delete Job</button>` : '<span></span>'}
          <div style="display:flex;gap:8px">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Job'}</button>
          </div>
        </div>
      </form>`;

    openModal(title, formHtml, async (form) => {
      const fd = new FormData(form);
      const data = {};
      fd.forEach((v, k) => { data[k] = v === '' ? null : v; });
      if (data.name !== undefined) { data.job_name = data.name; delete data.name; }
      if (data.priority) data.priority = parseInt(data.priority, 10);

      try {
        if (isEdit) {
          await API.schedule.updateJob(job.id, data);
          toast('Job updated');
        } else {
          await API.schedule.createJob(data);
          toast('Job created');
        }
        closeModal();
        await loadJobs();
      } catch (e) {
        toast('Error: ' + e.message, 'error');
      }
    });
  };

  window.schedDeleteJob = async (jobId) => {
    if (!confirm('Delete this job? This cannot be undone.')) return;
    try {
      await API.schedule.deleteJob(jobId);
      toast('Job deleted');
      closeModal();
      if (selectedJobId === jobId) {
        selectedJobId = null;
        techsForSite = [];
        assignedTechs = [];
      }
      await loadJobs();
      renderAssignmentPanel();
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  };

  // ── Load data ─────────────────────────────────────────────────────────────
  async function loadJobs() {
    try {
      allJobs = await API.schedule.listJobs().catch(() => []);
      renderJobList();
      // If a job is still selected, re-render assignment panel (tech count may have changed)
      if (selectedJobId) renderAssignmentPanel();
    } catch (e) {
      toast('Failed to load jobs: ' + e.message, 'error');
      document.getElementById('sched-job-list').innerHTML =
        '<div style="padding:24px;text-align:center;color:var(--text3)">Failed to load jobs</div>';
    }
  }

  // ── Filter tabs ───────────────────────────────────────────────────────────
  document.getElementById('sched-filter-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    activeFilter = tab.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t === tab));
    renderJobList();
  });

  // ── New job button ────────────────────────────────────────────────────────
  document.getElementById('sched-new-job-btn')?.addEventListener('click', () => schedOpenJobModal(null));

  // ── Initial load ──────────────────────────────────────────────────────────
  try {
    [allSites, allTechs, allUsers] = await Promise.all([
      API.sites.list().catch(() => []),
      API.technicians.list().catch(() => []),
      API.users.list().catch(() => []),
    ]);
  } catch (e) {
    // non-fatal — continue with empty arrays
  }

  await loadJobs();
}
