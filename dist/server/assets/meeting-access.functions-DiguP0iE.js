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
const CodeSchema = z.object({
  code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
});
const getMeetingInfo_createServerFn_handler = createServerRpc({
  id: "585a3be2727accc71bfe7ae1e5474bb432f66837295e46f6471820c54a99357d",
  name: "getMeetingInfo",
  filename: "src/lib/meeting-access.functions.ts"
}, (opts) => getMeetingInfo.__executeServer(opts));
const getMeetingInfo = createServerFn({
  method: "POST"
}).validator((input) => CodeSchema.parse(input)).handler(getMeetingInfo_createServerFn_handler, async ({
  data
}) => {
  const {
    supabaseAdmin
  } = await import("./client.server-C0CSld-n.js");
  const {
    isMeetingLive
  } = await import("./meeting-live.server-zpaLDToW.js");
  const {
    data: m
  } = await supabaseAdmin.from("meetings").select("title,host_id,password,locked,waiting_room").eq("code", data.code).maybeSingle();
  if (!m) return {
    found: false
  };
  return {
    found: true,
    title: m.title,
    hostId: m.host_id,
    hasPassword: !!m.password,
    locked: !!m.locked,
    waitingRoom: !!m.waiting_room,
    live: await isMeetingLive(data.code)
  };
});
export {
  getMeetingInfo_createServerFn_handler
};
