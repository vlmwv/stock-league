-- Allow UPDATE path for wishlist upsert conflict handling
DROP POLICY IF EXISTS "Users can update their own wishlist" ON public.wishlists;
CREATE POLICY "Users can update their own wishlist" ON public.wishlists
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
