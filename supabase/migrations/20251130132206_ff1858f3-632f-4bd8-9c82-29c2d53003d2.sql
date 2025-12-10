
-- Insert dummy companies with comprehensive data
INSERT INTO "Company" (name, kyb_status, kyb_effective_date, risk_rating, credit_limit, trade_credit_limit, current_exposure, amount_overdue, "total_MT_loaded", "total_MT_signed", trader_relationship_owner, payment_terms, total_traded_volume)
VALUES 
  ('Shanghai Steel Industries Co.', 'Approved', '2024-01-15', 'Low', 5000000, 4500000, 2100000, 0, 15000, 18000, 'Harry', 'Net 60', 45000000),
  ('European Metal Recyclers GmbH', 'Approved', '2024-02-20', 'Medium', 3500000, 3000000, 1500000, 250000, 8500, 12000, 'Veli', 'Net 45', 28000000),
  ('Emirates Scrap Trading LLC', 'Needs Review', NULL, 'High', 2000000, 1800000, 1900000, 500000, 3200, 5000, 'Eric', 'Net 30', 12000000),
  ('Tokyo Metal Resources KK', 'Approved', '2024-03-10', 'Low', 6000000, 5500000, 3200000, 0, 22000, 25000, 'Anton', 'Net 90', 67000000),
  ('Brazilian Metals Exporters SA', 'Approved', '2023-12-05', 'Medium', 4000000, 3500000, 2400000, 120000, 12000, 15000, 'Armin', 'Net 60', 38000000),
  ('Nordic Recycling Solutions AB', 'Approved', '2024-01-28', 'Low', 4500000, 4000000, 1800000, 0, 9500, 11000, 'Christian', 'Net 45', 32000000),
  ('India Steel Traders Pvt Ltd', 'Rejected', '2024-02-15', 'High', 1500000, 1200000, 1400000, 800000, 2800, 4500, 'Khsitiz', 'Net 15', 8500000),
  ('Australian Metal Brokers Pty', 'Approved', '2024-03-01', 'Low', 5500000, 5000000, 2800000, 0, 18000, 20000, 'Harry', 'Net 75', 52000000),
  ('Singapore Commodities Hub Ltd', 'Approved', '2024-01-10', 'Medium', 7000000, 6500000, 4100000, 180000, 28000, 32000, 'Veli', 'Net 60', 89000000),
  ('Turkish Metal Industries AS', 'Needs Review', NULL, 'Medium', 2500000, 2200000, 2100000, 350000, 5500, 7500, 'Eric', 'Net 30', 18000000),
  ('Canadian Scrap Solutions Inc', 'Approved', '2024-02-12', 'Low', 4200000, 3800000, 2000000, 0, 11000, 13500, 'Anton', 'Net 60', 35000000),
  ('South African Metal Works Ltd', 'Approved', '2023-11-20', 'Medium', 3000000, 2700000, 1600000, 95000, 7200, 9000, 'Armin', 'Net 45', 24000000),
  ('Mexican Metals Trading SA de CV', 'Approved', '2024-01-05', 'Low', 3800000, 3400000, 1900000, 0, 10500, 12800, 'Christian', 'Net 60', 31000000),
  ('Korean Metal Exporters Co', 'Approved', '2024-03-15', 'Low', 5200000, 4800000, 2600000, 0, 16500, 19000, 'Khsitiz', 'Net 75', 48000000),
  ('Italian Recycling Group SpA', 'Needs Review', NULL, 'High', 2200000, 2000000, 2100000, 620000, 4100, 6200, 'Harry', 'Net 30', 14000000)
ON CONFLICT (id) DO NOTHING;

