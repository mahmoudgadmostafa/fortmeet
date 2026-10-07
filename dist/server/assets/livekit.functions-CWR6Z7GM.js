import { c as createServerRpc } from "./createServerRpc-BxaLD-v-.js";
import { a as createServerFn } from "./server-DpeWxidM.js";
import { z } from "zod";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "seroval";
import "@tanstack/history";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
const InputSchema = z.object({
  room: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(64),
  isHost: z.boolean().optional(),
  password: z.string().max(128).optional(),
  /** رقم المجموعة الفرعية (Breakout room) إن وُجد */
  group: z.number().int().min(1).max(20).optional()
});
const getLivekitToken_createServerFn_handler = createServerRpc({
  id: "ac19c3a08d9409a0859dec5fece6e5a4551fb340c5e74aeee72226112ab0fcf3",
  name: "getLivekitToken",
  filename: "src/lib/livekit.functions.ts"
}, (opts) => getLivekitToken.__executeServer(opts));
const getLivekitToken = createServerFn({
  method: "POST"
}).validator((input) => InputSchema.parse(input)).handler(getLivekitToken_createServerFn_handler, async ({
  data
}) => {
  const {
    AccessToken
  } = await import("livekit-server-sdk");
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials not configured");
  }
  if (!data.isHost) {
    const {
      supabaseAdmin
    } = await import("./client.server-C0CSld-n.js");
    const {
      data: m
    } = await supabaseAdmin.from("meetings").select("password,locked").eq("code", data.room).maybeSingle();
    if (!m) throw new Error("الاجتماع غير موجود");
    if (m.locked) throw new Error("الاجتماع مقفل");
    if (m.password && data.password !== m.password) throw new Error("كلمة المرور غير صحيحة");
    const {
      isMeetingLive
    } = await import("./meeting-live.server-zpaLDToW.js");
    if (!await isMeetingLive(data.room)) throw new Error("لم يبدأ المضيف الاجتماع بعد");
  }
  const identity = `${data.name}-${crypto.randomUUID().slice(0, 8)}`;
  const roomName = data.group ? `${data.room}-g${data.group}` : data.room;
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: data.name,
    ttl: 60 * 60 * 6,
    // 6 hours
    metadata: JSON.stringify({
      isHost: !!data.isHost
    })
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: !!data.isHost
  });
  const token = await at.toJwt();
  return {
    token,
    url,
    identity
  };
});
export {
  getLivekitToken_createServerFn_handler
};
