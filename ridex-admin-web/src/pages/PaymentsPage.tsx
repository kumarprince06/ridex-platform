import { useNavigate } from 'react-router-dom';

import { Card, humanState, PageHeader, Pill, Table, stateTone } from '../components/ui';
import { Payment, PAYMENTS } from '../data/mock';

/** FR-OPS-006. Provider references are shown because they are what an engineer will ask for. */
export function PaymentsPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Payments" subtitle="Trip-scoped payments and their provider references" />

      <Card>
        <Table<Payment>
          columns={[
            { key: 'id', header: 'Payment', render: (row) => <span className="mono">{row.id}</span> },
            { key: 'trip', header: 'Trip', render: (row) => <span className="mono">{row.tripId}</span> },
            { key: 'rider', header: 'Rider', render: (row) => row.rider },
            { key: 'method', header: 'Method', render: (row) => row.method },
            { key: 'provider', header: 'Provider ref', render: (row) => <span className="mono cell-muted">{row.providerRef}</span> },
            { key: 'state', header: 'State', render: (row) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
            { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span className="cell-strong">{row.amount}</span> },
          ]}
          rows={PAYMENTS}
          onRowClick={(row) => navigate(`/payments/${row.id}`)}
        />
      </Card>
    </>
  );
}
