import { useState } from "react";
import { Copy, Mail, Share2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { meetingUrl } from "@/lib/meeting-url";

export default function InviteModal({ code, title, onClose }: { code: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [emails, setEmails] = useState("");
  const link = meetingUrl(code);

  function copy(text: string, what: "link" | "code") {
    navigator.clipboard.writeText(text);
    setCopied(what);
    toast.success("تم النسخ");
    setTimeout(() => setCopied(null), 1500);
  }

  function sendEmails() {
    const list = emails.split(/[,\s;]+/).map((e) => e.trim()).filter(Boolean);
    if (!list.length) return toast.error("أدخل بريداً واحداً على الأقل");
    const subject = encodeURIComponent(`دعوة للانضمام لاجتماع: ${title}`);
    const body = encodeURIComponent(`أنت مدعو للانضمام للاجتماع "${title}".\n\nالرابط: ${link}\nكود الاجتماع: ${code}`);
    window.location.href = `mailto:${list.join(",")}?subject=${subject}&body=${body}`;
  }

  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title: `دعوة: ${title}`, text: `انضم للاجتماع: ${code}`, url: link }); }
      catch {}
    } else {
      copy(link, "link");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose} dir="rtl">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e1017]/95 p-6 sm:p-7 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-primary/30 to-accent/20 border border-primary/40 text-primary">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">دعوة مشاركين</h2>
              <p className="text-xs text-white/50 truncate max-w-[240px]">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/70">رابط الاجتماع المباشر</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white/90 outline-none select-all"
              />
              <button
                onClick={() => copy(link, "link")}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all"
              >
                {copied === "link" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "link" ? "تم" : "نسخ"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/70">كود الدخول</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={code}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 font-mono text-sm tracking-widest text-primary font-bold outline-none select-all"
              />
              <button
                onClick={() => copy(code, "code")}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 active:scale-95 transition-all"
              >
                {copied === "code" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "code" ? "تم" : "نسخ"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/70">دعوة عبر البريد الإلكتروني</label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="name@company.com, coworker@domain.com"
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
            <button
              onClick={sendEmails}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white/90 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <Mail className="h-4 w-4 text-primary" /> إرسال عبر تطبيق البريد
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={nativeShare}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:brightness-110 active:scale-[0.99] transition-all"
            >
              <Share2 className="h-4 w-4" /> مشاركة الرابط مع الآخرين
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
