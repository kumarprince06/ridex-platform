-- Refresh tokens were JWTs whose only varying claim was a second-granularity timestamp, so two
-- issued in the same second were byte-identical. Rotation then replaced a secret with itself, and
-- reuse detection could not fire in that window.
--
-- They are stored hashed and looked up by hash, so the JWT carried nothing: its claims were never
-- trusted, and roles are re-derived from the account on every refresh. An opaque 256-bit random
-- value cannot collide.

-- The surface used to be read from the token's claims. It belongs on the row, where the client
-- cannot edit it.
ALTER TABLE refresh_tokens ADD COLUMN app_context VARCHAR(20);

UPDATE refresh_tokens SET app_context = 'RIDER' WHERE app_context IS NULL;
ALTER TABLE refresh_tokens ALTER COLUMN app_context SET NOT NULL;

-- The token format changed, so every live session ends. Signing in again is the honest cost of the
-- fix; leaving old-format tokens live would keep the collision window open.
UPDATE refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL;
