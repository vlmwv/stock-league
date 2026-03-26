-- Update predictions policy to allow updates (for upsert)
DROP POLICY IF EXISTS "Users can update their own predictions" ON public.predictions;
CREATE POLICY "Users can update their own predictions" ON public.predictions
  FOR UPDATE USING (auth.uid() = user_id);
