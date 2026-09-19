import { useState } from 'react';
import { date } from '../lib/format';

import { changeRideFare, listRideFares, listSettings, updateSetting, type RideFare, type Setting } from '../api/admin';
import { FormDialog } from '../components/FormDialog';
import { ApiError } from '../api/problem';
import { useQuery } from '../api/useQuery';
import { Button, Card, PageHeader, Table } from '../components/ui';

/**
 * Platform values operations can change without a deploy.
 *
 * Every change is audited. These numbers decide what people earn and pay, so "who set the
 * commission to 40% last Tuesday" has to be answerable.
 */
/** Settings grouped the way operations thinks about them, by what they change. */
const GROUPS: { title: string; about: string; match: (key: string) => boolean }[] = [
  { title: 'Commission', about: 'What the platform keeps from every fare.', match: (key) => key.startsWith('payments.') },
  {
    title: 'Cancellations and no-shows',
    about: 'Who pays when a ride is cancelled, and how much of it reaches the driver.',
    match: (key) => key.startsWith('cancellation.') || key.startsWith('driver.cancel.') || key.startsWith('driver.no-show.'),
  },
  { title: 'Driver wallet', about: 'How far a driver can owe the platform before going off duty.', match: (key) => key.startsWith('driver.wallet.') },
  {
    title: 'Referrals',
    about: 'Rewards for bringing in riders and drivers.',
    match: (key) => key.startsWith('referrals.') || key.startsWith('points.referral'),
  },
  { title: 'Points', about: 'How riders earn and spend points.', match: (key) => key.startsWith('points.') },
];

const rupees = (value: number) => `${value < 0 ? '-' : ''}₹${Math.abs(value).toLocaleString('en-IN')}`;

/** The stored value in the unit a person reads: 0.80 is 80%, 300 seconds is 5 min, 50000 paise is Rs 500. */
function readable(setting: Setting): string {
  const value = Number(setting.value);
  if (Number.isNaN(value)) return setting.value;
  if (/rate|share/.test(setting.key)) return `${Math.round(value * 100)}%`;
  if (setting.key.endsWith('-seconds')) return value >= 60 && value % 60 === 0 ? `${value / 60} min` : `${value} s`;
  if (setting.key.endsWith('-minor')) return rupees(value / 100);
  if (/\(Rs\)/.test(setting.label) || setting.key.endsWith('.penalty') || setting.key.endsWith('min-balance')) {
    return rupees(value);
  }
  return value.toLocaleString('en-IN');
}

