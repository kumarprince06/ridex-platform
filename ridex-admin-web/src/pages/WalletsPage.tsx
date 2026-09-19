import { useState } from 'react';

import { DEFAULT_PAGE_SIZE, listWallets, walletEntries, type DriverWallet, type WalletEntry } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, FilterTabs, PageHeader, Pagination, Pill, SearchInput, Table } from '../components/ui';
import { dateTime } from '../lib/format';

const FILTERS = ['ALL', 'OWING', 'BLOCKED'] as const;
const rupees = (minor: number) => `${minor < 0 ? '-' : ''}₹${(Math.abs(minor) / 100).toLocaleString('en-IN')}`;

/** What each driver owes the platform or is owed, and who is off duty because of it. */
export function WalletsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [open, setOpen] = useState<DriverWallet | null>(null);
  const { data, loading, error } = useQuery(() => listWallets(filter, q, page, size), [filter, q, page, size]);

  return (
    <>
      <PageHeader
        title="Driver wallets"
        subtitle="Cash trips leave drivers owing the platform its commission. Below the wallet limit a driver cannot go on duty until they top up."
      />
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <Card
        actions={
          <span className="row-actions">
            <SearchInput value={q} onChange={(value) => { setQ(value); setPage(0); }} placeholder="Name or email" />
            <FilterTabs options={FILTERS} value={filter} onChange={(value) => { setFilter(value); setPage(0); }} />
          </span>
        }
      >
        <Table<DriverWallet>
          columns={[
            {
              key: 'driver',
              header: 'Driver',
              render: (row) => (
                <>
                  <div className="cell-strong">{row.name ?? row.email}</div>
                  <div className="cell-muted">{row.phone ?? row.email}</div>
                </>
              ),
            },
            {
              key: 'balance',
              header: 'Balance',
              align: 'right',
              render: (row) => (
                <span className="cell-strong" style={{ color: row.balanceMinor < 0 ? 'var(--danger)' : undefined }}>
                  {rupees(row.balanceMinor)}
                </span>
              ),
            },
            {
              key: 'state',
              header: 'Status',
              render: (row) =>
                row.blocked ? <Pill tone="danger">Blocked - must top up</Pill> : row.balanceMinor < 0 ? <Pill tone="warning">Owes</Pill> : <Pill tone="success">OK</Pill>,
            },
            { key: 'duty', header: 'Duty', render: (row) => (row.onDuty ? <Pill tone="success">On duty</Pill> : <span className="cell-muted">Off</span>) },
            { key: 'topup', header: 'Last top-up', render: (row) => <span className="cell-muted">{row.lastTopUpAt ? dateTime(row.lastTopUpAt) : 'Never'}</span> },
          ]}
          rows={data?.items ?? []}
          onRowClick={(row) => setOpen(open?.driverId === row.driverId ? null : row)}
          empty={loading ? 'Loading...' : 'No drivers match.'}
        />
        {data && data.totalItems > size ? (
          <Pagination
            page={page}
            size={size}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="drivers"
            onPage={setPage}
            onSize={(next) => { setSize(next); setPage(0); }}
          />
        ) : null}
      </Card>

      {open ? <Entries wallet={open} /> : null}
    </>
  );
}

function Entries({ wallet }: { wallet: DriverWallet }) {
  const { data, loading } = useQuery(() => walletEntries(wallet.driverId), [wallet.driverId]);
  return (
    <Card title={`Wallet of ${wallet.name ?? wallet.email} · ${rupees(wallet.balanceMinor)}`}>
      <Table<WalletEntry>
        columns={[
          { key: 'when', header: 'When', render: (row) => dateTime(row.createdAt) },
          { key: 'what', header: 'What', render: (row) => row.entryType.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) },
          {
            key: 'amount',
            header: 'Amount',
            align: 'right',
            render: (row) => (
              <span style={{ color: row.direction === 'CREDIT' ? 'var(--success, #15803d)' : 'var(--danger)' }}>
                {row.direction === 'CREDIT' ? '+' : '-'}
                {rupees(row.amountMinor)}
              </span>
            ),
          },
        ]}
        rows={data ?? []}
        empty={loading ? 'Loading...' : 'Nothing on this wallet yet.'}
      />
    </Card>
  );
}
