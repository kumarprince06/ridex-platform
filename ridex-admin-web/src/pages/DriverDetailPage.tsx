import { useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  DOCUMENT_LABELS,
  VEHICLE_LABELS,
  approveDocument,
  approveDriver,
  approveVehicle,
  driverDocuments,
  driverVehicles,
  getDriver,
  openDocument,
  rejectDocument,
  rejectVehicle,
  suspendDriver,
  type DriverDocument,
  type Vehicle,
} from '../api/admin';
import { useQuery } from '../api/useQuery';
import { useSession } from '../auth/session';
import { ConfirmWithReason } from '../components/ConfirmWithReason';
import {
  Button,
  Card,
  DetailList,
  Grid,
  humanState,
  PageHeader,
  Pill,
  StatTile,
  stateTone,
  Table,
} from '../components/ui';

export function DriverDetailPage() {
  const { driverId = '' } = useParams();
  const { can } = useSession();

  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<'suspend' | 'reject-document' | null>(null);
  const [rejecting, setRejecting] = useState<DriverDocument | null>(null);

  const { data: driver, loading, error, refetch } = useQuery(() => getDriver(driverId), [driverId]);
  const documents = useQuery(() => driverDocuments(driverId), [driverId]);
  const vehicles = useQuery(() => driverVehicles(driverId), [driverId]);

  async function act(what: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await what();
      setNotice(message);
      refetch();
      documents.refetch();
      vehicles.refetch();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  if (!driver) {
    return (
      <PageHeader
        title={loading ? 'Loading driver…' : 'Driver not found'}
        subtitle={error ?? `No account with ID ${driverId}`}
      />
    );
  }

  const name = [driver.firstName, driver.lastName].filter(Boolean).join(' ') || driver.email;
  const suspended = driver.onboardingStatus === 'SUSPENDED';
  const activeVehicle = (vehicles.data ?? []).find((vehicle) => vehicle.status === 'ACTIVE');

  return (
    <>
      <PageHeader
        title={name}
        subtitle={`${driver.driverId} · joined ${new Date(driver.joinedAt).toLocaleDateString()}`}
        actions={
          can('OPERATIONS') ? (
            <span className="row-actions">
              {driver.onboardingStatus === 'UNDER_REVIEW' ? (
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => act(() => approveDriver(driver.driverId), 'Driver approved.')}
                >
                  Approve driver
                </Button>
              ) : null}
              {!suspended ? (
                <Button variant="danger" disabled={busy} onClick={() => setConfirming('suspend')}>
                  Suspend driver
                </Button>
              ) : null}
            </span>
          ) : null
        }
      />

      {notice ? (
        <Card>
          <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Grid columns={4}>
        <StatTile
          label="Onboarding"
          value={humanState(driver.onboardingStatus)}
          tone={stateTone(driver.onboardingStatus)}
        />
        {/* Null is not zero: a driver nobody has rated has no rating, and 0.00 reads as the worst. */}
        <StatTile
          label="Rating"
          value={driver.rating != null ? Number(driver.rating).toFixed(2) : '—'}
          note={`${driver.ratingCount} ratings`}
        />
        <StatTile
          label="Duty"
          value={driver.onDuty ? 'On duty' : 'Off duty'}
          tone={driver.onDuty ? 'success' : 'default'}
        />
        {/* The one that decides whether dispatch can place them - and the reason it usually cannot. */}
        <StatTile
          label="Approved vehicle"
          value={activeVehicle ? VEHICLE_LABELS[activeVehicle.vehicleType] : 'None'}
          note={activeVehicle ? `${activeVehicle.seatCapacity} seats` : 'Cannot go on duty'}
          tone={activeVehicle ? 'success' : 'warning'}
        />
      </Grid>

      <Card title="Profile">
        <DetailList
          items={[
            { label: 'Email', value: driver.email },
            { label: 'Phone', value: driver.phone ?? '—' },
            { label: 'Driver ID', value: <span className="mono">{driver.driverId}</span> },
          ]}
        />
      </Card>

      <Card title="Vehicles">
        <Table<Vehicle>
          columns={[
            {
              key: 'vehicle',
              header: 'Vehicle',
              render: (row) => (
                <>
                  <div className="cell-strong">
                    {row.make} {row.model}
                  </div>
                  <div className="cell-muted">
                    {VEHICLE_LABELS[row.vehicleType]} · {row.manufactureYear}
                    {row.color ? ` · ${row.color}` : ''}
                  </div>
                </>
              ),
            },
            {
              key: 'plate',
              header: 'Plate',
              render: (row) => <span className="mono">{row.registrationNumber}</span>,
            },
            { key: 'seats', header: 'Seats', align: 'right', render: (row) => row.seatCapacity },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>,
            },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (row) =>
                can('OPERATIONS') && row.status === 'PENDING_REVIEW' ? (
                  <span className="row-actions">
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => act(() => approveVehicle(row.id), 'Vehicle approved.')}
                    >
                      Approve
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() => act(() => rejectVehicle(row.id), 'Vehicle rejected.')}
                    >
                      Reject
                    </Button>
                  </span>
                ) : null,
            },
          ]}
          rows={vehicles.data ?? []}
          empty={
            vehicles.error ??
            (vehicles.loading ? 'Loading vehicles…' : 'No vehicle added yet.')
          }
        />
      </Card>

      <Card title="Documents">
        <Table<DriverDocument>
          columns={[
            {
              key: 'type',
              header: 'Document',
              render: (row) => (
                <span className="cell-strong">{DOCUMENT_LABELS[row.documentType]}</span>
              ),
            },
            {
              key: 'expiry',
              header: 'Expires',
              // Expiry is the field that turns an approved document invalid without anybody
              // touching it, so it gets its own column rather than hiding in a detail line.
              render: (row) =>
                row.expiresAt ? (
                  new Date(row.expiresAt).toLocaleDateString()
                ) : (
                  <span className="cell-muted">No expiry</span>
                ),
            },
            {
              key: 'submitted',
              header: 'Submitted',
              render: (row) => (
                <span className="cell-muted">{new Date(row.createdAt).toLocaleDateString()}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <>
                  <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>
                  {row.reviewNotes ? <div className="cell-muted">{row.reviewNotes}</div> : null}
                </>
              ),
            },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (row) => (
                <span className="row-actions">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      openDocument(row.id).catch(() => setNotice('That document could not be opened.'))
                    }
                  >
                    View
                  </Button>
                  {can('OPERATIONS') && row.status === 'PENDING_REVIEW' ? (
                    <>
                      <Button
                        variant="primary"
                        disabled={busy}
                        onClick={() => act(() => approveDocument(row.id), 'Document approved.')}
                      >
                        Approve
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => {
                          setRejecting(row);
                          setConfirming('reject-document');
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </span>
              ),
            },
          ]}
          rows={documents.data ?? []}
          empty={
            documents.error ??
            (documents.loading ? 'Loading documents…' : 'Nothing submitted yet.')
          }
        />
      </Card>

      {confirming === 'suspend' ? (
        <ConfirmWithReason
          title={`Suspend ${name}?`}
          body="They go off duty and out of the dispatch pool immediately. Any trip already in progress is unaffected."
          confirmLabel="Suspend driver"
          danger
          presets={['Document expired and not renewed', 'Safety complaint under investigation']}
          onCancel={() => setConfirming(null)}
          onConfirm={(reason) => {
            setConfirming(null);
            act(() => suspendDriver(driver.driverId, reason), 'Driver suspended.');
          }}
        />
      ) : null}

      {confirming === 'reject-document' && rejecting ? (
        <ConfirmWithReason
          title={`Reject ${DOCUMENT_LABELS[rejecting.documentType]}?`}
          body="The driver sees this reason and can upload a replacement, which comes back for review."
          confirmLabel="Reject document"
          danger
          presets={['Photo is blurred or cropped', 'Name does not match the account']}
          onCancel={() => {
            setConfirming(null);
            setRejecting(null);
          }}
          onConfirm={(reason) => {
            const document = rejecting;
            setConfirming(null);
            setRejecting(null);
            act(() => rejectDocument(document.id, reason), 'Document rejected.');
          }}
        />
      ) : null}
    </>
  );
}