export function PricingPage() {
  const { data, loading, error, refetch } = useQuery(() => listSettings(), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(key: string) {
    setBusy(true);
    setSaveError(null);
    try {
      await updateSetting(key, draft);
      setEditing(null);
      refetch();
    } catch (caught) {
      // Bounds are enforced by the server, so "Maximum is 0.5" arrives from there.
      setSaveError(caught instanceof ApiError ? caught.userMessage : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Fares and fees"
        subtitle="Changes take effect immediately and are recorded in the audit log"
      />

      {saveError ? <p style={{ color: 'var(--danger)' }}>{saveError}</p> : null}
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <CabFares />
      {loading && !data ? <p className="cell-muted">Loading...</p> : null}

      {GROUPS.map((group, index) => {
        // First matching group wins, so referral points are not listed again under Points.
        const rows = (data ?? []).filter(
          (setting) => group.match(setting.key) && GROUPS.findIndex((other) => other.match(setting.key)) === index,
        );
        return rows.length === 0 ? null : (
      <Card key={group.title} title={group.title} actions={<span className="cell-muted">{group.about}</span>}>
        <Table<Setting>
          columns={[
            { key: 'label', header: 'Setting', render: (row) => (
              <>
                <div className="cell-strong">{row.label}</div>
                <div className="cell-muted">{row.description}</div>
              </>
            ) },
            { key: 'value', header: 'Value', align: 'right', render: (row) =>
              editing === row.key ? (
                <input
                  className="field-input"
                  style={{ width: 120, height: 32 }}
                  value={draft}
                  autoFocus
                  onChange={(event) => setDraft(event.target.value)}
                />
              ) : (
                <span className="cell-strong">{readable(row)}</span>
              ) },
            { key: 'range', header: 'Allowed', align: 'right', render: (row) =>
              row.minValue != null || row.maxValue != null ? (
                <span className="cell-muted mono">
                  {row.minValue ?? '—'} to {row.maxValue ?? '—'}
                </span>
              ) : '—' },
            { key: 'updated', header: 'Last changed', render: (row) => (
              <span className="cell-muted">{date(row.updatedAt)}</span>
            ) },
            { key: 'actions', header: '', align: 'right', render: (row) =>
              editing === row.key ? (
                <span style={{ display: 'inline-flex', gap: 8 }}>
                  <Button variant="secondary" disabled={busy} onClick={() => void save(row.key)}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(row.key);
                    setDraft(row.value);
                    setSaveError(null);
                  }}
                >
                  Change
                </Button>
              ) },
          ]}
          rows={rows}
        />
      </Card>
        );
      })}
    </>
  );
}

const rupee = (minor: number | null) => (minor == null ? '—' : `₹${(minor / 100).toLocaleString('en-IN')}`);

/** Go, Comfort and XL: what a cab ride costs. A change applies to every estimate from now on. */
function CabFares() {
  const { data, error, refetch } = useQuery(() => listRideFares(), []);
  const [editing, setEditing] = useState<RideFare | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <Card title="Cab fares" actions={<span className="cell-muted">Every estimate from the moment you save uses the new fare.</span>}>
      {notice ? <p className="cell-muted">{notice}</p> : null}
      <Table<RideFare>
        columns={[
          { key: 'type', header: 'Ride type', render: (row) => <span className="cell-strong">{row.displayName}</span> },
          { key: 'base', header: 'Base', align: 'right', render: (row) => rupee(row.baseFareMinor) },
          { key: 'km', header: 'Per km', align: 'right', render: (row) => rupee(row.perKmMinor) },
          { key: 'min', header: 'Per minute', align: 'right', render: (row) => rupee(row.perMinuteMinor) },
          { key: 'minimum', header: 'Minimum', align: 'right', render: (row) => rupee(row.minimumFareMinor) },
          {
            key: 'wait',
            header: 'Waiting',
            align: 'right',
            render: (row) =>
              row.freeWaitingSeconds == null ? '—' : `${row.freeWaitingSeconds / 60} min free, then ${rupee(row.perWaitingMinuteMinor)}/min`,
          },
          { key: 'since', header: 'Since', render: (row) => <span className="cell-muted">{row.validFrom ? date(row.validFrom) : '—'}</span> },
          { key: 'edit', header: '', align: 'right', render: (row) => <Button variant="ghost" onClick={() => setEditing(row)}>Change</Button> },
        ]}
        rows={data ?? []}
        empty={error ?? 'Loading...'}
      />
      {editing ? (
        <FormDialog
          title={`${editing.displayName} fare`}
          body="In rupees. A 10 km, 25 minute trip is shown below the fields as you type."
          submitLabel="Save fare"
          fields={[
            { name: 'base', label: 'Base fare (₹)', type: 'number', initial: String((editing.baseFareMinor ?? 0) / 100) },
            { name: 'km', label: 'Per km (₹)', type: 'number', initial: String((editing.perKmMinor ?? 0) / 100) },
            { name: 'minute', label: 'Per minute (₹)', type: 'number', initial: String((editing.perMinuteMinor ?? 0) / 100) },
            { name: 'minimum', label: 'Minimum fare (₹)', type: 'number', initial: String((editing.minimumFareMinor ?? 0) / 100) },
            { name: 'freeWait', label: 'Free waiting (minutes)', type: 'number', initial: String((editing.freeWaitingSeconds ?? 300) / 60) },
            { name: 'waitRate', label: 'Waiting after that, per minute (₹)', type: 'number', initial: String((editing.perWaitingMinuteMinor ?? 0) / 100) },
          ]}
          extra={(values) => {
            const trip = Number(values.base) + 10 * Number(values.km) + 25 * Number(values.minute);
            return (
              <p className="cell-muted">
                Example 10 km, 25 min trip: ₹{Math.max(trip, Number(values.minimum)).toFixed(2)}
              </p>
            );
          }}
          onCancel={() => setEditing(null)}
          onSubmit={(values) => {
            const type = editing;
            setEditing(null);
            const paise = (value: string) => Math.round(Number(value || 0) * 100);
            changeRideFare(type.rideTypeId, {
              baseFareMinor: paise(values.base),
              perKmMinor: paise(values.km),
              perMinuteMinor: paise(values.minute),
              minimumFareMinor: paise(values.minimum),
              freeWaitingSeconds: Math.round(Number(values.freeWait || 0) * 60),
              perWaitingMinuteMinor: paise(values.waitRate),
            })
              .then(() => {
                setNotice(`${type.displayName} fare updated.`);
                refetch();
              })
              .catch((caught) => setNotice(caught instanceof Error ? caught.message : 'Could not save that fare.'));
          }}
        />
      ) : null}
    </Card>
  );
}

