import { useState } from 'react';

import { approveDriver, driversAwaitingReview, rejectDriver } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { ConfirmWithReason } from '../components/ConfirmWithReason';
import { Button, Card, EmptyState, PageHeader, Pill, Table, humanState, stateTone } from '../components/ui';

type Pending = { driverId: string; email: string; status: string; eligibleToDrive: boolean };

/**
 * FR-OPS-003. Oldest first, rejection reason mandatory.
 *
 * Reviews the whole application, not document by document: the backend has no document review yet
 * (T7), and a per-document UI over a per-driver API would be a decision the server never recorded.
 *
 * The reason is shown to the driver word for word, so "docs unclear" is a driver who cannot fix
 * the problem and a support ticket that lands back here anyway.
 */
export function ApprovalsPage() {
  const { data, loading, error, refetch } = useQuery(() => driversAwaitingReview(), []);
  const [rejecting, setRejecting] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const queue = data ?? [];

  async function decide(driverId: string, action: () => Promise<unknown>) {
    setBusy(driverId);
    setFailure(null);
    try {
      await action();
      refetch();
    } catch {
      setFailure('That decision did not go through. Nothing was changed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Driver approvals"
        subtitle={loading ? 'Loading...' : `${queue.length} applications waiting, oldest first`}
      />

      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
      {failure ? <p style={{ color: 'var(--danger)' }}>{failure}</p> : null}

      {queue.length > 0 ? (
        <Card>
          <Table<Pending>
            columns={[
              { key: 'driverId', header: 'Driver', render: (row) => <span className="mono">{row.driverId.slice(-8)}</span> },
              { key: 'email', header: 'Account', render: (row) => <span className="cell-strong">{row.email}</span> },
              { key: 'status', header: 'Status', render: (row) => (
                <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>
              ) },
              { key: 'actions', header: '', align: 'right', render: (row) => (
                <span style={{ display: 'inline-flex', gap: 8 }}>
                  <Button
                    variant="secondary"
                    disabled={busy === row.driverId}
                    onClick={() => void decide(row.driverId, () => approveDriver(row.driverId))}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy === row.driverId}
                    onClick={() => setRejecting(row)}
                  >
                    Reject
                  </Button>
                </span>
              ) },
            ]}
            rows={queue}
            empty="Nothing waiting."
          />
        </Card>
      ) : null}

      {!loading && queue.length === 0 ? (
        <EmptyState title="Nothing waiting">
          Every submitted application has been reviewed.
        </EmptyState>
      ) : null}

      {rejecting ? (
        <ConfirmWithReason
          title={`Reject ${rejecting.email}?`}
          body="The driver sees this reason word for word in the partner app, and re-applies against it. Rejection is final for this application."
          confirmLabel="Reject application"
          danger
          presets={[
            'The expiry date is not readable in the photo',
            'The document has already expired',
            'The name does not match the profile',
            'The plate does not match the vehicle on file',
          ]}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => {
            const target = rejecting;
            setRejecting(null);
            void decide(target.driverId, () => rejectDriver(target.driverId, reason));
          }}
        />
      ) : null}
    </>
  );
}
