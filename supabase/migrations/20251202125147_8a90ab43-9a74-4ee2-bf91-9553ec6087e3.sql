-- Update existing BL orders with complete dummy data
UPDATE bl_order SET 
  eta = '2025-12-20',
  atd = '2025-10-28',
  revenue = 82905.12,
  cost = 69078.00
WHERE id = 4;

UPDATE bl_order SET 
  eta = '2026-01-15',
  revenue = 45000.00,
  cost = 38000.00
WHERE id = 5;

UPDATE bl_order SET 
  eta = '2025-12-15',
  atd = '2025-11-01',
  revenue = 55673.28,
  cost = 46394.00
WHERE id = 14;

UPDATE bl_order SET 
  eta = '2025-12-28',
  revenue = 48000.00,
  cost = 40000.00
WHERE id = 15;

UPDATE bl_order SET 
  eta = '2026-01-05',
  revenue = 52000.00,
  cost = 43500.00
WHERE id = 16;

UPDATE bl_order SET 
  eta = '2026-01-20',
  revenue = 38000.00,
  cost = 31500.00
WHERE id = 17;

UPDATE bl_order SET 
  eta = '2025-12-30',
  revenue = 44000.00,
  cost = 36500.00
WHERE id = 19;

UPDATE bl_order SET 
  eta = '2025-12-18',
  atd = '2025-10-15',
  ata = '2025-11-28',
  revenue = 55673.28,
  cost = 46394.00
WHERE id = 20;

UPDATE bl_order SET 
  eta = '2025-12-25',
  atd = '2025-11-15',
  revenue = 55673.28,
  cost = 46394.00
WHERE id = 21;

UPDATE bl_order SET 
  eta = '2025-12-22',
  atd = '2025-11-05',
  revenue = 58749.60,
  cost = 48958.00
WHERE id = 22;