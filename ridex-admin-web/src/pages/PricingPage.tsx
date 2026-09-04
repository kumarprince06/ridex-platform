import { useState } from 'react';

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
        title="Pricing and rewards"
        subtitle="Changes take effect immediately and are recorded in the audit log"
      />

      {saveError ? <p style={{ color: 'var(--danger)' }}>{saveError}</p> : null}

      <Card>
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
                <span className="cell-strong mono">{row.value}</span>
              ) },
            { key: 'range', header: 'Allowed', align: 'right', render: (row) =>
              row.minValue != null || row.maxValue != null ? (
                <span className="cell-muted">
                  {row.minValue ?? '—'} to {row.maxValue ?? '—'}
                </span>
              ) : '—' },
            { key: 'updated', header: 'Last changed', render: (row) => (
              <span className="cell-muted">{new Date(row.updatedAt).toLocaleDateString()}</span>
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
          rows={data ?? []}
          empty={error ?? (loading ? 'Loading...' : 'No settings.')}
        />
      </Card>
    </>
  );
}
