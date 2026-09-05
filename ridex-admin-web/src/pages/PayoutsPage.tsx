import { useState } from 'react';

import {
  DEFAULT_PAGE_SIZE,
  failPayout,
  formatMoney,
  listPayouts,
  runPayoutBatch,
  sendPayout,
  settlePayout,
  type Payout,
  type PayoutStatus,
} from '../api/admin';
import { useQuery } from '../api/useQuery';
import { ConfirmWithReason } from '../components/ConfirmWithReason';
import {
  Button,
  Card,
  FilterTabs,
  humanState,
  PageHeader,
  Pagination,
  Pill,
  Table,
  stateTone,
} from '../components/ui';

// 'ALL' is the sentinel for "no filter": a tab strip needs every choice to be a value,
// while the API takes an absent status rather than a magic one.
const FILTERS = ['ALL', 'PENDING', 'PROCESSING', 'PAID', 'FAILED'] as const;
type Filter = (typeof FILTERS)[number];

/** FR-OPS-006 and T13. Adjustments are new dated rows; nothing recalculates a historical figure. */
export function PayoutsPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failing, setFailing] = useState<Payout | null>(null);

  const status = filter === 'ALL' ? undefined : (filter as PayoutStatus);
  const { data, loading, error, refetch } = useQuery(
    () => listPayouts(status, page, size),
    [status, page, size],
  );

  async function act(what: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await what();
      setNotice(message);
      refetch();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Payouts"
        subtitle={data ? `${data.totalItems} batches` : loading ? 'Loading...' : ''}
        actions={
          <Button
            disabled={busy}
            onClick={() =>
              act(async () => {
                const created = await runPayoutBatch();
                setNotice(
                  created.length === 0
                    ? 'Nothing owed. No payouts created.'
                    : `Created ${created.length} payout${created.length === 1 ? '' : 's'}.`,
                );
              }, 'Batch run.')
            }
          >
            Run batch
          </Button>
        }
      />

      {notice ? (
        <Card>
          <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Card
        actions={
          <FilterTabs
            options={FILTERS}
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setPage(0);
            }}
          />
        }
      >
        <Table<Payout>
          columns={[
            {
              key: 'id',
              header: 'Payout',
              render: (row) => <span className="mono">{row.id.slice(-8)}</span>,
            },
            { key: 'driver', header: 'Driver', render: (row) => row.driverEmail },
            {
              key: 'period',
              header: 'Period',
              render: (row) => (
                <span className="cell-muted">
                  {new Date(row.periodStart).toLocaleDateString()} –{' '}
                  {new Date(row.periodEnd).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: 'reference',
              header: 'Reference',
              // The bank's UTR. A settled payout with no reference cannot be traced, which is why
              // the API refuses to settle without one.
              render: (row) =>
                row.reference ? (
                  <span className="mono">{row.reference}</span>
                ) : row.failureReason ? (
                  <span className="cell-muted">{row.failureReason}</span>
                ) : (
                  '—'
                ),
            },
            {
              key: 'state',
              header: 'State',
              render: (row) => <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>,
            },
            {
              key: 'amount',
              header: 'Amount',
              align: 'right',
              render: (row) => (
                <span className="cell-strong">{formatMoney(row.amountMinor, row.currency)}</span>
              ),
            },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (row) => (
                <span className="row-actions">
                  {row.status === 'PENDING' ? (
                    <Button
                      disabled={busy}
                      onClick={() => act(() => sendPayout(row.id), 'Marked as sent to the bank.')}
                    >
                      Send
                    </Button>
                  ) : null}
                  {row.status === 'PENDING' || row.status === 'PROCESSING' ? (
                    <>
                      <Button
                        disabled={busy}
                        onClick={() => {
                          // Typed in rather than generated: this is the reference the bank gave,
                          // and inventing one would make the row untraceable.
                          const reference = window.prompt('Bank reference (UTR) for this transfer');
                          if (reference) {
                            act(() => settlePayout(row.id, reference), 'Settled.');
                          }
                        }}
                      >
                        Settle
                      </Button>
                      <Button disabled={busy} onClick={() => setFailing(row)}>
                        Mark failed
                      </Button>
                    </>
                  ) : null}
                </span>
              ),
            },
          ]}
          rows={data?.items ?? []}
          empty={error ?? (loading ? 'Loading payouts...' : 'No payouts yet. Run a batch.')}
        />

        {data ? (
          <Pagination
            page={data.page}
            size={size}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="payouts"
            onPage={setPage}
            onSize={(next) => {
              setSize(next);
              setPage(0);
            }}
          />
        ) : null}
      </Card>

      {failing ? (
        <ConfirmWithReason
          title={`Mark payout ${failing.id.slice(-8)} as failed?`}
          body={`${formatMoney(failing.amountMinor, failing.currency)} to ${failing.driverEmail}. The earnings in this batch go back to unsettled, so the next run picks them up again.`}
          confirmLabel="Mark failed"
          presets={[
            'Bank returned the transfer, details since corrected',
            'Provider outage during the original run',
          ]}
          onCancel={() => setFailing(null)}
          onConfirm={(reason) => {
            const payout = failing;
            setFailing(null);
            act(() => failPayout(payout.id, reason), 'Marked failed. Earnings released.');
          }}
        />
      ) : null}
    </>
  );
}
