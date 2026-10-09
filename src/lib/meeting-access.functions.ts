import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CodeSchema = z.object({
  code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
});

/**
 * Public: minimal, non-sensitive info about a meeting so guests holding the
 * link can see whether they may join. Never returns the password itself.
 */
export const getMeetingInfo = createServerFn({ method: "POST" })
  .validator((input: unknown) => CodeSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isMeetingLive } = await import("./meeting-live.server");
    const { data: m } = await supabaseAdmin
      .from("meetings")
      .select("title,host_id,password,locked,waiting_room")
      .eq("code", data.code)
      .maybeSingle();
    if (!m) return { found: false as const };
    return {
      found: true as const,
      title: m.title as string,
      hostId: m.host_id as string,
      hasPassword: !!m.password,
      locked: !!m.locked,
      waitingRoom: !!m.waiting_room,
      live: await isMeetingLive(data.code),
    };
  });
