import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const projectRef = process.env.SUPABASE_PROJECT_ID;

/** Supabase Storage S3-compatible endpoint helper */
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
    endpoint: `https://${projectRef}.supabase.co/storage/v1/s3`,
  };
}

function livekitClient() {
  const url = process.env.LIVEKIT_URL!;
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  if (!url || !apiKey || !apiSecret) throw new Error("LiveKit credentials missing");
  return { url: url.replace(/^ws/, "http"), apiKey, apiSecret };
}

async function ensureHost(supabase: any, userId: string, code: string) {
  const { data, error } = await supabase
    .from("meetings").select("id,host_id").eq("code", code).maybeSingle();
  if (error || !data) throw new Error("Meeting not found");
  if (data.host_id !== userId) throw new Error("Forbidden");
  return data;
}

/* ============ START RECORDING ============ */
export const startRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await ensureHost(context.supabase, context.userId, data.code);

    // Prevent duplicate active recording
    const { data: existing } = await context.supabase
      .from("recordings").select("id")
      .eq("meeting_code", data.code).in("status", ["starting", "active"]).maybeSingle();
    if (existing) throw new Error("هناك تسجيل نشط بالفعل");

    const s3 = s3Config();
    const lk = livekitClient();
    const { EgressClient, EncodedFileType, EncodedFileOutput, S3Upload } =
      await import("livekit-server-sdk");

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
          forcePathStyle: true,
        }),
      },
    });

    const egress = new EgressClient(lk.url, lk.apiKey, lk.apiSecret);
    const info = await egress.startRoomCompositeEgress(data.code, { file: output }, { layout: "grid" });

    const { data: row, error } = await context.supabase
      .from("recordings")
      .insert({
        meeting_code: data.code,
        host_id: context.userId,
        egress_id: info.egressId,
        status: "active",
        file_path: filename,
      })
      .select("id").single();
    if (error) throw new Error(error.message);

    return { id: row.id, egressId: info.egressId };
  });

/* ============ STOP RECORDING ============ */
export const stopRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await ensureHost(context.supabase, context.userId, data.code);

    const { data: rec, error } = await context.supabase
      .from("recordings").select("id,egress_id")
      .eq("meeting_code", data.code).in("status", ["starting", "active"]).maybeSingle();
    if (error || !rec?.egress_id) throw new Error("لا يوجد تسجيل نشط");

    const lk = livekitClient();
    const { EgressClient } = await import("livekit-server-sdk");
    const egress = new EgressClient(lk.url, lk.apiKey, lk.apiSecret);
    await egress.stopEgress(rec.egress_id);

    // Webhook will mark it completed; mark pending here
    await context.supabase
      .from("recordings")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", rec.id);

    return { ok: true };
  });

/* ============ LIST MY RECORDINGS ============ */
export const listRecordings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("recordings").select("*")
      .eq("host_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { recordings: data ?? [] };
  });

/* ============ GET ACTIVE RECORDING (for meeting page) ============ */
export const getActiveRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("recordings").select("id,status,started_at")
      .eq("meeting_code", data.code).in("status", ["starting", "active"])
      .maybeSingle();
    return { active: row ?? null };
  });

/* ============ DOWNLOAD URL (host only via RLS) ============ */
export const getRecordingDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    // RLS ensures only the host gets this row
    const { data: rec, error } = await context.supabase
      .from("recordings").select("file_path,status")
      .eq("id", data.id).maybeSingle();
    if (error || !rec) throw new Error("Recording not found");
    if (!rec.file_path || rec.status !== "completed")
      throw new Error("التسجيل غير جاهز بعد");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("recordings").createSignedUrl(rec.file_path, 60 * 60); // 1h
    if (sErr || !signed) throw new Error(sErr?.message ?? "Failed to sign URL");
    return { url: signed.signedUrl };
  });

/* ============ DELETE RECORDING ============ */
export const deleteRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: rec, error } = await context.supabase
      .from("recordings").select("file_path").eq("id", data.id).maybeSingle();
    if (error || !rec) throw new Error("Not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (rec.file_path) {
      await supabaseAdmin.storage.from("recordings").remove([rec.file_path]);
    }
    await context.supabase.from("recordings").delete().eq("id", data.id);
    return { ok: true };
  });
