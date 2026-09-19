import { useState } from 'react';

import { changeStaffRole, inviteStaff, listStaff, setStaffEnabled, type StaffMember, type StaffRoleName } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { ROLE_LABELS, type StaffRole } from '../auth/permissions';
import { useSession } from '../auth/session';
import { FormDialog } from '../components/FormDialog';
import { Button, Card, humanState, PageHeader, Pill, Table, stateTone } from '../components/ui';
import { dateTime } from '../lib/format';

const ROLE_OPTIONS: { value: StaffRoleName; label: string }[] = [
  { value: 'SUPPORT', label: 'Support agent - cases, riders and rides; no money' },
  { value: 'OPS_ADMIN', label: 'Operations admin - routes, fares, drivers, refunds' },
  { value: 'SUPER_ADMIN', label: 'Super admin - everything, including staff' },
];

/**
 * Console accounts. A super admin invites staff, changes their role or switches them off; nobody
 * changes their own access, and the last super admin cannot be removed.
 */
export function StaffPage() {
  const { session } = useSession();
  const { data, loading, error, refetch } = useQuery(() => listStaff(), []);
  const [inviting, setInviting] = useState(false);
  const [changing, setChanging] = useState<StaffMember | null>(null);
  const [invited, setInvited] = useState<{ email: string; password: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = (action: Promise<unknown>, done: string) =>
    action
      .then(() => {
        setNotice(done);
        refetch();
      })
      .catch((caught) => setNotice(caught instanceof Error ? caught.message : 'That did not work.'));

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Everyone who can sign in to this console. Riders and drivers never appear here."
        actions={
          <Button variant="primary" onClick={() => setInviting(true)}>
            Invite staff
          </Button>
        }
      />
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
      {notice ? (
        <Card>
          <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      {invited ? (
        <Card title="Share this sign-in with them">
          <p className="cell-muted">
            This password is shown once. Send it to {invited.email} privately; they should change it from the top bar
            after signing in.
          </p>
          <div className="row-actions">
            <code className="mono" style={{ fontSize: 16, padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 6 }}>
              {invited.password}
            </code>
            <Button onClick={() => void navigator.clipboard.writeText(invited.password)}>Copy</Button>
            <Button variant="ghost" onClick={() => setInvited(null)}>Done</Button>
          </div>
        </Card>
      ) : null}

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
              { key: 'roles', header: 'Role', render: (row) => row.roles.map((role) => ROLE_LABELS[role as StaffRole] ?? role).join(' · ') },
              { key: 'status', header: 'Status', render: (row) => <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill> },
              { key: 'lastLogin', header: 'Last sign-in', render: (row) => <span className="cell-muted">{row.lastLoginAt ? dateTime(row.lastLoginAt) : 'Never'}</span> },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) =>
                  row.email === session?.email ? (
                    <span className="cell-muted">You</span>
                  ) : (
                    <span className="row-actions">
                      <Button variant="ghost" onClick={() => setChanging(row)}>Change role</Button>
                      {row.status === 'ACTIVE' ? (
                        <Button variant="ghost" onClick={() => run(setStaffEnabled(row.id, false), `${row.email} can no longer sign in.`)}>
                          Disable
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => run(setStaffEnabled(row.id, true), `${row.email} can sign in again.`)}>
                          Enable
                        </Button>
                      )}
                    </span>
                  ),
              },
            ]}
          />
        )}
      </Card>

      {inviting ? (
        <FormDialog
          title="Invite staff"
          body="They get a temporary password to sign in with, shown to you once."
          submitLabel="Create account"
          fields={[
            { name: 'email', label: 'Email', placeholder: 'name@ridex.com' },
            { name: 'firstName', label: 'First name' },
            { name: 'lastName', label: 'Last name', required: false },
            { name: 'role', label: 'Role', initial: 'SUPPORT', options: ROLE_OPTIONS },
          ]}
          onCancel={() => setInviting(false)}
          onSubmit={(values) => {
            setInviting(false);
            inviteStaff({ email: values.email, firstName: values.firstName, lastName: values.lastName, role: values.role as StaffRoleName })
              .then((result) => {
                setInvited({ email: result.staff.email, password: result.temporaryPassword });
                setNotice(null);
                refetch();
              })
              .catch((caught) => setNotice(caught instanceof Error ? caught.message : 'Could not invite.'));
          }}
        />
      ) : null}

      {changing ? (
        <FormDialog
          title={`Role for ${changing.email}`}
          body="They are signed out everywhere so the new role applies straight away."
          submitLabel="Change role"
          fields={[{ name: 'role', label: 'Role', initial: changing.roles[0] ?? 'SUPPORT', options: ROLE_OPTIONS }]}
          onCancel={() => setChanging(null)}
          onSubmit={(values) => {
            const member = changing;
            setChanging(null);
            run(changeStaffRole(member.id, values.role as StaffRoleName), `${member.email} is now ${ROLE_LABELS[values.role as StaffRole]}.`);
          }}
        />
      ) : null}
    </>
  );
}
