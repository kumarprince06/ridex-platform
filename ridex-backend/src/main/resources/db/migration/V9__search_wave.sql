-- How far the search has widened.
--
-- The wave was derived from MAX(wave) on ride_offers, which breaks the moment a wave offers to
-- nobody new: every nearby driver has already been asked, no row is written, the derived wave
-- never advances, and the sweep re-runs the same wave forever. Attempted is not the same as
-- offered, so it has to be recorded rather than inferred.
ALTER TABLE ride_requests ADD COLUMN search_wave SMALLINT NOT NULL DEFAULT 0;
