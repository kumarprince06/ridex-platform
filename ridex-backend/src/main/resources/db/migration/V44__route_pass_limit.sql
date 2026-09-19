-- How many passes a route may have running at once. Pass holders ride free, so a route that sells
-- more passes than it has seats leaves its own pass holders standing. Null means no cap.
ALTER TABLE routes ADD COLUMN pass_limit INTEGER;
ALTER TABLE routes ADD CONSTRAINT ck_routes_pass_limit CHECK (pass_limit IS NULL OR pass_limit > 0);
