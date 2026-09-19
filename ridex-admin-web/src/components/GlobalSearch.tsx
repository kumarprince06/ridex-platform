import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { searchConsole, type SearchHit } from '../api/admin';

const PAGES: Record<SearchHit['kind'], { label: string; path: (id: string) => string }> = {
  RIDER: { label: 'Riders', path: (id) => `/riders/${id}` },
  DRIVER: { label: 'Drivers', path: (id) => `/drivers/${id}` },
  RIDE: { label: 'Rides', path: (id) => `/trips/${id}` },
  PAYMENT: { label: 'Payments', path: (id) => `/payments/${id}` },
  ROUTE: { label: 'Shuttle routes', path: (id) => `/shuttle/routes/${id}` },
  CASE: { label: 'Support cases', path: (id) => `/cases/${id}` },
};

/** Type a name, email, phone or id; results come grouped by kind, and Enter opens the first. */
export function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits(null);
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      searchConsole(q.trim())
        .then((found) => !stale && setHits(found))
        .catch(() => !stale && setHits([]));
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q]);

  function go(hit: SearchHit) {
    setOpen(false);
    setQ('');
    navigate(PAGES[hit.kind].path(hit.id));
  }

  const groups = (Object.keys(PAGES) as SearchHit['kind'][])
    .map((kind) => ({ kind, items: (hits ?? []).filter((hit) => hit.kind === kind) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="global-search-wrap">
      <input
        className="global-search"
        type="search"
        placeholder="Search a rider, driver, ride, payment, route or case…"
        aria-label="Global search"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && hits?.length) go(hits[0]);
          if (event.key === 'Escape') setOpen(false);
        }}
      />
      {open && hits ? (
        <div className="search-results" role="listbox">
          {groups.length === 0 ? <div className="search-empty">Nothing matches "{q}".</div> : null}
          {groups.map((group) => (
            <div key={group.kind}>
              <div className="search-group">{PAGES[group.kind].label}</div>
              {group.items.map((hit) => (
                <button key={hit.kind + hit.id} type="button" className="search-hit" onMouseDown={() => go(hit)}>
                  <span className="search-title">{hit.title}</span>
                  {hit.detail ? <span className="search-detail">{hit.detail}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
