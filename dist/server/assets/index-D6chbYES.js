import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Video, LayoutDashboard, LogOut, ArrowLeft, Sparkles, Plus, LogIn, MonitorUp, MessageSquare, Users, Shield } from "lucide-react";
import { u as useAuth } from "./use-auth-DsAF41JV.js";
import { s as supabase } from "./client-DweYJVoo.js";
import { toast } from "sonner";
import "@supabase/supabase-js";
function randomCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 9; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${out.slice(0, 3)}-${out.slice(3, 6)}-${out.slice(6, 9)}`;
}
function Landing() {
  const {
    user,
    loading
  } = useAuth();
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
      navigate({
        to: "/auth",
        search: {
          next: void 0
        }
      });
      return;
    }
    if (creating) return;
    setCreating(true);
    const code = randomCode();
    const {
      error
    } = await supabase.from("meetings").insert({
      code,
      title: "اجتماع فوري",
      host_id: user.id,
      waiting_room: false
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({
      to: "/meeting/$code",
      params: {
        code
      }
    });
  }
  function joinByCode() {
    const c = joinCode.trim().toLowerCase();
    if (!c) return toast.error("أدخل كود الاجتماع");
    navigate({
      to: "/meeting/$code",
      params: {
        code: c
      }
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "relative min-h-screen overflow-x-hidden text-foreground selection:bg-primary/40 selection:text-white", dir: "rtl", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none fixed inset-0 -z-10", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute -top-40 right-1/4 h-[32rem] w-[32rem] rounded-full bg-primary/30 blur-[130px] animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "absolute top-1/4 -left-32 h-[30rem] w-[30rem] rounded-full bg-accent/25 blur-[140px]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-10 right-10 h-[28rem] w-[28rem] rounded-full bg-purple-600/20 blur-[140px]" })
    ] }),
    /* @__PURE__ */ jsx("header", { className: "sticky top-4 z-50 container mx-auto px-4 max-w-6xl", children: /* @__PURE__ */ jsxs("div", { className: "glass-card flex items-center justify-between rounded-2xl px-4 sm:px-5 py-3 shadow-lg", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2.5 group flex-shrink-0", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-gradient-to-tr from-primary via-indigo-500 to-accent text-white shadow-md shadow-primary/30 group-hover:scale-105 transition-transform", children: /* @__PURE__ */ jsx(Video, { className: "h-4 w-4 sm:h-5 sm:w-5" }) }),
        /* @__PURE__ */ jsx("span", { className: "font-display text-lg sm:text-xl font-bold tracking-tight text-white", children: "FortMeet" })
      ] }),
      /* @__PURE__ */ jsx("nav", { className: "flex items-center gap-2 sm:gap-3", children: loading ? null : user ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/dashboard", className: "inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all", children: [
          /* @__PURE__ */ jsx(LayoutDashboard, { className: "h-3.5 w-3.5 sm:h-4 sm:w-4" }),
          /* @__PURE__ */ jsx("span", { children: "لوحة التحكم" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-6 w-6 place-items-center rounded-full bg-primary text-white font-bold text-xs", children: userInitial }),
          /* @__PURE__ */ jsx("span", { className: "font-mono text-xs max-w-[130px] md:max-w-[180px] truncate", title: user.email, children: user.email })
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: handleSignOut, className: "rounded-xl border border-white/10 bg-white/5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5", title: "تسجيل الخروج", children: [
          /* @__PURE__ */ jsx(LogOut, { className: "h-3.5 w-3.5" }),
          /* @__PURE__ */ jsx("span", { className: "hidden xs:inline", children: "خروج" })
        ] })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Link, { to: "/auth", search: {
          next: void 0
        }, className: "hidden sm:block rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white hover:bg-white/5 transition", children: "تسجيل الدخول" }),
        /* @__PURE__ */ jsxs(Link, { to: "/auth", search: {
          next: void 0
        }, className: "inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all", children: [
          "ابدأ مجاناً",
          /* @__PURE__ */ jsx(ArrowLeft, { className: "h-3 w-3 sm:h-3.5 sm:w-3.5" })
        ] })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-20 text-center max-w-5xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md mb-6 sm:mb-8", children: [
        /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5 text-accent animate-spin", style: {
          animationDuration: "4s"
        } }),
        /* @__PURE__ */ jsx("span", { className: "text-center", children: "مؤتمرات فيديو فائقة الدقة — مدعومة بالذكاء الاصطناعي" })
      ] }),
      /* @__PURE__ */ jsxs("h1", { className: "font-display mx-auto max-w-4xl text-3xl sm:text-5xl md:text-7xl font-extrabold leading-[1.2] tracking-tight", children: [
        "اجتماعات فيديو احترافية",
        /* @__PURE__ */ jsx("span", { className: "block mt-2 text-gradient", children: "بسرعة فائقة وبدون تعقيد" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto mt-5 sm:mt-6 max-w-2xl text-sm sm:text-lg text-muted-foreground leading-relaxed px-2", children: "أنشئ غرفتك في ثوانٍ، وشارك الرابط مع فريقك دون الحاجة لتثبيت أي برامج — مع مشاركة الشاشة، تقارير الذكاء الاصطناعي التفاعلية، وأمان تام." }),
      user && /* @__PURE__ */ jsx("div", { className: "mx-auto mt-7 mb-2 max-w-xl rounded-3xl border border-white/10 bg-[#0d0f16]/70 p-4 sm:p-5 backdrop-blur-xl shadow-2xl text-right", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3.5 w-full sm:w-auto", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white font-bold text-base shadow-lg shadow-primary/30", children: userInitial }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-white", children: "مرحباً بك مجدداً" }),
              /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400", children: [
                /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" }),
                " متصل"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "text-xs sm:text-sm font-mono text-muted-foreground truncate max-w-[240px]", title: user.email, children: user.email })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 w-full sm:w-auto justify-end", children: [
          /* @__PURE__ */ jsxs(Link, { to: "/dashboard", className: "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 transition-all", children: [
            /* @__PURE__ */ jsx(LayoutDashboard, { className: "h-3.5 w-3.5" }),
            /* @__PURE__ */ jsx("span", { children: "لوحة التحكم" })
          ] }),
          /* @__PURE__ */ jsxs("button", { onClick: handleSignOut, className: "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5", title: "تسجيل الخروج", children: [
            /* @__PURE__ */ jsx(LogOut, { className: "h-3.5 w-3.5" }),
            /* @__PURE__ */ jsx("span", { className: "hidden xs:inline", children: "خروج" })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full", children: [
        /* @__PURE__ */ jsxs("button", { onClick: createInstant, disabled: creating, className: "w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary via-indigo-600 to-purple-600 px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] disabled:opacity-60 transition-all", children: [
          /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" }),
          creating ? "جارٍ الإنشاء..." : user ? "ابدأ اجتماعاً فورياً الآن" : "ابدأ اجتماعك الأول مجاناً"
        ] }),
        user ? /* @__PURE__ */ jsxs("div", { className: "glass-card w-full sm:w-auto flex items-center gap-2 rounded-2xl p-1.5 pl-3", children: [
          /* @__PURE__ */ jsx("input", { value: joinCode, onChange: (e) => setJoinCode(e.target.value), onKeyDown: (e) => e.key === "Enter" && joinByCode(), placeholder: "أدخل كود الاجتماع", className: "flex-1 min-w-0 sm:w-52 bg-transparent px-2 sm:px-3 text-xs sm:text-sm text-white outline-none placeholder:text-muted-foreground/70" }),
          /* @__PURE__ */ jsxs("button", { onClick: joinByCode, className: "flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/20 transition", children: [
            /* @__PURE__ */ jsx(LogIn, { className: "h-4 w-4" }),
            "انضم"
          ] })
        ] }) : /* @__PURE__ */ jsx(Link, { to: "/auth", search: {
          next: void 0
        }, className: "w-full sm:w-auto glass-card rounded-2xl px-7 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-foreground hover:bg-white/10 transition text-center", children: "انضم برمز اجتماع" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 sm:px-6 py-16 sm:py-20 max-w-6xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-10 sm:mb-14", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl sm:text-4xl font-extrabold text-white", children: "كل ما تحتاجه لتواصل سلس ومثمر" }),
        /* @__PURE__ */ jsx("p", { className: "mt-3 text-muted-foreground text-sm sm:text-base", children: "أدوات متطورة مصممة خصيصاً للفرق الإنتاجية والشركات الحديثة" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", children: [{
        Icon: Video,
        t: "صوت وفيديو بجودة فائقة",
        d: "بث عالي الدقة يتكيف تلقائياً مع سرعة الإنترنت لمنع التقطيع وضمان استقرار الاجتماع.",
        gradient: "from-blue-500 to-indigo-600"
      }, {
        Icon: Sparkles,
        t: "تقارير ذكية بالذكاء الاصطناعي",
        d: "تلخيص تفاعل المشاركين، إحصائيات الحضور، وتوصيات عملية تصدر بتقرير PDF فوري.",
        gradient: "from-purple-500 to-pink-600"
      }, {
        Icon: MonitorUp,
        t: "مشاركة الشاشة بسلاسة",
        d: "شارك شاشتك بالكامل أو نافذة محددة بنقرة زر واحدة وبدقة كاملة.",
        gradient: "from-cyan-500 to-blue-600"
      }, {
        Icon: MessageSquare,
        t: "دردشة واستطلاعات رأي تفاعلية",
        d: "أنشئ استطلاعات لحظية وصوّت مع فريقك وتشارك الروابط والملفات داخل الغرفة.",
        gradient: "from-emerald-500 to-teal-600"
      }, {
        Icon: Users,
        t: "غرف فرعية (Breakout Rooms)",
        d: "قسّم المشاركين إلى مجموعات عمل صغيرة وأعد تجميعهم بنقرة واحدة من المضيف.",
        gradient: "from-amber-500 to-orange-600"
      }, {
        Icon: Shield,
        t: "أمان وتشفير من الدرجة الأولى",
        d: "غرف انتظار، قفل الاجتماع برقم سري، وتحكم صارم بصلاحيات الحضور.",
        gradient: "from-rose-500 to-red-600"
      }].map(({
        Icon,
        t,
        d,
        gradient
      }) => /* @__PURE__ */ jsxs("div", { className: "glass-card group relative rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-2xl", children: [
        /* @__PURE__ */ jsx("div", { className: `mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr ${gradient} text-white shadow-lg transition-transform group-hover:scale-110`, children: /* @__PURE__ */ jsx(Icon, { className: "h-6 w-6" }) }),
        /* @__PURE__ */ jsx("h3", { className: "font-display text-xl font-bold text-white mb-2", children: t }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: d })
      ] }, t)) })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl", children: /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-3xl p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "font-display text-2xl sm:text-3xl font-extrabold text-white", children: "99.9%" }),
        /* @__PURE__ */ jsx("div", { className: "text-[11px] sm:text-xs text-muted-foreground mt-1", children: "استقرار وجودة الاتصال" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "font-display text-2xl sm:text-3xl font-extrabold text-emerald-400", children: "0 ثانية" }),
        /* @__PURE__ */ jsx("div", { className: "text-[11px] sm:text-xs text-muted-foreground mt-1", children: "وقت التثبيت (يعمل بالمتصفح)" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "font-display text-2xl sm:text-3xl font-extrabold text-cyan-400", children: "256-bit" }),
        /* @__PURE__ */ jsx("div", { className: "text-[11px] sm:text-xs text-muted-foreground mt-1", children: "تشفير تام وأمان عالٍ" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "font-display text-2xl sm:text-3xl font-extrabold text-purple-400", children: "AI" }),
        /* @__PURE__ */ jsx("div", { className: "text-[11px] sm:text-xs text-muted-foreground mt-1", children: "تقارير وتحليلات ذكية" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("footer", { className: "border-t border-white/10 mt-20 py-8 bg-[#0b0c10]/80 backdrop-blur-md", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto px-6 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-white font-bold", children: [
        /* @__PURE__ */ jsx(Video, { className: "h-4 w-4 text-primary" }),
        /* @__PURE__ */ jsx("span", { children: "FortMeet" }),
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground font-normal", children: [
          "© ",
          (/* @__PURE__ */ new Date()).getFullYear(),
          " جميع الحقوق محفوظة"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center gap-4", children: /* @__PURE__ */ jsx("span", { children: "منصة مؤتمرات فيديو عربية احترافية" }) })
    ] }) })
  ] });
}
export {
  Landing as component
};
