import { c as createServerRpc } from "./createServerRpc-BxaLD-v-.js";
import { a as createServerFn } from "./server-DpeWxidM.js";
import { r as requireSupabaseAuth } from "./auth-middleware-BQ-toWLv.js";
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
import "@supabase/supabase-js";
const ActionSchema = z.object({
  room: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  identity: z.string().min(1).max(128),
  action: z.enum(["kick", "mute", "mute_audio", "mute_video"])
});
const livekitHostAction_createServerFn_handler = createServerRpc({
  id: "a58582f36b8a420b4797fa6b9ca4c9d7966dca0530a335d405e575d572fa1435",
  name: "livekitHostAction",
  filename: "src/lib/livekit-admin.functions.ts"
}, (opts) => livekitHostAction.__executeServer(opts));
const livekitHostAction = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => ActionSchema.parse(input)).handler(livekitHostAction_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: meeting,
    error
  } = await context.supabase.from("meetings").select("host_id").eq("code", data.room).maybeSingle();
  if (error || !meeting) throw new Error("Meeting not found");
  if (meeting.host_id !== context.userId) throw new Error("Forbidden");
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const {
    RoomServiceClient
  } = await import("livekit-server-sdk");
  const httpUrl = url.replace(/^ws/, "http");
  const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
  if (data.action === "kick") {
    await svc.removeParticipant(data.room, data.identity);
    return {
      ok: true
    };
  }
  const wantAudio = data.action === "mute" || data.action === "mute_audio";
  const wantVideo = data.action === "mute_video";
  const p = await svc.getParticipant(data.room, data.identity);
  for (const t of p.tracks) {
    const isAudio = t.source === 1 || t.type === 0;
    const isVideo = t.source === 2 || t.type === 1;
    if (wantAudio && isAudio || wantVideo && isVideo) {
      await svc.mutePublishedTrack(data.room, data.identity, t.sid, true);
    }
  }
  return {
    ok: true
  };
});
export {
  livekitHostAction_createServerFn_handler
};
