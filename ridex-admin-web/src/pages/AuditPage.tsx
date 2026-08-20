import { useState } from 'react';

import { Card, PageHeader, Pill, SearchInput, Table } from '../components/ui';
import { AUDIT, AuditEntry } from '../data/mock';

const ACTION_TONE = (action: string) => {
  if (action.includes('REFUND') || action.includes('SUSPEND') || action.includes('REJECT')) return 'danger' as const;
  if (action.includes('GRANT') || action.includes('APPROVE')) return 'success' as const;
  return 'info' as const;
};

/**
 * FR-OPS-010. Read-only for everyone, including super admins - the console's credibility rests on
 * this screen, and a log its own operators can edit proves nothing.
 */
export function AuditPage() {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();

  const rows = needle
    ? AUDIT.filter((entry) =>
        [entry.actor, entry.action, entry.entity, entry.reason].some((field) =>
          field.toLowerCase().includes(needle),
        ),
      )
    : AUDIT;

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every privileged action, with the reason its operator gave. Read-only for all roles."
      />

      <Card actions={<SearchInput value={query} onChange={setQuery} placeholder="Actor, action, entity or reason" />}>
        <Table<AuditEntry>
          columns={[
            { key: 'at', header: 'When', render: (row) => <span className="cell-muted">{row.at}</span> },
            { key: 'actor', header: 'Actor', render: (row) => (
              <>
                <div className="cell-strong">{row.actor}</div>
                <div className="cell-muted mono">{row.role}</div>
              </>
            ) },
            { key: 'action', header: 'Action', render: (row) => <Pill tone={ACTION_TONE(row.action)}>{row.action}</Pill> },
            { key: 'entity', header: 'Entity', render: (row) => <span className="mono">{row.entity}</span> },
            { key: 'reason', header: 'Reason given', render: (row) => row.reason },
          ]}
          rows={rows}
          empty={`No audit entry matches “${query}”.`}
        />
      </Card>

      <Card>
        <p className="cell-muted">
          The <code className="mono">audit_logs</code> table does not exist yet — T1 deferred it on
          purpose, and T15 needs it. These rows are static until it lands.
        </p>
      </Card>
    </>
  );
}
