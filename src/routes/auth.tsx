import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Video, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — FortMeet" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function goNext() {
    if (next) {
      window.location.href = next;
    } else {
      navigate({ to: "/dashboard" });
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goNext();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب — يمكنك تسجيل الدخول الآن");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goNext();
      }
    } catch (err: any) {
      toast.error(err.message ?? "حدث خطأ في المصادقة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0b10] flex items-center justify-center px-4 py-12" dir="rtl">
      {/* عناصر الإضاءة الخلفية */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-1/4 right-1/3 h-96 w-96 rounded-full bg-primary/20 blur-[140px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-accent/20 blur-[140px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-primary via-indigo-500 to-accent text-white shadow-xl shadow-primary/30 group-hover:scale-105 transition-transform">
              <Video className="h-6 w-6" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-white">
              FortMeet
            </span>
          </Link>
        </div>

        <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10">
          {/* محول التبويب السلس */}
          <div className="grid grid-cols-2 rounded-2xl bg-black/40 p-1.5 border border-white/10 mb-8">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${mode === "signin"
                  ? "bg-primary text-white shadow-md shadow-primary/40"
                  : "text-muted-foreground hover:text-white"
                }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${mode === "signup"
                  ? "bg-primary text-white shadow-md shadow-primary/40"
                  : "text-muted-foreground hover:text-white"
                }`}
            >
              إنشاء حساب جديد
            </button>
          </div>

          <div className="mb-6">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              {mode === "signin" ? "مرحباً بعودتك 👋" : "انضم إلى FortMeet ✨"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {mode === "signin"
                ? "سجّل دخولك للوصول إلى اجتماعاتك وتقارير الذكاء الاصطناعي"
                : "أنشئ حسابك المجاني في أقل من دقيقة"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-white/80">
                  الاسم الكامل
                </label>
                <div className="relative">
                  <User className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد محمود"
                    className="w-full rounded-xl border border-white/10 bg-black/30 pr-10 pl-4 py-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-white/80">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  dir="ltr"
                  className="w-full text-right rounded-xl border border-white/10 bg-black/30 pr-10 pl-4 py-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-white/80">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full text-right rounded-xl border border-white/10 bg-black/30 pr-10 pl-10 py-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.01] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                "جارٍ المعالجة..."
              ) : mode === "signin" ? (
                <>
                  <span>دخول إلى حسابي</span>
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </>
              ) : (
                <>
                  <span>إنشاء الحساب مجاناً</span>
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs text-muted-foreground">
            بالدخول أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بـ FortMeet.
          </div>
        </div>
      </div>
    </div>
  );
}
