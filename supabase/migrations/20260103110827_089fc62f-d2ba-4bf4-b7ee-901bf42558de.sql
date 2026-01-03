-- Update trial_end_date default from 8 days to 5 days
ALTER TABLE public.profiles 
ALTER COLUMN trial_end_date SET DEFAULT (now() + '5 days'::interval);