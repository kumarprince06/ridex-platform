import { ReactNode } from 'react';

import { PAGE_SIZES } from '../api/admin';

import './ui.css';

/* ------------------------------------------------------------------ page furniture */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      {title || actions ? (
        <div className="card-head">
          {title ? <h2 className="card-title">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Grid({ columns = 2, children }: { columns?: number; children: ReactNode }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ data display */

export function StatTile({
  label,
  value,
  note,
  delta,
  deltaGood = 'up',
  tone = 'default',
  onClick,
}: {
  label: string;
  value: string | number;
  note?: string;
  /** Percent change against the previous period. Null when there is nothing to compare to. */
  delta?: number | null;
  /** Which direction is the good one - cancellations improving means going down. */
  deltaGood?: 'up' | 'down';
  tone?: Tone;
  onClick?: () => void;
}) {
  // A number nobody can drill into is decoration, so a tile with a target renders as a button.
  const Wrapper = onClick ? 'button' : 'div';
  const direction = delta == null || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';
  const good = direction === 'flat' ? 'flat' : direction === deltaGood ? 'good' : 'bad';

  return (
    <Wrapper className={`stat-tile tone-${tone}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-foot">
        {delta == null ? null : (
          // Arrow plus sign, not colour alone: the direction has to survive a colourblind reader.
          <span className={`stat-delta delta-${good}`}>
            {direction === 'flat' ? '→' : direction === 'up' ? '↑' : '↓'}
            {Math.abs(Math.round(delta))}%
          </span>
        )}
        {note ? <span className="stat-note">{note}</span> : null}
      </span>
    </Wrapper>
  );
}

export type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}

/** One place decides what colour a state is, so two screens cannot disagree about it. */
export function stateTone(state: string): Tone {
  if (/(COMPLETED|APPROVED|SUCCEEDED|SETTLED|ACTIVE|RESOLVED|ON)$/.test(state)) return 'success';
  if (/(CANCELLED|REJECTED|FAILED|SUSPENDED|DISABLED|EXPIRED)/.test(state)) return 'danger';
  if (/(UNDER_REVIEW|PENDING|PROCESSING|REQUIRES_ACTION|IN_TRANSIT|EXPIRING|PARTIAL|INVITED)/.test(state)) return 'warning';
  if (/(SEARCHING|REQUESTED|DRIVER_|TRIP_STARTED|CREATED|OPEN)/.test(state)) return 'info';
  return 'default';
}

export function humanState(state: string) {
  return state.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
  align?: 'left' | 'right';
};

export function Table<T>({
  columns,
  rows,
  onRowClick,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return <EmptyState title="Nothing to show">{empty}</EmptyState>;
  }

  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ width: column.width, textAlign: column.align ?? 'left' }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className={onRowClick ? 'clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} style={{ textAlign: column.align ?? 'left' }}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Row count on the left, position on the right. No numbered strip: operations reaches a record by
 * searching for it, never by hunting for page 7 of 40 - forty controls nobody clicks.
 */
export function Pagination({
  page,
  size,
  totalPages,
  totalItems,
  noun,
  onPage,
  onSize,
}: {
  page: number;
  size: number;
  totalPages: number;
  totalItems: number;
  noun: string;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  // Nothing to page through and nothing to resize.
  if (totalItems === 0) {
    return null;
  }

  const first = page * size + 1;
  const last = Math.min((page + 1) * size, totalItems);

  return (
    <div className="pagination">
      <label className="page-size">
        <span className="page-size-label">Rows</span>
        {/* A native select: it is keyboard- and screen-reader-correct for free, and a custom
            listbox here would be a hundred lines to land in the same place. */}
        <select
          className="page-size-select"
          value={size}
          onChange={(event) => onSize(Number(event.target.value))}
          aria-label={`${noun} per page`}
        >
          {PAGE_SIZES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <span className="pagination-range">
        <strong>
          {first.toLocaleString()}–{last.toLocaleString()}
        </strong>{' '}
        of {totalItems.toLocaleString()} {noun}
      </span>

      <div className="pagination-controls">
        <button
          type="button"
          className="page-btn"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <Chevron direction="left" />
        </button>
        <span className="page-position">
          {page + 1} <span className="page-position-of">/ {totalPages || 1}</span>
        </span>
        <button
          type="button"
          className="page-btn"
          disabled={page >= totalPages - 1}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <Chevron direction="right" />
        </button>
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children ? <p className="empty-body">{children}</p> : null}
    </div>
  );
}

export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="detail-list">
      {items.map((item) => (
        <div className="detail-row" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({ items }: { items: { title: string; at: string; actor: string; tone?: Tone }[] }) {
  return (
    <ol className="timeline">
      {items.map((item, index) => (
        <li key={index}>
          <span className={`timeline-dot tone-${item.tone ?? 'info'}`} />
          <div className="timeline-body">
            <span className="timeline-title">{item.title}</span>
            <span className="timeline-meta">
              {item.at} · {item.actor}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ controls */

export function Button({
  children,
  onClick,
  variant = 'secondary',
  type = 'button',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      className="search"
      type="search"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      aria-label={placeholder}
    />
  );
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="filter-tabs" role="tablist">
      {options.map((option) => (
        <button
          key={option}
          role="tab"
          aria-selected={value === option}
          className={value === option ? 'filter-tab active' : 'filter-tab'}
          onClick={() => onChange(option)}
          type="button"
        >
          {humanState(option)}
        </button>
      ))}
    </div>
  );
}
