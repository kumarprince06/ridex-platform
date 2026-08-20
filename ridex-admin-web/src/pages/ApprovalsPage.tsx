import { useState } from 'react';

import { ConfirmWithReason } from '../components/ConfirmWithReason';
import {
  Button,
  Card,
  DetailList,
  EmptyState,
  humanState,
  PageHeader,
  Pill,
  stateTone,
  Table,
} from '../components/ui';
import { DRIVERS, DriverDoc } from '../data/mock';

type Pending = { driverId: string; driverName: string; document: DriverDoc };

/**
 * FR-OPS-003. Oldest first, one document at a time, rejection reason mandatory per document.
 *
 * The partner app renders whatever is typed here on its Rejected screen, so "docs unclear" is a
 * driver who cannot fix the problem and a support ticket that lands back here anyway.
 */
export function ApprovalsPage() {
  const [decided, setDecided] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<Pending | null>(null);

  const queue: Pending[] = DRIVERS.filter((driver) => driver.onboarding === 'UNDER_REVIEW').flatMap(
    (driver) =>
      driver.documents
        .filter((document) => document.status === 'UNDER_REVIEW')
        .map((document) => ({ driverId: driver.id, driverName: driver.name, document })),
  );

  const key = (item: Pending) => `${item.driverId}:${item.document.type}`;
  const outstanding = queue.filter((item) => !decided[key(item)]);

  return (
    <>
      <PageHeader
        title="Driver approvals"
        subtitle={`${outstanding.length} documents waiting, oldest first`}
      />

      {DRIVERS.filter((driver) => driver.onboarding === 'UNDER_REVIEW').map((driver) => (
        <Card
          key={driver.id}
          title={`${driver.name} · ${driver.id}`}
          actions={<Pill tone={stateTone(driver.onboarding)}>{humanState(driver.onboarding)}</Pill>}
        >
          <DetailList
            items={[
              { label: 'Vehicle', value: `${driver.vehicle} · ${driver.plate}` },
              { label: 'City', value: driver.city },
              { label: 'Submitted', value: driver.submitted },
            ]}
          />

          <div style={{ marginTop: 'var(--space-4)' }}>
            <Table
              columns={[
                { key: 'type', header: 'Document', render: (row: DriverDoc) => row.type },
                { key: 'detail', header: 'Detail', render: (row) => <span className="cell-muted">{row.detail}</span> },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => {
                    const decision = decided[`${driver.id}:${row.type}`];
                    if (decision === 'approved') return <Pill tone="success">Approved</Pill>;
                    if (decision) return <Pill tone="danger">Rejected</Pill>;
                    return <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>;
                  },
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (row) => {
                    if (row.status !== 'UNDER_REVIEW' || decided[`${driver.id}:${row.type}`]) {
                      return null;
                    }
                    return (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button
                          variant="primary"
                          onClick={() =>
                            setDecided((prev) => ({ ...prev, [`${driver.id}:${row.type}`]: 'approved' }))
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setRejecting({ driverId: driver.id, driverName: driver.name, document: row })}
                        >
                          Reject
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
              rows={driver.documents}
            />
          </div>
        </Card>
      ))}

      {queue.length === 0 ? (
        <EmptyState title="Nothing waiting">Every submitted document has been reviewed.</EmptyState>
      ) : null}

      {rejecting ? (
        <ConfirmWithReason
          title={`Reject ${rejecting.document.type}?`}
          body={`${rejecting.driverName} sees this reason word for word in the partner app, and re-uploads against it.`}
          confirmLabel="Reject document"
          danger
          presets={[
            'The expiry date is not readable in the photo',
            'The document has already expired',
            'The name does not match the profile',
            'The plate does not match the vehicle on file',
          ]}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => {
            setDecided((prev) => ({ ...prev, [key(rejecting)]: reason }));
            setRejecting(null);
          }}
        />
      ) : null}
    </>
  );
}
