-- Drivers refer for money, riders refer for points.
--
-- The asymmetry is deliberate. A rider wants a cheaper ride, so points are both what they want and
-- circular for the platform. A driver's relationship is income - ride discounts are worthless to
-- them - and driver supply is the constraint in this business, so a driver who brings a driver is
-- solving the expensive problem.
--
-- Cash referrals are also the first thing anyone defrauds, so the bar is much higher: a rider
-- qualifies on one ride, a driver on a run of real trips inside a window.

ALTER TABLE referrals ADD COLUMN reward_type VARCHAR(10) NOT NULL DEFAULT 'POINTS';

-- How far the referred driver has got towards qualifying. Counted, not inferred, so the threshold
-- can change without rewriting anybody's progress.
ALTER TABLE referrals ADD COLUMN qualifying_trips INTEGER NOT NULL DEFAULT 0;

-- Nothing pays after this. Without a deadline a dormant account qualifies years later, long after
-- whoever farmed it has been forgotten.
ALTER TABLE referrals ADD COLUMN qualify_by TIMESTAMPTZ;

-- Void reasons are worth keeping: they are the record of what abuse looked like.
ALTER TABLE referrals ADD COLUMN void_reason VARCHAR(255);

INSERT INTO platform_settings
    (setting_key, setting_value, label, description, value_type, min_value, max_value)
VALUES
    ('referrals.driver-reward-minor', '50000', 'Driver referral reward',
     'Paid to the referring driver, in minor units, once the referred driver qualifies. 50000 is 500 rupees.',
     'INTEGER', 0, 10000000),
    ('referrals.driver-qualifying-trips', '25', 'Trips before a driver referral pays',
     'Completed trips the referred driver must finish. Set high: a cash referral is the first thing anyone farms.',
     'INTEGER', 1, 500),
    ('referrals.driver-qualifying-days', '30', 'Days to qualify',
     'How long the referred driver has to reach that trip count before the referral expires.',
     'INTEGER', 1, 365);
