const BASE = "http://localhost:3000";

export const EXTRA_STYLES = `
  .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem; }
  .page-actions { display:flex; gap:0.5rem; margin-left:auto; }
  .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1rem; }
  .stat-title { font-size:0.875rem; font-weight:500; }
  .stat-value-row { display:flex; align-items:center; padding-top:0.5rem; }
  .stat-value { font-size:1.875rem; font-weight:700; color:#334155; }
  .stat-icon { width:32px; height:32px; color:#475569; margin-left:0.5rem; flex-shrink:0; }
  .stat-icon-warn { color:#F9AB72; }
  .stat-icon-active { color:#3DD9B3; }
  .stat-sub { font-size:0.75rem; color:#64748b; margin-top:0.25rem; }
  .stat-expiring-breakdown { display:flex; align-items:center; justify-content:space-between; gap:0.5rem; font-size:0.75rem; color:#64748b; margin-top:0.5rem; }
  .contracts-status-tabs { padding-top:2.35rem; }
  .glass-card { position:relative; border-radius:0.5rem; overflow:hidden; background:rgba(255,255,255,0.55); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.5); box-shadow:0 8px 32px rgba(31,38,135,0.15); }
  .glass-card-cap { position:absolute; top:0; left:0; right:0; height:1rem; background:#d6d7d8; opacity:0.7; }
  .card-body { padding:1rem 1.25rem; padding-top:1.45rem; }
  .card-title { font-size:1.125rem; font-weight:700; margin-bottom:0.75rem; }
  .approval-item { background:rgba(255,255,255,0.2); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.3); border-radius:0.5rem; padding:0.75rem; margin-bottom:0.65rem; }
  .approval-top { display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.25rem; }
  .approval-type { font-weight:500; color:#334155; font-size:0.875rem; }
  .review-btn { height:28px; padding:0 0.75rem; border:1px solid #e2e8f0; border-radius:0.375rem; background:#fff; font-size:0.75rem; color:#334155; font-weight:500; white-space:nowrap; }
  .approval-meta { font-size:0.8125rem; color:#64748b; }
  .approval-meta-xs { font-size:0.75rem; color:#64748b; margin-top:0.15rem; }
  .inbox-btn { display:flex; align-items:center; justify-content:center; width:100%; height:40px; border:none; border-radius:9999px; color:#fff; font-weight:600; font-size:0.875rem; background-image:linear-gradient(to right,#00c1cb,#078fab,#0e638f,#11487d,#162768); margin-top:0.5rem; }
  .dash-greeting { font-size:1.25rem; font-weight:700; margin-bottom:1rem; }
  .dash-greeting span { color:#64748b; font-weight:400; font-size:1rem; }
  .status-tabs { display:flex; flex-wrap:wrap; gap:0.25rem; padding:1.65rem 1rem 0.75rem; background:rgba(241,245,249,0.8); border-bottom:1px solid rgba(226,232,240,0.8); }
  .status-tab { flex:1; min-width:4.5rem; text-align:center; padding:0.5rem 0.35rem; font-size:0.75rem; border-radius:0.375rem; color:#64748b; }
  .status-tab.active { background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.06); font-weight:600; }
  .status-tab .count { color:#64748b; font-weight:400; margin-left:0.15rem; }
  .toolbar-row { display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; justify-content:space-between; padding:0.75rem 1rem; }
  .cta-left { flex:1; min-width:12rem; max-width:18rem; }
  .cta-search { width:100%; height:40px; border:1px solid #e2e8f0; border-radius:0.375rem; padding:0 0.75rem 0 2.25rem; font-size:0.875rem; background:#fff url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2394a3b8" stroke-width="2"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>') 0.75rem center no-repeat; color:#334155; }
  .cta-right { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-left:auto; }
  .filter-btn-gradient { display:inline-flex; align-items:center; gap:0.35rem; height:40px; padding:0 1rem; border:none; border-radius:9999px; color:#fff; font-size:0.875rem; font-weight:600; background-image:linear-gradient(to right,#00c1cb,#078fab,#0e638f,#11487d,#162768); box-shadow:0 4px 6px rgba(0,0,0,0.1); }
  .views-btn { display:inline-flex; align-items:center; gap:0.35rem; height:40px; padding:0 0.75rem; border:1px solid #e2e8f0; border-radius:0.375rem; background:#fff; font-size:0.875rem; color:#334155; }
  .sort-select { display:inline-flex; align-items:center; justify-content:space-between; gap:0.5rem; height:40px; min-width:11.5rem; padding:0 0.75rem; border:1px solid #e2e8f0; border-radius:0.375rem; background:#fff; font-size:0.8125rem; color:#334155; }
  .view-toggle { display:inline-flex; align-items:center; border:2px solid #e2e8f0; border-radius:0.5rem; background:#fff; padding:0.15rem; height:40px; box-shadow:0 1px 2px rgba(0,0,0,0.05); }
  .view-toggle-btn { width:36px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:0.375rem; color:#64748b; border:none; background:transparent; }
  .view-toggle-btn.active { background:#03afbf; color:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.12); }
  .file-thumb { width:32px; height:32px; min-width:32px; min-height:32px; flex-shrink:0; display:block; object-fit:contain; }
  .data-table { width:100%; border-collapse:collapse; font-size:0.8125rem; }
  .data-table th { text-align:left; padding:0.65rem 1rem; color:#64748b; font-weight:500; border-bottom:1px solid #e2e8f0; background:rgba(248,250,252,0.8); }
  .data-table td { padding:0.75rem 1rem; border-bottom:1px solid #f1f5f9; color:#334155; vertical-align:middle; }
  .data-table tr:last-child td { border-bottom:none; }
  .pill { display:inline-flex; align-items:center; padding:0.125rem 0.5rem; border-radius:9999px; font-size:0.6875rem; font-weight:600; }
  .pill-pending { background:rgba(245,158,11,0.15); color:#d97706; }
  .pill-active { background:rgba(61,217,179,0.15); color:#059669; }
  .pill-expired { background:rgba(239,68,68,0.12); color:#dc2626; }
  .pill-gray { background:#f1f5f9; color:#64748b; }
  .file-name { display:flex; align-items:center; gap:0.5rem; font-weight:500; }
  .file-icon { width:28px; height:28px; border-radius:0.375rem; background:rgba(15,83,132,0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#0f5384; font-size:0.625rem; font-weight:700; }
  .table-footer { display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; font-size:0.75rem; color:#64748b; border-top:1px solid #e2e8f0; flex-wrap:wrap; gap:0.5rem; }
  .pagination { display:flex; align-items:center; gap:0.25rem; }
  .page-num { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:0.375rem; border:1px solid #e2e8f0; font-size:0.75rem; }
  .page-num.active { background:#0f5384; color:#fff; border-color:#0f5384; }
  .calendar-shell { display:flex; height:100%; min-height:0; gap:0; }
  .cal-sidebar { width:242px; flex-shrink:0; border-right:1px solid #e2e8f0; background:rgba(255,255,255,0.5); display:flex; flex-direction:column; overflow:hidden; min-height:0; }
  .cal-sidebar-scroll { flex:1; overflow:hidden; padding:0.75rem 1rem; display:flex; flex-direction:column; gap:1rem; min-height:0; }
  .mini-cal { border:1px solid #e2e8f0; border-radius:0.5rem; background:rgba(255,255,255,0.8); padding:0.5rem 0.35rem; }
  .mini-cal-head { display:flex; justify-content:space-between; align-items:center; font-size:0.8125rem; font-weight:600; margin-bottom:0.5rem; color:#334155; padding:0 0.15rem; }
  .mini-cal-head button { border:none; background:transparent; color:#64748b; font-size:0.875rem; line-height:1; padding:0 0.15rem; cursor:pointer; }
  .mini-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; text-align:center; font-size:0.6875rem; }
  .mini-grid .dow { color:#64748b; padding:0.15rem 0; font-weight:500; font-size:0.625rem; }
  .mini-grid .day { padding:0.18rem 0; border-radius:9999px; color:#334155; }
  .mini-grid .day.out { color:#9ca3af; }
  .mini-grid .day.sel { background:linear-gradient(135deg,#12477d,#03afbf); color:#fff; font-weight:600; }
  .cal-section-head { display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom:0.5rem; border:none; background:transparent; padding:0; cursor:pointer; }
  .cal-section-head span { font-size:0.875rem; font-weight:500; }
  .cal-section-head svg { width:16px; height:16px; color:#64748b; flex-shrink:0; }
  .cal-cal-row { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem; margin-left:0.25rem; }
  .cal-round-check { width:16px; height:16px; border-radius:9999px; border:1px solid #cbd5e1; background:#fff; flex-shrink:0; position:relative; }
  .cal-round-check.checked { background:#00c1cb; border-color:#00c1cb; }
  .cal-round-check.checked::after { content:''; position:absolute; left:5px; top:2px; width:4px; height:7px; border:solid #fff; border-width:0 2px 2px 0; transform:rotate(45deg); }
  .cal-dot { width:8px; height:8px; border-radius:9999px; flex-shrink:0; }
  .cal-cal-label { font-size:0.75rem; color:#334155; line-height:1.2; }
  .cal-empty { font-size:0.875rem; color:#64748b; margin-left:0.25rem; }
  .cal-manage { margin-top:auto; border-top:1px solid #e2e8f0; padding:0.75rem; background:rgba(248,250,252,0.8); display:flex; flex-direction:column; gap:0.5rem; flex-shrink:0; }
  .cal-manage-title { font-size:0.75rem; font-weight:500; margin-bottom:0.15rem; }
  .cal-manage-btn { display:flex; align-items:center; gap:0.35rem; width:100%; height:32px; padding:0 0.65rem; border:none; border-radius:9999px; color:#fff; font-size:0.6875rem; font-weight:600; background-image:linear-gradient(to right,#00c1cb,#078fab,#0e638f,#11487d,#162768); justify-content:flex-start; white-space:nowrap; }
  .cal-manage-btn svg { width:14px; height:14px; flex-shrink:0; }
  .cal-main { flex:1; display:flex; flex-direction:column; min-width:0; padding:0.75rem 1rem; }
  .cal-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:0.5rem; margin-bottom:0.75rem; }
  .cal-toolbar .h1 { margin:0; font-size:28px; }
  .cal-nav { display:flex; align-items:center; gap:0.35rem; margin-left:auto; }
  .cal-nav-btn { height:32px; padding:0 0.65rem; border:1px solid #e2e8f0; border-radius:0.375rem; background:#fff; font-size:0.75rem; }
  .view-tabs { display:flex; gap:0.15rem; padding:0.15rem; background:#f1f5f9; border-radius:0.375rem; }
  .view-tab { padding:0.35rem 0.65rem; font-size:0.75rem; border-radius:0.25rem; color:#64748b; }
  .view-tab.active { background:#fff; color:#0f5384; font-weight:600; box-shadow:0 1px 2px rgba(0,0,0,0.06); }
  .month-grid { display:grid; grid-template-columns:repeat(7,1fr); flex:1; border:1px solid #e5e7eb; border-radius:0.5rem; overflow:hidden; min-height:0; background:#fff; }
  .month-grid .dow { background:#f8fafc; padding:0.4rem; text-align:center; font-size:0.6875rem; font-weight:600; color:#64748b; border-bottom:1px solid #e5e7eb; }
  .month-cell { min-height:52px; border:1px solid #e5e7eb; padding:0.35rem 0.4rem; font-size:0.75rem; background:#fff; display:flex; flex-direction:column; }
  .month-cell.out { background:#f9fafb; }
  .month-cell.out .day-num { color:#9ca3af; font-size:0.75rem; font-weight:500; }
  .month-cell.in-month .day-num { color:#0f172a; font-size:0.75rem; font-weight:500; }
  .month-cell.selected { background:#f9fafb; border-color:#93c5fd; }
  .month-cell.today .day-num {
    background:linear-gradient(135deg,#12477d,#03afbf); color:#fff; border-radius:9999px;
    width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:0.75rem;
  }
  .event-chip { margin-top:0.15rem; padding:0.1rem 0.35rem; border-radius:0.25rem; background:linear-gradient(135deg,#12477d,#03afbf); color:#fff; font-size:0.625rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .main-content.flush { padding:0; overflow:hidden; }
  .main-content.flush .page { padding:0; height:100%; display:flex; flex-direction:column; }
`;

