import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { s as supabase } from "./client-DweYJVoo.js";
import { Video, User, Mail, Lock, EyeOff, Eye, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { R as Route } from "./router-C1Gq3I6k.js";
import "@supabase/supabase-js";
import "@tanstack/react-query";
function AuthPage() {
  const navigate = useNavigate();
  const {
    next
  } = Route.useSearch();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  function goNext() {
    if (next) {
      window.location.href = next;
    } else {
      navigate({
        to: "/dashboard"
      });
    }
  }
  useEffect(() => {
    supabase.auth.getSession().then(({
      data
    }) => {
      if (data.session) goNext();
    });
  }, []);
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const {
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}`,
            data: {
              display_name: name
            }
          }
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب — يمكنك تسجيل الدخول الآن");
        setMode("signin");
      } else {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        goNext();
      }
    } catch (err) {
      toast.error(err.message ?? "حدث خطأ في المصادقة");
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "relative min-h-screen overflow-hidden bg-[#0a0b10] flex items-center justify-center px-4 py-12", dir: "rtl", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none fixed inset-0 -z-10", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-1/4 right-1/3 h-96 w-96 rounded-full bg-primary/20 blur-[140px] animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-accent/20 blur-[140px]" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md", children: [
      /* @__PURE__ */ jsx("div", { className: "text-center mb-8", children: /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-3 group", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-primary via-indigo-500 to-accent text-white shadow-xl shadow-primary/30 group-hover:scale-105 transition-transform", children: /* @__PURE__ */ jsx(Video, { className: "h-6 w-6" }) }),
        /* @__PURE__ */ jsx("span", { className: "font-display text-2xl font-bold tracking-tight text-white", children: "FortMeet" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 rounded-2xl bg-black/40 p-1.5 border border-white/10 mb-8", children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setMode("signin"), className: `py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${mode === "signin" ? "bg-primary text-white shadow-md shadow-primary/40" : "text-muted-foreground hover:text-white"}`, children: "تسجيل الدخول" }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setMode("signup"), className: `py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${mode === "signup" ? "bg-primary text-white shadow-md shadow-primary/40" : "text-muted-foreground hover:text-white"}`, children: "إنشاء حساب جديد" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
          /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl sm:text-3xl font-extrabold text-white", children: mode === "signin" ? "مرحباً بعودتك 👋" : "انضم إلى FortMeet ✨" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs sm:text-sm text-muted-foreground", children: mode === "signin" ? "سجّل دخولك للوصول إلى اجتماعاتك وتقارير الذكاء الاصطناعي" : "أنشئ حسابك المجاني في أقل من دقيقة" })
        ] }),
        /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-4", children: [
          mode === "signup" && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1.5 block text-xs font-semibold text-white/80", children: "الاسم الكامل" }),
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(User, { className: "absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" }),
              /* @__PURE__ */ jsx("input", { type: "text", required: true, value: name, onChange: (e) => setName(e.target.value), placeholder: "مثال: أحمد محمود", className: "w-full rounded-xl border border-white/10 bg-black/30 pr-10 pl-4 py-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1.5 block text-xs font-semibold text-white/80", children: "البريد الإلكتروني" }),
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(Mail, { className: "absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" }),
              /* @__PURE__ */ jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "name@company.com", dir: "ltr", className: "w-full text-right rounded-xl border border-white/10 bg-black/30 pr-10 pl-4 py-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1.5 block text-xs font-semibold text-white/80", children: "كلمة المرور" }),
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(Lock, { className: "absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" }),
              /* @__PURE__ */ jsx("input", { type: showPassword ? "text" : "password", required: true, minLength: 6, value: password, onChange: (e) => setPassword(e.target.value), placeholder: "••••••••", dir: "ltr", className: "w-full text-right rounded-xl border border-white/10 bg-black/30 pr-10 pl-10 py-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" }),
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition", children: showPassword ? /* @__PURE__ */ jsx(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4" }) })
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "submit", disabled: loading, className: "mt-2 w-full rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.01] disabled:opacity-60 transition-all flex items-center justify-center gap-2", children: loading ? "جارٍ المعالجة..." : mode === "signin" ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("span", { children: "دخول إلى حسابي" }),
            /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4 rotate-180" })
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("span", { children: "إنشاء الحساب مجاناً" }),
            /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-6 pt-6 border-t border-white/10 text-center text-xs text-muted-foreground", children: "بالدخول أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بـ FortMeet." })
      ] })
    ] })
  ] });
}
export {
  AuthPage as component
};
