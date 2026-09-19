import { useEffect, useState } from 'react';

import { listLegalDocuments, updateLegalDocument, type LegalDocument } from '../api/admin';
import { ApiError } from '../api/problem';
import { useQuery } from '../api/useQuery';
import { Button, Card, PageHeader } from '../components/ui';
import { date } from '../lib/format';

/** Terms and privacy text the apps show. Edits are live on the next open and are audited. */
export function LegalPage() {
  const { data, loading, error, refetch } = useQuery(() => listLegalDocuments(), []);
  const [slug, setSlug] = useState<string | null>(null);
  const current = data?.find((document) => document.slug === slug) ?? data?.[0];

  return (
    <>
      <PageHeader
        title="App content"
        subtitle="Legal pages shown in the rider and partner apps. A blank line starts a new paragraph; start one with # for a heading."
      />
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
      {loading && !data ? <p className="cell-muted">Loading...</p> : null}

      {data && data.length > 0 ? (
        <div className="doc-switch" role="tablist">
          {data.map((document) => (
            <button
              key={document.slug}
              type="button"
              role="tab"
              aria-selected={document === current}
              className={document === current ? 'filter-tab active' : 'filter-tab'}
              onClick={() => setSlug(document.slug)}
            >
              {document.title}
            </button>
          ))}
        </div>
      ) : null}

      {current ? <DocumentEditor key={current.slug} document={current} onSaved={refetch} /> : null}
    </>
  );
}

function DocumentEditor({ document, onSaved }: { document: LegalDocument; onSaved: () => void }) {
  const [title, setTitle] = useState(document.title);
  const [body, setBody] = useState(document.body);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = title !== document.title || body !== document.body;

  useEffect(() => setSaved(false), [title, body]);

  async function save() {
    setBusy(true);
    setSaveError(null);
    try {
      await updateLegalDocument(document.slug, title, body);
      setSaved(true);
      onSaved();
    } catch (caught) {
      setSaveError(caught instanceof ApiError ? caught.userMessage : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="doc-layout">
      <Card
        title="Edit"
        actions={
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            {saved ? <span className="cell-muted">Published</span> : null}
            <Button variant="primary" disabled={!dirty || busy} onClick={() => void save()}>
              {busy ? 'Publishing...' : 'Publish'}
            </Button>
          </span>
        }
      >
        <p className="cell-muted">
          <span className="mono">{document.slug}</span> · last published {date(document.updatedAt)} ·{' '}
          {words(body)} words
        </p>
        <label className="field">
          <span className="field-label">Title</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Text</span>
          <textarea className="textarea doc-text" value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        {saveError ? <p className="assign-error">{saveError}</p> : null}
      </Card>

      {/* Rendered with the apps' own rule - blank line splits, # makes a heading - so what
          operations sees here is what a rider reads. */}
      <div className="doc-preview">
        <span className="field-label">In the app</span>
        <div className="phone">
          <div className="phone-title">{title}</div>
          {blocks(body).map((block, index) =>
            block.startsWith('#') ? (
              <div key={index} className="phone-heading">{block.replace(/^#+\s*/, '')}</div>
            ) : (
              <p key={index} className="phone-paragraph">{block}</p>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function blocks(body: string) {
  return body.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
}

function words(body: string) {
  return body.trim() ? body.trim().split(/\s+/).length : 0;
}