const NAV = [
	{
		header: "Dashboard",
		icon: "dashboard.svg",
		items: [
			{ label: "Executive dashboard", icon: "analytics.svg", id: "dash-exec" },
		],
	},
	{
		header: "Calendar",
		icon: "calendar2.svg",
		items: [{ label: "Calendar View", icon: "calendar.svg", id: "cal-view" }],
	},
	{
		header: "Contracts",
		icon: "contracts.svg",
		items: [
			{ label: "All Contracts", icon: "documents.svg", id: "contracts-all" },
			{ label: "My Contracts", icon: "my-contracts.svg", id: "contracts-my" },
			{ label: "Proposals & Approvals", icon: "edit.svg", id: "contracts-approvals" },
		],
	},
	{
		header: "Licenses",
		icon: "license.svg",
		items: [
			{ label: "All Licenses", icon: "license.svg", id: "licenses-all" },
			{ label: "Department Licenses", icon: "department.svg", id: "licenses-dept" },
		],
	},
	{
		header: "Documents",
		icon: "documents.svg",
		items: [
			{ label: "Uploads", icon: "uploads.svg", id: "doc-uploads" },
			{ label: "Images", icon: "images.svg", id: "doc-images" },
			{ label: "Media", icon: "media.svg", id: "doc-media" },
			{ label: "Others", icon: "others.svg", id: "doc-others" },
		],
	},
	{
		header: "Audits",
		icon: "audit.svg",
		items: [
			{ label: "Compliance status", icon: "compliance-status.svg", id: "audit-status" },
			{ label: "Audit logs", icon: "audit-logs.svg", id: "audit-logs" },
		],
	},
	{
		header: "Reports & analytics",
		icon: "reports-analytics.svg",
		items: [
			{ label: "Overview", icon: "analytics.svg", id: "reports-overview" },
			{ label: "Quick view", icon: "analytics.svg", id: "reports-quick" },
		],
	},
];

