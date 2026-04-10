CREATE POLICY "Anyone can delete blitz tournaments"
ON public.blitz_tournaments
FOR DELETE
TO anon, authenticated
USING (true);