-- Cajun Bingo Supply — product seed data
-- Run once after schema.sql, in the Supabase SQL Editor.
-- Translates the 9 hardcoded product cards (6 from pages/products.html,
-- 3 from pages/raffles.html) into the products table.

insert into public.products (id, name, form_label, category, price_display, img_class, flyer_path, payout_rows, sort_order) values

('KB2', 'Killer Bees', 'Form KB2', 'pull-tab', '$1.00 per card', 'kb-img', '../images/products/KB2_KillerBees.pdf', '[
  {"label":"Cards per deal","value":"660","style":"default"},
  {"label":"Takes in","value":"$660.00","style":"default"},
  {"label":"Daub Prize","value":"$400","style":"highlight"},
  {"label":"Top Instant Win","value":"$50","style":"default"},
  {"label":"Payout","value":"72.73%","style":"default"},
  {"label":"Gross Profit","value":"$180.00","style":"gross"}
]'::jsonb, 10),

('KB3', 'Killer Bees', 'Form KB3', 'pull-tab', '$1.00 per card', 'kb-img', '../images/products/KB2_KillerBees.pdf', '[
  {"label":"Cards per deal","value":"1,440","style":"default"},
  {"label":"Takes in","value":"$1,440.00","style":"default"},
  {"label":"Daub Prize","value":"$599","style":"highlight"},
  {"label":"Top Instant Win","value":"$100","style":"default"},
  {"label":"Payout","value":"72.15%","style":"default"},
  {"label":"Gross Profit","value":"$401.00","style":"gross"}
]'::jsonb, 20),

('RBDD01', 'Rubber Ducky Downline', 'RBDD01', 'pull-tab', '$1.00 per card', 'rd-img', '../images/products/RBDD02 $1 Rubber Ducky Downline.pdf', '[
  {"label":"Cards per deal","value":"385","style":"default"},
  {"label":"Takes in","value":"$385.00","style":"default"},
  {"label":"Duck Winner","value":"$200","style":"highlight"},
  {"label":"Bingo Winner","value":"$50","style":"default"},
  {"label":"Payout","value":"71.17%","style":"default"},
  {"label":"Gross Profit","value":"$111.00","style":"gross"}
]'::jsonb, 30),

('RBDD02', 'Rubber Ducky Downline', 'RBDD02', 'pull-tab', '$1.00 per card', 'rd-img', '../images/products/RBDD02 $1 Rubber Ducky Downline.pdf', '[
  {"label":"Cards per deal","value":"630","style":"default"},
  {"label":"Takes in","value":"$630.00","style":"default"},
  {"label":"Duck Winner","value":"$300","style":"highlight"},
  {"label":"Bingo Winner","value":"$100","style":"default"},
  {"label":"Payout","value":"70.48%","style":"default"},
  {"label":"Gross Profit","value":"$186.00","style":"gross"}
]'::jsonb, 40),

('RBDD03', 'Rubber Ducky Downline', 'RBDD03', 'pull-tab', '$1.00 per card', 'rd-img', '../images/products/RBDD02 $1 Rubber Ducky Downline.pdf', '[
  {"label":"Cards per deal","value":"945","style":"default"},
  {"label":"Takes in","value":"$945.00","style":"default"},
  {"label":"Duck Winner","value":"$500","style":"highlight"},
  {"label":"Bingo Winner","value":"$100","style":"default"},
  {"label":"Payout","value":"71.96%","style":"default"},
  {"label":"Gross Profit","value":"$265.00","style":"gross"}
]'::jsonb, 50),

('TB40', 'Tiger Ball', 'Form TB40', 'pull-tab', '$1.00 per card', 'tb-img', '../images/products/TB40_TigerBall_PROMO.pdf', '[
  {"label":"Cards per deal","value":"840","style":"default"},
  {"label":"Takes in","value":"$840.00","style":"default"},
  {"label":"Purple Winner","value":"$400","style":"highlight"},
  {"label":"Gold Winner","value":"$100","style":"default"},
  {"label":"Payout","value":"70.24%","style":"default"},
  {"label":"Gross Profit","value":"$250.00","style":"gross"}
]'::jsonb, 60),

('CAT1R', 'Lucky Cat', 'Form CAT1R', 'raffle', '$5.00 per card', 'cat-img', '../images/products/Lucky Cat_CAT1R_Flier.pdf', '[
  {"label":"Cards per set","value":"180","style":"default"},
  {"label":"Takes in","value":"$900.00","style":"default"},
  {"label":"Raffle Winner","value":"$599.00","style":"highlight"},
  {"label":"Payout","value":"66.65%","style":"default"},
  {"label":"Gross Profit","value":"$301.00","style":"gross"}
]'::jsonb, 10),

('TBD', 'The Big Dill', 'Item TBD', 'raffle', 'Contact us for pricing', 'dill-img', '../images/products/TBD The Big Dill Raffle.pdf', '[
  {"label":"Cards per set","value":"150","style":"default"},
  {"label":"Sets per game","value":"7 (A–G)","style":"default"},
  {"label":"Unique tickets","value":"1,050","style":"highlight"},
  {"label":"Prize","value":"Item TBD","style":"default"},
  {"label":"Daub 1–75 to win","value":"","style":"default"}
]'::jsonb, 20),

('BA180', 'Bingo Animals', 'Form BA180', 'raffle', 'Contact us for pricing', 'ba-img', '../images/products/Bingo Animals_BA180_Flier.pdf', '[
  {"label":"Cards per set","value":"180","style":"default"},
  {"label":"Sets per case","value":"8","style":"default"},
  {"label":"Unique faces/case","value":"1,440","style":"highlight"},
  {"label":"Daub 1–75 to win","value":"","style":"default"}
]'::jsonb, 30);
