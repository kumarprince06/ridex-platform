import { useState } from 'react';

import { changeOwnPassword } from '../api/admin';
import { FormDialog } from './FormDialog';

/** The signed-in person's own password - how an invited staff member replaces their temporary one. */
export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  return (
    <>
      <button className="signout" type="button" onClick={() => { setOpen(true); setDone(null); }} title={done ?? undefined}>
        {done ? 'Password changed' : 'Change password'}
      </button>
      {open ? (
        <FormDialog
          title="Change your password"
          body="At least 8 characters. Your other sessions are signed out."
          submitLabel="Change password"
          fields={[
            { name: 'current', label: 'Current password', type: 'password' },
            { name: 'next', label: 'New password', type: 'password' },
          ]}
          onCancel={() => setOpen(false)}
          onSubmit={(values) => {
            setOpen(false);
            changeOwnPassword(values.current, values.next)
              .then(() => setDone('Password changed'))
              .catch((caught) => {
                setDone(null);
                window.alert(caught instanceof Error ? caught.message : 'Could not change the password.');
              });
          }}
        />
      ) : null}
    </>
  );
}
