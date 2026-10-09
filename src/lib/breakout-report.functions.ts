import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RowSchema = z.object({
  name: z.string().max(80),
  group: z.number().int().min(0).max(20),
  joinedAt: z.string().max(40).optional(),
  speakingMinutes: z.number().min(0).max(100000).optional(),
  screenShares: z.number().int().min(0).max(10000).optional(),
});

const InputSchema = z.object({
  room: z.string().min(1).max(64),
  title: z.string().max(200).optional(),
  rows: z.array(RowSchema).max(300),
});

type Row = z.infer<typeof RowSchema>;
const label = (g: number) => (g === 0 ? "الاجتماع الرئيسي" : `مجموعة ${g}`);
const fmtT = (s?: string) =>
  s ? new Date(s).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—";
const mins = (r: Row) => Math.round((r.speakingMinutes ?? 0) * 10) / 10;

function recommendations(rows: Row[], groups: number[]) {
  const out: string[] = [];
  const silent = rows.filter((r) => (r.speakingMinutes ?? 0) < 0.5);
  if (silent.length)
    out.push(`شجّع المشاركين الصامتين (${silent.map((r) => r.name).join("، ")}) بتوجيه أسئلة مباشرة لهم أو تكليفهم بدور محدد.`);
  for (const g of groups) {
    const m = rows.filter((r) => r.group === g);
    const total = m.reduce((s, r) => s + (r.speakingMinutes ?? 0), 0);
    if (m.length > 1 && total > 0) {
      const top = m.reduce((a, b) => ((a.speakingMinutes ?? 0) >= (b.speakingMinutes ?? 0) ? a : b));
      const share = (top.speakingMinutes ?? 0) / total;
      if (share > 0.6)
        out.push(`في ${label(g)} استحوذ ${top.name} على ${Math.round(share * 100)}% من الحديث — عيّن ميسّراً يوزّع الأدوار بالتناوب.`);
    }
    if (m.length && m.every((r) => (r.screenShares ?? 0) === 0) && g !== 0)
      out.push(`لم يشارك أحد شاشته في ${label(g)} — اطلب عرض مخرجات العمل بصرياً لزيادة التركيز.`);
    if (m.length > 6) out.push(`${label(g)} كبيرة (${m.length} مشاركين) — قسّمها لغرف أصغر (3–5) لتفاعل أفضل.`);
  }
  if (!out.length) out.push("التفاعل متوازن — حافظ على نفس التوزيع وحدد هدفاً واضحاً ووقتاً لكل نشاط.");
  out.push("اختم كل جلسة غرف بملخص من دقيقتين يقدمه عضو مختلف من كل مجموعة.");
  return out;
}

function buildMarkdown(room: string, title: string, rows: Row[]) {
  const groups = Array.from(new Set(rows.map((r) => r.group))).sort((a, b) => a - b);
  const L: string[] = [];
  L.push(`# تقرير توزيع المجموعات — ${title || room}`, "");
  L.push(`تاريخ التقرير: ${new Date().toLocaleString("ar-EG")}`);
  L.push(`عدد المشاركين: ${rows.length} · عدد الغرف المستخدمة: ${groups.filter((g) => g !== 0).length}`, "");
  L.push("## جدول التوزيع", "");
  L.push("| المشارك | الغرفة | وقت الدخول للغرفة | دقائق التحدث | مرات مشاركة الشاشة |");
  L.push("| --- | --- | --- | --- | --- |");
  for (const r of rows) L.push(`| ${r.name} | ${label(r.group)} | ${fmtT(r.joinedAt)} | ${mins(r)} | ${r.screenShares ?? 0} |`);
  L.push("", "## ملخص كل غرفة", "");
  for (const g of groups) {
    const m = rows.filter((r) => r.group === g);
    const talk = Math.round(m.reduce((s, r) => s + (r.speakingMinutes ?? 0), 0) * 10) / 10;
    const shares = m.reduce((s, r) => s + (r.screenShares ?? 0), 0);
    L.push(`### ${label(g)} (${m.length} مشارك · ${talk} دقيقة تحدث · ${shares} مشاركة شاشة)`);
    for (const x of m) L.push(`- ${x.name} — دخل ${fmtT(x.joinedAt)} · تحدث ${mins(x)} دقيقة · شارك الشاشة ${x.screenShares ?? 0} مرة`);
    L.push("");
  }
  L.push("## توصيات لتحسين التفاعل", "");
  recommendations(rows, groups).forEach((t, i) => L.push(`${i + 1}. ${t}`));
  return L.join("\n");
}

/** حفظ تقرير توزيع المشاركين على المجموعات في سجل تقارير الاجتماع. */
export const saveBreakoutReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const report = buildMarkdown(data.room, data.title ?? "", data.rows);
    const { error } = await context.supabase.from("meeting_reports").insert({
      meeting_code: data.room,
      host_id: context.userId,
      title: `تقرير المجموعات — ${data.title || data.room}`,
      report,
      participants_count: data.rows.length,
      duration_minutes: 0,
      summary: { kind: "breakout", rows: data.rows },
    });
    if (error) throw new Error(error.message);
    return { report };
  });
