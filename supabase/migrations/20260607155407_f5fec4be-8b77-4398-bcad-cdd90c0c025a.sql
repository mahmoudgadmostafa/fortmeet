
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waiting_room BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_code TEXT NOT NULL,
  host_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  votes JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT SELECT, UPDATE ON public.polls TO anon;
GRANT ALL ON public.polls TO service_role;

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Polls readable by anyone" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Anyone can vote (update votes)" ON public.polls FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Host creates polls" ON public.polls FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host deletes polls" ON public.polls FOR DELETE TO authenticated USING (auth.uid() = host_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
