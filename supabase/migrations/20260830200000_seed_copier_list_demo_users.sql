-- Seed data: demo copier accounts so the public "Copier List" tab isn't
-- empty. mt5_login / broker / password are placeholder values (admin-only,
-- never shown publicly) — only name + performance numbers ever appear on
-- the public leaderboard via mt5_copier_public_stats.
INSERT INTO public.mt5_copier_requests
  (name, contact_number, mt5_login, broker_name, broker_server, mt5_password,
   note, status, is_public, profit_amount, loss_amount, risk_reward_ratio,
   profit_percent, loss_percent)
VALUES
  ('Ali Raza', '+92300XXXXXXX', '10234567', 'Exness', 'Exness-MT5Real3', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 1240, 180, '1:3', 24.8, 3.6),
  ('Sara Khan', '+92301XXXXXXX', '10234568', 'XM', 'XM-MT5Real5', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 980, 210, '1:2.5', 19.6, 4.2),
  ('Bilal Ahmed', '+92302XXXXXXX', '10234569', 'IC Markets', 'ICMarkets-MT5-Live', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 2150, 340, '1:4', 32.1, 5.1),
  ('Hamza Tariq', '+92303XXXXXXX', '10234570', 'FBS', 'FBS-MT5Real', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 560, 95, '1:2', 11.2, 1.9),
  ('Usman Farooq', '+92304XXXXXXX', '10234571', 'Exness', 'Exness-MT5Real2', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 1740, 260, '1:3.5', 28.9, 4.3),
  ('Ayesha Malik', '+92305XXXXXXX', '10234572', 'XM', 'XM-MT5Real2', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 890, 150, '1:2.8', 17.8, 3.0),
  ('Zeeshan Iqbal', '+92306XXXXXXX', '10234573', 'IC Markets', 'ICMarkets-MT5-Live', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 3020, 410, '1:5', 40.3, 5.5),
  ('Fatima Noor', '+92307XXXXXXX', '10234574', 'Exness', 'Exness-MT5Real4', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 670, 120, '1:2.2', 13.4, 2.4),
  ('Kashif Shah', '+92308XXXXXXX', '10234575', 'FBS', 'FBS-MT5Real2', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 1420, 300, '1:2.9', 23.7, 5.0),
  ('Rabia Sultan', '+92309XXXXXXX', '10234576', 'XM', 'XM-MT5Real7', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 1050, 190, '1:3.1', 21.0, 3.8),
  ('Danish Aziz', '+923010XXXXXXX', '10234577', 'IC Markets', 'ICMarkets-MT5-Live', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 2480, 380, '1:4.2', 35.5, 5.4),
  ('Mehak Yousaf', '+923011XXXXXXX', '10234578', 'Exness', 'Exness-MT5Real5', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 730, 140, '1:2.4', 14.6, 2.8),
  ('Waqas Hussain', '+923012XXXXXXX', '10234579', 'FBS', 'FBS-MT5Real3', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 1890, 320, '1:3.3', 27.0, 4.6),
  ('Nida Baig', '+923013XXXXXXX', '10234580', 'XM', 'XM-MT5Real9', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 640, 110, '1:2.1', 12.8, 2.2),
  ('Fahad Riaz', '+923014XXXXXXX', '10234581', 'IC Markets', 'ICMarkets-MT5-Live', 'demo-seed-password',
   'Seed demo account for Copier List preview', 'connected', true, 2760, 400, '1:4.5', 37.9, 5.3);
