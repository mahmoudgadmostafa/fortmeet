
DROP POLICY IF EXISTS "Anyone can vote (update votes)" ON public.polls;
REVOKE UPDATE ON public.polls FROM authenticated, anon;
GRANT UPDATE (votes) ON public.polls TO authenticated, anon;
CREATE POLICY "Anyone can vote" ON public.polls FOR UPDATE USING (is_active = true) WITH CHECK (is_active = true);