function navLink(item, activeId) {
	const active = item.id === activeId ? " active" : "";
	return `<li class="nav-item"><span class="tree-v"></span><span class="tree-elbow"></span><a class="nav-link${active}" href="#"><img src="${BASE}/assets/icons/${item.icon}" width="20" height="20" alt="" /><span class="nav-label">${item.label}</span></a></li>`;
}

function sectionIcon(iconFile) {
	if (iconFile === "dashboard.svg") {
		return `<svg class="section-icon" width="22" height="22" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.5167 2.16602H3.74582C2.87467 2.16602 2.16602 2.87467 2.16602 3.74582V7.80832C2.16602 8.67964 2.87467 9.38829 3.74582 9.38829H10.5167C11.388 9.38829 12.0966 8.67964 12.0966 7.80832V3.74582C12.0966 2.87467 11.388 2.16602 10.5167 2.16602ZM10.5167 11.1937H3.74582C2.87467 11.1937 2.16602 11.9024 2.16602 12.7737V22.2529C2.16602 23.124 2.87467 23.8327 3.74582 23.8327H10.5167C11.388 23.8327 12.0966 23.124 12.0966 22.2529V12.7737C12.0966 11.9024 11.388 11.1937 10.5167 11.1937ZM22.2529 16.6104H15.482C14.6107 16.6104 13.9021 17.3191 13.9021 18.1904V22.2529C13.9021 23.124 14.6107 23.8327 15.482 23.8327H22.2529C23.124 23.8327 23.8327 23.124 23.8327 22.2529V18.1904C23.8327 17.3191 23.124 16.6104 22.2529 16.6104ZM22.2529 2.16602H15.482C14.6107 2.16602 13.9021 2.87467 13.9021 3.74582V13.225C13.9021 14.0963 14.6107 14.805 15.482 14.805H22.2529C23.124 14.805 23.8327 14.0963 23.8327 13.225V3.74582C23.8327 2.87467 23.124 2.16602 22.2529 2.16602Z" fill="#03AFBF"/></svg>`;
	}
	return `<img src="${BASE}/assets/icons/${iconFile}" width="22" height="22" alt="" />`;
}

