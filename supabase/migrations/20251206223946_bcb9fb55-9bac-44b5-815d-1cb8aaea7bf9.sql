UPDATE invoice SET 
  original_due_date = CASE 
    WHEN original_due_date IS NULL THEN '2025-12-15'::date 
    ELSE original_due_date 
  END,
  actual_due_date = CASE id
    WHEN 8 THEN '2025-12-10'::date
    WHEN 10 THEN '2025-12-20'::date
    WHEN 11 THEN '2025-12-18'::date
    WHEN 12 THEN '2025-12-22'::date
    WHEN 13 THEN '2025-12-28'::date
    WHEN 14 THEN '2026-01-05'::date
    WHEN 15 THEN '2026-01-10'::date
    WHEN 16 THEN '2026-01-15'::date
    WHEN 17 THEN '2026-01-18'::date
    WHEN 18 THEN '2026-01-22'::date
    WHEN 19 THEN '2026-01-25'::date
    WHEN 20 THEN '2026-01-28'::date
    WHEN 21 THEN '2026-02-02'::date
    WHEN 22 THEN '2026-02-08'::date
    WHEN 23 THEN '2026-02-12'::date
    WHEN 24 THEN '2026-02-15'::date
    WHEN 25 THEN '2026-02-18'::date
    WHEN 26 THEN '2026-02-20'::date
    WHEN 27 THEN '2026-02-22'::date
    WHEN 28 THEN '2026-02-25'::date
    WHEN 29 THEN '2025-12-20'::date
    WHEN 30 THEN '2025-12-28'::date
    WHEN 31 THEN '2026-01-08'::date
    WHEN 32 THEN '2026-01-12'::date
    WHEN 33 THEN '2025-12-15'::date
    WHEN 34 THEN '2025-12-22'::date
    WHEN 35 THEN '2026-01-05'::date
    WHEN 36 THEN '2026-01-15'::date
    WHEN 218 THEN '2025-12-08'::date
    WHEN 219 THEN '2025-12-12'::date
    WHEN 221 THEN '2026-01-20'::date
    WHEN 222 THEN '2026-02-01'::date
    WHEN 223 THEN '2026-02-28'::date
    ELSE actual_due_date
  END
WHERE actual_due_date IS NULL;