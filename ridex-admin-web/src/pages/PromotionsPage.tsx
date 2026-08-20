import { Card, PageHeader, Pill, Table } from '../components/ui';
import { Promotion, PROMOTIONS } from '../data/mock';

/** FR-OPS-009. */
export function PromotionsPage() {
  return (
    <>
      <PageHeader title="Promotions" subtitle="Codes, their caps and what they have cost so far" />

      <Card>
        <Table<Promotion>
          columns={[
            { key: 'code', header: 'Code', render: (row) => <span className="mono cell-strong">{row.code}</span> },
            { key: 'description', header: 'Description', render: (row) => row.description },
            { key: 'discount', header: 'Discount', align: 'right', render: (row) => row.discount },
            { key: 'uses', header: 'Redemptions', align: 'right', render: (row) => (
              <>
                <span className="cell-strong">{row.uses.toLocaleString()}</span>
                <span className="cell-muted"> / {row.cap.toLocaleString()}</span>
              </>
            ) },
            { key: 'expires', header: 'Expires', render: (row) => row.expires },
            { key: 'state', header: 'State', render: (row) => (
              <Pill tone={row.active ? 'success' : 'default'}>{row.active ? 'Active' : 'Ended'}</Pill>
            ) },
          ]}
          rows={PROMOTIONS}
        />
      </Card>
    </>
  );
}
