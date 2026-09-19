import { useState } from 'react';
import { date } from '../lib/format';

import { listSettings, updateSetting, type Setting } from '../api/admin';
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