function renderSidebar(activeId) {
	const sections = NAV.map(
		(section) => `
    <li class="nav-section">
      <div class="section-head">
        ${sectionIcon(section.icon)}
        <span class="section-title sidebar-gradient-text">${section.header}</span>
      </div>
      <ul class="nav-tree">${section.items.map((i) => navLink(i, activeId)).join("")}</ul>
    </li>`,
	).join("");
	return sections;
}

function renderHeader() {
	return `
    <div class="header-row">
      <div class="quick-actions">
        <button class="primary-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload Contract</button>
        <button class="primary-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload License</button>
        <button class="primary-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Audit</button>
        <button class="primary-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Schedule</button>
        <button class="primary-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>Report</button>
      </div>
      <header class="header-pill">
        <div class="header-pill-inner">
          <img class="avatar" src="${BASE}/assets/images/3.png" alt="Profile" />
          <button class="icon-btn" type="button" aria-label="Notifications"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><span class="badge">3</span></button>
          <button class="icon-btn" type="button" aria-label="Messages"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v12H5.17L4 17.17V4z"/><path d="m22 6-10 7L2 6"/></svg></button>
          <button class="icon-btn" type="button" aria-label="Log out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
        </div>
      </header>
    </div>`;
}

export function renderDemoPage({ title, activeNav, content, flush = false }) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1440, initial-scale=1" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Inter,system-ui,sans-serif; background:#eef1f5; color:#334155; overflow:hidden; }
    .shell { display:flex; height:900px; width:1440px; overflow:hidden; background:#f8fafc; }
    .sidebar { width:280px; min-width:280px; flex-shrink:0; display:flex; flex-direction:column; padding:1.75rem 1.25rem 1rem; overflow:hidden; background:#fff; }
    .sidebar-gradient-text { background:linear-gradient(135deg,#12477d 0%,#03afbf 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .logo-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; }
    .logo-link { display:flex; align-items:center; gap:0.5rem; text-decoration:none; }
    .dashboard-logo img { width:32px; height:32px; }
    .logo-text { font-size:1.125rem; font-weight:700; }
    .collapse-btn { width:28px; height:28px; border-radius:0.375rem; border:1px solid #e2e8f0; background:#fff; color:#64748b; display:flex; align-items:center; justify-content:center; }
    .sidebar-nav { flex:1; overflow:hidden; margin-top:0.35rem; }
    .nav-section { margin-bottom:0.35rem; list-style:none; }
    .section-head { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.15rem; }
    .section-head img { width:22px; height:22px; }
    .section-title { font-size:0.875rem; font-weight:600; }
    .nav-tree { position:relative; margin-left:0.75rem; }
    .nav-item { position:relative; display:flex; align-items:center; list-style:none; }
    .tree-v { position:absolute; left:0; top:0; height:24px; width:16px; border-left:1px solid #BFBFBF; }
    .tree-elbow { position:absolute; left:0; top:0; height:16px; width:16px; border-left:1px solid #BFBFBF; border-bottom:1px solid #BFBFBF; border-bottom-left-radius:0.75rem; }
    .nav-link { margin-left:1rem; width:100%; display:flex; align-items:center; gap:0.25rem; border-radius:0.375rem; padding:0.25rem 0.375rem; border:1px solid transparent; text-decoration:none; min-height:28px; }
    .nav-link.active { background:rgba(59,130,246,0.1); border-color:rgba(59,130,246,0.2); }
    .nav-label { font-size:0.75rem; font-weight:500; color:#8E8E8E; padding:0 0.5rem; }
    .nav-link.active .nav-label { color:#0f172a; }
    .sidebar-storage-info { margin-top:0.75rem; padding:0.75rem; border-radius:0.375rem; background:#e3f2fd; flex-shrink:0; }
    .storage-head { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem; font-size:0.75rem; }
    .storage-bar { height:6px; background:#cbd5e1; border-radius:9999px; overflow:hidden; }
    .storage-fill { height:100%; width:12%; background:linear-gradient(to right,#00c1cb,#0e638f); border-radius:9999px; }
    .storage-meta { font-size:0.65rem; color:#64748b; margin-top:0.35rem; }
    .main-wrap { flex:1; display:flex; flex-direction:column; min-width:0; padding:1.25rem 0 0; }
    .header-row { display:flex; flex-wrap:wrap; align-items:center; gap:0.5rem; padding:0 1rem 0.5rem 1rem; justify-content:space-between; }
    .quick-actions { display:flex; align-items:center; gap:0.375rem; flex:1; min-width:0; overflow:hidden; }
    .primary-btn { display:inline-flex; align-items:center; justify-content:center; gap:0.375rem; height:36px; padding:0 0.875rem; border:none; border-radius:9999px; color:#fff; font-size:0.75rem; font-weight:600; white-space:nowrap; background-image:linear-gradient(to right,#00c1cb,#078fab,#0e638f,#11487d,#162768); box-shadow:0 4px 6px rgba(0,0,0,0.1); }
    .primary-btn svg { width:14px; height:14px; }
    .header-pill { display:flex; align-items:center; flex-shrink:0; background:rgba(255,255,255,0.3); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.4); border-radius:9999px; padding:0 0.5rem; height:36px; box-shadow:0 10px 15px rgba(0,0,0,0.08); }
    .header-pill-inner { display:flex; align-items:center; gap:0.15rem; height:36px; }
    .avatar { width:28px; height:28px; border-radius:9999px; object-fit:cover; border:2px solid rgba(255,255,255,0.8); }
    .icon-btn { position:relative; width:32px; height:32px; border:none; background:transparent; border-radius:0.375rem; display:flex; align-items:center; justify-content:center; color:#334155; }
    .badge { position:absolute; top:0; right:0; min-width:16px; height:16px; padding:0 4px; background:#ef4444; color:#fff; font-size:10px; font-weight:700; border-radius:9999px; display:flex; align-items:center; justify-content:center; }
    .main-content { flex:1; overflow:hidden; margin:0 1.75rem 1.75rem 0; border-radius:30px; padding:1.25rem 1.75rem 1rem; background-color:#f0eded; background-image:linear-gradient(rgba(255,255,255,0.6),rgba(255,255,255,0.6)),url("${BASE}/assets/images/main-content-overlay2.png"); background-size:100% 100%; background-repeat:no-repeat; }
    .page { padding:0 0.25rem; }
    .h1 { font-size:34px; line-height:42px; font-weight:700; text-transform:capitalize; }
    ${EXTRA_STYLES}
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="logo-row">
        <a class="logo-link" href="#"><span class="dashboard-logo"><img src="${BASE}/assets/images/logo.svg" alt="CAALM" /></span><span class="logo-text sidebar-gradient-text">CAALM</span></a>
        <button class="collapse-btn" type="button">‹</button>
      </div>
      <nav class="sidebar-nav"><ul>${renderSidebar(activeNav)}</ul></nav>
      <div class="sidebar-storage-info"><div class="storage-head">Storage</div><div class="storage-bar"><div class="storage-fill"></div></div><div class="storage-meta">1.24 GB of 100 GB used</div></div>
    </aside>
    <div class="main-wrap">
      ${renderHeader()}
      <div class="main-content${flush ? " flush" : ""}">
        <div class="page">${content}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const CONTENT_01 = `
  <div class="dash-greeting sidebar-gradient-text">Good afternoon, <span>Admin User | Executive</span></div>
  <div class="grid-4" style="margin-bottom:1rem">
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Total contracts</p><div class="stat-value-row"><span class="stat-value">16</span></div></div></div>
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Active staff</p><div class="stat-value-row"><span class="stat-value">5</span></div></div></div>
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Compliance rate</p><div class="stat-value-row"><span class="stat-value">92%</span></div></div></div>
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Pending approvals</p><div class="stat-value-row"><span class="stat-value">3</span></div></div></div>
  </div>
  <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body">
    <p class="card-title sidebar-gradient-text">Pending Approvals</p>
    <div class="approval-item"><div class="approval-top"><span class="approval-type">User Registration</span><button class="review-btn" type="button">Review</button></div><p class="approval-meta">David Wilson — Admin</p><p class="approval-meta-xs">Division: HR</p></div>
    <div class="approval-item"><div class="approval-top"><span class="approval-type">Contract Proposal</span><button class="review-btn" type="button">Review</button></div><p class="approval-meta">New Vendor Agreement</p><p class="approval-meta-xs">Amount: $125,000</p></div>
    <div class="approval-item"><div class="approval-top"><span class="approval-type">Document Access</span><button class="review-btn" type="button">Review</button></div><p class="approval-meta">Emma Davis — Legal</p></div>
    <button class="inbox-btn" type="button">Open approvals inbox</button>
  </div></div>`;

export const CONTENT_02 = `
  <div class="calendar-shell">
    <aside class="cal-sidebar">
      <div class="cal-sidebar-scroll">
        <div class="mini-cal">
          <div class="mini-cal-head"><button type="button" aria-label="Previous month">‹</button><span>July 2026</span><button type="button" aria-label="Next month">›</button></div>
          <div class="mini-grid">
            <span class="dow">Su</span><span class="dow">Mo</span><span class="dow">Tu</span><span class="dow">We</span><span class="dow">Th</span><span class="dow">Fr</span><span class="dow">Sa</span>
            <span class="day out">28</span><span class="day out">29</span><span class="day out">30</span><span class="day">1</span><span class="day">2</span><span class="day">3</span><span class="day">4</span>
            <span class="day">5</span><span class="day">6</span><span class="day">7</span><span class="day">8</span><span class="day">9</span><span class="day">10</span><span class="day">11</span>
            <span class="day">12</span><span class="day">13</span><span class="day">14</span><span class="day">15</span><span class="day">16</span><span class="day">17</span><span class="day">18</span>
            <span class="day">19</span><span class="day">20</span><span class="day">21</span><span class="day">22</span><span class="day">23</span><span class="day sel">24</span><span class="day">25</span>
            <span class="day">26</span><span class="day">27</span><span class="day">28</span><span class="day">29</span><span class="day">30</span><span class="day">31</span><span class="day out">1</span>
          </div>
        </div>
        <div>
          <div class="cal-section-head"><span class="sidebar-gradient-text">My calendars</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg></div>
          <div class="cal-cal-row"><span class="cal-round-check checked"></span><span class="cal-dot" style="background:#00c1cb"></span><span class="cal-cal-label">Calendar</span></div>
          <div class="cal-cal-row"><span class="cal-round-check"></span><span class="cal-dot" style="background:#f97316"></span><span class="cal-cal-label">United States holidays</span></div>
          <div class="cal-cal-row"><span class="cal-round-check checked"></span><span class="cal-dot" style="background:#9333ea"></span><span class="cal-cal-label">Resources</span></div>
        </div>
        <div>
          <div class="cal-section-head"><span class="sidebar-gradient-text">Shared calendars</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg></div>
          <p class="cal-empty">No shared calendars</p>
        </div>
      </div>
      <div class="cal-manage">
        <p class="cal-manage-title sidebar-gradient-text">Manage</p>
        <button class="cal-manage-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Manage Shared Calendars</button>
        <button class="cal-manage-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18Z"/><path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2"/><path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>Manage Resources</button>
        <button class="cal-manage-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="8" r="4"/><path d="M10.3 14H7a4 4 0 00-4 4v1"/><path d="M19.4 15.5a2.5 2.5 0 010 5"/><path d="M21.2 20.8l-1.9-1.9"/></svg>Manage Delegations</button>
      </div>
    </aside>
    <div class="cal-main">
      <div class="cal-toolbar">
        <h1 class="h1 sidebar-gradient-text">Calendar</h1>
        <div class="cal-nav">
          <button class="cal-nav-btn" type="button">Today</button>
          <button class="cal-nav-btn" type="button">‹</button>
          <button class="cal-nav-btn" type="button">›</button>
          <div class="view-tabs">
            <span class="view-tab">Day</span><span class="view-tab">Week</span><span class="view-tab active">Month</span><span class="view-tab">Agenda</span>
          </div>
          <button class="primary-btn" type="button" style="height:32px;font-size:0.75rem">+ New Event</button>
        </div>
      </div>
      <p style="font-size:0.875rem;color:#64748b;margin-bottom:0.5rem">July 2026</p>
      <div class="month-grid">
        <div class="dow">Sun</div><div class="dow">Mon</div><div class="dow">Tue</div><div class="dow">Wed</div><div class="dow">Thu</div><div class="dow">Fri</div><div class="dow">Sat</div>
        ${buildMonthCells()}
      </div>
    </div>
  </div>`;

function buildMonthCells() {
	const days = [
		{ n: 28, out: true }, { n: 29, out: true }, { n: 30, out: true },
		{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }, { n: 6 }, { n: 7 }, { n: 8 }, { n: 9 }, { n: 10 },
		{ n: 11 }, { n: 12 }, { n: 13 }, { n: 14 }, { n: 15 },
		{ n: 16, events: ["9:00 AM Quic...", "12:00 PM Quic..."] },
		{ n: 17 }, { n: 18 }, { n: 19 }, { n: 20 }, { n: 21 }, { n: 22 }, { n: 23 },
		{ n: 24, today: true, selected: true },
		{ n: 25 }, { n: 26 }, { n: 27 }, { n: 28 }, { n: 29 }, { n: 30 }, { n: 31 },
		{ n: 1, out: true }, { n: 2, out: true }, { n: 3, out: true },
	];
	return days
		.map((d) => {
			const cls = [
				"month-cell",
				d.out ? "out" : "in-month",
				d.today && "today",
				d.selected && "selected",
			].filter(Boolean).join(" ");
			const chips = (d.events || []).map((e) => `<div class="event-chip">${e}</div>`).join("");
			return `<div class="${cls}"><div class="day-num">${d.n}</div>${chips}</div>`;
		})
		.join("");
}

const PDF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.1698 0H26.7166L38.6745 11.9602V34.9274C38.6745 37.7163 36.3931 40 33.602 40H13.1699C10.381 40 8.09961 37.7163 8.09961 34.9274V5.07258C8.09961 2.28367 10.381 0 13.1698 0Z" fill="#E5252A"/><path fill-rule="evenodd" clip-rule="evenodd" d="M26.7168 0L38.6748 11.9602H28.0061C27.2952 11.9602 26.7168 11.3796 26.7168 10.6687V0Z" fill="#B71D21"/><path fill-rule="evenodd" clip-rule="evenodd" d="M2.4375 17.0328H29.9858C30.5984 17.0328 31.0991 17.5334 31.0991 18.1461V28.2523C31.0991 28.865 30.5984 29.3656 29.9858 29.3656H2.4375C1.82484 29.3656 1.32422 28.865 1.32422 28.2523V18.1461C1.32422 17.5334 1.82492 17.0328 2.4375 17.0328Z" fill="#B71D21"/><path d="M9.20031 19.0937H7.12234C6.7657 19.0937 6.47656 19.3828 6.47656 19.7395V23.1455V23.9845V26.6568C6.47656 27.0134 6.7657 27.3026 7.12234 27.3026C7.47898 27.3026 7.76813 27.0134 7.76813 26.6568V24.6302H9.20023C10.7021 24.6302 11.924 23.4084 11.924 21.9066V21.8174C11.9241 20.3155 10.7022 19.0937 9.20031 19.0937ZM10.6325 21.9065C10.6325 22.6962 9.99 23.3386 9.20031 23.3386H7.76813V23.1455V20.3852H9.20023C9.98992 20.3852 10.6324 21.0277 10.6324 21.8173V21.9065H10.6325ZM16.1497 19.0937H14.0718C13.7152 19.0937 13.426 19.3828 13.426 19.7395V26.6568C13.426 27.0134 13.7152 27.3026 14.0718 27.3026H16.1497C17.6516 27.3026 18.8734 26.0807 18.8734 24.5789V21.8174C18.8734 20.3155 17.6516 19.0937 16.1497 19.0937ZM17.5819 24.5788C17.5819 25.3685 16.9394 26.0109 16.1497 26.0109H14.7176V20.3852H16.1497C16.9394 20.3852 17.5819 21.0277 17.5819 21.8173V24.5788ZM21.7926 20.3852V22.1729H24.7861C25.1427 22.1729 25.4319 22.462 25.4319 22.8187C25.4319 23.1753 25.1427 23.4645 24.7861 23.4645H21.7926V26.6568C21.7926 27.0134 21.5034 27.3026 21.1468 27.3026C20.7902 27.3026 20.501 27.0134 20.501 26.6568V19.7395C20.501 19.3828 20.7902 19.0937 21.1468 19.0937H25.3027C25.6593 19.0937 25.9484 19.3828 25.9484 19.7395C25.9484 20.0961 25.6593 20.3852 25.3027 20.3852H21.7926Z" fill="#FFFFFF"/></svg>`;
const PDF_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PDF_SVG)}`;
const PDF_FILE_ICON = `<img class="file-thumb" src="${PDF_DATA_URI}" alt="PDF" width="32" height="32" decoding="sync" />`;
const ICON_FILE = `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const ICON_WARN = `<svg class="stat-icon stat-icon-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 00-3.48 0l-8 14A2 2 0 004 21h16a2 2 0 001.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const ICON_CHECK = `<svg class="stat-icon stat-icon-active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const CONTRACTS_TOOLBAR = `
    <div class="toolbar-row">
      <div class="cta-left"><input class="cta-search" type="text" placeholder="Search contracts..." aria-label="Search contracts" /></div>
      <div class="cta-right">
        <button class="filter-btn-gradient" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>Filter</button>
        <button class="views-btn" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>Views</button>
        <div class="sort-select">Date created (newest) <span style="color:#94a3b8">▾</span></div>
        <div class="view-toggle">
          <button class="view-toggle-btn" type="button" aria-label="Card view"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
          <button class="view-toggle-btn active" type="button" aria-label="Table view"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg></button>
        </div>
      </div>
    </div>`;

function licenseRow(name, vendor, category, seats, seatsUsed, pillClass, status, expiry, cost) {
	return `<tr>
      <td><input type="checkbox" /></td>
      <td><div class="file-name">${PDF_FILE_ICON}${name}</div></td>
      <td>${vendor}</td><td>${category}</td><td>${seats} <span style="color:#94a3b8;font-size:0.6875rem">${seatsUsed}</span></td>
      <td><span class="pill ${pillClass}">${status}</span></td><td>${expiry}</td><td>${cost}</td><td>⋯</td>
    </tr>`;
}

function contractRow(name, fileType, pillClass, status, size, uploaded, expires, expiresStyle = "") {
	const icon =
		fileType === "doc"
			? `<img class="file-thumb" src="${BASE}/assets/icons/file-doc.svg" alt="DOC" width="32" height="32" decoding="sync" />`
			: PDF_FILE_ICON;
	const expiresAttr = expiresStyle ? ` style="${expiresStyle}"` : "";
	return `<tr>
      <td><div class="file-name">${icon}${name}</div></td>
      <td><span class="pill ${pillClass}">${status}</span></td>
      <td>${size}</td><td>${uploaded}</td><td${expiresAttr}>${expires}</td>
    </tr>`;
}

export const CONTENT_04 = `
  <div class="page-header"><h1 class="h1 sidebar-gradient-text">Licenses</h1><div class="page-actions"><button class="primary-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload</button><button class="primary-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export</button></div></div>
  <div class="grid-4">
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Total Cost</p><div class="stat-value-row"><span class="stat-value">$14,750</span></div><p class="stat-sub">Sum of license costs</p></div></div>
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Total Licenses</p><div class="stat-value-row"><span class="stat-value">5</span></div><p class="stat-sub">Click to show all</p></div></div>
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Active</p><div class="stat-value-row"><span class="stat-value">3</span></div><p class="stat-sub">60% of total</p></div></div>
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Seat Utilization</p><div class="stat-value-row"><span class="stat-value">68.0%</span></div><p class="stat-sub">17 of 25 seats used</p></div></div>
  </div>
  <div class="glass-card" style="margin-top:0.5rem">
    <div class="glass-card-cap"></div>
    <div class="status-tabs">
      <span class="status-tab active"><span class="sidebar-gradient-text">All</span><span class="count">5</span></span>
      <span class="status-tab"><span class="sidebar-gradient-text">Active</span><span class="count">3</span></span>
      <span class="status-tab"><span class="sidebar-gradient-text">Pending</span><span class="count">1</span></span>
      <span class="status-tab"><span class="sidebar-gradient-text">Expiring</span><span class="count">1</span></span>
      <span class="status-tab"><span class="sidebar-gradient-text">Expired</span><span class="count">0</span></span>
    </div>
    <div class="toolbar-row">
      <div class="cta-left"><input class="cta-search" type="text" placeholder="Search licenses..." aria-label="Search licenses" /></div>
      <div class="cta-right">
        <button class="filter-btn-gradient" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>Filter</button>
        <button class="views-btn" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>Views</button>
        <div class="sort-select">Date created (newest) <span style="color:#94a3b8">▾</span></div>
        <div class="view-toggle">
          <button class="view-toggle-btn" type="button" aria-label="Card view"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
          <button class="view-toggle-btn active" type="button" aria-label="Table view"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg></button>
        </div>
      </div>
    </div>
    <table class="data-table"><thead><tr><th></th><th>License Name</th><th>Vendor</th><th>Category</th><th>Seats</th><th>Status</th><th>Expiration Date</th><th>Cost</th><th></th></tr></thead>
    <tbody>
      ${licenseRow("Meridian Health License", "Meridian Systems", "Healthcare", "5", "3 used", "pill-active", "Active", "Dec 14, 2026", "$4,200.00")}
      ${licenseRow("Northgate SaaS Subscription", "Northgate Cloud", "Productivity", "10", "8 used", "pill-active", "Active", "Aug 22, 2026", "$3,600.00")}
      ${licenseRow("BrightPath Analytics Suite", "BrightPath Inc.", "Analytics", "3", "1 used", "pill-gray", "Pending", "May 31, 2025", "$2,000.00")}
      ${licenseRow("Harbor Ridge Security Cert", "Harbor Ridge", "Security", "4", "4 used", "pill-pending", "Expiring", "Apr 18, 2026", "$2,450.00")}
      ${licenseRow("Cascade ERP Enterprise", "Cascade Software", "Operations", "3", "1 used", "pill-active", "Active", "Jan 9, 2027", "$2,500.00")}
    </tbody></table>
    <div class="table-footer"><span>Show 10 per page · 1–5 of 5</span><div class="pagination"><span class="page-num active">1</span></div></div>
  </div>`;

export const CONTENT_07 = `
  <div class="page-header"><h1 class="h1 sidebar-gradient-text">Contracts</h1><div class="page-actions"><button class="primary-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload</button><button class="primary-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export</button></div></div>
  <div class="grid-4">
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Total Value</p><div class="stat-value-row"><span class="stat-value">$2.3M</span></div><p class="stat-sub">Sum of contract amounts</p></div></div>
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Total Contracts</p><div class="stat-value-row"><span class="stat-value">16</span>${ICON_FILE}</div><p class="stat-sub">Click to show all</p></div></div>
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Expiring Soon</p><div class="stat-value-row"><span class="stat-value">4</span>${ICON_WARN}</div><div class="stat-expiring-breakdown"><span>30d: 1</span><span>60d: 2</span><span>90d: 1</span></div></div></div>
    <div class="glass-card"><div class="glass-card-cap"></div><div class="card-body"><p class="stat-title sidebar-gradient-text">Active</p><div class="stat-value-row"><span class="stat-value">14</span>${ICON_CHECK}</div><p class="stat-sub">88% of total</p></div></div>
  </div>
  <div class="glass-card" style="margin-top:0.5rem">
    <div class="glass-card-cap"></div>
    <div class="status-tabs contracts-status-tabs">
      <span class="status-tab active"><span class="sidebar-gradient-text">All</span><span class="count">16</span></span>
      <span class="status-tab"><span class="sidebar-gradient-text">Active</span><span class="count">14</span></span>
      <span class="status-tab"><span class="sidebar-gradient-text">Pending</span><span class="count">1</span></span>
      <span class="status-tab"><span class="sidebar-gradient-text">Expiring</span><span class="count">4</span></span>
      <span class="status-tab"><span class="sidebar-gradient-text">Expired</span><span class="count">1</span></span>
    </div>
    ${CONTRACTS_TOOLBAR}
    <table class="data-table"><thead><tr><th>Name</th><th>Status</th><th>Size</th><th>Uploaded</th><th>Expires</th></tr></thead>
    <tbody>
      ${contractRow("Meridian Health Agreement", "pdf", "pill-pending", "Pending Review", "2.4 MB", "Jun 12, 2024", "Jun 30, 2024", "color:#d97706")}
      ${contractRow("Northgate Vendor SOW", "doc", "pill-active", "Active", "1.1 MB", "May 3, 2024", "Oct 15, 2024")}
      ${contractRow("BrightPath Consulting MSA", "pdf", "pill-expired", "Expired", "890 KB", "Jan 8, 2024", "Mar 15, 2024", "color:#dc2626")}
      ${contractRow("Harbor Ridge Facilities Lease", "doc", "pill-active", "Active", "3.2 MB", "Nov 20, 2023", "Feb 28, 2026")}
      ${contractRow("Cascade IT Services Agreement", "pdf", "pill-active", "Active", "1.8 MB", "Aug 14, 2024", "Jul 31, 2026")}
      ${contractRow("Summit Legal Retainer", "pdf", "pill-active", "Active", "720 KB", "Mar 22, 2024", "Dec 31, 2025")}
      ${contractRow("Pacific Coast Supply Contract", "doc", "pill-active", "Active", "2.0 MB", "Sep 5, 2023", "Apr 30, 2026")}
      ${contractRow("Riverside Medical Partnership", "pdf", "pill-pending", "Pending Review", "1.5 MB", "Feb 18, 2025", "Aug 15, 2025", "color:#d97706")}
    </tbody></table>
    <div class="table-footer"><span>Showing 1 to 8 of 16 contracts</span><div class="pagination"><span class="page-num active">1</span><span class="page-num">2</span><span class="page-num">3</span><span class="page-num">4</span></div></div>
  </div>`;

export const DEMOS = [
	{
		file: "demo-01-pending-approvals.png",
		html: "demo-01-pending-approvals.html",
		title: "CAALM — Executive dashboard",
		activeNav: "dash-exec",
		content: CONTENT_01,
	},
	{
		file: "demo-02-calendar.png",
		html: "demo-02-calendar.html",
		title: "CAALM — Calendar",
		activeNav: "cal-view",
		content: CONTENT_02,
		flush: true,
	},
	{
		file: "demo-04-licenses.png",
		html: "demo-04-licenses.html",
		title: "CAALM — Licenses",
		activeNav: "licenses-all",
		content: CONTENT_04,
	},
	{
		file: "demo-07-contracts-full.png",
		html: "demo-07-contracts-full.html",
		title: "CAALM — Contracts",
		activeNav: "contracts-all",
		content: CONTENT_07,
	},
];
