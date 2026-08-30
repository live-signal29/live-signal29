-- Track who submitted an MT5 copier request so admin knows whom to contact.
ALTER TABLE public.mt5_copier_requests
ADD COLUMN name TEXT,
ADD COLUMN contact_number TEXT;
