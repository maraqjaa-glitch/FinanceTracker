-- ─────────────────────────────────────────────
-- FinFort 2.0 — Migration 003: System Categories
-- Run AFTER 001_core_schema.sql
-- These are seeded once and cannot be deleted by users (is_system = true)
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- INCOME categories
-- ─────────────────────────────────────────────
insert into public.categories (type, name_pl, name_en, icon, color, is_system, sort_order) values
('income', 'Wynagrodzenie',    'Salary',            '💼', '#10b981', true, 1),
('income', 'Premia / Nagroda', 'Bonus / Award',     '🏆', '#f59e0b', true, 2),
('income', 'Prezent otrzymany','Gift received',      '🎁', '#ec4899', true, 3),
('income', 'Odsetki / Zyski',  'Interest / Returns', '📈', '#6366f1', true, 4),
('income', 'Sprzedaż',         'Sales',             '🏷️', '#14b8a6', true, 5),
('income', 'Cashback / Zwrot', 'Cashback / Refund', '🔄', '#84cc16', true, 6),
('income', 'Świadczenia',      'Benefits',          '🏛️', '#0ea5e9', true, 7),
('income', 'Czynsz najmu',     'Rental income',     '🏠', '#f97316', true, 8),
('income', 'Inne przychody',   'Other income',      '❓', '#6b7280', true, 99);

-- ─────────────────────────────────────────────
-- EXPENSE categories
-- ─────────────────────────────────────────────
insert into public.categories (type, name_pl, name_en, icon, color, is_system, sort_order) values
('expense', 'Spożywcze',             'Groceries',           '🛒', '#10b981', true, 1),
('expense', 'Jedzenie na mieście',   'Dining out',          '🍽️', '#f97316', true, 2),
('expense', 'Fast food',             'Fast food',           '🍔', '#ef4444', true, 3),
('expense', 'Transport / Auto',      'Transport / Car',     '🚗', '#6366f1', true, 4),
('expense', 'Komunikacja miejska',   'Public transport',    '🚌', '#0ea5e9', true, 5),
('expense', 'Zdrowie / Apteka',      'Health / Pharmacy',   '💊', '#ef4444', true, 6),
('expense', 'Sport i forma',         'Sport & Fitness',     '💪', '#10b981', true, 7),
('expense', 'Odzież i obuwie',       'Clothing & Shoes',    '👗', '#ec4899', true, 8),
('expense', 'Kosmetyki / Uroda',     'Beauty & Care',       '💄', '#f472b6', true, 9),
('expense', 'Elektronika / Tech',    'Electronics & Tech',  '📱', '#8b5cf6', true, 10),
('expense', 'Edukacja / Książki',    'Education & Books',   '📚', '#0ea5e9', true, 11),
('expense', 'Rozrywka',              'Entertainment',       '🎭', '#f59e0b', true, 12),
('expense', 'Wakacje / Podróże',     'Vacation & Travel',   '✈️', '#14b8a6', true, 13),
('expense', 'Prezenty',              'Gifts',               '🎁', '#ec4899', true, 14),
('expense', 'Naprawy / Dom',         'Home repairs',        '🛠️', '#78716c', true, 15),
('expense', 'Zwierzęta',             'Pets',                '🐾', '#a78bfa', true, 16),
('expense', 'Alkohol',               'Alcohol',             '🍺', '#f59e0b', true, 17),
('expense', 'Inne wydatki',          'Other expenses',      '❓', '#6b7280', true, 99);

-- ─────────────────────────────────────────────
-- BILL categories (regular fixed expenses)
-- ─────────────────────────────────────────────
insert into public.categories (type, name_pl, name_en, icon, color, is_system, sort_order) values
('bill', 'Czynsz / Wynajem',          'Rent',                        '🏠', '#f97316', true, 1),
('bill', 'Energia / Gaz',             'Utilities',                   '⚡', '#f59e0b', true, 2),
('bill', 'Telefon / Internet',        'Phone & Internet',            '📡', '#0ea5e9', true, 3),
('bill', 'Karta kredytowa',           'Credit card',                 '💳', '#ef4444', true, 4),
('bill', 'Streaming (Netflix etc.)',  'Streaming (Netflix etc.)',    '🎬', '#dc2626', true, 5),
('bill', 'Muzyka (Spotify etc.)',     'Music (Spotify etc.)',        '🎵', '#16a34a', true, 6),
('bill', 'Parking / Garaż',          'Parking / Garage',            '🅿️', '#6b7280', true, 7),
('bill', 'Ubezpieczenia',             'Insurance',                   '🛡️', '#0284c7', true, 8),
('bill', 'Abonamenty inne',           'Other subscriptions',         '📋', '#7c3aed', true, 9),
('bill', 'Inne rachunki',             'Other bills',                 '❓', '#6b7280', true, 99);
