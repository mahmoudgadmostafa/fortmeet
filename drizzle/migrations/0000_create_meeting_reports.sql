CREATE TABLE public.meeting_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_code text NOT NULL,
  host_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  report text NOT NULL,
  participants_count integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_reports TO authenticated;
GRANT ALL ON public.meeting_reports TO service_role;

ALTER TABLE public.meeting_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their meeting reports"
ON public.meeting_reports FOR SELECT TO authenticated
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can insert their meeting reports"
ON public.meeting_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their meeting reports"
ON public.meeting_reports FOR DELETE TO authenticated
USING (auth.uid() = host_id);

CREATE INDEX idx_meeting_reports_host_created ON public.meeting_reports (host_id, created_at DESC);
CREATE INDEX idx_meeting_reports_code ON public.meeting_reports (meeting_code);