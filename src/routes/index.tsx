import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Video,
  Shield,
  Users,
  Calendar,
  MonitorUp,
  MessageSquare,
  ArrowLeft,
  Sparkles,
  Plus,
  LayoutDashboard,
  LogIn,
  LogOut,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FortMeet — مؤتمرات واجتماعات فيديو ذكية وفورية" },
      {
        name: "description",
        content:
          "منصة مؤتمرات فيديو متكاملة بتقنية WebRTC و LiveKit — اجتماعات فورية بجودة عالية، مشاركة شاشة، ذكاء اصطناعي، تشفير كامل وبدون تعقيد.",
      },
    ],
  }),
  component: Landing,
});

function randomCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 9; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${out.slice(0, 3)}-${out.slice(3, 6)}-${out.slice(6, 9)}`;
}

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const userInitial = user?.email ? user.email.slice(0, 1).toUpperCase() : "U";

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج بنجاح");
  }

  async function createInstant() {
    if (!user) {
      navigate({ to: "/auth", search: { next: undefined } });
      return;
    }
    if (creating) return;
    setCreating(true);
    const code = randomCode();
    const { error } = await supabase.from("meetings").insert({
      code,
      title: "اجتماع فوري",
      host_id: user.id,
      waiting_room: false,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/meeting/$code", params: { code } });
  }

  function joinByCode() {
    const c = joinCode.trim().toLowerCase();
    if (!c) return toast.error("أدخل كود الاجتماع");
    navigate({ to: "/meeting/$code", params: { code: c } });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground selection:bg-primary/40 selection:text-white" dir="rtl">
      {/* خلفية فلكية بألوان نابضة بالحياة */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 right-1/4 h-[32rem] w-[32rem] rounded-full bg-primary/30 blur-[130px] animate-pulse" />
        <div className="absolute top-1/4 -left-32 h-[30rem] w-[30rem] rounded-full bg-accent/25 blur-[140px]" />
        <div className="absolute bottom-10 right-10 h-[28rem] w-[28rem] rounded-full bg-purple-600/20 blur-[140px]" />
      </div>

      {/* شريط الملاحة العلوي الأنيق */}
      <header className="sticky top-4 z-50 container mx-auto px-4 max-w-6xl">
        <div className="glass-card flex items-center justify-between rounded-2xl px-4 sm:px-5 py-3 shadow-lg">
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-gradient-to-tr from-primary via-indigo-500 to-accent text-white shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
              <Video className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
              FortMeet
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            {loading ? null : user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* رابط الانتقال إلى لوحة التحكم */}
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>لوحة التحكم</span>
                </Link>

                {/* شارة بيانات المستخدم */}
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-white font-bold text-xs">
                    {userInitial}
                  </div>
                  <span className="font-mono text-xs max-w-[130px] md:max-w-[180px] truncate" title={user.email}>
                    {user.email}
                  </span>
                </div>

                {/* زر تسجيل الخروج مباشرة من الصفحة الرئيسية */}
                <button
                  onClick={handleSignOut}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5"
                  title="تسجيل الخروج"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">خروج</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ next: undefined }}
                  className="hidden sm:block rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white hover:bg-white/5 transition"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  to="/auth"
                  search={{ next: undefined }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all"
                >
                  ابدأ مجاناً
                  <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* قسم البطولة Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-20 text-center max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md mb-6 sm:mb-8">
          <Sparkles className="h-3.5 w-3.5 text-accent animate-spin" style={{ animationDuration: "4s" }} />
          <span className="text-center">مؤتمرات فيديو فائقة الدقة — مدعومة بالذكاء الاصطناعي</span>
        </div>

        <h1 className="font-display mx-auto max-w-4xl text-3xl sm:text-5xl md:text-7xl font-extrabold leading-[1.2] tracking-tight">
          اجتماعات فيديو احترافية
          <span className="block mt-2 text-gradient">
            بسرعة فائقة وبدون تعقيد
          </span>
        </h1>

        <p className="mx-auto mt-5 sm:mt-6 max-w-2xl text-sm sm:text-lg text-muted-foreground leading-relaxed px-2">
          أنشئ غرفتك في ثوانٍ، وشارك الرابط مع فريقك دون الحاجة لتثبيت أي برامج — مع مشاركة الشاشة، تقارير الذكاء الاصطناعي التفاعلية، وأمان تام.
        </p>

        {/* بطاقة ترحيبية احترافية وسلسة تظهر بيانات المستخدم وربطها بلوحة التحكم */}
        {user && (
          <div className="mx-auto mt-7 mb-2 max-w-xl rounded-3xl border border-white/10 bg-[#0d0f16]/70 p-4 sm:p-5 backdrop-blur-xl shadow-2xl text-right">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white font-bold text-base shadow-lg shadow-primary/30">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">مرحباً بك مجدداً</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> متصل
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-mono text-muted-foreground truncate max-w-[240px]" title={user.email}>
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 transition-all"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>لوحة التحكم</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5"
                  title="تسجيل الخروج"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">خروج</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* أزرار الإجراء السريع */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
          <button
            onClick={createInstant}
            disabled={creating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary via-indigo-600 to-purple-600 px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] disabled:opacity-60 transition-all"
          >
            <Plus className="h-5 w-5" />
            {creating ? "جارٍ الإنشاء..." : user ? "ابدأ اجتماعاً فورياً الآن" : "ابدأ اجتماعك الأول مجاناً"}
          </button>

          {user ? (
            <div className="glass-card w-full sm:w-auto flex items-center gap-2 rounded-2xl p-1.5 pl-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinByCode()}
                placeholder="أدخل كود الاجتماع"
                className="flex-1 min-w-0 sm:w-52 bg-transparent px-2 sm:px-3 text-xs sm:text-sm text-white outline-none placeholder:text-muted-foreground/70"
              />
              <button
                onClick={joinByCode}
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/20 transition"
              >
                <LogIn className="h-4 w-4" />
                انضم
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              search={{ next: undefined }}
              className="w-full sm:w-auto glass-card rounded-2xl px-7 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-foreground hover:bg-white/10 transition text-center"
            >
              انضم برمز اجتماع
            </Link>
          )}
        </div>
      </section>

      {/* قسم الميزات الفريدة Feature Cards */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 max-w-6xl">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white">
            كل ما تحتاجه لتواصل سلس ومثمر
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            أدوات متطورة مصممة خصيصاً للفرق الإنتاجية والشركات الحديثة
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              Icon: Video,
              t: "صوت وفيديو بجودة فائقة",
              d: "بث عالي الدقة يتكيف تلقائياً مع سرعة الإنترنت لمنع التقطيع وضمان استقرار الاجتماع.",
              gradient: "from-blue-500 to-indigo-600",
            },
            {
              Icon: Sparkles,
              t: "تقارير ذكية بالذكاء الاصطناعي",
              d: "تلخيص تفاعل المشاركين، إحصائيات الحضور، وتوصيات عملية تصدر بتقرير PDF فوري.",
              gradient: "from-purple-500 to-pink-600",
            },
            {
              Icon: MonitorUp,
              t: "مشاركة الشاشة بسلاسة",
              d: "شارك شاشتك بالكامل أو نافذة محددة بنقرة زر واحدة وبدقة كاملة.",
              gradient: "from-cyan-500 to-blue-600",
            },
            {
              Icon: MessageSquare,
              t: "دردشة واستطلاعات رأي تفاعلية",
              d: "أنشئ استطلاعات لحظية وصوّت مع فريقك وتشارك الروابط والملفات داخل الغرفة.",
              gradient: "from-emerald-500 to-teal-600",
            },
            {
              Icon: Users,
              t: "غرف فرعية (Breakout Rooms)",
              d: "قسّم المشاركين إلى مجموعات عمل صغيرة وأعد تجميعهم بنقرة واحدة من المضيف.",
              gradient: "from-amber-500 to-orange-600",
            },
            {
              Icon: Shield,
              t: "أمان وتشفير من الدرجة الأولى",
              d: "غرف انتظار، قفل الاجتماع برقم سري، وتحكم صارم بصلاحيات الحضور.",
              gradient: "from-rose-500 to-red-600",
            },
          ].map(({ Icon, t, d, gradient }) => (
            <div
              key={t}
              className="glass-card group relative rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-2xl"
            >
              <div
                className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr ${gradient} text-white shadow-lg transition-transform group-hover:scale-110`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">{t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* قسم الإحصائيات والثقة */}
      <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        <div className="glass-card rounded-3xl p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
          <div>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-white">99.9%</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">استقرار وجودة الاتصال</div>
          </div>
          <div>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-emerald-400">0 ثانية</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">وقت التثبيت (يعمل بالمتصفح)</div>
          </div>
          <div>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-cyan-400">256-bit</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">تشفير تام وأمان عالٍ</div>
          </div>
          <div>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-purple-400">AI</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">تقارير وتحليلات ذكية</div>
          </div>
        </div>
      </section>

      {/* تذييل الصفحة الفاخر Footer */}
      <footer className="border-t border-white/10 mt-20 py-8 bg-[#0b0c10]/80 backdrop-blur-md">
        <div className="container mx-auto px-6 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-white font-bold">
            <Video className="h-4 w-4 text-primary" />
            <span>FortMeet</span>
            <span className="text-muted-foreground font-normal">© {new Date().getFullYear()} جميع الحقوق محفوظة</span>
          </div>
          <div className="flex items-center gap-4">
            <span>منصة مؤتمرات فيديو عربية احترافية</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
