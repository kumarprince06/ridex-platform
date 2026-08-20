import { useState } from 'react';

import { ConfirmWithReason } from '../components/ConfirmWithReason';
import { Button, Card, PageHeader, Pill, Table } from '../components/ui';
import { RIDE_TYPES, RideType, SURGE, SurgeWindow } from '../data/mock';

/** FR-OPS-005, FR-PLAT-001, FR-PLAT-002. Every change is versioned and attributed. */
export function PricingPage() {
  const [editing, setEditing] = useState<RideType | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Pricing and ride types"
        subtitle="Changes take effect on the next fare estimate, never on a trip already quoted"
      />

      {notice ? (
        <Card>
          <strong>Recorded.</strong> <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Card title="Ride types">
        <Table<RideType>
          columns={[
            { key: 'name', header: 'Ride type', render: (row) => (
              <>
                <div className="cell-strong">{row.name}</div>
                <div className="cell-muted mono">{row.id}</div>
              </>
            ) },
            { key: 'seats', header: 'Seats', align: 'right', render: (row) => row.seats },
            { key: 'base', header: 'Base', align: 'right', render: (row) => row.base },
            { key: 'perKm', header: 'Per km', align: 'right', render: (row) => row.perKm },
            { key: 'perMin', header: 'Per min', align: 'right', render: (row) => row.perMin },
            { key: 'minFare', header: 'Minimum', align: 'right', render: (row) => row.minFare },
            { key: 'cancelFee', header: 'Cancel fee', align: 'right', render: (row) => row.cancelFee },
            { key: 'active', header: 'State', render: (row) => <Pill tone={row.active ? 'success' : 'default'}>{row.active ? 'Active' : 'Disabled'}</Pill> },
            { key: 'edit', header: '', align: 'right', render: (row) => <Button onClick={() => setEditing(row)}>Edit</Button> },
          ]}
          rows={RIDE_TYPES}
        />
      </Card>

      <Card title="Surge windows">
        <Table<SurgeWindow>
          columns={[
            { key: 'area', header: 'Area', render: (row) => row.area },
            { key: 'days', header: 'Days', render: (row) => row.days },
            { key: 'hours', header: 'Hours', render: (row) => row.hours },
            { key: 'multiplier', header: 'Multiplier', align: 'right', render: (row) => <span className="cell-strong">{row.multiplier}</span> },
            { key: 'active', header: 'State', render: (row) => <Pill tone={row.active ? 'success' : 'default'}>{row.active ? 'Active' : 'Off'}</Pill> },
          ]}
          rows={SURGE}
        />
      </Card>

      {editing ? (
        <ConfirmWithReason
          title={`Change pricing for ${editing.name}?`}
          body="Pricing changes are versioned. Trips already quoted keep the fare they were quoted, so nothing in flight moves."
          confirmLabel="Save pricing"
          presets={['Fuel cost adjustment approved by finance', 'Matching competitor pricing in this city', 'Correcting a data entry error']}
          onCancel={() => setEditing(null)}
          onConfirm={(reason) => {
            setNotice(`Audit entry written against ride type ${editing.id}: “${reason}”`);
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}
