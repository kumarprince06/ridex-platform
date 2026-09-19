import { useState } from 'react';

import { listLegalDocuments, updateLegalDocument, type LegalDocument } from '../api/admin';
import { ApiError } from '../api/problem';
import { useQuery } from '../api/useQuery';
import { Button, Card, PageHeader } from '../components/ui';
import { date } from '../lib/format';

/** Terms and privacy text the apps show. Edits are live on the next open and are audited. */
export function LegalPage() {
  const { data, loading, error, refetch } = useQuery(() => listLegalDocuments(), []);

  return (
    <>
      <PageHeader
        title="Legal documents"
        subtitle="Shown in the rider and partner apps. Start a line with # for a heading."
      />
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
      {loading && !data ? <p className="cell-muted">Loading...</p> : null}
      {(data ?? []).map((document) => (
        <DocumentEditor key={document.slug} document={document} onSaved={refetch} />
      ))}
    </>
  );
}

function DocumentEditor({ document, onSaved }: { document: LegalDocument; onSaved: () => void }) {
  const [title, setTitle] = useState(document.title);
  const [body, setBody] = useState(document.body);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dirty = title !== document.title || body !== document.body;

  async function save() {
    setBusy(true);
    setSaveError(null);
    try {
      await updateLegalDocument(document.slug, title, body);
      onSaved();
    } catch (caught) {
      setSaveError(caught instanceof ApiError ? caught.userMessage : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={document.title}
      actions={
        <Button variant="secondary" disabled={!dirty || busy} onClick={() => void save()}>
          {busy ? 'Saving...' : 'Save'}
        </Button>
      }
    >
      <p className="cell-muted">
        <span className="mono">{document.slug}</span> · last updated {date(document.updatedAt)}
      </p>
      <label className="field">
        <span className="field-label">Title</span>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Text</span>
        <textarea className="textarea" rows={14} value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      {saveError ? <p className="assign-error">{saveError}</p> : null}
    </Card>
  );
}
