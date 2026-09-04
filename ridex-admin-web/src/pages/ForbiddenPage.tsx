import { Permission } from '../auth/permissions';
import { useSession } from '../auth/session';
import { Card, PageHeader } from '../components/ui';

/**
 * Names the missing permission and who grants it. "403 Forbidden" tells an operator nothing they
 * can act on, and they raise a ticket that support has to decode.
 */
export function ForbiddenPage({ permission }: { permission: Permission }) {
  const { session } = useSession();

  return (
    <>
      <PageHeader title="You do not have access to this screen" />
      <Card>
        <p>
          This screen needs the <code className="mono">{permission}</code> permission. You are signed
          in as <strong>{session?.email}</strong>, whose role does not include it.
        </p>
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>
          A super admin can grant it under Staff and roles. Access changes are recorded in the audit
          log, including who asked and who approved.
        </p>
      </Card>
    </>
  );
}
