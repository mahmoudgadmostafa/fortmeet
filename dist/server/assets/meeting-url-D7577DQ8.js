import * as React from "react";
import { useRouter, isRedirect } from "@tanstack/react-router";
import { T as TSS_SERVER_FUNCTION, g as getServerFnById, a as createServerFn } from "./server-DpeWxidM.js";
import { r as requireSupabaseAuth } from "./auth-middleware-BQ-toWLv.js";
import { z } from "zod";
function useServerFn(serverFn) {
  const router = useRouter();
  return React.useCallback(async (...args) => {
    try {
      const res = await serverFn(...args);
      if (isRedirect(res)) throw res;
      return res;
    } catch (err) {
      if (isRedirect(err)) {
        err.options._fromLocation = router.stores.location.get();
        return router.navigate(router.resolveRedirect(err).options);
      }
      throw err;
    }
  }, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const startRecording = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
}).parse(input)).handler(createSsrRpc("2cf7923d1518a9640a99def6cc31eadb344546ac1b3ef28fa4f702ca7059dd94"));
const stopRecording = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
}).parse(input)).handler(createSsrRpc("616fb76dfe3f8d45e2881a4e925df33fce25fc20a4b2613ec0fad1de4b37ce32"));
const listRecordings = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("9f7d5d586dbadd6032b6d7af0b6b3f3021a12fb6e2dcae768e76be60fa286c03"));
const getActiveRecording = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
}).parse(input)).handler(createSsrRpc("ffd331cf76bacf09094fcb702e712024a4ab0edc444d67be5294e6aa46d7b7ff"));
const getRecordingDownloadUrl = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  id: z.string().uuid()
}).parse(input)).handler(createSsrRpc("b429ec739d54ce665c85bd614d77f9f186fd0c1dc061d9495a5b92513151b385"));
const deleteRecording = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  id: z.string().uuid()
}).parse(input)).handler(createSsrRpc("62e6908845af01281bd1092e5834039691881bf6272742691c8e7dc6e3b6b7a8"));
const ParticipantSchema = z.object({
  name: z.string(),
  isHost: z.boolean().optional(),
  audioOn: z.boolean().optional(),
  videoOn: z.boolean().optional(),
  screenSharing: z.boolean().optional(),
  handRaised: z.boolean().optional(),
  joinedMinutesAgo: z.number().optional(),
  connectionQuality: z.string().optional(),
  speakingSeconds: z.number().optional(),
  speakingMinutes: z.number().optional(),
  participationPercent: z.number().optional(),
  /** وقت الدخول والخروج ومدة الحضور */
  joinedAt: z.string().max(40).optional(),
  leftAt: z.string().max(40).optional(),
  stillPresent: z.boolean().optional(),
  presentMinutes: z.number().optional()
});
const InputSchema = z.object({
  room: z.string().min(1).max(64),
  title: z.string().max(200).optional(),
  durationMinutes: z.number().min(0).max(1e4).optional(),
  participants: z.array(ParticipantSchema).max(200),
  notes: z.string().max(4e3).optional(),
  /** حفظ التقرير في سجل تقارير الاجتماع (للمضيف) */
  save: z.boolean().optional()
});
const generateMeetingReport = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => InputSchema.parse(input)).handler(createSsrRpc("f235f06d628c441d9b7d3907b692bac30c3020a8c3339922d9913d52d28ba8ed"));
const listMeetingReports = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  meetingCode: z.string().max(64).optional()
}).parse(input ?? {})).handler(createSsrRpc("079d8f8bf1bbf5286644689e26745318edbc995f0ce15fa4545507b2dccacc81"));
const deleteMeetingReport = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  id: z.string().uuid()
}).parse(input)).handler(createSsrRpc("159c6295792ae3d6b64d2e836be6a569edcd0f1ac7b9730f6c6f9a94ab5cf9a4"));
function normalizeBaseUrl(value) {
  if (!value) return void 0;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return void 0;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
function getBaseUrlFromRequest(request) {
  return void 0;
}
function getBaseUrl(request) {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fromRequest = getBaseUrlFromRequest();
  const fromEnv = normalizeBaseUrl(
    process.env.VITE_APP_URL ?? process.env.APP_URL ?? process.env.PUBLIC_URL ?? process.env.URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : void 0)
  );
  return fromRequest ?? fromEnv ?? "http://localhost:8080";
}
function meetingUrl(code, room, request) {
  const base = `${getBaseUrl()}/meeting/${code}`;
  return room && room > 0 ? `${base}?room=${room}` : base;
}
export {
  listMeetingReports as a,
  deleteMeetingReport as b,
  createSsrRpc as c,
  deleteRecording as d,
  generateMeetingReport as e,
  startRecording as f,
  getRecordingDownloadUrl as g,
  getActiveRecording as h,
  listRecordings as l,
  meetingUrl as m,
  stopRecording as s,
  useServerFn as u
};
