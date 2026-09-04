import { listAuditLog, type AuditEntry } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, PageHeader, Pill, Table } from '../components/ui';

/**
 * Every mutating action operations took, and why.
 *
 * Super admin only: it records what everyone else did, including them.
 */
export function AuditPage() {
  const { data, loading, error } = useQuery(() => listAuditLog(), []);

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle={data ? `${data.totalItems} recorded actions` : loading ? 'Loading...' : ''}
      />

      <Card>
        <Table<AuditEntry>
          columns={[
            { key: 'when', header: 'When', render: (row) => (
              <span className="cell-muted">{new Date(row.occurredAt).toLocaleString()}</span>
            ) },
            { key: 'actor', header: 'Who', render: (row) => (
              <span className="cell-strong">{row.actorEmail ?? 'System'}</span>
            ) },
            { key: 'action', header: 'Action', render: (row) => <Pill tone="info">{row.action}</Pill> },
            { key: 'target', header: 'Target', render: (row) =>
              row.targetId ? (
                <span className="mono">
                  {row.targetType} {row.targetId.slice(-8)}
                </span>
              ) : '—' },
            { key: 'reason', header: 'Reason', render: (row) => row.reason ?? '—' },
            { key: 'ip', header: 'From', render: (row) => (
              <span className="cell-muted mono">{row.ipAddress ?? '—'}</span>
            ) },
          ]}
          rows={data?.items ?? []}
          empty={error ?? (loading ? 'Loading...' : 'Nothing recorded yet.')}
        />
      </Card>
    </>
  );
}
