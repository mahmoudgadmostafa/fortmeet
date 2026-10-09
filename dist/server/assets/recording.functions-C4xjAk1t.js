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
const projectRef = process.env.SUPABASE_PROJECT_ID;
function s3Config() {
  const accessKey = process.env.STORAGE_S3_ACCESS_KEY_ID;
  const secret = process.env.STORAGE_S3_SECRET_ACCESS_KEY;
  const region = process.env.STORAGE_S3_REGION ?? "us-east-1";
  if (!accessKey || !secret) {
    throw new Error("S3 credentials not configured (STORAGE_S3_ACCESS_KEY_ID, STORAGE_S3_SECRET_ACCESS_KEY)");
  }
  if (!projectRef) throw new Error("SUPABASE_PROJECT_ID missing");
  return {
    accessKey,
    secret,
    region,
    endpoint: `https://${projectRef}.supabase.co/storage/v1/s3`
  };
}
function livekitClient() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) throw new Error("LiveKit credentials missing");
  return {
    url: url.replace(/^ws/, "http"),
    apiKey,
    apiSecret
  };
}
async function ensureHost(supabase, userId, code) {
  const {
    data,
    error
  } = await supabase.from("meetings").select("id,host_id").eq("code", code).maybeSingle();
  if (error || !data) throw new Error("Meeting not found");
  if (data.host_id !== userId) throw new Error("Forbidden");
  return data;
}
const startRecording_createServerFn_handler = createServerRpc({
  id: "2cf7923d1518a9640a99def6cc31eadb344546ac1b3ef28fa4f702ca7059dd94",
  name: "startRecording",
  filename: "src/lib/recording.functions.ts"
}, (opts) => startRecording.__executeServer(opts));
const startRecording = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
}).parse(input)).handler(startRecording_createServerFn_handler, async ({
  data,
  context
}) => {
  await ensureHost(context.supabase, context.userId, data.code);
  const {
    data: existing
  } = await context.supabase.from("recordings").select("id").eq("meeting_code", data.code).in("status", ["starting", "active"]).maybeSingle();
  if (existing) throw new Error("هناك تسجيل نشط بالفعل");
  const s3 = s3Config();
  const lk = livekitClient();
  const {
    EgressClient,
    EncodedFileType,
    EncodedFileOutput,
    S3Upload
  } = await import("livekit-server-sdk");
  const filename = `${data.code}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.mp4`;
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: filename,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: s3.accessKey,
        secret: s3.secret,
        region: s3.region,
        bucket: "recordings",
        endpoint: s3.endpoint,
        forcePathStyle: true
      })
    }
  });
  const egress = new EgressClient(lk.url, lk.apiKey, lk.apiSecret);
  const info = await egress.startRoomCompositeEgress(data.code, {
    file: output
  }, {
    layout: "grid"
  });
  const {
    data: row,
    error
  } = await context.supabase.from("recordings").insert({
    meeting_code: data.code,
    host_id: context.userId,
    egress_id: info.egressId,
    status: "active",
    file_path: filename
  }).select("id").single();
  if (error) throw new Error(error.message);
  return {
    id: row.id,
    egressId: info.egressId
  };
});
const stopRecording_createServerFn_handler = createServerRpc({
  id: "616fb76dfe3f8d45e2881a4e925df33fce25fc20a4b2613ec0fad1de4b37ce32",
  name: "stopRecording",
  filename: "src/lib/recording.functions.ts"
}, (opts) => stopRecording.__executeServer(opts));
const stopRecording = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
}).parse(input)).handler(stopRecording_createServerFn_handler, async ({
  data,
  context
}) => {
  await ensureHost(context.supabase, context.userId, data.code);
  const {
    data: rec,
    error
  } = await context.supabase.from("recordings").select("id,egress_id").eq("meeting_code", data.code).in("status", ["starting", "active"]).maybeSingle();
  if (error || !rec?.egress_id) throw new Error("لا يوجد تسجيل نشط");
  const lk = livekitClient();
  const {
    EgressClient
  } = await import("livekit-server-sdk");
  const egress = new EgressClient(lk.url, lk.apiKey, lk.apiSecret);
  await egress.stopEgress(rec.egress_id);
  await context.supabase.from("recordings").update({
    status: "completed",
    ended_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", rec.id);
  return {
    ok: true
  };
});
const listRecordings_createServerFn_handler = createServerRpc({
  id: "9f7d5d586dbadd6032b6d7af0b6b3f3021a12fb6e2dcae768e76be60fa286c03",
  name: "listRecordings",
  filename: "src/lib/recording.functions.ts"
}, (opts) => listRecordings.__executeServer(opts));
const listRecordings = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(listRecordings_createServerFn_handler, async ({
  context
}) => {
  const {
    data,
    error
  } = await context.supabase.from("recordings").select("*").eq("host_id", context.userId).order("created_at", {
    ascending: false
  }).limit(100);
  if (error) throw new Error(error.message);
  return {
    recordings: data ?? []
  };
});
const getActiveRecording_createServerFn_handler = createServerRpc({
  id: "ffd331cf76bacf09094fcb702e712024a4ab0edc444d67be5294e6aa46d7b7ff",
  name: "getActiveRecording",
  filename: "src/lib/recording.functions.ts"
}, (opts) => getActiveRecording.__executeServer(opts));
const getActiveRecording = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
}).parse(input)).handler(getActiveRecording_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: row
  } = await context.supabase.from("recordings").select("id,status,started_at").eq("meeting_code", data.code).in("status", ["starting", "active"]).maybeSingle();
  return {
    active: row ?? null
  };
});
const getRecordingDownloadUrl_createServerFn_handler = createServerRpc({
  id: "b429ec739d54ce665c85bd614d77f9f186fd0c1dc061d9495a5b92513151b385",
  name: "getRecordingDownloadUrl",
  filename: "src/lib/recording.functions.ts"
}, (opts) => getRecordingDownloadUrl.__executeServer(opts));
const getRecordingDownloadUrl = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  id: z.string().uuid()
}).parse(input)).handler(getRecordingDownloadUrl_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: rec,
    error
  } = await context.supabase.from("recordings").select("file_path,status").eq("id", data.id).maybeSingle();
  if (error || !rec) throw new Error("Recording not found");
  if (!rec.file_path || rec.status !== "completed") throw new Error("التسجيل غير جاهز بعد");
  const {
    supabaseAdmin
  } = await import("./client.server-C0CSld-n.js");
  const {
    data: signed,
    error: sErr
  } = await supabaseAdmin.storage.from("recordings").createSignedUrl(rec.file_path, 60 * 60);
  if (sErr || !signed) throw new Error(sErr?.message ?? "Failed to sign URL");
  return {
    url: signed.signedUrl
  };
});
const deleteRecording_createServerFn_handler = createServerRpc({
  id: "62e6908845af01281bd1092e5834039691881bf6272742691c8e7dc6e3b6b7a8",
  name: "deleteRecording",
  filename: "src/lib/recording.functions.ts"
}, (opts) => deleteRecording.__executeServer(opts));
const deleteRecording = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  id: z.string().uuid()
}).parse(input)).handler(deleteRecording_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: rec,
    error
  } = await context.supabase.from("recordings").select("file_path").eq("id", data.id).maybeSingle();
  if (error || !rec) throw new Error("Not found");
  const {
    supabaseAdmin
  } = await import("./client.server-C0CSld-n.js");
  if (rec.file_path) {
    await supabaseAdmin.storage.from("recordings").remove([rec.file_path]);
  }
  await context.supabase.from("recordings").delete().eq("id", data.id);
  return {
    ok: true
  };
});
export {
  deleteRecording_createServerFn_handler,
  getActiveRecording_createServerFn_handler,
  getRecordingDownloadUrl_createServerFn_handler,
  listRecordings_createServerFn_handler,
  startRecording_createServerFn_handler,
  stopRecording_createServerFn_handler
};
