
CREATE TABLE public.recordings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_code text NOT NULL,
  host_id uuid NOT NULL,
  egress_id text,
  status text NOT NULL DEFAULT 'starting', -- starting | active | completed | failed | aborted
  file_path text, -- path within the 'recordings' storage bucket
  file_size_bytes bigint,
  duration_seconds integer,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recordings_host_idx ON public.recordings (host_id, created_at DESC);
CREATE INDEX recordings_meeting_idx ON public.recordings (meeting_code, created_at DESC);
CREATE INDEX recordings_egress_idx ON public.recordings (egress_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recordings TO authenticated;
GRANT ALL ON public.recordings TO service_role;

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host views own recordings"
  ON public.recordings FOR SELECT
  TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Host deletes own recordings"
  ON public.recordings FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER recordings_touch_updated_at
  BEFORE UPDATE ON public.recordings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
