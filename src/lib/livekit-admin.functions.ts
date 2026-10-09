import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ActionSchema = z.object({
  room: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  identity: z.string().min(1).max(128),
  action: z.enum(["kick", "mute", "mute_audio", "mute_video"]),
});

/** Host-only: kick or force-mute (audio/video) a participant via LiveKit Server API. */
export const livekitHostAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: meeting, error } = await context.supabase
      .from("meetings")
      .select("host_id")
      .eq("code", data.room)
      .maybeSingle();
    if (error || !meeting) throw new Error("Meeting not found");
    if (meeting.host_id !== context.userId) throw new Error("Forbidden");

    const url = process.env.LIVEKIT_URL!;
    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const { RoomServiceClient } = await import("livekit-server-sdk");
    const httpUrl = url.replace(/^ws/, "http");
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    if (data.action === "kick") {
      await svc.removeParticipant(data.room, data.identity);
      return { ok: true };
    }

    // Source enum: 1 = MICROPHONE, 2 = CAMERA. Type enum: 0 = AUDIO, 1 = VIDEO.
    const wantAudio = data.action === "mute" || data.action === "mute_audio";
    const wantVideo = data.action === "mute_video";
    const p = await svc.getParticipant(data.room, data.identity);
    for (const t of p.tracks) {
      const isAudio = t.source === 1 || t.type === 0;
      const isVideo = t.source === 2 || t.type === 1;
      if ((wantAudio && isAudio) || (wantVideo && isVideo)) {
        await svc.mutePublishedTrack(data.room, data.identity, t.sid, true);
      }
    }
    return { ok: true };
  });
