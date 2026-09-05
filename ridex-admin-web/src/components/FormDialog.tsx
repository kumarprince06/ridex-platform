import { FormEvent, ReactNode, useState } from 'react';

import { Button } from './ui';
import './ui.css';

export type Field = {
  name: string;
  label: string;
  /** Shown under the input. Say what the server will reject, not what the field is called. */
  hint?: string;
  type?: 'text' | 'number' | 'time';
  placeholder?: string;
  initial?: string;
  required?: boolean;
  /** A fixed set of choices renders as a select rather than a free-text box. */
  options?: { value: string; label: string }[];
};

/**
 * A small form in a dialog.
 *
 * <p>It exists because the alternative was window.prompt, which cannot show a hint, cannot offer a
 * select, validates nothing and stacks one question per box - so entering a stop meant three
 * separate prompts with no way to go back a step.
 */
export function FormDialog({
  title,
  body,
  fields,
  submitLabel,
  extra,
  onSubmit,
  onCancel,
}: {
  title: string;
  body?: string;
  fields: Field[];
  submitLabel: string;
  /**
   * Rendered under the fields. Gets a setter too, so a picker can write back into them - which is
   * the whole point of a map next to a latitude box.
   */
  extra?: (
    values: Record<string, string>,
    set: (patch: Record<string, string>) => void,
  ) => ReactNode;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, field.initial ?? ''])),
  );

  const missing = fields.some(
    (field) => field.required !== false && values[field.name]?.trim() === '',
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (missing) {
      return;
    }
    onSubmit(values);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <form className="modal" onSubmit={submit}>
        <h2 className="modal-title">{title}</h2>
        {body ? <p className="modal-body">{body}</p> : null}

        {fields.map((field) => (
          <label className="field" key={field.name}>
            <span className="field-label">{field.label}</span>

            {field.options ? (
              <select
                className="input"
                value={values[field.name]}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                type={field.type ?? 'text'}
                value={values[field.name]}
                placeholder={field.placeholder}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
              />
            )}

            {field.hint ? <span className="field-hint">{field.hint}</span> : null}
          </label>
        ))}

        {extra
          ? extra(values, (patch) => setValues((current) => ({ ...current, ...patch })))
          : null}

        <div className="modal-actions">
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={missing}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
