import { FormEvent, useState } from 'react';

import { Button } from './ui';
import './ui.css';

type Props = {
  title: string;
  /** What will happen, in one sentence, in the operator's words rather than the system's. */
  body: string;
  confirmLabel: string;
  /** Suggested reasons. Free text is always allowed - a fixed list makes people pick the nearest lie. */
  presets?: string[];
  danger?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

const MIN_REASON = 12;

/**
 * The component every destructive action in the console goes through.
 *
 * It exists so the reason cannot be forgotten by whoever builds the next screen: refunds,
 * suspensions, document rejections and role changes all land in the audit log, and an audit row
 * that says only "REFUND_ISSUED by Aisha" answers nothing three months later in a dispute.
 *
 * A confirm dialog that only asks "are you sure?" is a speed bump, not a control.
 */
export function ConfirmWithReason({
  title,
  body,
  confirmLabel,
  presets = [],
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const [reason, setReason] = useState('');
  const tooShort = reason.trim().length < MIN_REASON;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (tooShort) {
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="modal-title">{title}</h2>
        <p className="modal-body">{body}</p>

        {presets.length > 0 ? (
          <div className="preset-row">
            {presets.map((preset) => (
              <button key={preset} type="button" className="preset" onClick={() => setReason(preset)}>
                {preset}
              </button>
            ))}
          </div>
        ) : null}

        <label className="field">
          <span className="field-label">Reason (recorded in the audit log)</span>
          <textarea
            className="textarea"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="What happened, and which case or evidence supports this"
            autoFocus
          />
        </label>

        <p className="field-hint">
          {tooShort
            ? `At least ${MIN_REASON} characters. This is read by whoever handles the dispute.`
            : 'This reason is attached to your name and cannot be edited afterwards.'}
        </p>

        <div className="modal-actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} type="submit" disabled={tooShort}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
