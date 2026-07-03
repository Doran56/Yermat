
-- Allow authenticated users to insert new bars
CREATE POLICY "Authenticated users can insert bars"
  ON public.bars
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update bars (required for upsert ON CONFLICT DO UPDATE)
CREATE POLICY "Authenticated users can update bars"
  ON public.bars
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
