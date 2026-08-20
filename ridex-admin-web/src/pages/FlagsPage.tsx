import { useState } from 'react';

import { ConfirmWithReason } from '../components/ConfirmWithReason';
import { Button, Card, humanState, PageHeader, Pill, Table, stateTone } from '../components/ui';
import { FeatureFlag, FLAGS } from '../data/mock';

/** FR-PLAT-004. Who changed it last is a column, because that is the first question after an incident. */
export function FlagsPage() {
  const [toggling, setToggling] = useState<FeatureFlag | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <PageHeader title="Feature flags" subtitle="Platform behaviour that can change without a deploy" />

      {notice ? (
        <Card>
          <strong>Recorded.</strong> <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Card>
        <Table<FeatureFlag>
          columns={[
            { key: 'key', header: 'Flag', render: (row) => (
              <>
                <div className="mono cell-strong">{row.key}</div>
                <div className="cell-muted">{row.description}</div>
              </>
            ) },
            { key: 'state', header: 'State', render: (row) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
            { key: 'rollout', header: 'Rollout', render: (row) => row.rollout },
            { key: 'updatedBy', header: 'Changed by', render: (row) => <span className="cell-muted">{row.updatedBy}</span> },
            { key: 'action', header: '', align: 'right', render: (row) => (
              <Button variant={row.state === 'ON' ? 'danger' : 'primary'} onClick={() => setToggling(row)}>
                {row.state === 'ON' ? 'Turn off' : 'Turn on'}
              </Button>
            ) },
          ]}
          rows={FLAGS}
        />
      </Card>

      {toggling ? (
        <ConfirmWithReason
          title={`${toggling.state === 'ON' ? 'Turn off' : 'Turn on'} ${toggling.key}?`}
          body="Flag changes apply immediately to every request that reads them. There is no deploy to roll back."
          confirmLabel={toggling.state === 'ON' ? 'Turn off' : 'Turn on'}
          danger={toggling.state === 'ON'}
          presets={['Pilot completed successfully in this city', 'Rolling back after an incident', 'Enabling for a scheduled test window']}
          onCancel={() => setToggling(null)}
          onConfirm={(reason) => {
            setNotice(`Audit entry written against ${toggling.key}: “${reason}”`);
            setToggling(null);
          }}
        />
      ) : null}
    </>
  );
}
