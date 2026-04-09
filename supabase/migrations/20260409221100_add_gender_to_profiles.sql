-- Add gender column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
comment on column public.profiles.gender is 'User gender for default avatar selection';
