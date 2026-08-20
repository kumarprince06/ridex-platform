import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, FilterTabs, humanState, PageHeader, Pill, Table, stateTone } from '../components/ui';
import { Case, CASES } from '../data/mock';

const FILTERS = ['ALL', 'OPEN', 'PENDING', 'RESOLVED'] as const;

const PRIORITY_TONE = { Low: 'default', Normal: 'info', High: 'warning', Urgent: 'danger' } as const;

/** FR-OPS-008. SLA age is a column because it is the thing that decides what to pick up next. */
export function CasesPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');

  const rows = filter === 'ALL' ? CASES : CASES.filter((item) => item.state === filter);

  return (
    <>
      <PageHeader title="Support cases" subtitle={`${CASES.filter((c) => c.state !== 'RESOLVED').length} open`} />

      <Card>
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
          <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        <Table<Case>
          columns={[
            { key: 'id', header: 'Case', render: (row) => <span className="mono">{row.id}</span> },
            { key: 'subject', header: 'Subject', render: (row) => (
              <>
                <div className="cell-strong">{row.subject}</div>
                <div className="cell-muted">{row.reporter} · {row.tripId}</div>
              </>
            ) },
            { key: 'category', header: 'Category', render: (row) => row.category },
            { key: 'priority', header: 'Priority', render: (row) => <Pill tone={PRIORITY_TONE[row.priority]}>{row.priority}</Pill> },
            { key: 'age', header: 'Age', align: 'right', render: (row) => (
              <span className={row.ageHours > 24 ? 'cell-strong' : undefined}>{row.ageHours}h</span>
            ) },
            { key: 'assignee', header: 'Assignee', render: (row) => (
              <span className={row.assignee === 'Unassigned' ? 'cell-muted' : undefined}>{row.assignee}</span>
            ) },
            { key: 'state', header: 'State', render: (row) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
          ]}
          rows={rows}
          onRowClick={(row) => navigate(`/cases/${row.id}`)}
        />
      </Card>
    </>
  );
}
