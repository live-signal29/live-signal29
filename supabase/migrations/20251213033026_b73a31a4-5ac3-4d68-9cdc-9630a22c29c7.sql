-- Add new columns to account_management_applications table
ALTER TABLE public.account_management_applications
ADD COLUMN platform_type text,
ADD COLUMN broker_server text,
ADD COLUMN trading_login text,
ADD COLUMN trading_password text;