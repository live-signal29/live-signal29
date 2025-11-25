-- Add unique constraint to prevent duplicate favorites
ALTER TABLE public.user_favorites 
ADD CONSTRAINT user_favorites_user_signal_unique 
UNIQUE (user_id, signal_id);