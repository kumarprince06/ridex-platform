-- The most points one journey may take.
--
-- Without a ceiling a rider empties months of credit into a single fare: the platform funds the
-- whole balance at once, and the rider is left with nothing to come back for. Points can take a
-- fare to zero, but only up to this much of it.
--
-- A setting rather than a constant, and seeded here so it appears in the admin panel with the
-- other points rules - operations tune this against redemption behaviour, not engineering.

INSERT INTO platform_settings
    (setting_key, setting_value, label, description, value_type, min_value, max_value)
VALUES
    ('points.max-redeem-per-journey', '5000', 'Max points per journey',
     'The most points a rider may spend on one ride or one shuttle seat, whatever their balance. '
     || '5000 is fifty rupees at the default rate.',
     'INTEGER', 0, 1000000)
ON CONFLICT (setting_key) DO NOTHING;
