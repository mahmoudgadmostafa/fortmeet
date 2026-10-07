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
const SYSTEM_PROMPT = "أنت محلل اجتماعات محترف. اكتب تقريراً عربياً احترافياً بصيغة Markdown بعناوين واضحة ويشمل: 1) **الملخص التنفيذي** في 3-5 نقاط، 2) **جدول المشاركين** (الاسم، الدور، الصوت، الفيديو، مشاركة الشاشة، رفع اليد، جودة الاتصال، نسبة المشاركة، الحالة المزاجية)، 3) **تحليل الحالة المزاجية** لكل مشارك (متحمس/متفاعل/محايد/سلبي/منسحب) مع سبب مختصر مبني على زمن التحدث وحالة الكاميرا والمايك ورفع اليد، 4) **ترتيب نسب المشاركة** تنازلياً مع تصنيف: عالية (>30%)، متوسطة (10-30%)، منخفضة (<10%)، 5) **جدول الحضور والانصراف**: لكل مشارك (وقت الدخول، وقت الخروج أو «ما زال متصلاً»، مدة الحضور بالدقائق، دقائق التحدث، نسبة زمن التحدث من مدة حضوره)، 6) **تحليل الحضور**: من حضر متأخراً، من خرج مبكراً، من دخل وخرج أكثر من مرة إن ظهر ذلك، وأثر ذلك على الاجتماع، 7) **مؤشرات التفاعل وجودة الاتصال** مع ملاحظات فنية، 8) **المخاطر والملاحظات**، 9) **توصيات عملية للمضيف لتحسين التفاعل**: توصيات محددة لكل مشارك منخفض التفاعل أو متأخر الحضور (توجيه سؤال مباشر، تقسيم مجموعات، تقصير المدة، جدولة أنسب…)، 10) **الخطوات التالية** كقائمة مهام. كن دقيقاً ومختصراً ولا تخترع بيانات غير موجودة.";
const generateMeetingReport_createServerFn_handler = createServerRpc({
  id: "f235f06d628c441d9b7d3907b692bac30c3020a8c3339922d9913d52d28ba8ed",
  name: "generateMeetingReport",
  filename: "src/lib/ai-report.functions.ts"
}, (opts) => generateMeetingReport.__executeServer(opts));
const generateMeetingReport = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => InputSchema.parse(input)).handler(generateMeetingReport_createServerFn_handler, async ({
  data,
  context
}) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("مفتاح الذكاء الاصطناعي غير مهيأ (يرجى إضافة OPENAI_API_KEY أو GEMINI_API_KEY)");
  const prompt = [`اجتماع: ${data.title ?? data.room} (كود: ${data.room})`, data.durationMinutes != null ? `المدة حتى الآن: ${Math.round(data.durationMinutes)} دقيقة` : null, `عدد المشاركين: ${data.participants.length}`, "", "بيانات المشاركين (JSON):", JSON.stringify(data.participants, null, 2), data.notes ? `
ملاحظات إضافية: ${data.notes}` : null].filter(Boolean).join("\n");
  const endpoint = process.env.OPENAI_API_BASE || (process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://api.openai.com/v1/chat/completions");
  const model = process.env.OPENAI_MODEL || (process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o-mini");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: "system",
        content: SYSTEM_PROMPT
      }, {
        role: "user",
        content: prompt
      }]
    })
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("تم تجاوز حد الطلبات، حاول بعد قليل");
    if (res.status === 402) throw new Error("انتهى رصيد الذكاء الاصطناعي، يرجى إضافة رصيد");
    throw new Error(`فشل توليد التقرير [${res.status}]: ${body}`);
  }
  const json = await res.json();
  const report = json.choices?.[0]?.message?.content ?? "";
  if (!report) throw new Error("لم يتم إنشاء تقرير");
  let saved = false;
  if (data.save) {
    const top = [...data.participants].sort((a, b) => (b.participationPercent ?? 0) - (a.participationPercent ?? 0)).slice(0, 5).map((p) => ({
      name: p.name,
      participationPercent: p.participationPercent ?? 0
    }));
    const {
      error
    } = await context.supabase.from("meeting_reports").insert({
      meeting_code: data.room,
      host_id: context.userId,
      title: data.title ?? data.room,
      report,
      participants_count: data.participants.length,
      duration_minutes: Math.round(data.durationMinutes ?? 0),
      summary: {
        top
      }
    });
    saved = !error;
  }
  return {
    report,
    saved,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
});
const listMeetingReports_createServerFn_handler = createServerRpc({
  id: "079d8f8bf1bbf5286644689e26745318edbc995f0ce15fa4545507b2dccacc81",
  name: "listMeetingReports",
  filename: "src/lib/ai-report.functions.ts"
}, (opts) => listMeetingReports.__executeServer(opts));
const listMeetingReports = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  meetingCode: z.string().max(64).optional()
}).parse(input ?? {})).handler(listMeetingReports_createServerFn_handler, async ({
  data,
  context
}) => {
  let query = context.supabase.from("meeting_reports").select("id, meeting_code, title, participants_count, duration_minutes, created_at, report").eq("host_id", context.userId).order("created_at", {
    ascending: false
  }).limit(100);
  if (data.meetingCode) query = query.eq("meeting_code", data.meetingCode);
  const {
    data: rows,
    error
  } = await query;
  if (error) throw new Error(error.message);
  return rows ?? [];
});
const deleteMeetingReport_createServerFn_handler = createServerRpc({
  id: "159c6295792ae3d6b64d2e836be6a569edcd0f1ac7b9730f6c6f9a94ab5cf9a4",
  name: "deleteMeetingReport",
  filename: "src/lib/ai-report.functions.ts"
}, (opts) => deleteMeetingReport.__executeServer(opts));
const deleteMeetingReport = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => z.object({
  id: z.string().uuid()
}).parse(input)).handler(deleteMeetingReport_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    error
  } = await context.supabase.from("meeting_reports").delete().eq("id", data.id).eq("host_id", context.userId);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
export {
  deleteMeetingReport_createServerFn_handler,
  generateMeetingReport_createServerFn_handler,
  listMeetingReports_createServerFn_handler
};
