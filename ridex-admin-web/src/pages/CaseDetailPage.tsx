import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getTicket, replyToTicket, resolveTicket } from '../api/admin';
import { ApiError } from '../api/problem';
import { useQuery } from '../api/useQuery';
import { Button, Card, humanState, PageHeader, Pill, stateTone } from '../components/ui';
import { ConfirmWithReason } from '../components/ConfirmWithReason';

/** The conversation is the case. A status with no thread is a queue entry, not support. */
export function CaseDetailPage() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { data: ticket, loading, error, refetch } = useQuery(() => getTicket(caseId), [caseId]);

  const [draft, setDraft] = useState('');
  const [internal, setInternal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function send() {
    if (!draft.trim()) return;
    setBusy(true);
    setFailure(null);
    try {
      await replyToTicket(caseId, draft.trim(), internal);
      setDraft('');
      refetch();
    } catch (caught) {
      setFailure(caught instanceof ApiError ? caught.userMessage : 'Could not send.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageHeader title="Loading..." />;
  if (error || !ticket) return <PageHeader title="Not found" subtitle={error ?? ''} />;

  return (
    <>
      <PageHeader
        title={ticket.subject}
        subtitle={`${humanState(ticket.category)} · raised by ${ticket.raisedByEmail ?? 'unknown'}`}
        actions={
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <Pill tone={stateTone(ticket.status)}>{humanState(ticket.status)}</Pill>
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' ? (
              <Button variant="secondary" onClick={() => setResolving(true)}>Resolve</Button>
            ) : null}
          </span>
        }
      />

      {failure ? <p style={{ color: 'var(--danger)' }}>{failure}</p> : null}

      <Card title="Conversation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
          {ticket.messages.map((message) => (
            <div
              key={message.id}
              style={{
                alignSelf: message.fromSupport ? 'flex-end' : 'flex-start',
                maxWidth: '72%',
                padding: '10px 14px',
                borderRadius: 12,
                // Internal notes look different on purpose: an agent must never mistake one for
                // something the customer can read.
                background: message.internal
                  ? 'var(--warning-surface)'
                  : message.fromSupport
                    ? 'var(--primary-surface)'
                    : 'var(--surface-alt)',
                border: message.internal ? '1px dashed var(--warning)' : '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                {humanState(message.authorRole)}
                {message.internal ? ' · internal note' : ''}
                {' · '}
                {new Date(message.createdAt).toLocaleString()}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.45 }}>{message.body}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
          <textarea
            className="field-input"
            style={{ width: '100%', height: 80, padding: 10, resize: 'vertical' }}
            placeholder="Write a reply..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={internal}
                onChange={(event) => setInternal(event.target.checked)}
              />{' '}
              Internal note — not shown to {humanState(ticket.raisedByRole).toLowerCase()}
            </label>
            <Button disabled={busy || !draft.trim()} onClick={() => void send()}>
              {busy ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </Card>

      {ticket.resolution ? (
        <Card title="Resolution">
          <div style={{ padding: 16, fontSize: 14 }}>{ticket.resolution}</div>
        </Card>
      ) : null}

      {resolving ? (
        <ConfirmWithReason
          title="Resolve this ticket?"
          body="The person who raised it reads this word for word, and it closes the thread."
          confirmLabel="Resolve"
          presets={[
            'Refunded the difference to your original payment method',
            'Passed to the driver-conduct team for review',
            'The fare was correct: the route was longer than quoted',
          ]}
          onCancel={() => setResolving(false)}
          onConfirm={(resolution) => {
            setResolving(false);
            void resolveTicket(caseId, resolution).then(refetch).catch(() =>
              setFailure('Could not resolve.'),
            );
          }}
        />
      ) : null}

      <Button variant="ghost" onClick={() => navigate('/cases')}>Back to queue</Button>
    </>
  );
}
