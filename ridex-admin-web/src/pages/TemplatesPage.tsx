import { Card, PageHeader, Pill, Table } from '../components/ui';
import { Template, TEMPLATES } from '../data/mock';

/** FR-PLAT-003. Templates are versioned; the outbox sends whatever version was live at the time. */
export function TemplatesPage() {
  return (
    <>
      <PageHeader title="Notification templates" subtitle="Email, push and SMS copy per platform event" />

      <Card>
        <Table<Template>
          columns={[
            { key: 'name', header: 'Template', render: (row) => <span className="cell-strong">{row.name}</span> },
            { key: 'channel', header: 'Channel', render: (row) => <Pill tone="info">{row.channel}</Pill> },
            { key: 'event', header: 'Triggered by', render: (row) => <span className="mono">{row.event}</span> },
            { key: 'updated', header: 'Last updated', render: (row) => <span className="cell-muted">{row.updated}</span> },
          ]}
          rows={TEMPLATES}
        />
      </Card>
    </>
  );
}