-- Now insert corresponding addresses for these companies
-- Get the company IDs that were just inserted
WITH company_ids AS (
  SELECT id, name FROM "Company" 
  WHERE name IN (
    'Shanghai Steel Industries Co.',
    'European Metal Recyclers GmbH',
    'Emirates Scrap Trading LLC',
    'Tokyo Metal Resources KK',
    'Brazilian Metals Exporters SA',
    'Nordic Recycling Solutions AB',
    'India Steel Traders Pvt Ltd',
    'Australian Metal Brokers Pty',
    'Singapore Commodities Hub Ltd',
    'Turkish Metal Industries AS',
    'Canadian Scrap Solutions Inc',
    'South African Metal Works Ltd',
    'Mexican Metals Trading SA de CV',
    'Korean Metal Exporters Co',
    'Italian Recycling Group SpA'
  )
)
INSERT INTO "Company_address" (company_id, line1, city, region, country, post_code, is_primary, "VAT_id", contact_name_1, email_1, phone_1, job_position_1, contact_name_2, email_2, phone_2, job_position_2)
SELECT 
  c.id,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN '1288 Nanjing Road, Pudong District'
    WHEN 'European Metal Recyclers GmbH' THEN 'Industriestraße 45'
    WHEN 'Emirates Scrap Trading LLC' THEN 'Jebel Ali Free Zone, Building 3'
    WHEN 'Tokyo Metal Resources KK' THEN '2-8-1 Marunouchi, Chiyoda-ku'
    WHEN 'Brazilian Metals Exporters SA' THEN 'Avenida Paulista 1578, 15º andar'
    WHEN 'Nordic Recycling Solutions AB' THEN 'Kungsgatan 58'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'Plot 42, MIDC Industrial Area'
    WHEN 'Australian Metal Brokers Pty' THEN '125 York Street, Level 12'
    WHEN 'Singapore Commodities Hub Ltd' THEN '1 Raffles Place, Tower 2, #40-01'
    WHEN 'Turkish Metal Industries AS' THEN 'Büyükdere Caddesi No:193, Levent'
    WHEN 'Canadian Scrap Solutions Inc' THEN '100 King Street West, Suite 5600'
    WHEN 'South African Metal Works Ltd' THEN '2 Hertzog Boulevard, Foreshore'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'Paseo de la Reforma 505, Piso 51'
    WHEN 'Korean Metal Exporters Co' THEN '159 Samsung-ro, Gangnam-gu'
    WHEN 'Italian Recycling Group SpA' THEN 'Via Montenapoleone 8'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'Shanghai'
    WHEN 'European Metal Recyclers GmbH' THEN 'Hamburg'
    WHEN 'Emirates Scrap Trading LLC' THEN 'Dubai'
    WHEN 'Tokyo Metal Resources KK' THEN 'Tokyo'
    WHEN 'Brazilian Metals Exporters SA' THEN 'São Paulo'
    WHEN 'Nordic Recycling Solutions AB' THEN 'Stockholm'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'Mumbai'
    WHEN 'Australian Metal Brokers Pty' THEN 'Sydney'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'Singapore'
    WHEN 'Turkish Metal Industries AS' THEN 'Istanbul'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'Toronto'
    WHEN 'South African Metal Works Ltd' THEN 'Cape Town'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'Mexico City'
    WHEN 'Korean Metal Exporters Co' THEN 'Seoul'
    WHEN 'Italian Recycling Group SpA' THEN 'Milan'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'Pudong'
    WHEN 'European Metal Recyclers GmbH' THEN 'Hamburg'
    WHEN 'Emirates Scrap Trading LLC' THEN 'Dubai'
    WHEN 'Tokyo Metal Resources KK' THEN 'Tokyo'
    WHEN 'Brazilian Metals Exporters SA' THEN 'São Paulo'
    WHEN 'Nordic Recycling Solutions AB' THEN 'Stockholm'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'Maharashtra'
    WHEN 'Australian Metal Brokers Pty' THEN 'New South Wales'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'Central'
    WHEN 'Turkish Metal Industries AS' THEN 'Istanbul'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'Ontario'
    WHEN 'South African Metal Works Ltd' THEN 'Western Cape'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'CDMX'
    WHEN 'Korean Metal Exporters Co' THEN 'Seoul'
    WHEN 'Italian Recycling Group SpA' THEN 'Lombardy'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'China'
    WHEN 'European Metal Recyclers GmbH' THEN 'Germany'
    WHEN 'Emirates Scrap Trading LLC' THEN 'United Arab Emirates'
    WHEN 'Tokyo Metal Resources KK' THEN 'Japan'
    WHEN 'Brazilian Metals Exporters SA' THEN 'Brazil'
    WHEN 'Nordic Recycling Solutions AB' THEN 'Sweden'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'India'
    WHEN 'Australian Metal Brokers Pty' THEN 'Australia'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'Singapore'
    WHEN 'Turkish Metal Industries AS' THEN 'Turkey'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'Canada'
    WHEN 'South African Metal Works Ltd' THEN 'South Africa'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'Mexico'
    WHEN 'Korean Metal Exporters Co' THEN 'Korea, South'
    WHEN 'Italian Recycling Group SpA' THEN 'Italy'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN '200120'
    WHEN 'European Metal Recyclers GmbH' THEN '22761'
    WHEN 'Emirates Scrap Trading LLC' THEN '17000'
    WHEN 'Tokyo Metal Resources KK' THEN '100-0005'
    WHEN 'Brazilian Metals Exporters SA' THEN '01310-100'
    WHEN 'Nordic Recycling Solutions AB' THEN '11156'
    WHEN 'India Steel Traders Pvt Ltd' THEN '400001'
    WHEN 'Australian Metal Brokers Pty' THEN '2000'
    WHEN 'Singapore Commodities Hub Ltd' THEN '048616'
    WHEN 'Turkish Metal Industries AS' THEN '34394'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'M5X 1B8'
    WHEN 'South African Metal Works Ltd' THEN '8001'
    WHEN 'Mexican Metals Trading SA de CV' THEN '06500'
    WHEN 'Korean Metal Exporters Co' THEN '06236'
    WHEN 'Italian Recycling Group SpA' THEN '20121'
  END,
  true,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'CN-91310000MA1FL3CU2X'
    WHEN 'European Metal Recyclers GmbH' THEN 'DE123456789'
    WHEN 'Emirates Scrap Trading LLC' THEN 'AE100389876500003'
    WHEN 'Tokyo Metal Resources KK' THEN 'JP1234567890123'
    WHEN 'Brazilian Metals Exporters SA' THEN 'BR12.345.678/0001-90'
    WHEN 'Nordic Recycling Solutions AB' THEN 'SE556123456701'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'IN29AABCU1234C1Z5'
    WHEN 'Australian Metal Brokers Pty' THEN 'AU12345678901'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'SG201234567X'
    WHEN 'Turkish Metal Industries AS' THEN 'TR1234567890'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'CA123456789RT0001'
    WHEN 'South African Metal Works Ltd' THEN 'ZA1234567890'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'MX-ABC123456DEF'
    WHEN 'Korean Metal Exporters Co' THEN 'KR123-45-67890'
    WHEN 'Italian Recycling Group SpA' THEN 'IT12345678901'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'Li Wei'
    WHEN 'European Metal Recyclers GmbH' THEN 'Hans Mueller'
    WHEN 'Emirates Scrap Trading LLC' THEN 'Ahmed Al Maktoum'
    WHEN 'Tokyo Metal Resources KK' THEN 'Tanaka Hiroshi'
    WHEN 'Brazilian Metals Exporters SA' THEN 'Carlos Silva'
    WHEN 'Nordic Recycling Solutions AB' THEN 'Erik Andersson'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'Rajesh Kumar'
    WHEN 'Australian Metal Brokers Pty' THEN 'James Mitchell'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'Tan Wei Ming'
    WHEN 'Turkish Metal Industries AS' THEN 'Mehmet Yilmaz'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'Sarah Thompson'
    WHEN 'South African Metal Works Ltd' THEN 'Thabo Nkosi'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'Juan Rodriguez'
    WHEN 'Korean Metal Exporters Co' THEN 'Kim Min-jae'
    WHEN 'Italian Recycling Group SpA' THEN 'Marco Rossi'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'li.wei@shanghaisteel.cn'
    WHEN 'European Metal Recyclers GmbH' THEN 'h.mueller@emr-gmbh.de'
    WHEN 'Emirates Scrap Trading LLC' THEN 'ahmed@emiratesscrap.ae'
    WHEN 'Tokyo Metal Resources KK' THEN 'tanaka@tmr.co.jp'
    WHEN 'Brazilian Metals Exporters SA' THEN 'carlos.silva@brmetals.com.br'
    WHEN 'Nordic Recycling Solutions AB' THEN 'erik.andersson@nordic-recycling.se'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'rajesh@indiasteel.in'
    WHEN 'Australian Metal Brokers Pty' THEN 'james.mitchell@ausmetals.com.au'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'tan.weiming@sgcommodities.sg'
    WHEN 'Turkish Metal Industries AS' THEN 'mehmet.yilmaz@turkishmetal.com.tr'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'sarah.thompson@canscrap.ca'
    WHEN 'South African Metal Works Ltd' THEN 'thabo.nkosi@sametalworks.co.za'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'juan.rodriguez@mexmetals.mx'
    WHEN 'Korean Metal Exporters Co' THEN 'kim.minjae@koreanmetal.kr'
    WHEN 'Italian Recycling Group SpA' THEN 'marco.rossi@italrecycling.it'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN '+86 21 5888 1234'
    WHEN 'European Metal Recyclers GmbH' THEN '+49 40 7654 3210'
    WHEN 'Emirates Scrap Trading LLC' THEN '+971 4 887 1234'
    WHEN 'Tokyo Metal Resources KK' THEN '+81 3 5252 1234'
    WHEN 'Brazilian Metals Exporters SA' THEN '+55 11 3456 7890'
    WHEN 'Nordic Recycling Solutions AB' THEN '+46 8 123 4567'
    WHEN 'India Steel Traders Pvt Ltd' THEN '+91 22 2345 6789'
    WHEN 'Australian Metal Brokers Pty' THEN '+61 2 9876 5432'
    WHEN 'Singapore Commodities Hub Ltd' THEN '+65 6234 5678'
    WHEN 'Turkish Metal Industries AS' THEN '+90 212 345 6789'
    WHEN 'Canadian Scrap Solutions Inc' THEN '+1 416 555 7890'
    WHEN 'South African Metal Works Ltd' THEN '+27 21 456 7890'
    WHEN 'Mexican Metals Trading SA de CV' THEN '+52 55 1234 5678'
    WHEN 'Korean Metal Exporters Co' THEN '+82 2 1234 5678'
    WHEN 'Italian Recycling Group SpA' THEN '+39 02 7654 3210'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'General Manager'
    WHEN 'European Metal Recyclers GmbH' THEN 'Commercial Director'
    WHEN 'Emirates Scrap Trading LLC' THEN 'Managing Director'
    WHEN 'Tokyo Metal Resources KK' THEN 'President'
    WHEN 'Brazilian Metals Exporters SA' THEN 'Export Director'
    WHEN 'Nordic Recycling Solutions AB' THEN 'CEO'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'Managing Director'
    WHEN 'Australian Metal Brokers Pty' THEN 'Head of Trading'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'CFO'
    WHEN 'Turkish Metal Industries AS' THEN 'General Manager'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'VP Operations'
    WHEN 'South African Metal Works Ltd' THEN 'Commercial Manager'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'Director General'
    WHEN 'Korean Metal Exporters Co' THEN 'CEO'
    WHEN 'Italian Recycling Group SpA' THEN 'Managing Director'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'Zhang Mei'
    WHEN 'European Metal Recyclers GmbH' THEN 'Anna Schmidt'
    WHEN 'Emirates Scrap Trading LLC' THEN 'Fatima Hassan'
    WHEN 'Tokyo Metal Resources KK' THEN 'Sato Yuki'
    WHEN 'Brazilian Metals Exporters SA' THEN 'Maria Santos'
    WHEN 'Nordic Recycling Solutions AB' THEN 'Anna Svensson'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'Priya Patel'
    WHEN 'Australian Metal Brokers Pty' THEN 'Emma Watson'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'Lee Xiao Hui'
    WHEN 'Turkish Metal Industries AS' THEN 'Ayse Demir'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'Jennifer Lee'
    WHEN 'South African Metal Works Ltd' THEN 'Nomsa Zulu'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'Ana Martinez'
    WHEN 'Korean Metal Exporters Co' THEN 'Park Ji-woo'
    WHEN 'Italian Recycling Group SpA' THEN 'Sofia Bianchi'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'zhang.mei@shanghaisteel.cn'
    WHEN 'European Metal Recyclers GmbH' THEN 'a.schmidt@emr-gmbh.de'
    WHEN 'Emirates Scrap Trading LLC' THEN 'fatima@emiratesscrap.ae'
    WHEN 'Tokyo Metal Resources KK' THEN 'sato@tmr.co.jp'
    WHEN 'Brazilian Metals Exporters SA' THEN 'maria.santos@brmetals.com.br'
    WHEN 'Nordic Recycling Solutions AB' THEN 'anna.svensson@nordic-recycling.se'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'priya@indiasteel.in'
    WHEN 'Australian Metal Brokers Pty' THEN 'emma.watson@ausmetals.com.au'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'lee.xiaohui@sgcommodities.sg'
    WHEN 'Turkish Metal Industries AS' THEN 'ayse.demir@turkishmetal.com.tr'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'jennifer.lee@canscrap.ca'
    WHEN 'South African Metal Works Ltd' THEN 'nomsa.zulu@sametalworks.co.za'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'ana.martinez@mexmetals.mx'
    WHEN 'Korean Metal Exporters Co' THEN 'park.jiwoo@koreanmetal.kr'
    WHEN 'Italian Recycling Group SpA' THEN 'sofia.bianchi@italrecycling.it'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN '+86 21 5888 1235'
    WHEN 'European Metal Recyclers GmbH' THEN '+49 40 7654 3211'
    WHEN 'Emirates Scrap Trading LLC' THEN '+971 4 887 1235'
    WHEN 'Tokyo Metal Resources KK' THEN '+81 3 5252 1235'
    WHEN 'Brazilian Metals Exporters SA' THEN '+55 11 3456 7891'
    WHEN 'Nordic Recycling Solutions AB' THEN '+46 8 123 4568'
    WHEN 'India Steel Traders Pvt Ltd' THEN '+91 22 2345 6780'
    WHEN 'Australian Metal Brokers Pty' THEN '+61 2 9876 5433'
    WHEN 'Singapore Commodities Hub Ltd' THEN '+65 6234 5679'
    WHEN 'Turkish Metal Industries AS' THEN '+90 212 345 6780'
    WHEN 'Canadian Scrap Solutions Inc' THEN '+1 416 555 7891'
    WHEN 'South African Metal Works Ltd' THEN '+27 21 456 7891'
    WHEN 'Mexican Metals Trading SA de CV' THEN '+52 55 1234 5679'
    WHEN 'Korean Metal Exporters Co' THEN '+82 2 1234 5679'
    WHEN 'Italian Recycling Group SpA' THEN '+39 02 7654 3211'
  END,
  CASE c.name
    WHEN 'Shanghai Steel Industries Co.' THEN 'Finance Manager'
    WHEN 'European Metal Recyclers GmbH' THEN 'Procurement Manager'
    WHEN 'Emirates Scrap Trading LLC' THEN 'Operations Manager'
    WHEN 'Tokyo Metal Resources KK' THEN 'Finance Director'
    WHEN 'Brazilian Metals Exporters SA' THEN 'Logistics Coordinator'
    WHEN 'Nordic Recycling Solutions AB' THEN 'CFO'
    WHEN 'India Steel Traders Pvt Ltd' THEN 'Accountant'
    WHEN 'Australian Metal Brokers Pty' THEN 'Operations Manager'
    WHEN 'Singapore Commodities Hub Ltd' THEN 'Head of Trading'
    WHEN 'Turkish Metal Industries AS' THEN 'Financial Controller'
    WHEN 'Canadian Scrap Solutions Inc' THEN 'Logistics Manager'
    WHEN 'South African Metal Works Ltd' THEN 'Finance Manager'
    WHEN 'Mexican Metals Trading SA de CV' THEN 'Operations Director'
    WHEN 'Korean Metal Exporters Co' THEN 'CFO'
    WHEN 'Italian Recycling Group SpA' THEN 'Financial Controller'
  END
FROM company_ids c
ON CONFLICT (id) DO NOTHING;
