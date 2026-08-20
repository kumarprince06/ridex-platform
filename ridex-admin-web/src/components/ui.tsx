import { ReactNode } from 'react';

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
  tone = 'default',
  onClick,
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: Tone;
  onClick?: () => void;
}) {
  // A number nobody can drill into is decoration, so a tile with a target renders as a button.
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper className={`stat-tile tone-${tone}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {note ? <span className="stat-note">{note}</span> : null}
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
