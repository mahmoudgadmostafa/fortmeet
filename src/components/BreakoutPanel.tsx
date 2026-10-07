import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useParticipants } from "@livekit/components-react";
import { Shuffle, Users, LogIn, Undo2, Megaphone, GripVertical, LayoutGrid, Rows3, Save, Link2 } from "lucide-react";
import { saveBreakoutReport } from "@/lib/breakout-report.functions";
import { meetingUrl } from "@/lib/meeting-url";
import { toast } from "sonner";

export type BreakoutState = { assignments: Record<string, number>; groups: number };

/** لوحة المضيف لتقسيم المشاركين إلى مجموعات فرعية والتحكم بها. */
export default function BreakoutPanel({
  code,
  selfGroup,
  onJoinGroup,
}: {
  code: string;
  selfGroup: number | null;
  onJoinGroup: (g: number | null) => void;
}) {
  const participants = useParticipants();
  const [groups, setGroups] = useState(2);
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [entryTimes, setEntryTimes] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState("");
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [view, setView] = useState<"rooms" | "table">("rooms");
  const [saving, setSaving] = useState(false);
  const chRef = useRef<RealtimeChannel | null>(null);
  const statsRef = useRef<Record<string, { speakSec: number; shares: number; sharing: boolean }>>({});

  useEffect(() => {
    const ch = supabase.channel(`breakout:${code}`);
    chRef.current = ch;
    ch.subscribe();
    return () => { ch.unsubscribe(); supabase.removeChannel(ch); chRef.current = null; };
  }, [code]);

  // تتبع زمن التحدث وعدد مرات فتح مشاركة الشاشة لكل مشارك
  const partsRef = useRef(participants);
  partsRef.current = participants;
  useEffect(() => {
    const t = setInterval(() => {
      for (const p of partsRef.current as any[]) {
        const n = p.name || p.identity;
        if (!n) continue;
        const s = (statsRef.current[n] ||= { speakSec: 0, shares: 0, sharing: false });
        if (p.isSpeaking) s.speakSec += 1;
        const sharing = !!p.isScreenShareEnabled;
        if (sharing && !s.sharing) s.shares += 1;
        s.sharing = sharing;
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  function copyInvite(g: number) {
    navigator.clipboard.writeText(meetingUrl(code, g));
    toast.success(g ? `نُسخ رابط دعوة مجموعة ${g}` : "نُسخ رابط الاجتماع");
  }

  const names = participants.map((p: any) => p.name || p.identity).filter(Boolean) as string[];

  const roomsList: number[] = [0, ...Array.from({ length: groups }, (_, i) => i + 1)];

  function setFor(name: string, g: number) {
    setAssignments((a) => ({ ...a, [name]: g }));
  }

  function autoSplit() {
    const next: Record<string, number> = {};
    names.forEach((n, i) => { next[n] = (i % groups) + 1; });
    setAssignments(next);
    toast.success(`تم توزيع ${names.length} مشاركاً على ${groups} مجموعات`);
  }

  function apply() {
    chRef.current?.send({ type: "broadcast", event: "assign", payload: { assignments, groups } });
    const now = new Date().toISOString();
    setEntryTimes((prev) => {
      const next = { ...prev };
      for (const n of names) if ((assignments[n] ?? 0) !== 0 && !next[n]) next[n] = now;
      return next;
    });
    toast.success("تم فتح المجموعات");
  }

  async function saveReport() {
    setSaving(true);
    try {
      const rows = names.map((n) => ({
        name: n, group: assignments[n] ?? 0, joinedAt: entryTimes[n],
        speakingMinutes: Math.round(((statsRef.current[n]?.speakSec ?? 0) / 60) * 10) / 10,
        screenShares: statsRef.current[n]?.shares ?? 0,
      }));
      await saveBreakoutReport({ data: { room: code, title: code, rows } });
      toast.success("حُفظ تقرير التوزيع في لوحة التقارير");
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر حفظ التقرير");
    } finally {
      setSaving(false);
    }
  }

  function closeAll() {
    chRef.current?.send({ type: "broadcast", event: "close", payload: {} });
    setAssignments({});
    setEntryTimes({});
    onJoinGroup(null);
    toast.success("عاد الجميع إلى الاجتماع الرئيسي");
  }

  function broadcastMsg() {
    const t = announce.trim();
    if (!t) return;
    chRef.current?.send({ type: "broadcast", event: "announce", payload: { text: t } });
    setAnnounce("");
    toast.success("أُرسل الإعلان لكل المجموعات");
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#0e1017] p-4 text-xs sm:text-sm text-white" dir="rtl">
      {/* Title */}
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/20 border border-primary/30 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">المجموعات الفرعية</h3>
            <p className="text-[11px] text-white/50">توزيع المشاركين على غرف مستقلة</p>
          </div>
        </div>
      </div>

      {/* Group count controller */}
      <div className="mb-3.5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
        <span className="text-xs text-white/70">عدد المجموعات</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={2}
            max={10}
            value={groups}
            onChange={(e) => setGroups(Math.min(10, Math.max(2, Number(e.target.value) || 2)))}
            className="w-16 rounded-xl border border-white/10 bg-black/40 px-2 py-1.5 text-center font-bold text-primary outline-none focus:border-primary/80"
          />
          <button
            onClick={autoSplit}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            <Shuffle className="h-3.5 w-3.5 text-accent" /> توزيع تلقائي
          </button>
        </div>
      </div>

      {/* View switch & save report */}
      <div className="mb-3 flex items-center gap-1.5">
        <button
          onClick={() => setView("rooms")}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            view === "rooms"
              ? "border-primary/50 bg-primary/20 text-primary shadow-sm"
              : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> الغرف
        </button>
        <button
          onClick={() => setView("table")}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            view === "table"
              ? "border-primary/50 bg-primary/20 text-primary shadow-sm"
              : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10"
          }`}
        >
          <Rows3 className="h-3.5 w-3.5" /> الجدول
        </button>
        <button
          onClick={saveReport}
          disabled={saving || names.length === 0}
          className="mr-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-40 transition"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "حفظ..." : "حفظ التقرير"}
        </button>
      </div>

      {view === "table" && (
        <div className="mb-3.5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-white/10 bg-white/[0.04] text-white/60">
              <tr>
                <th className="px-3 py-2 font-semibold">المشارك</th>
                <th className="px-3 py-2 font-semibold">الغرفة</th>
                <th className="px-3 py-2 font-semibold">وقت الدخول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {names.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-white/40">لا يوجد مشاركون</td>
                </tr>
              )}
              {names.map((n) => (
                <tr key={n} className="hover:bg-white/[0.02]">
                  <td className="max-w-32 truncate px-3 py-2 font-medium">{n}</td>
                  <td className="px-3 py-2">
                    <select
                      value={assignments[n] ?? 0}
                      onChange={(e) => setFor(n, Number(e.target.value))}
                      className="rounded-lg border border-white/10 bg-[#141622] px-2 py-1 text-xs outline-none focus:border-primary"
                    >
                      <option value={0}>الرئيسي</option>
                      {Array.from({ length: groups }, (_, i) => i + 1).map((x) => (
                        <option key={x} value={x}>مجموعة {x}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-white/50 font-mono text-[11px]">
                    {entryTimes[n] ? new Date(entryTimes[n]).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "rooms" && (
        <div className="mb-3.5 space-y-2.5">
          {names.length === 0 && (
            <p className="py-6 text-center text-xs text-white/40">لا يوجد مشاركون في الاجتماع حالياً</p>
          )}
          {roomsList.map((g) => {
            const members = names.filter((n) => (assignments[n] ?? 0) === g);
            const isTarget = dragOver === g;
            return (
              <div
                key={g}
                onDragOver={(e) => { e.preventDefault(); setDragOver(g); }}
                onDragLeave={() => setDragOver((d) => (d === g ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  const n = e.dataTransfer.getData("text/plain");
                  if (n) setFor(n, g);
                  setDragOver(null);
                }}
                className={`rounded-2xl border p-3 transition-all ${
                  isTarget
                    ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/15"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span className={`h-2 w-2 rounded-full ${g === 0 ? "bg-primary" : "bg-accent"}`} />
                    <span>{g === 0 ? "الاجتماع الرئيسي" : `مجموعة ${g}`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
                      {members.length} مشارك
                    </span>
                    <button
                      onClick={() => copyInvite(g)}
                      title="نسخ رابط دعوة لهذه الغرفة"
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Link2 className="h-3 w-3" /> رابط
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-8">
                  {members.length === 0 && (
                    <span className="text-[11px] text-white/30 self-center">فارغة — اسحب مشاركاً هنا</span>
                  )}
                  {members.map((n) => (
                    <div
                      key={n}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", n)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.07] px-2.5 py-1 text-xs cursor-grab active:cursor-grabbing hover:bg-white/[0.12] transition"
                    >
                      <GripVertical className="h-3 w-3 text-white/40" />
                      <span className="max-w-28 truncate font-medium">{n}</span>
                      <select
                        value={g}
                        onChange={(e) => setFor(n, Number(e.target.value))}
                        className="rounded border border-white/10 bg-[#10121d] px-1 py-0.5 text-[10px] outline-none"
                      >
                        <option value={0}>الرئيسي</option>
                        {Array.from({ length: groups }, (_, i) => i + 1).map((x) => (
                          <option key={x} value={x}>مجموعة {x}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={apply}
          className="flex-1 rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:brightness-110 active:scale-98 transition"
        >
          فتح وتفعيل المجموعات
        </button>
        <button
          onClick={closeAll}
          className="flex items-center gap-1 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
        >
          <Undo2 className="h-3.5 w-3.5" /> إنهاء
        </button>
      </div>

      {/* Switch between rooms */}
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-2 text-xs font-semibold text-white/70">انضم إلى مجموعة بنفسك</div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onJoinGroup(null)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              selfGroup === null
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            الرئيسي
          </button>
          {Array.from({ length: groups }, (_, i) => i + 1).map((g) => (
            <button
              key={g}
              onClick={() => onJoinGroup(g)}
              className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                selfGroup === g
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LogIn className="h-3 w-3" /> مجموعة {g}
            </button>
          ))}
        </div>
      </div>

      {/* Global Broadcast message */}
      <div className="mt-auto pt-3 border-t border-white/[0.08]">
        <div className="mb-1.5 text-xs font-semibold text-white/70">إعلان عام لجميع المجموعات</div>
        <div className="flex gap-2">
          <input
            value={announce}
            onChange={(e) => setAnnounce(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") broadcastMsg(); }}
            placeholder="اكتب إعلاناً يظهر للجميع فوراً..."
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 transition"
          />
          <button
            onClick={broadcastMsg}
            disabled={!announce.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90 disabled:opacity-40 transition"
          >
            <Megaphone className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
