import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listRecordings, getRecordingDownloadUrl, deleteRecording } from "@/lib/recording.functions";
import { listMeetingReports, deleteMeetingReport } from "@/lib/ai-report.functions";
import {
  Video,
  Plus,
  LogIn,
  LogOut,
  Home,
  Calendar,
  Copy,
  Lock,
  Users,
  Download,
  Trash2,
  Circle,
  RefreshCw,
  Share2,
  MessageCircle,
  Send,
  Twitter,
  Facebook,
  Mail,
  AlertTriangle,
  Sparkles,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { meetingUrl } from "@/lib/meeting-url";
import { downloadReportPdf, downloadReportWord, type ExportableReport } from "@/lib/report-export";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم — FortMeet" }] }),
  component: Dashboard,
});

type Meeting = {
  id: string;
  code: string;
  title: string;
  scheduled_at: string | null;
  created_at: string;
};

function randomCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 9; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${out.slice(0, 3)}-${out.slice(3, 6)}-${out.slice(6, 9)}`;
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [title, setTitle] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [password, setPassword] = useState("");
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [shareOpen, setShareOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; code: string; title: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [activeTab, setActiveTab] = useState<"meetings" | "recordings" | "reports">("meetings");

  async function doDelete() {
    if (!confirmDelete) return;
    if (!deleteReason.trim()) return toast.error("يرجى كتابة سبب الحذف");
    const { id, code, title } = confirmDelete;
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setConfirmDelete(null);
    setDeleteReason("");
    toast.success(`تم حذف الاجتماع "${title}"`);
  }

  function deleteMeeting(id: string, code: string, title: string) {
    setConfirmDelete({ id, code, title });
    setDeleteReason("");
  }

  function shareTo(platform: string, code: string, title: string) {
    const url = meetingUrl(code);
    const text = `انضم إلى اجتماع "${title}" على FortMeet`;
    const enc = encodeURIComponent;
    const links: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${enc(text + " " + url)}`,
      telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      email: `mailto:?subject=${enc(title)}&body=${enc(text + "\n\n" + url)}`,
    };
    window.open(links[platform], "_blank", "noopener,noreferrer");
    setShareOpen(null);
  }

  async function nativeShare(code: string, title: string) {
    const url = meetingUrl(code);
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `انضم إلى اجتماع "${title}"`, url });
        setShareOpen(null);
        return;
      } catch {}
    }
    setShareOpen(shareOpen === code ? null : code);
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { next: undefined } });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("meetings")
      .select("*")
      .eq("host_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMeetings((data as Meeting[]) ?? []));
  }, [user]);

  const [creating, setCreating] = useState(false);

  async function createInstant() {
    if (!user) return toast.error("يرجى تسجيل الدخول أولاً");
    setCreating(true);
    try {
      const code = randomCode();
      const { error } = await supabase.from("meetings").insert({
        code,
        title: title.trim() || "اجتماع فوري",
        host_id: user.id,
        password: password || null,
        waiting_room: waitingRoom,
      });
      if (error) {
        console.error("Create meeting error:", error);
        toast.error(`فشل إنشاء الاجتماع: ${error.message}`);
        return;
      }
      toast.success("تم إنشاء الاجتماع بنجاح!");
      navigate({ to: "/meeting/$code", params: { code } });
    } catch (err: any) {
      console.error("Unexpected error creating meeting:", err);
      toast.error(`حدث خطأ غير متوقع: ${err?.message ?? err}`);
    } finally {
      setCreating(false);
    }
  }

  async function schedule() {
    if (!user) return toast.error("يرجى تسجيل الدخول أولاً");
    if (!scheduleAt) return toast.error("يرجى اختيار موعد الاجتماع");
    setCreating(true);
    try {
      const code = randomCode();
      const { error } = await supabase.from("meetings").insert({
        code,
        title: title.trim() || "اجتماع مجدول",
        host_id: user.id,
        scheduled_at: new Date(scheduleAt).toISOString(),
        password: password || null,
        waiting_room: waitingRoom,
      });
      if (error) {
        console.error("Schedule meeting error:", error);
        toast.error(`فشل الجدولة: ${error.message}`);
        return;
      }
      toast.success("تمت الجدولة بنجاح");
      setTitle("");
      setScheduleAt("");
      setPassword("");
      setWaitingRoom(false);
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false });
      setMeetings((data as Meeting[]) ?? []);
    } catch (err: any) {
      console.error("Unexpected error scheduling meeting:", err);
      toast.error(`حدث خطأ غير متوقع: ${err?.message ?? err}`);
    } finally {
      setCreating(false);
    }
  }

  function join() {
    const c = joinCode.trim().toLowerCase();
    if (!c) return toast.error("أدخل كود الاجتماع");
    navigate({ to: "/meeting/$code", params: { code: c } });
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(meetingUrl(code));
    toast.success("تم نسخ الرابط الحافظة");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0b10] grid place-items-center text-muted-foreground" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm font-semibold text-white/70">جاري تحميل لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  const userInitial = user.email ? user.email.slice(0, 1).toUpperCase() : "U";

  return (
    <div className="relative min-h-screen bg-[#0a0b10] text-foreground overflow-x-hidden selection:bg-primary/40 selection:text-white" dir="rtl">
      {/* خلفية بتدرجات كونية أنيقة */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 right-1/4 h-[30rem] w-[30rem] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute top-1/3 -left-20 h-96 w-96 rounded-full bg-accent/15 blur-[140px]" />
      </div>

      {/* الشريط العلوي للوحة التحكم */}
      <header className="sticky top-0 z-30 glass border-b border-white/10 bg-[#0d0f16]/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-3.5 max-w-6xl">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
              <Video className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              FortMeet
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            {/* رابط العودة إلى الصفحة الرئيسية */}
            <Link
              to="/"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5"
              title="الصفحة الرئيسية"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">الرئيسية</span>
            </Link>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-white font-bold text-xs">
                {userInitial}
              </div>
              <span className="hidden sm:inline font-mono text-xs">{user.email}</span>
            </div>
            <button
              onClick={signOut}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-6xl">
        {/* بطاقة الترحيب والإحصائيات السريعة */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 mb-10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white">
                مرحباً بك في لوحة التحكم ✨
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                ابدأ أو جدول اجتماعك القادم، وأدر تسجيلاتك وتقارير الذكاء الاصطناعي بكل سهولة.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-center">
                <span className="text-xl font-bold text-primary font-mono">{meetings.length}</span>
                <span className="block text-[10px] text-muted-foreground">اجتماعاتك</span>
              </div>
            </div>
          </div>
        </div>

        {/* أدوات الإجراءات السريعة (Bento Grid) */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* كرت: اجتماع فوري */}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between hover:border-primary/40 transition-all duration-300">
            <div>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg shadow-primary/30">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">بدء اجتماع فوري</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                أنشئ غرفة فورية الآن واحصل على الرابط لدعوة فريقك مباشرة.
              </p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان الاجتماع (اختياري)"
                className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={createInstant}
              disabled={creating}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.01] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {creating ? "جاري الإنشاء..." : "ابدأ الاجتماع الآن"}
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
          </div>

          {/* كرت: انضمام بكود */}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between hover:border-accent/40 transition-all duration-300">
            <div>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-accent to-emerald-600 text-white shadow-lg shadow-accent/30">
                <LogIn className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">الانضمام لاجتماع</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                ادخل باستخدام كود الاجتماع الذي تمت مشاركته معك.
              </p>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && join()}
                placeholder="مثال: abc-def-ghi"
                className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <button
              onClick={join}
              className="mt-5 w-full rounded-xl bg-white/10 border border-white/15 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/15 transition-all flex items-center justify-center gap-2"
            >
              انضم إلى الغرفة
            </button>
          </div>

          {/* كرت: جدولة اجتماع */}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300">
            <div>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">جدولة موعد</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                حدد موعداً مسبقاً للاجتماع لتنسيق الوقت مع الحضور.
              </p>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
              />
            </div>
            <button
              onClick={schedule}
              disabled={creating}
              className="mt-5 w-full rounded-xl bg-white/10 border border-white/15 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/15 transition-all flex items-center justify-center gap-2"
            >
              جدولة الاجتماع
            </button>
          </div>
        </div>

        {/* إعدادات الأمان السريعة للاجتماع التالي */}
        <div className="glass-card rounded-2xl p-5 mb-10">
          <div className="flex items-center gap-2 mb-3 text-white font-bold text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>خيارات الأمان والتحكم (تنطبق على الاجتماع الذي تنشئه)</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">
                كلمة مرور الاجتماع (اختياري)
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="اتركها فارغة بدون كلمة مرور"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-primary"
              />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-2 cursor-pointer hover:bg-black/40 transition">
              <input
                type="checkbox"
                checked={waitingRoom}
                onChange={(e) => setWaitingRoom(e.target.checked)}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-white block">
                  تفعيل غرفة الانتظار
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  يتطلب دخول أي مشارك موافقة صريحة من المضيف
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* محول التبويبات الفاخر للاستكشاف */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("meetings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "meetings"
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <Video className="h-4 w-4" />
            اجتماعاتي ({meetings.length})
          </button>
          <button
            onClick={() => setActiveTab("recordings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "recordings"
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <Circle className="h-3 w-3 fill-red-500 text-red-500" />
            التسجيلات
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "reports"
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="h-4 w-4 text-accent" />
            تقارير الذكاء الاصطناعي
          </button>
        </div>

        {/* محتوى تبويب: اجتماعاتي */}
        {activeTab === "meetings" && (
          <div className="space-y-3">
            {meetings.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <Video className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white/70">لا توجد اجتماعات بعد</p>
                <p className="text-xs text-muted-foreground mt-1">
                  اضغط على زر "بدء اجتماع فوري" بالأعلى لبدء أول اجتماع لك.
                </p>
              </div>
            ) : (
              meetings.map((m) => (
                <div
                  key={m.id}
                  className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all shadow-md"
                >
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      {m.title}
                      {m.scheduled_at && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Clock className="h-3 w-3" /> مجدول
                        </span>
                      )}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>كود الغرفة: <span className="font-mono text-white/90 bg-black/40 px-1.5 py-0.5 rounded">{m.code}</span></span>
                      <span>•</span>
                      <span>أنشئ في: {new Date(m.created_at).toLocaleDateString("ar")}</span>
                      {m.scheduled_at && (
                        <>
                          <span>•</span>
                          <span className="text-amber-300">موعده: {new Date(m.scheduled_at).toLocaleString("ar")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative">
                    <button
                      onClick={() => copyLink(m.code)}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:text-white hover:bg-white/10 transition"
                      title="نسخ الرابط"
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => nativeShare(m.code, m.title)}
                        className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:text-white hover:bg-white/10 transition"
                        title="مشاركة"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>

                      {shareOpen === m.code && (
                        <div className="absolute left-0 top-full mt-2 z-30 w-48 rounded-2xl border border-white/15 bg-[#161822] p-2 shadow-2xl backdrop-blur-xl">
                          <button
                            onClick={() => shareTo("whatsapp", m.code, m.title)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/90 hover:bg-white/10"
                          >
                            <MessageCircle className="h-4 w-4 text-emerald-400" /> واتساب
                          </button>
                          <button
                            onClick={() => shareTo("telegram", m.code, m.title)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/90 hover:bg-white/10"
                          >
                            <Send className="h-4 w-4 text-sky-400" /> تيليجرام
                          </button>
                          <button
                            onClick={() => shareTo("twitter", m.code, m.title)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/90 hover:bg-white/10"
                          >
                            <Twitter className="h-4 w-4 text-blue-400" /> منصة X
                          </button>
                          <button
                            onClick={() => shareTo("email", m.code, m.title)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/90 hover:bg-white/10"
                          >
                            <Mail className="h-4 w-4 text-amber-400" /> البريد الإلكتروني
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => deleteMeeting(m.id, m.code, m.title)}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => navigate({ to: "/meeting/$code", params: { code: m.code } })}
                      className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 transition-all"
                    >
                      دخول الاجتماع
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* محتوى تبويب: التسجيلات */}
        {activeTab === "recordings" && <RecordingsSection />}

        {/* محتوى تبويب: تقارير الذكاء الاصطناعي */}
        {activeTab === "reports" && <ReportsSection />}
      </main>

      {/* نافذة تأكيد الحذف */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="max-w-md bg-[#13151d] border-white/10 text-white" dir="rtl">
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-white">تأكيد حذف الاجتماع</DialogTitle>
            <DialogDescription className="text-center text-xs text-white/70">
              أنت على وشك حذف الاجتماع <strong>"{confirmDelete?.title}"</strong> بشكل نهائي.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">الكود:</span>{" "}
              <span className="font-mono text-white font-bold">{confirmDelete?.code}</span>
            </div>
            <label className="block text-xs font-semibold text-white/80">سبب الحذف (مطلوب)</label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="مثال: تم بالخطأ، أو انتهت الحاجة للاجتماع..."
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-red-500 min-h-[80px] resize-none"
            />
          </div>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/5"
            >
              إلغاء
            </button>
            <button
              onClick={doDelete}
              className="flex-1 rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-white hover:bg-destructive/90 shadow-md shadow-destructive/30"
            >
              حذف نهائي
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Recording = {
  id: string;
  meeting_code: string;
  status: string;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  created_at: string;
  ended_at: string | null;
  error_message: string | null;
};

function RecordingsSection() {
  const fetchList = useServerFn(listRecordings);
  const fetchUrl = useServerFn(getRecordingDownloadUrl);
  const removeRec = useServerFn(deleteRecording);
  const [items, setItems] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchList();
      setItems((r.recordings ?? []) as Recording[]);
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر تحميل التسجيلات");
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => { reload(); }, [reload]);

  async function download(id: string) {
    try {
      const { url } = await fetchUrl({ data: { id } });
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر التنزيل");
    }
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا التسجيل نهائياً؟")) return;
    try {
      await removeRec({ data: { id } });
      toast.success("تم حذف التسجيل");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الحذف");
    }
  }

  function fmtSize(b: number | null) {
    if (!b) return "—";
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  function fmtDur(s: number | null) {
    if (!s) return "—";
    const m = Math.floor(s / 60), ss = s % 60;
    return `${m}:${String(ss).padStart(2, "0")}`;
  }

  const statusLabel = (s: string) =>
    ({ completed: "مكتمل", active: "قيد التسجيل", starting: "يبدأ...", failed: "فشل", aborted: "ملغى" } as Record<string, string>)[s] ?? s;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">قائمة التسجيلات المحفوظة لاجتماعاتك</span>
        <button
          onClick={reload}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10 transition"
          title="تحديث"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-xs text-muted-foreground">جاري تحميل التسجيلات...</div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Circle className="h-10 w-10 text-red-500/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white/70">لا توجد تسجيلات بعد</p>
          <p className="text-xs text-muted-foreground mt-1">ابدأ اجتماعاً واضغط على زر "تسجيل" ليُحفظ هنا تلقائياً.</p>
        </div>
      ) : (
        items.map((r) => (
          <div
            key={r.id}
            className="glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="font-bold flex items-center gap-2 text-sm text-white">
                <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-white">{r.meeting_code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  r.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  ● {statusLabel(r.status)}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString("ar")} · المدة: {fmtDur(r.duration_seconds)} · الحجم: {fmtSize(r.file_size_bytes)}
              </div>
              {r.error_message && <div className="mt-1 text-xs text-destructive truncate">خطأ: {r.error_message}</div>}
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => download(r.id)}
                disabled={r.status !== "completed"}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="تنزيل الفيديو"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(r.id)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

type MeetingReport = {
  id: string;
  meeting_code: string;
  title: string;
  participants_count: number;
  duration_minutes: number;
  created_at: string;
  report: string;
};

function ReportsSection() {
  const fetchList = useServerFn(listMeetingReports);
  const removeReport = useServerFn(deleteMeetingReport);
  const [items, setItems] = useState<MeetingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<MeetingReport | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchList({ data: {} });
      setItems(rows as MeetingReport[]);
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر تحميل التقارير");
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => { reload(); }, [reload]);

  async function remove(id: string) {
    if (!confirm("حذف هذا التقرير نهائياً؟")) return;
    try {
      await removeReport({ data: { id } });
      toast.success("تم حذف التقرير");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الحذف");
    }
  }

  function toExportable(r: MeetingReport): ExportableReport {
    return {
      title: r.title,
      meetingCode: r.meeting_code,
      createdAt: r.created_at,
      participantsCount: r.participants_count,
      durationMinutes: r.duration_minutes,
      report: r.report,
    };
  }

  function download(r: MeetingReport) {
    const blob = new Blob([r.report], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `تقرير-${r.meeting_code}-${new Date(r.created_at).toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function asPdf(r: MeetingReport) {
    const ok = downloadReportPdf(toExportable(r));
    if (!ok) toast.error("تعذر فتح نافذة الطباعة، اسمح بالنوافذ المنبثقة");
  }

  function asWord(r: MeetingReport) {
    downloadReportWord(toExportable(r));
    toast.success("تم تنزيل ملف الوورد");
  }

  const groups = items.reduce<Record<string, MeetingReport[]>>((acc, r) => {
    (acc[r.meeting_code] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">تقارير التفاعل وتحليلات الحضور التي تم إنشاؤها بواسطة AI</span>
        <button
          onClick={reload}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10 transition"
          title="تحديث"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-xs text-muted-foreground">جاري تحميل التقارير...</div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Sparkles className="h-10 w-10 text-primary/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white/70">لا توجد تقارير بعد</p>
          <p className="text-xs text-muted-foreground mt-1">
            من داخل أي اجتماع، افتح قائمة "مساعد AI" واضغط على "تقرير عن المشاركين" ليُحفظ التقرير هنا تلقائياً.
          </p>
        </div>
      ) : (
        Object.entries(groups).map(([code, list]) => (
          <div key={code} className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm text-white">{list[0].title || code}</h3>
                <span className="font-mono text-xs text-muted-foreground">{code}</span>
              </div>
              <span className="rounded-full bg-primary/20 border border-primary/30 px-2.5 py-0.5 text-xs text-primary font-bold">
                {list.length} تقارير
              </span>
            </div>

            <div className="space-y-2">
              {list.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-white/10 bg-black/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/50 transition"
                >
                  <button
                    onClick={() => setOpen(r)}
                    className="text-right hover:text-primary transition group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-primary">
                      {new Date(r.created_at).toLocaleString("ar")}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {r.participants_count} مشارك · المدة: {r.duration_minutes} دقيقة
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setOpen(r)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-1"
                      title="عرض التقرير"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">عرض</span>
                    </button>
                    <button
                      onClick={() => asPdf(r)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white hover:bg-white/10 font-bold"
                      title="تصدير PDF"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => asWord(r)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white hover:bg-white/10 font-bold"
                      title="تصدير Word"
                    >
                      Word
                    </button>
                    <button
                      onClick={() => download(r)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
                      title="تنزيل Markdown"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-red-400 hover:bg-red-500/10"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* نافذة تفاصيل التقرير الذكي */}
      <Dialog open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto bg-[#13151d] border-white/10 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {open?.title || open?.meeting_code}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70">
              {open && `${new Date(open.created_at).toLocaleString("ar")} · ${open.participants_count} مشارك · ${open.duration_minutes} دقيقة`}
            </DialogDescription>
          </DialogHeader>

          <div className="whitespace-pre-wrap text-xs sm:text-sm leading-7 text-white/90 p-4 rounded-2xl bg-black/40 border border-white/10 my-3">
            {open?.report}
          </div>

          <DialogFooter>
            {open && (
              <div className="flex flex-wrap gap-2 w-full justify-end">
                <button
                  onClick={() => asPdf(open)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 shadow-md shadow-primary/30"
                >
                  <Download className="h-4 w-4" /> تنزيل PDF
                </button>
                <button
                  onClick={() => asWord(open)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                >
                  <FileText className="h-4 w-4" /> Word
                </button>
                <button
                  onClick={() => download(open)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                >
                  <Download className="h-4 w-4" /> Markdown
                </button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
