import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  room: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(64),
  isHost: z.boolean().optional(),
  password: z.string().max(128).optional(),
  /** رقم المجموعة الفرعية (Breakout room) إن وُجد */
  group: z.number().int().min(1).max(20).optional(),
});

export const getLivekitToken = createServerFn({ method: "POST" })
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { AccessToken } = await import("livekit-server-sdk");
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
      throw new Error("LiveKit credentials not configured");
    }

    if (!data.isHost) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: m } = await supabaseAdmin
        .from("meetings")
        .select("password,locked")
        .eq("code", data.room)
        .maybeSingle();
      if (!m) throw new Error("الاجتماع غير موجود");
      if (m.locked) throw new Error("الاجتماع مقفل");
      if (m.password && data.password !== m.password) throw new Error("كلمة المرور غير صحيحة");
      const { isMeetingLive } = await import("./meeting-live.server");
      if (!(await isMeetingLive(data.room))) throw new Error("لم يبدأ المضيف الاجتماع بعد");
    }

    const identity = `${data.name}-${crypto.randomUUID().slice(0, 8)}`;
    const roomName = data.group ? `${data.room}-g${data.group}` : data.room;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: data.name,
      ttl: 60 * 60 * 6, // 6 hours
      metadata: JSON.stringify({ isHost: !!data.isHost }),
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: !!data.isHost,
    });
    const token = await at.toJwt();
    return { token, url, identity };
  });
