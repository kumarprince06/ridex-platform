import { listStaff, type StaffMember } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { ROLE_LABELS, type StaffRole } from '../auth/permissions';
import { Card, humanState, PageHeader, Pill, Table, stateTone } from '../components/ui';
import { dateTime } from '../lib/format';

/**
 * Console accounts, read-only. Staff are provisioned on the server (the bootstrap admin, then
 * by hand) - there is no invite flow yet, so this page shows who has access rather than pretend to grant it.
 */
export function StaffPage() {
  const { data, loading, error } = useQuery(() => listStaff(), []);

  return (
    <>
      <PageHeader title="Staff" subtitle="Everyone who can sign in to this console. Riders and drivers never appear here." />
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
      <Card>
        {loading && !data ? (
          <p className="cell-muted">Loading...</p>
        ) : (
          <Table<StaffMember>
            rows={data ?? []}
            empty="Only the bootstrap admin exists."
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (row) => (
                  <>
                    <div className="cell-strong">{row.name || row.email.split('@')[0]}</div>
                    <div className="cell-muted">{row.email}</div>
                  </>
                ),
              },
              {
                key: 'roles',
                header: 'Role',
                render: (row) => row.roles.map((role) => ROLE_LABELS[role as StaffRole] ?? role).join(' · '),
              },
              { key: 'status', header: 'Status', render: (row) => <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill> },
              {
                key: 'lastLogin',
                header: 'Last sign-in',
                render: (row) => <span className="cell-muted">{row.lastLoginAt ? dateTime(row.lastLoginAt) : 'Never'}</span>,
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}
