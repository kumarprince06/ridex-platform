import { useState } from 'react';

import { ROLE_LABELS, ROLE_PERMISSIONS } from '../auth/permissions';
import { useSession } from '../auth/session';
import { ConfirmWithReason } from '../components/ConfirmWithReason';
import { Button, Card, humanState, PageHeader, Pill, Table, stateTone } from '../components/ui';
import { STAFF, StaffMember } from '../data/mock';

/**
 * Role assignment is super-admin only, and a super admin changing their own row is refused: the
 * one control that stops a compromised account quietly promoting itself is that somebody else has
 * to do it.
 */
export function StaffPage() {
  const { session } = useSession();
  const [changing, setChanging] = useState<StaffMember | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Staff and roles"
        subtitle="Console accounts. Riders and drivers never appear here."
        actions={<Button variant="primary">Invite staff</Button>}
      />

      {notice ? (
        <Card>
          <strong>Recorded.</strong> <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Card>
        <Table<StaffMember>
          columns={[
            { key: 'name', header: 'Name', render: (row) => (
              <>
                <div className="cell-strong">{row.name}</div>
                <div className="cell-muted">{row.email}</div>
              </>
            ) },
            { key: 'role', header: 'Role', render: (row) => (
              <>
                <div>{ROLE_LABELS[row.role]}</div>
                <div className="cell-muted mono">{ROLE_PERMISSIONS[row.role].join(' · ')}</div>
              </>
            ) },
            { key: 'status', header: 'Status', render: (row) => <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill> },
            { key: 'lastActive', header: 'Last active', render: (row) => <span className="cell-muted">{row.lastActive}</span> },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (row) => {
                const isSelf = row.email === session?.email;
                return isSelf ? (
                  <span className="cell-muted">Cannot change your own role</span>
                ) : (
                  <Button onClick={() => setChanging(row)}>Change role</Button>
                );
              },
            },
          ]}
          rows={STAFF}
        />
      </Card>

      {changing ? (
        <ConfirmWithReason
          title={`Change the role for ${changing.name}?`}
          body="Permissions change on their next sign-in. Both the old and new role are written to the audit log."
          confirmLabel="Change role"
          presets={['Moved to the finance team', 'Temporary cover for annual leave', 'Offboarding: reducing access']}
          onCancel={() => setChanging(null)}
          onConfirm={(reason) => {
            setNotice(`Audit entry written against ${changing.email}: “${reason}”`);
            setChanging(null);
          }}
        />
      ) : null}
    </>
  );
}
