const PAGES = ['The car', 'Ghost Lap', 'Season', 'Lights Out'] as const;

/** Site header. Pages not built yet show as muted labels rather than dead links. */
export function TopNav({ current }: { current: (typeof PAGES)[number] }) {
  return (
    <header className="topnav">
      <a className="brand" href="/">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6l7 6-7 6" />
          <path d="M12 6l7 6-7 6" />
        </svg>
        <span>PIT WALL</span>
      </a>
      <nav aria-label="Main">
        {PAGES.map((page) =>
          page === current ? (
            <span key={page} className="nav-item current" aria-current="page">
              {page}
            </span>
          ) : (
            <span key={page} className="nav-item soon" title="Coming in a later phase">
              {page}
            </span>
          ),
        )}
      </nav>
      <span className="season-pill">Season 2025</span>
    </header>
  );
}
