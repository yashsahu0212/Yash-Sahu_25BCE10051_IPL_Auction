-- =====================================================================
-- HAMMER REALTIME CRICKET AUCTION ENGINE — OFFICIAL IPL SEED DATA
-- File: backend/seed.sql
-- =====================================================================

-- 1. SEED TEAMS (10 Official IPL Franchises — Starting Purse: 12,500 Lakhs = ₹125.00 Cr)
INSERT INTO public.teams (id, name, short_name, code, purse, spent, remaining, max_slots, min_slots, filled_slots, color, logo_url) VALUES
('CSK',  'CHENNAI SUPER KINGS',         'CSK',  'CSK',  12500, 0, 12500, 25, 7, 0, '#F9CD05', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png'),
('DC',   'DELHI CAPITALS',              'DC',   'DC',   12500, 0, 12500, 25, 7, 0, '#004C97', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png'),
('GT',   'GUJARAT TITANS',              'GT',   'GT',   12500, 0, 12500, 25, 7, 0, '#1C2841', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png'),
('KKR',  'KOLKATA KNIGHT RIDERS',       'KKR',  'KKR',  12500, 0, 12500, 25, 7, 0, '#3A225D', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png'),
('LSG',  'LUCKNOW SUPER GIANTS',        'LSG',  'LSG',  12500, 0, 12500, 25, 7, 0, '#0057E7', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png'),
('MI',   'MUMBAI INDIANS',             'MI',   'MI',   12500, 0, 12500, 25, 7, 0, '#004BA0', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png'),
('PBKS', 'PUNJAB KINGS',                'PBKS', 'PBKS', 12500, 0, 12500, 25, 7, 0, '#ED1B24', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png'),
('RR',   'RAJASTHAN ROYALS',            'RR',   'RR',   12500, 0, 12500, 25, 7, 0, '#EA1A85', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png'),
('RCB',  'ROYAL CHALLENGERS BENGALURU', 'RCB',  'RCB',  12500, 0, 12500, 25, 7, 0, '#4A154B', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png'),
('SRH',  'SUNRISERS HYDERABAD',         'SRH',  'SRH',  12500, 0, 12500, 25, 7, 0, '#F26522', 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png')
ON CONFLICT (id) DO UPDATE SET
    purse = EXCLUDED.purse,
    spent = EXCLUDED.spent,
    remaining = EXCLUDED.remaining,
    max_slots = EXCLUDED.max_slots,
    min_slots = EXCLUDED.min_slots,
    filled_slots = EXCLUDED.filled_slots,
    color = EXCLUDED.color,
    logo_url = EXCLUDED.logo_url;

-- 2. SEED SINGLETON AUCTION SESSION
INSERT INTO public.auctions (
    id, status, current_player_id, current_bid, base_price,
    leading_team_id, round, lot_index, timer, max_timer,
    gavel_stage, bid_increment, session_label
) VALUES (
    1, 'idle', NULL, 0, 0,
    NULL, 1, 0, 10, 10,
    0, 10, '2026 MEGA AUCTION'
) ON CONFLICT (id) DO NOTHING;

-- 3. SEED 35 REAL OFFICIAL IPL PLAYERS (Integer Lakhs Reserve Prices)
INSERT INTO public.players (
    id, lot_number, name, display_name, role, role_label,
    nationality, overseas, capped, set_name,
    base_price, image, icon, stats, tactical_profile, status
) VALUES
(1, 1, 'VIRAT KOHLI', 'Virat kohli', 'batter', 'TOP-ORDER BATTER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, NULL, 'sports_cricket', '{"matches":252,"runs":8004,"wickets":4,"strikeRate":131.97,"average":38.67,"economy":8.79,"fifties":55,"hundreds":8,"best":"113","debutYear":2008}'::jsonb, 'Official IPL squad profile for VIRAT KOHLI', 'available'),
(2, 2, 'ROHIT SHARMA', 'Rohit sharma', 'batter', 'OPENING BATTER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, NULL, 'sports_cricket', '{"matches":257,"runs":6628,"wickets":15,"strikeRate":131.14,"average":29.72,"economy":8.02,"fifties":43,"hundreds":2,"best":"109*","debutYear":2008}'::jsonb, 'Official IPL squad profile for ROHIT SHARMA', 'available'),
(3, 3, 'TRAVIS HEAD', 'Travis head', 'batter', 'AGGRESSIVE OPENER (LEFT HAND)', 'Australia', true, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, NULL, 'sports_cricket', '{"matches":25,"runs":872,"wickets":3,"strikeRate":178.69,"average":37.91,"economy":9.21,"fifties":5,"hundreds":1,"best":"102","debutYear":2016}'::jsonb, 'Official IPL squad profile for TRAVIS HEAD', 'available'),
(4, 4, 'SHUBMAN GILL', 'Shubman gill', 'batter', 'TOP-ORDER BATTER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, NULL, 'sports_cricket', '{"matches":103,"runs":3216,"wickets":null,"strikeRate":135.7,"average":37.84,"economy":null,"fifties":20,"hundreds":4,"best":"129","debutYear":2018}'::jsonb, 'Official IPL squad profile for SHUBMAN GILL', 'available'),
(5, 5, 'YASHASVI JAISWAL', 'Yashasvi jaiswal', 'batter', 'DYNAMIC OPENER (LEFT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, NULL, 'sports_cricket', '{"matches":52,"runs":1607,"wickets":null,"strikeRate":150.61,"average":32.14,"economy":null,"fifties":9,"hundreds":2,"best":"124","debutYear":2020}'::jsonb, 'Official IPL squad profile for YASHASVI JAISWAL', 'available'),
(6, 6, 'SURYAKUMAR YADAV', 'Suryakumar yadav', 'batter', '360-DEGREE FINISHER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, NULL, 'sports_cricket', '{"matches":150,"runs":3594,"wickets":null,"strikeRate":145.33,"average":32.09,"economy":null,"fifties":24,"hundreds":2,"best":"103*","debutYear":2012}'::jsonb, 'Official IPL squad profile for SURYAKUMAR YADAV', 'available'),
(7, 7, 'RISHABH PANT', 'Rishabh pant', 'wicketkeeper', 'WICKETKEEPER-BATTER (LEFT HAND)', 'India', false, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, NULL, 'front_hand', '{"matches":111,"runs":3284,"wickets":null,"strikeRate":148.93,"average":35.31,"catches":75,"stumpings":23,"fifties":18,"hundreds":1,"best":"128*","debutYear":2016}'::jsonb, 'Official IPL squad profile for RISHABH PANT', 'available'),
(8, 8, 'HEINRICH KLAASEN', 'Heinrich klaasen', 'wicketkeeper', 'MIDDLE-ORDER POWER WK (RIGHT HAND)', 'South Africa', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, NULL, 'front_hand', '{"matches":35,"runs":993,"wickets":null,"strikeRate":168.31,"average":39.72,"catches":19,"stumpings":6,"fifties":6,"hundreds":1,"best":"104","debutYear":2018}'::jsonb, 'Official IPL squad profile for HEINRICH KLAASEN', 'available'),
(9, 9, 'SANJU SAMSON', 'Sanju samson', 'wicketkeeper', 'TOP-ORDER WK-BATTER (RIGHT HAND)', 'India', false, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, NULL, 'front_hand', '{"matches":167,"runs":4419,"wickets":null,"strikeRate":138.96,"average":30.69,"catches":82,"stumpings":16,"fifties":25,"hundreds":3,"best":"119","debutYear":2013}'::jsonb, 'Official IPL squad profile for SANJU SAMSON', 'available'),
(10, 10, 'JOS BUTTLER', 'Jos buttler', 'wicketkeeper', 'EXPLOSIVE OPENER-WK (RIGHT HAND)', 'England', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, '/players/gt/jos-buttler.png', 'front_hand', '{"matches":107,"runs":3582,"wickets":null,"strikeRate":147.53,"average":38.11,"catches":51,"stumpings":1,"fifties":19,"hundreds":7,"best":"124","debutYear":2016}'::jsonb, 'Official IPL squad profile for JOS BUTTLER', 'available'),
(11, 11, 'NICHOLAS POORAN', 'Nicholas pooran', 'wicketkeeper', 'FINISHER / WK (LEFT HAND)', 'West Indies', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, NULL, 'front_hand', '{"matches":76,"runs":1769,"wickets":null,"strikeRate":162.29,"average":32.76,"catches":34,"stumpings":8,"fifties":9,"hundreds":0,"best":"77","debutYear":2019}'::jsonb, 'Official IPL squad profile for NICHOLAS POORAN', 'available'),
(12, 12, 'MS DHONI', 'Ms dhoni', 'wicketkeeper', 'LEGENDARY FINISHER / WK (RIGHT HAND)', 'India', false, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, NULL, 'front_hand', '{"matches":264,"runs":5243,"wickets":null,"strikeRate":137.54,"average":39.13,"catches":152,"stumpings":42,"fifties":24,"hundreds":0,"best":"84*","debutYear":2008}'::jsonb, 'Official IPL squad profile for MS DHONI', 'available'),
(13, 13, 'HARDIK PANDYA', 'Hardik pandya', 'allrounder', 'PACE-BOWLING ALL-ROUNDER', 'India', false, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, NULL, 'public', '{"matches":137,"runs":2525,"wickets":64,"strikeRate":145.87,"average":28.69,"economy":8.95,"fifties":10,"hundreds":0,"best":"3/17","debutYear":2015}'::jsonb, 'Official IPL squad profile for HARDIK PANDYA', 'available'),
(14, 14, 'RAVINDRA JADEJA', 'Ravindra jadeja', 'allrounder', 'SPIN ALL-ROUNDER / ELITE FIELDER', 'India', false, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, NULL, 'public', '{"matches":240,"runs":2959,"wickets":160,"strikeRate":129.5,"average":27.4,"economy":7.62,"fifties":3,"hundreds":0,"best":"5/16","debutYear":2008}'::jsonb, 'Official IPL squad profile for RAVINDRA JADEJA', 'available'),
(15, 15, 'ANDRE RUSSELL', 'Andre russell', 'allrounder', 'POWER FINISHER & DEATH BOWLER', 'West Indies', true, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, NULL, 'public', '{"matches":127,"runs":2484,"wickets":115,"strikeRate":174.93,"average":29.22,"economy":9.24,"fifties":11,"hundreds":0,"best":"5/15","debutYear":2012}'::jsonb, 'Official IPL squad profile for ANDRE RUSSELL', 'available'),
(16, 16, 'RASHID KHAN', 'Rashid khan', 'allrounder', 'LEG-SPIN ALL-ROUNDER', 'Afghanistan', true, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, NULL, 'public', '{"matches":121,"runs":551,"wickets":149,"strikeRate":154.78,"average":21.84,"economy":6.82,"best":"4/24","fifties":1,"hundreds":0,"debutYear":2017}'::jsonb, 'Official IPL squad profile for RASHID KHAN', 'available'),
(17, 17, 'SUNIL NARINE', 'Sunil narine', 'allrounder', 'MYSTERY OFF-SPIN & PINCH HITTER', 'West Indies', true, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, NULL, 'public', '{"matches":177,"runs":1534,"wickets":180,"strikeRate":165.84,"average":25.39,"economy":6.73,"fifties":7,"hundreds":1,"best":"5/19","debutYear":2012}'::jsonb, 'Official IPL squad profile for SUNIL NARINE', 'available'),
(18, 18, 'AXAR PATEL', 'Axar patel', 'allrounder', 'LEFT-ARM ORTHODOX & BATTER', 'India', false, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, NULL, 'public', '{"matches":150,"runs":1653,"wickets":123,"strikeRate":130.88,"average":30.55,"economy":7.24,"fifties":3,"hundreds":0,"best":"4/21","debutYear":2014}'::jsonb, 'Official IPL squad profile for AXAR PATEL', 'available'),
(19, 19, 'JASPRIT BUMRAH', 'Jasprit bumrah', 'bowler', 'RIGHT-ARM EXPRESS (145+ KPH)', 'India', false, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, NULL, 'bolt', '{"matches":133,"runs":null,"wickets":165,"strikeRate":null,"average":22.51,"economy":7.3,"fifties":null,"hundreds":null,"best":"5/10","debutYear":2013}'::jsonb, 'Official IPL squad profile for JASPRIT BUMRAH', 'available'),
(20, 20, 'PAT CUMMINS', 'Pat cummins', 'bowler', 'RIGHT-ARM FAST SEAM', 'Australia', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, NULL, 'bolt', '{"matches":58,"runs":515,"wickets":63,"strikeRate":150.15,"average":29.84,"economy":8.87,"fifties":1,"hundreds":0,"best":"4/34","debutYear":2014}'::jsonb, 'Official IPL squad profile for PAT CUMMINS', 'available'),
(21, 21, 'MITCHELL STARC', 'Mitchell starc', 'bowler', 'LEFT-ARM EXPRESS (150 KPH)', 'Australia', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, NULL, 'bolt', '{"matches":41,"runs":null,"wickets":51,"strikeRate":null,"average":23.9,"economy":8.64,"best":"4/15","debutYear":2014}'::jsonb, 'Official IPL squad profile for MITCHELL STARC', 'available'),
(22, 22, 'TRENT BOULT', 'Trent boult', 'bowler', 'LEFT-ARM SWING SPECIALIST', 'New Zealand', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, NULL, 'bolt', '{"matches":104,"runs":null,"wickets":121,"strikeRate":null,"average":26.49,"economy":8.29,"best":"4/18","debutYear":2015}'::jsonb, 'Official IPL squad profile for TRENT BOULT', 'available'),
(23, 23, 'MOHAMMED SHAMI', 'Mohammed shami', 'bowler', 'RIGHT-ARM SEAM ENFORCER', 'India', false, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, NULL, 'bolt', '{"matches":110,"runs":null,"wickets":127,"strikeRate":null,"average":26.87,"economy":8.44,"best":"4/11","debutYear":2013}'::jsonb, 'Official IPL squad profile for MOHAMMED SHAMI', 'available'),
(24, 24, 'ARSHDEEP SINGH', 'Arshdeep singh', 'bowler', 'LEFT-ARM DEATH OVERS SPECIALIST', 'India', false, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, NULL, 'bolt', '{"matches":65,"runs":null,"wickets":76,"strikeRate":null,"average":27,"economy":9.03,"best":"5/32","debutYear":2019}'::jsonb, 'Official IPL squad profile for ARSHDEEP SINGH', 'available'),
(25, 25, 'MATHEESHA PATHIRANA', 'Matheesha pathirana', 'bowler', 'SLING-ACTION DEATH SPECIALIST', 'Sri Lanka', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 150, NULL, 'bolt', '{"matches":20,"runs":null,"wickets":34,"strikeRate":null,"average":18.59,"economy":7.88,"best":"4/28","debutYear":2022}'::jsonb, 'Official IPL squad profile for MATHEESHA PATHIRANA', 'available'),
(26, 26, 'YUZVENDRA CHAHAL', 'Yuzvendra chahal', 'bowler', 'RIGHT-ARM LEGBREAK WICKET-TAKER', 'India', false, true, 'SET 05 // SPIN BOWLERS (SPIN1)', 200, NULL, 'bolt', '{"matches":160,"runs":null,"wickets":205,"strikeRate":null,"average":22.45,"economy":7.84,"best":"5/40","debutYear":2013}'::jsonb, 'Official IPL squad profile for YUZVENDRA CHAHAL', 'available'),
(27, 27, 'KULDEEP YADAV', 'Kuldeep yadav', 'bowler', 'LEFT-ARM WRIST SPIN (CHINAMAN)', 'India', false, true, 'SET 05 // SPIN BOWLERS (SPIN1)', 200, NULL, 'bolt', '{"matches":84,"runs":null,"wickets":87,"strikeRate":null,"average":26.24,"economy":7.85,"best":"4/14","debutYear":2016}'::jsonb, 'Official IPL squad profile for KULDEEP YADAV', 'available'),
(28, 28, 'VARUN CHAKARAVARTHY', 'Varun chakaravarthy', 'bowler', 'RIGHT-ARM MYSTERY SPIN', 'India', false, true, 'SET 05 // SPIN BOWLERS (SPIN1)', 150, '/players/kkr/varun-chakaravarthy.png', 'bolt', '{"matches":71,"runs":null,"wickets":75,"strikeRate":null,"average":25.4,"economy":7.56,"best":"5/20","debutYear":2019}'::jsonb, 'Official IPL squad profile for VARUN CHAKARAVARTHY', 'available'),
(29, 29, 'RINKU SINGH', 'Rinku singh', 'batter', 'LEFT-HAND FINISHER', 'India', false, true, 'SET 06 // EMERGING & IMPACT (ACC1)', 100, NULL, 'sports_cricket', '{"matches":45,"runs":893,"wickets":null,"strikeRate":143.34,"average":30.79,"fifties":4,"hundreds":0,"best":"67*","debutYear":2018}'::jsonb, 'Official IPL squad profile for RINKU SINGH', 'available'),
(30, 30, 'SHASHANK SINGH', 'Shashank singh', 'batter', 'MIDDLE-ORDER STRIKER (RIGHT HAND)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, NULL, 'sports_cricket', '{"matches":24,"runs":423,"wickets":null,"strikeRate":164.71,"average":38.45,"fifties":2,"hundreds":0,"best":"68*","debutYear":2022}'::jsonb, 'Official IPL squad profile for SHASHANK SINGH', 'available'),
(31, 31, 'MAYANK YADAV', 'Mayank yadav', 'bowler', 'OUTRIGHT EXPRESS (156.7 KPH)', 'India', false, true, 'SET 06 // EMERGING & IMPACT (ACC1)', 75, NULL, 'bolt', '{"matches":4,"runs":null,"wickets":7,"strikeRate":null,"average":12.14,"economy":6.99,"best":"3/14","debutYear":2024}'::jsonb, 'Official IPL squad profile for MAYANK YADAV', 'available'),
(32, 32, 'NITISH KUMAR REDDY', 'Nitish kumar reddy', 'allrounder', 'SEAM-BOWLING ALL-ROUNDER', 'India', false, true, 'SET 06 // EMERGING & IMPACT (ACC1)', 75, NULL, 'public', '{"matches":15,"runs":303,"wickets":3,"strikeRate":142.92,"average":33.67,"economy":9.88,"fifties":2,"hundreds":0,"best":"64","debutYear":2023}'::jsonb, 'Official IPL squad profile for NITISH KUMAR REDDY', 'available'),
(33, 33, 'ABISHEK POREL', 'Abishek porel', 'wicketkeeper', 'TOP-ORDER ATTACKING WK (LEFT HAND)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, NULL, 'front_hand', '{"matches":18,"runs":360,"wickets":null,"strikeRate":155.17,"average":27.69,"catches":11,"stumpings":2,"fifties":2,"hundreds":0,"best":"65","debutYear":2023}'::jsonb, 'Official IPL squad profile for ABISHEK POREL', 'available'),
(34, 34, 'PHILIP SALT', 'Philip salt', 'wicketkeeper', 'POWERPLAY DESTROYER / WK (RIGHT HAND)', 'England', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 150, NULL, 'front_hand', '{"matches":21,"runs":653,"wickets":null,"strikeRate":175.54,"average":36.28,"catches":16,"stumpings":2,"fifties":6,"hundreds":0,"best":"89*","debutYear":2023}'::jsonb, 'Official IPL squad profile for PHILIP SALT', 'available'),
(35, 35, 'KAGISO RABADA', 'Kagiso rabada', 'bowler', 'RIGHT-ARM FAST (145+ KPH)', 'South Africa', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, NULL, 'bolt', '{"matches":80,"runs":null,"wickets":117,"strikeRate":null,"average":23.15,"economy":8.42,"best":"4/21","debutYear":2017}'::jsonb, 'Official IPL squad profile for KAGISO RABADA', 'available'),
(36, 36, 'KHALEEL AHMED', 'Khaleel ahmed', 'bowler', 'FAST BOWLER (LEFT ARM)', 'India', false, true, 'SET 04 // FAST BOWLERS (PAC1)', 150, '/players/csk/khaleel-ahmed.png', 'bolt', '{"matches":57,"runs":8,"wickets":74,"strikeRate":16.88,"average":24.62,"economy":8.75,"best":"3/16","debutYear":2018}'::jsonb, 'Official IPL squad profile for KHALEEL AHMED', 'available'),
(37, 37, 'DEWALD BREVIS', 'Dewald brevis', 'batter', 'TOP-ORDER BATTER (RIGHT HAND)', 'South Africa', true, true, 'SET 01 // OVERSEAS BATTERS (M1)', 75, '/players/csk/dewald-brevis.png', 'sports_cricket', '{"matches":10,"runs":230,"wickets":1,"strikeRate":147.44,"average":23,"economy":6.5,"fifties":1,"hundreds":0,"best":"49","debutYear":2022}'::jsonb, 'Official IPL squad profile for DEWALD BREVIS', 'available'),
(38, 38, 'RAHUL CHAHAR', 'Rahul chahar', 'bowler', 'SPIN BOWLER (LEG BREAK)', 'India', false, true, 'SET 05 // SPINNERS (SPN1)', 100, '/players/csk/rahul-chahar.png', 'bolt', '{"matches":78,"runs":124,"wickets":75,"strikeRate":22.48,"average":28.53,"economy":7.62,"best":"4/27","debutYear":2017}'::jsonb, 'Official IPL squad profile for RAHUL CHAHAR', 'available'),
(39, 39, 'MUKESH CHOUDHARY', 'Mukesh choudhary', 'bowler', 'SEAM BOWLER (LEFT ARM)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, '/players/csk/mukesh-choudhary.png', 'bolt', '{"matches":14,"runs":10,"wickets":16,"strikeRate":17.06,"average":26.5,"economy":9.32,"best":"4/46","debutYear":2022}'::jsonb, 'Official IPL squad profile for MUKESH CHOUDHARY', 'available'),
(40, 40, 'JOFRA ARCHER', 'Jofra archer', 'bowler', 'FAST BOWLER (RIGHT ARM EXPRESS)', 'England', true, true, 'SET 04 // FAST BOWLERS (PAC1)', 200, '/players/rr/jofra-archer.png', 'bolt', '{"matches":40,"runs":195,"wickets":48,"strikeRate":19.33,"average":24.38,"economy":7.43,"best":"3/15","debutYear":2018}'::jsonb, 'Official IPL squad profile for JOFRA ARCHER', 'available'),
(41, 41, 'RAVI BISHNOI', 'Ravi bishnoi', 'bowler', 'SPIN BOWLER (WRIST SPIN)', 'India', false, true, 'SET 05 // SPINNERS (SPN1)', 150, '/players/rr/ravi-bishnoi.png', 'bolt', '{"matches":66,"runs":45,"wickets":63,"strikeRate":23.4,"average":30.63,"economy":7.85,"best":"3/24","debutYear":2020}'::jsonb, 'Official IPL squad profile for RAVI BISHNOI', 'available'),
(42, 42, 'BHUVNESHWAR KUMAR', 'Bhuvneshwar kumar', 'bowler', 'FAST-MEDIUM (SWING SPECIALIST)', 'India', false, true, 'SET 04 // FAST BOWLERS (PAC1)', 200, '/players/rcb/bhuvneshwar-kumar.png', 'bolt', '{"matches":176,"runs":305,"wickets":181,"strikeRate":21.65,"average":27.23,"economy":7.56,"best":"5/19","debutYear":2011}'::jsonb, 'Official IPL squad profile for BHUVNESHWAR KUMAR', 'available'),
(43, 43, 'AYUSH BADONI', 'Ayush badoni', 'allrounder', 'FINISHER & OFF-SPIN', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 50, '/players/lsg/ayush-badoni.png', 'public', '{"matches":42,"runs":634,"wickets":2,"strikeRate":134.04,"average":24.38,"economy":7.5,"fifties":4,"hundreds":0,"best":"59*","debutYear":2022}'::jsonb, 'Official IPL squad profile for AYUSH BADONI', 'available'),
(44, 44, 'AVESH KHAN', 'Avesh khan', 'bowler', 'FAST BOWLER (RIGHT ARM)', 'India', false, true, 'SET 04 // FAST BOWLERS (PAC1)', 150, '/players/lsg/avesh-khan.png', 'bolt', '{"matches":63,"runs":55,"wickets":75,"strikeRate":18.29,"average":26.65,"economy":8.74,"best":"4/24","debutYear":2017}'::jsonb, 'Official IPL squad profile for AVESH KHAN', 'available'),
(45, 45, 'AZMATULLAH OMARZAI', 'Azmatullah omarzai', 'allrounder', 'SEAM-BOWLING ALLROUNDER', 'Afghanistan', true, true, 'SET 03 // ALLROUNDERS (ALR1)', 100, '/players/pbks/azmatullah-omarzai.png', 'public', '{"matches":7,"runs":42,"wickets":4,"strikeRate":113.51,"average":14,"economy":8.82,"best":"2/27","debutYear":2024}'::jsonb, 'Official IPL squad profile for AZMATULLAH OMARZAI', 'available'),
(46, 46, 'KYLE JAMIESON', 'Kyle jamieson', 'bowler', 'TALL SEAM BOWLER (RIGHT ARM)', 'New Zealand', true, true, 'SET 04 // FAST BOWLERS (PAC1)', 100, '/players/dc/kyle-jamieson.png', 'bolt', '{"matches":9,"runs":65,"wickets":9,"strikeRate":20,"average":29.89,"economy":9.61,"best":"3/41","debutYear":2021}'::jsonb, 'Official IPL squad profile for KYLE JAMIESON', 'available'),
(47, 47, 'FINN ALLEN', 'Finn allen', 'batter', 'EXPLOSIVE OPENER (RIGHT HAND)', 'New Zealand', true, true, 'SET 01 // OVERSEAS BATTERS (M1)', 100, '/players/kkr/finn-allen.png', 'sports_cricket', '{"matches":0,"runs":0,"wickets":0,"strikeRate":168.5,"average":31.2,"fifties":0,"hundreds":0,"best":"137 (T20I)","debutYear":2024}'::jsonb, 'Official IPL squad profile for FINN ALLEN', 'available'),
(48, 48, 'VAIBHAV ARORA', 'Vaibhav arora', 'bowler', 'SEAM BOWLER (RIGHT ARM)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, '/players/kkr/vaibhav-arora.png', 'bolt', '{"matches":20,"runs":12,"wickets":19,"strikeRate":20.42,"average":31.84,"economy":9.42,"best":"3/27","debutYear":2022}'::jsonb, 'Official IPL squad profile for VAIBHAV ARORA', 'available'),
(49, 49, 'REHAN AHMED', 'Rehan ahmed', 'bowler', 'BOWLER', 'England', true, true, 'SPIN-BOWLERS', 100, '/players/dc/rehan-ahmed.png', 'sports_baseball', '{"matches":18,"wickets":24,"economy":7.6,"bestBowling":"4/22"}'::jsonb, 'Official IPL squad profile for REHAN AHMED', 'available'),
(50, 50, 'DUSHMANTHA CHAMEERA', 'Dushmantha chameera', 'bowler', 'BOWLER', 'Sri Lanka', true, true, 'FAST-BOWLERS', 75, '/players/dc/dushmantha-chameera.png', 'sports_baseball', '{"matches":12,"wickets":14,"economy":8.4,"bestBowling":"3/17"}'::jsonb, 'Official IPL squad profile for DUSHMANTHA CHAMEERA', 'available'),
(51, 51, 'BEN DUCKETT', 'Ben duckett', 'batter', 'BATTER', 'England', true, true, 'TOP-ORDER-BATTERS', 150, '/players/dc/ben-duckett.png', 'sports_cricket', '{"matches":28,"runs":850,"average":34,"strikeRate":145.2,"fifties":6}'::jsonb, 'Official IPL squad profile for BEN DUCKETT', 'available'),
(52, 52, 'ARSHAD KHAN', 'Arshad khan', 'allrounder', 'ALL-ROUNDER', 'India', false, false, 'UNCAPPED-ALLROUNDERS', 30, '/players/gt/arshad-khan.png', 'sports_cricket', '{"matches":10,"runs":125,"strikeRate":160,"wickets":6,"economy":9.2}'::jsonb, 'Official IPL squad profile for ARSHAD KHAN', 'available'),
(53, 53, 'TOM BANTON', 'Tom banton', 'wicketkeeper', 'WICKETKEEPER', 'England', true, true, 'WICKETKEEPERS', 100, '/players/gt/tom-banton.png', 'sports_cricket', '{"matches":15,"runs":390,"average":26,"strikeRate":148,"dismissals":12}'::jsonb, 'Official IPL squad profile for TOM BANTON', 'available'),
(54, 54, 'GURNOOR BRAR', 'Gurnoor brar', 'bowler', 'BOWLER', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/gt/gurnoor-brar.png', 'sports_baseball', '{"matches":5,"wickets":6,"economy":8.8,"bestBowling":"2/26"}'::jsonb, 'Official IPL squad profile for GURNOOR BRAR', 'available'),
(55, 55, 'TEJASVI DAHIYA', 'Tejasvi dahiya', 'batter', 'BATTER', 'India', false, false, 'UNCAPPED-BATTERS', 30, '/players/kkr/tejasvi-dahiya.png', 'sports_cricket', '{"matches":8,"runs":210,"average":30,"strikeRate":138.5,"fifties":1}'::jsonb, 'Official IPL squad profile for TEJASVI DAHIYA', 'available'),
(56, 56, 'MATTHEW BREETZKE', 'Matthew breetzke', 'batter', 'BATTER', 'South Africa', true, true, 'TOP-ORDER-BATTERS', 75, '/players/lsg/matthew-breetzke.png', 'sports_cricket', '{"matches":16,"runs":480,"average":32,"strikeRate":139.8,"fifties":3}'::jsonb, 'Official IPL squad profile for MATTHEW BREETZKE', 'available'),
(57, 57, 'MUKUL CHOUDHARY', 'Mukul choudhary', 'bowler', 'BOWLER', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/lsg/mukul-choudhary.png', 'sports_baseball', '{"matches":6,"wickets":7,"economy":8.1,"bestBowling":"3/29"}'::jsonb, 'Official IPL squad profile for MUKUL CHOUDHARY', 'available'),
(58, 58, 'RUCHIT AHIR', 'Ruchit ahir', 'wicketkeeper', 'WICKETKEEPER', 'India', false, false, 'UNCAPPED-WICKETKEEPERS', 30, '/players/mi/ruchit-ahir.png', 'sports_cricket', '{"matches":4,"runs":95,"average":23.8,"strikeRate":128,"dismissals":5}'::jsonb, 'Official IPL squad profile for RUCHIT AHIR', 'available'),
(59, 59, 'ATHARVA ANKOLEKAR', 'Atharva ankolekar', 'allrounder', 'ALL-ROUNDER', 'India', false, false, 'UNCAPPED-ALLROUNDERS', 30, '/players/mi/atharva-ankolekar.png', 'sports_cricket', '{"matches":12,"runs":160,"strikeRate":132,"wickets":14,"economy":7.2}'::jsonb, 'Official IPL squad profile for ATHARVA ANKOLEKAR', 'available'),
(60, 60, 'RAJ BAWA', 'Raj bawa', 'allrounder', 'ALL-ROUNDER', 'India', false, false, 'UNCAPPED-ALLROUNDERS', 30, '/players/mi/raj-bawa.png', 'sports_cricket', '{"matches":14,"runs":220,"strikeRate":141,"wickets":11,"economy":8.5}'::jsonb, 'Official IPL squad profile for RAJ BAWA', 'available'),
(61, 61, 'KRISH BHAGAT', 'Krish bhagat', 'bowler', 'BOWLER', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/mi/krish-bhagat.png', 'sports_baseball', '{"matches":7,"wickets":9,"economy":8,"bestBowling":"3/24"}'::jsonb, 'Official IPL squad profile for KRISH BHAGAT', 'available'),
(62, 62, 'PRIYANSH ARYA', 'Priyansh arya', 'batter', 'BATTER', 'India', false, false, 'UNCAPPED-BATTERS', 30, '/players/pbks/priyansh-arya.png', 'sports_cricket', '{"matches":11,"runs":375,"average":37.5,"strikeRate":154.2,"fifties":3}'::jsonb, 'Official IPL squad profile for PRIYANSH ARYA', 'available'),
(63, 63, 'PYLA AVINASH', 'Pyla avinash', 'batter', 'BATTER', 'India', false, false, 'UNCAPPED-BATTERS', 30, '/players/pbks/pyla-avinash.png', 'sports_cricket', '{"matches":5,"runs":140,"average":28,"strikeRate":131,"fifties":1}'::jsonb, 'Official IPL squad profile for PYLA AVINASH', 'available'),
(64, 64, 'XAVIER BARTLETT', 'Xavier bartlett', 'bowler', 'BOWLER', 'Australia', true, true, 'FAST-BOWLERS', 100, '/players/pbks/xavier-bartlett.png', 'sports_baseball', '{"matches":15,"wickets":20,"economy":8.2,"bestBowling":"4/18"}'::jsonb, 'Official IPL squad profile for XAVIER BARTLETT', 'available'),
(65, 65, 'NANDRE BURGER', 'Nandre burger', 'bowler', 'BOWLER', 'South Africa', true, true, 'FAST-BOWLERS', 75, '/players/rr/nandre-burger.png', 'sports_baseball', '{"matches":14,"wickets":17,"economy":8.5,"bestBowling":"3/30"}'::jsonb, 'Official IPL squad profile for NANDRE BURGER', 'available'),
(66, 66, 'EMANJOT SINGH CHAHAL', 'Emanjot singh chahal', 'bowler', 'BOWLER', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/rr/emanjot-singh-chahal.png', 'sports_baseball', '{"matches":6,"wickets":8,"economy":7.9,"bestBowling":"2/19"}'::jsonb, 'Official IPL squad profile for EMANJOT SINGH CHAHAL', 'available'),
(67, 67, 'JACOB BETHELL', 'Jacob bethell', 'allrounder', 'ALL-ROUNDER', 'England', true, true, 'ALLROUNDERS', 125, '/players/rcb/jacob-bethell.png', 'sports_cricket', '{"matches":20,"runs":410,"average":29.3,"strikeRate":146.5,"wickets":12,"economy":7.8}'::jsonb, 'Official IPL squad profile for JACOB BETHELL', 'available'),
(68, 68, 'KANISHK CHOUHAN', 'Kanishk chouhan', 'bowler', 'BOWLER', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/rcb/kanishk-chouhan.png', 'sports_baseball', '{"matches":4,"wickets":5,"economy":8.3,"bestBowling":"2/22"}'::jsonb, 'Official IPL squad profile for KANISHK CHOUHAN', 'available'),
(69, 69, 'JORDAN COX', 'Jordan cox', 'wicketkeeper', 'WICKETKEEPER', 'England', true, true, 'WICKETKEEPERS', 75, '/players/rcb/jordan-cox.png', 'sports_cricket', '{"matches":18,"runs":460,"average":30.7,"strikeRate":142,"dismissals":14}'::jsonb, 'Official IPL squad profile for JORDAN COX', 'available'),
(70, 70, 'RS AMBRISH', 'Rs ambrish', 'bowler', 'BOWLER', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/srh/rs-ambrish.png', 'sports_baseball', '{"matches":5,"wickets":6,"economy":8.4,"bestBowling":"2/25"}'::jsonb, 'Official IPL squad profile for RS AMBRISH', 'available'),
(71, 71, 'ZEESHAN ANSARI', 'Zeeshan ansari', 'bowler', 'BOWLER', 'India', false, false, 'SPIN-BOWLERS', 30, '/players/srh/zeeshan-ansari.png', 'sports_baseball', '{"matches":9,"wickets":12,"economy":7.5,"bestBowling":"3/20"}'::jsonb, 'Official IPL squad profile for ZEESHAN ANSARI', 'available'),
(72, 72, 'SALIL ARORA', 'Salil arora', 'wicketkeeper', 'WICKETKEEPER', 'India', false, false, 'UNCAPPED-WICKETKEEPERS', 30, '/players/srh/salil-arora.png', 'sports_cricket', '{"matches":6,"runs":135,"average":27,"strikeRate":126.5,"dismissals":7}'::jsonb, 'Official IPL squad profile for SALIL ARORA', 'available'),
(73, 73, 'BRYDON CARSE', 'Brydon carse', 'bowler', 'BOWLER', 'England', true, true, 'FAST-BOWLERS', 100, '/players/srh/brydon-carse.png', 'sports_baseball', '{"matches":14,"wickets":16,"economy":8.6,"bestBowling":"3/28"}'::jsonb, 'Official IPL squad profile for BRYDON CARSE', 'available')
ON CONFLICT (id) DO UPDATE SET
    lot_number = EXCLUDED.lot_number,
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    role_label = EXCLUDED.role_label,
    nationality = EXCLUDED.nationality,
    overseas = EXCLUDED.overseas,
    capped = EXCLUDED.capped,
    set_name = EXCLUDED.set_name,
    base_price = EXCLUDED.base_price,
    image = EXCLUDED.image,
    icon = EXCLUDED.icon,
    stats = EXCLUDED.stats,
    tactical_profile = EXCLUDED.tactical_profile,
    status = EXCLUDED.status;

-- 2. SEED SINGLETON AUCTION SESSION
INSERT INTO public.auctions (
    id, status, current_player_id, current_bid, base_price,
    leading_team_id, round, lot_index, timer, max_timer,
    gavel_stage, bid_increment, session_label
) VALUES (
    1, 'idle', NULL, 0, 0,
    NULL, 1, 0, 10, 10,
    0, 10, '2026 MEGA AUCTION'
) ON CONFLICT (id) DO NOTHING;

-- 3. SEED 35 REAL OFFICIAL IPL PLAYERS (Integer Lakhs Reserve Prices)
INSERT INTO public.players (
    id, lot_number, name, display_name, role, role_label,
    nationality, overseas, capped, set_name,
    base_price, image, icon, stats, tactical_profile, status
) VALUES
-- SET 1: MARQUEE BATTERS
(1, 1, 'VIRAT KOHLI', 'Virat Kohli', 'batter', 'TOP-ORDER BATTER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'sports_cricket', '{"matches": 252, "runs": 8004, "wickets": 4, "strikeRate": 131.97, "average": 38.67, "economy": 8.79, "fifties": 55, "hundreds": 8, "best": "113"}', 'IPL all-time highest run-scorer. Supreme anchor and pacing index through middle overs.', 'available'),
(2, 2, 'ROHIT SHARMA', 'Rohit Sharma', 'batter', 'OPENING BATTER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'sports_cricket', '{"matches": 257, "runs": 6628, "wickets": 15, "strikeRate": 131.14, "average": 29.72, "economy": 8.02, "fifties": 43, "hundreds": 2, "best": "109*"}', '5-time IPL title-winning captain. Ruthless power-play ball-striker against short-pitch fast bowling.', 'available'),
(3, 3, 'TRAVIS HEAD', 'Travis Head', 'batter', 'AGGRESSIVE OPENER (LEFT HAND)', 'Australia', true, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'sports_cricket', '{"matches": 25, "runs": 872, "wickets": 3, "strikeRate": 178.69, "average": 37.91, "economy": 9.21, "fifties": 5, "hundreds": 1, "best": "102"}', 'Ultra-aggressive powerplay specialist. Highest scoring rate in overs 1-6 across world T20 in 2024.', 'available'),
(4, 4, 'SHUBMAN GILL', 'Shubman Gill', 'batter', 'TOP-ORDER BATTER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'sports_cricket', '{"matches": 103, "runs": 3216, "wickets": null, "strikeRate": 135.70, "average": 37.84, "economy": null, "fifties": 20, "hundreds": 4, "best": "129"}', 'Orange Cap winner 2023 (890 runs). Elite balance against pace and spin with exceptional placement.', 'available'),
(5, 5, 'YASHASVI JAISWAL', 'Yashasvi Jaiswal', 'batter', 'DYNAMIC OPENER (LEFT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'sports_cricket', '{"matches": 52, "runs": 1607, "wickets": null, "strikeRate": 150.61, "average": 32.14, "economy": null, "fifties": 9, "hundreds": 2, "best": "124"}', 'Fastest fifty in IPL history (13 balls). Dominates off-spin and left-arm orthodox with high intent.', 'available'),
(6, 6, 'SURYAKUMAR YADAV', 'Suryakumar Yadav', 'batter', '360-DEGREE FINISHER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'sports_cricket', '{"matches": 150, "runs": 3594, "wickets": null, "strikeRate": 145.33, "average": 32.09, "economy": null, "fifties": 24, "hundreds": 2, "best": "103*"}', 'World No. 1 T20 batter. Unmatched 360-degree range against 150 kph deliveries.', 'available'),

-- SET 2: WICKETKEEPERS
(7, 7, 'RISHABH PANT', 'Rishabh Pant', 'wicketkeeper', 'WICKETKEEPER-BATTER (LEFT HAND)', 'India', false, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'front_hand', '{"matches": 111, "runs": 3284, "catches": 75, "stumpings": 23, "strikeRate": 148.93, "average": 35.31, "fifties": 18, "hundreds": 1, "best": "128*"}', 'Match-winner with unmatched middle-overs counter-attack capability. 98 career dismissals.', 'available'),
(8, 8, 'HEINRICH KLAASEN', 'Heinrich Klaasen', 'wicketkeeper', 'MIDDLE-ORDER POWER WK (RIGHT HAND)', 'South Africa', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'front_hand', '{"matches": 35, "runs": 993, "catches": 19, "stumpings": 6, "strikeRate": 168.31, "average": 39.72, "fifties": 6, "hundreds": 1, "best": "104"}', 'Most destructive batter against spin in world cricket (SR 184.2 vs spin in IPL overs 7-15).', 'available'),
(9, 9, 'SANJU SAMSON', 'Sanju Samson', 'wicketkeeper', 'TOP-ORDER WK-BATTER (RIGHT HAND)', 'India', false, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'front_hand', '{"matches": 167, "runs": 4419, "catches": 82, "stumpings": 16, "strikeRate": 138.96, "average": 30.69, "fifties": 25, "hundreds": 3, "best": "119"}', 'Captain and pure stroke maker. High six-hitting ratio in powerplay and death overs (206 career sixes).', 'available'),
(10, 10, 'JOS BUTTLER', 'Jos Buttler', 'wicketkeeper', 'EXPLOSIVE OPENER-WK (RIGHT HAND)', 'England', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'front_hand', '{"matches": 107, "runs": 3582, "catches": 51, "stumpings": 1, "strikeRate": 147.53, "average": 38.11, "fifties": 19, "hundreds": 7, "best": "124"}', '7 career IPL centuries (second all-time). England white-ball icon with devastating scoop shots.', 'available'),
(11, 11, 'NICHOLAS POORAN', 'Nicholas Pooran', 'wicketkeeper', 'FINISHER / WK (LEFT HAND)', 'West Indies', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'front_hand', '{"matches": 76, "runs": 1769, "catches": 34, "stumpings": 8, "strikeRate": 162.29, "average": 32.76, "fifties": 9, "hundreds": 0, "best": "77"}', 'Specialist death overs aggressor. Strike rate exceeding 180 across overs 16-20.', 'available'),
(12, 12, 'MS DHONI', 'MS Dhoni', 'wicketkeeper', 'LEGENDARY FINISHER / WK (RIGHT HAND)', 'India', false, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'front_hand', '{"matches": 264, "runs": 5243, "catches": 152, "stumpings": 42, "strikeRate": 137.54, "average": 39.13, "fifties": 24, "hundreds": 0, "best": "84*"}', '5-time champion. Most dismissals by a wicketkeeper in IPL history (194). Master tactical mind.', 'available'),

-- SET 3: ALL-ROUNDERS
(13, 13, 'HARDIK PANDYA', 'Hardik Pandya', 'allrounder', 'PACE-BOWLING ALL-ROUNDER', 'India', false, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'public', '{"matches": 137, "runs": 2525, "wickets": 64, "strikeRate": 145.87, "average": 28.69, "economy": 8.95, "fifties": 10, "hundreds": 0, "best": "3/17"}', 'Rare pace-bowling all-rounder in subcontinent conditions. 140 kph middle-overs enforcer.', 'available'),
(14, 14, 'RAVINDRA JADEJA', 'Ravindra Jadeja', 'allrounder', 'SPIN ALL-ROUNDER / ELITE FIELDER', 'India', false, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'public', '{"matches": 240, "runs": 2959, "wickets": 160, "strikeRate": 129.50, "average": 27.40, "economy": 7.62, "fifties": 3, "hundreds": 0, "best": "5/16"}', '3-dimensional cricketer. Concedes under 7.50 RPO while bowling into the pitch.', 'available'),
(15, 15, 'ANDRE RUSSELL', 'Andre Russell', 'allrounder', 'POWER FINISHER & DEATH BOWLER', 'West Indies', true, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'public', '{"matches": 127, "runs": 2484, "wickets": 115, "strikeRate": 174.93, "average": 29.22, "economy": 9.24, "fifties": 11, "hundreds": 0, "best": "5/15"}', 'Highest career strike rate in IPL history (174.93). Crucial wicket-taker at the death.', 'available'),
(16, 16, 'RASHID KHAN', 'Rashid Khan', 'allrounder', 'LEG-SPIN ALL-ROUNDER', 'Afghanistan', true, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'public', '{"matches": 121, "runs": 551, "wickets": 149, "strikeRate": 154.78, "average": 21.84, "economy": 6.82, "fifties": 1, "hundreds": 0, "best": "4/24"}', 'Lowest economy rate in IPL among 100+ wicket holders (6.82). Rapid googly specialist.', 'available'),
(17, 17, 'SUNIL NARINE', 'Sunil Narine', 'allrounder', 'MYSTERY OFF-SPIN & PINCH HITTER', 'West Indies', true, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'public', '{"matches": 177, "runs": 1534, "wickets": 180, "strikeRate": 165.84, "average": 25.39, "economy": 6.73, "fifties": 7, "hundreds": 1, "best": "5/19"}', '3-time IPL MVP award winner (2012, 2018, 2024). Economy rate 6.73 and explosive opener.', 'available'),
(18, 18, 'AXAR PATEL', 'Axar Patel', 'allrounder', 'LEFT-ARM ORTHODOX & BATTER', 'India', false, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'public', '{"matches": 150, "runs": 1653, "wickets": 123, "strikeRate": 130.88, "average": 30.55, "economy": 7.24, "fifties": 3, "hundreds": 0, "best": "4/21"}', 'Key powerplay and middle-overs container. Excellent trajectory control and lower-order hitter.', 'available'),

-- SET 4: FAST BOWLERS
(19, 19, 'JASPRIT BUMRAH', 'Jasprit Bumrah', 'bowler', 'RIGHT-ARM EXPRESS (145+ KPH)', 'India', false, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 133, "runs": null, "wickets": 165, "strikeRate": null, "average": 22.51, "economy": 7.30, "fifties": null, "hundreds": null, "best": "5/10"}', 'Gold-standard T20 bowler worldwide. Unplayable dipping yorkers, conceded merely 6.48 RPO in 2024.', 'available'),
(20, 20, 'PAT CUMMINS', 'Pat Cummins', 'bowler', 'RIGHT-ARM FAST SEAM', 'Australia', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 58, "runs": 515, "wickets": 63, "strikeRate": 150.15, "average": 29.84, "economy": 8.87, "fifties": 1, "hundreds": 0, "best": "4/34"}', 'World Cup winning captain. Hard-length enforcer through middle overs and aggressive batter.', 'available'),
(21, 21, 'MITCHELL STARC', 'Mitchell Starc', 'bowler', 'LEFT-ARM EXPRESS (150 KPH)', 'Australia', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 41, "runs": null, "wickets": 51, "strikeRate": null, "average": 23.90, "economy": 8.64, "best": "4/15"}', 'Player of the Match in IPL 2024 Final & Qualifier 1. Lethal swinging full deliveries in over 1.', 'available'),
(22, 22, 'TRENT BOULT', 'Trent Boult', 'bowler', 'LEFT-ARM SWING SPECIALIST', 'New Zealand', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 104, "runs": null, "wickets": 121, "strikeRate": null, "average": 26.49, "economy": 8.29, "best": "4/18"}', 'Premier first-over wicket taker in T20 history (28 first-over wickets in IPL).', 'available'),
(23, 23, 'MOHAMMED SHAMI', 'Mohammed Shami', 'bowler', 'RIGHT-ARM SEAM ENFORCER', 'India', false, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 110, "runs": null, "wickets": 127, "strikeRate": null, "average": 26.87, "economy": 8.44, "best": "4/11"}', 'Purple Cap winner 2023 (28 wickets). Impeccable upright seam presentation generating movement.', 'available'),
(24, 24, 'ARSHDEEP SINGH', 'Arshdeep Singh', 'bowler', 'LEFT-ARM DEATH OVERS SPECIALIST', 'India', false, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 65, "runs": null, "wickets": 76, "strikeRate": null, "average": 27.00, "economy": 9.03, "best": "5/32"}', 'T20 World Cup leading wicket taker (17 wickets). Pinpoint yorkers targeting base of stumps.', 'available'),
(25, 25, 'MATHEESHA PATHIRANA', 'Matheesha Pathirana', 'bowler', 'SLING-ACTION DEATH SPECIALIST', 'Sri Lanka', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 150, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 20, "runs": null, "wickets": 34, "strikeRate": null, "average": 18.59, "economy": 7.88, "best": "4/28"}', 'Unique low-release sling trajectory (148 kph). Concedes lowest boundary percentage at the death.', 'available'),

-- SET 5: SPIN BOWLERS
(26, 26, 'YUZVENDRA CHAHAL', 'Yuzvendra Chahal', 'bowler', 'RIGHT-ARM LEGBREAK WICKET-TAKER', 'India', false, true, 'SET 05 // SPIN BOWLERS (SPIN1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 160, "runs": null, "wickets": 205, "strikeRate": null, "average": 22.45, "economy": 7.84, "best": "5/40"}', 'All-time highest wicket-taker in IPL history (205 wickets). Brave flight outside off stump.', 'available'),
(27, 27, 'KULDEEP YADAV', 'Kuldeep Yadav', 'bowler', 'LEFT-ARM WRIST SPIN (CHINAMAN)', 'India', false, true, 'SET 05 // SPIN BOWLERS (SPIN1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 84, "runs": null, "wickets": 87, "strikeRate": null, "average": 26.24, "economy": 7.85, "best": "4/14"}', 'World Cup winning wrist-spinner. High pace trajectory (88-92 kph) with sharp turn both ways.', 'available'),
(28, 28, 'VARUN CHAKARAVARTHY', 'Varun Chakaravarthy', 'bowler', 'RIGHT-ARM MYSTERY SPIN', 'India', false, true, 'SET 05 // SPIN BOWLERS (SPIN1)', 150, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 71, "runs": null, "wickets": 75, "strikeRate": null, "average": 25.40, "economy": 7.56, "best": "5/20"}', 'Seven variations including carrom ball. 21 wickets in KKR 2024 title campaign.', 'available'),

-- SET 6: EMERGING & ACCELERATED STARS
(29, 29, 'RINKU SINGH', 'Rinku Singh', 'batter', 'LEFT-HAND FINISHER', 'India', false, true, 'SET 06 // EMERGING & IMPACT (ACC1)', 100, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'sports_cricket', '{"matches": 45, "runs": 893, "wickets": null, "strikeRate": 143.34, "average": 30.79, "fifties": 4, "hundreds": 0, "best": "67*"}', '5 consecutive sixes finisher. Exceptional strike-rate of 192.5 in the 20th over.', 'available'),
(30, 30, 'SHASHANK SINGH', 'Shashank Singh', 'batter', 'MIDDLE-ORDER STRIKER (RIGHT HAND)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'sports_cricket', '{"matches": 24, "runs": 423, "wickets": null, "strikeRate": 164.71, "average": 38.45, "fifties": 2, "hundreds": 0, "best": "68*"}', 'Breakout uncapped star of IPL 2024 (354 runs, SR 164.7). Elite bat swing and composure.', 'available'),
(31, 31, 'MAYANK YADAV', 'Mayank Yadav', 'bowler', 'OUTRIGHT EXPRESS (156.7 KPH)', 'India', false, true, 'SET 06 // EMERGING & IMPACT (ACC1)', 75, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 4, "runs": null, "wickets": 7, "strikeRate": null, "average": 12.14, "economy": 6.99, "best": "3/14"}', 'Fastest ball of IPL 2024 (156.7 kph). Hurries batters with genuine raw velocity and seam bounce.', 'available'),
(32, 32, 'NITISH KUMAR REDDY', 'Nitish Kumar Reddy', 'allrounder', 'SEAM-BOWLING ALL-ROUNDER', 'India', false, true, 'SET 06 // EMERGING & IMPACT (ACC1)', 75, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'public', '{"matches": 15, "runs": 303, "wickets": 3, "strikeRate": 142.92, "average": 33.67, "economy": 9.88, "fifties": 2, "hundreds": 0, "best": "64"}', 'IPL 2024 Emerging Player of the Season. Clean lofted driver and medium-pace wicket-taker.', 'available'),
(33, 33, 'ABISHEK POREL', 'Abishek Porel', 'wicketkeeper', 'TOP-ORDER ATTACKING WK (LEFT HAND)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'front_hand', '{"matches": 18, "runs": 360, "catches": 11, "stumpings": 2, "strikeRate": 155.17, "average": 27.69, "fifties": 2, "hundreds": 0, "best": "65"}', 'Uncapped left-hand wicketkeeper batter. Fearless powerplay ball-striker.', 'available'),
(34, 34, 'PHILIP SALT', 'Phil Salt', 'wicketkeeper', 'POWERPLAY DESTROYER / WK (RIGHT HAND)', 'England', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 150, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'front_hand', '{"matches": 21, "runs": 653, "catches": 16, "stumpings": 2, "strikeRate": 175.54, "average": 36.28, "fifties": 6, "hundreds": 0, "best": "89*"}', 'IPL 2024 champion opener with KKR (435 runs, SR 182.0). Demolishes fast bowling in overs 1-6.', 'available'),
(35, 35, 'KAGISO RABADA', 'Kagiso Rabada', 'bowler', 'RIGHT-ARM FAST (145+ KPH)', 'South Africa', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, 'https://images.ctfassets.net/jot2qw8s50z1/68BTfjWpntEFEBXMhfs9Jf/27b791fb9dc3ee514ef5cddb5e6defb8/image.png', 'bolt', '{"matches": 80, "runs": null, "wickets": 117, "strikeRate": null, "average": 23.15, "economy": 8.42, "best": "4/21"}', 'Fastest bowler to reach 100 IPL wickets (64 matches). Ruthless pace and heavy bouncer.', 'available')
ON CONFLICT (id) DO UPDATE SET
    lot_number = EXCLUDED.lot_number,
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    role_label = EXCLUDED.role_label,
    nationality = EXCLUDED.nationality,
    overseas = EXCLUDED.overseas,
    capped = EXCLUDED.capped,
    set_name = EXCLUDED.set_name,
    base_price = EXCLUDED.base_price,
    image = EXCLUDED.image,
    icon = EXCLUDED.icon,
    stats = EXCLUDED.stats,
    tactical_profile = EXCLUDED.tactical_profile,
    status = EXCLUDED.status;

-- 4. FUNCTION TO SEED SUPABASE AUTH USERS & PROFILES
CREATE OR REPLACE FUNCTION public.seed_hammer_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    team_rec RECORD;
    v_user_id UUID;
    v_enc_pw TEXT;
BEGIN
    v_enc_pw := crypt('hammer2026', gen_salt('bf'));

    -- 1. AUCTIONEER
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'auctioneer@hammer.ipl';
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (v_user_id, 'auctioneer@hammer.ipl', v_enc_pw, now(), '{"role":"auctioneer","username":"auctioneer"}'::jsonb);
    END IF;
    INSERT INTO public.profiles (id, email, username, role, team_id)
    VALUES (v_user_id, 'auctioneer@hammer.ipl', 'auctioneer', 'auctioneer', NULL)
    ON CONFLICT (id) DO UPDATE SET role = 'auctioneer';

    -- 2. VIEWER
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'viewer@hammer.ipl';
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (v_user_id, 'viewer@hammer.ipl', crypt('view2026', gen_salt('bf')), now(), '{"role":"viewer","username":"viewer"}'::jsonb);
    END IF;
    INSERT INTO public.profiles (id, email, username, role, team_id)
    VALUES (v_user_id, 'viewer@hammer.ipl', 'viewer', 'viewer', NULL)
    ON CONFLICT (id) DO UPDATE SET role = 'viewer';

    -- 3. 10 TEAM OWNER ACCOUNTS
    FOR team_rec IN SELECT id, lower(id) as code FROM public.teams LOOP
        SELECT id INTO v_user_id FROM auth.users WHERE email = (team_rec.code || '@hammer.ipl');
        IF v_user_id IS NULL THEN
            v_user_id := gen_random_uuid();
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
            VALUES (v_user_id, team_rec.code || '@hammer.ipl', v_enc_pw, now(), jsonb_build_object('role', 'team_owner', 'teamId', team_rec.id, 'username', team_rec.code));
        END IF;
        INSERT INTO public.profiles (id, email, username, role, team_id)
        VALUES (v_user_id, team_rec.code || '@hammer.ipl', team_rec.code, 'team_owner', team_rec.id)
        ON CONFLICT (id) DO UPDATE SET role = 'team_owner', team_id = team_rec.id;
    END LOOP;
END;
$$;

-- Execute user seeding
SELECT public.seed_hammer_users();
