import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { m as meetingUrl, u as useServerFn, l as listRecordings, g as getRecordingDownloadUrl, d as deleteRecording, a as listMeetingReports, b as deleteMeetingReport } from "./meeting-url-D7577DQ8.js";
import { s as supabase } from "./client-DweYJVoo.js";
import { u as useAuth } from "./use-auth-DsAF41JV.js";
import { X, Video, Home, LogOut, Plus, ArrowRight, LogIn, Calendar, ShieldCheck, Circle, Sparkles, Clock, Copy, Share2, MessageCircle, Send, Twitter, Mail, Trash2, AlertTriangle, RefreshCw, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import "./server-DpeWxidM.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "seroval";
import "@tanstack/history";
import "@tanstack/react-router/ssr/server";
import "./auth-middleware-BQ-toWLv.js";
import "@supabase/supabase-js";
import "zod";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Overlay,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxs(
    DialogPrimitive.Content,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxs(DialogPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
    ...props
  }
);
DialogFooter.displayName = "DialogFooter";
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
function markdownToHtml(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const out = [];
  let list = null;
  let table = null;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  const closeTable = () => {
    if (!table) return;
    const [head, ...rows] = table;
    out.push("<table><thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>");
    for (const r of rows) out.push("<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>");
    out.push("</tbody></table>");
    table = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      closeList();
      (table ||= []).push(cells);
      continue;
    }
    closeTable();
    if (!line) {
      closeList();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }
    const ul = /^[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ol) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  closeTable();
  return out.join("\n");
}
function documentHtml(r) {
  const meta = `${new Date(r.createdAt).toLocaleString("ar-EG")} · ${r.participantsCount} مشارك · ${r.durationMinutes} دقيقة · كود ${r.meetingCode}`;
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${esc(r.title || r.meetingCode)}</title>
<style>
 body{font-family:"Segoe UI","Tahoma",Arial,sans-serif;direction:rtl;color:#111;margin:32px;line-height:1.9}
 h1{font-size:22pt;margin:0 0 4px} h2{font-size:15pt;margin:18px 0 6px;color:#3b2fa8}
 h3{font-size:13pt;margin:14px 0 4px}
 .meta{color:#666;font-size:10pt;margin-bottom:18px;border-bottom:1px solid #ddd;padding-bottom:10px}
 table{border-collapse:collapse;width:100%;margin:10px 0;font-size:10.5pt}
 th,td{border:1px solid #bbb;padding:6px 8px;text-align:right}
 th{background:#eee9ff}
 ul,ol{padding-right:22px} p{margin:6px 0}
 .foot{margin-top:24px;border-top:1px solid #ddd;padding-top:8px;color:#888;font-size:9pt}
</style></head><body>
<h1>${esc(r.title || r.meetingCode)}</h1>
<div class="meta">${esc(meta)}</div>
${markdownToHtml(r.report)}
<div class="foot">تم إنشاء التقرير بواسطة FortMeet</div>
</body></html>`;
}
function fileBase(r) {
  return `تقرير-${r.meetingCode}-${new Date(r.createdAt).toISOString().slice(0, 10)}`;
}
function downloadReportWord(r) {
  const blob = new Blob(["\uFEFF" + documentHtml(r)], { type: "application/msword;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileBase(r)}.doc`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function downloadReportPdf(r) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;
  w.document.write(documentHtml(r));
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 400);
  return true;
}
function randomCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 9; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${out.slice(0, 3)}-${out.slice(3, 6)}-${out.slice(6, 9)}`;
}
function Dashboard() {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [title, setTitle] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [password, setPassword] = useState("");
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [shareOpen, setShareOpen] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [activeTab, setActiveTab] = useState("meetings");
  async function doDelete() {
    if (!confirmDelete) return;
    if (!deleteReason.trim()) return toast.error("يرجى كتابة سبب الحذف");
    const {
      id,
      code,
      title: title2
    } = confirmDelete;
    const {
      error
    } = await supabase.from("meetings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setConfirmDelete(null);
    setDeleteReason("");
    toast.success(`تم حذف الاجتماع "${title2}"`);
  }
  function deleteMeeting(id, code, title2) {
    setConfirmDelete({
      id,
      code,
      title: title2
    });
    setDeleteReason("");
  }
  function shareTo(platform, code, title2) {
    const url = meetingUrl(code);
    const text = `انضم إلى اجتماع "${title2}" على FortMeet`;
    const enc = encodeURIComponent;
    const links = {
      whatsapp: `https://wa.me/?text=${enc(text + " " + url)}`,
      telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      email: `mailto:?subject=${enc(title2)}&body=${enc(text + "\n\n" + url)}`
    };
    window.open(links[platform], "_blank", "noopener,noreferrer");
    setShareOpen(null);
  }
  async function nativeShare(code, title2) {
    const url = meetingUrl(code);
    if (navigator.share) {
      try {
        await navigator.share({
          title: title2,
          text: `انضم إلى اجتماع "${title2}"`,
          url
        });
        setShareOpen(null);
        return;
      } catch {
      }
    }
    setShareOpen(shareOpen === code ? null : code);
  }
  useEffect(() => {
    if (!loading && !user) navigate({
      to: "/auth",
      search: {
        next: void 0
      }
    });
  }, [user, loading, navigate]);
  useEffect(() => {
    if (!user) return;
    supabase.from("meetings").select("*").eq("host_id", user.id).order("created_at", {
      ascending: false
    }).then(({
      data
    }) => setMeetings(data ?? []));
  }, [user]);
  const [creating, setCreating] = useState(false);
  async function createInstant() {
    if (!user) return toast.error("يرجى تسجيل الدخول أولاً");
    setCreating(true);
    try {
      const code = randomCode();
      const {
        error
      } = await supabase.from("meetings").insert({
        code,
        title: title.trim() || "اجتماع فوري",
        host_id: user.id,
        password: password || null,
        waiting_room: waitingRoom
      });
      if (error) {
        console.error("Create meeting error:", error);
        toast.error(`فشل إنشاء الاجتماع: ${error.message}`);
        return;
      }
      toast.success("تم إنشاء الاجتماع بنجاح!");
      navigate({
        to: "/meeting/$code",
        params: {
          code
        }
      });
    } catch (err) {
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
      const {
        error
      } = await supabase.from("meetings").insert({
        code,
        title: title.trim() || "اجتماع مجدول",
        host_id: user.id,
        scheduled_at: new Date(scheduleAt).toISOString(),
        password: password || null,
        waiting_room: waitingRoom
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
      const {
        data
      } = await supabase.from("meetings").select("*").eq("host_id", user.id).order("created_at", {
        ascending: false
      });
      setMeetings(data ?? []);
    } catch (err) {
      console.error("Unexpected error scheduling meeting:", err);
      toast.error(`حدث خطأ غير متوقع: ${err?.message ?? err}`);
    } finally {
      setCreating(false);
    }
  }
  function join() {
    const c = joinCode.trim().toLowerCase();
    if (!c) return toast.error("أدخل كود الاجتماع");
    navigate({
      to: "/meeting/$code",
      params: {
        code: c
      }
    });
  }
  async function signOut() {
    await supabase.auth.signOut();
    navigate({
      to: "/"
    });
  }
  function copyLink(code) {
    navigator.clipboard.writeText(meetingUrl(code));
    toast.success("تم نسخ الرابط الحافظة");
  }
  if (loading || !user) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-[#0a0b10] grid place-items-center text-muted-foreground", dir: "rtl", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-3", children: [
      /* @__PURE__ */ jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" }),
      /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-white/70", children: "جاري تحميل لوحة التحكم..." })
    ] }) });
  }
  const userInitial = user.email ? user.email.slice(0, 1).toUpperCase() : "U";
  return /* @__PURE__ */ jsxs("div", { className: "relative min-h-screen bg-[#0a0b10] text-foreground overflow-x-hidden selection:bg-primary/40 selection:text-white", dir: "rtl", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none fixed inset-0 -z-10", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute -top-32 right-1/4 h-[30rem] w-[30rem] rounded-full bg-primary/20 blur-[140px]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute top-1/3 -left-20 h-96 w-96 rounded-full bg-accent/15 blur-[140px]" })
    ] }),
    /* @__PURE__ */ jsx("header", { className: "sticky top-0 z-30 glass border-b border-white/10 bg-[#0d0f16]/80 backdrop-blur-md", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto flex items-center justify-between px-6 py-3.5 max-w-6xl", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-3 group", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white shadow-md shadow-primary/30 group-hover:scale-105 transition-transform", children: /* @__PURE__ */ jsx(Video, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsx("span", { className: "font-display text-lg font-bold tracking-tight text-white", children: "FortMeet" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 sm:gap-3 text-xs sm:text-sm", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/", className: "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5", title: "الصفحة الرئيسية", children: [
          /* @__PURE__ */ jsx(Home, { className: "h-3.5 w-3.5" }),
          /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "الرئيسية" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-6 w-6 place-items-center rounded-full bg-primary text-white font-bold text-xs", children: userInitial }),
          /* @__PURE__ */ jsx("span", { className: "hidden sm:inline font-mono text-xs", children: user.email })
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: signOut, className: "rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(LogOut, { className: "h-3.5 w-3.5" }),
          " خروج"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "container mx-auto px-6 py-10 max-w-6xl", children: [
      /* @__PURE__ */ jsx("div", { className: "glass-card rounded-3xl p-6 sm:p-8 mb-10 shadow-2xl relative overflow-hidden", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl sm:text-4xl font-extrabold text-white", children: "مرحباً بك في لوحة التحكم ✨" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs sm:text-sm text-muted-foreground", children: "ابدأ أو جدول اجتماعك القادم، وأدر تسجيلاتك وتقارير الذكاء الاصطناعي بكل سهولة." })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-center", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xl font-bold text-primary font-mono", children: meetings.length }),
          /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-muted-foreground", children: "اجتماعاتك" })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-6 md:grid-cols-3 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-3xl p-6 flex flex-col justify-between hover:border-primary/40 transition-all duration-300", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg shadow-primary/30", children: /* @__PURE__ */ jsx(Plus, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx("h3", { className: "font-display text-xl font-bold text-white", children: "بدء اجتماع فوري" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground leading-relaxed", children: "أنشئ غرفة فورية الآن واحصل على الرابط لدعوة فريقك مباشرة." }),
            /* @__PURE__ */ jsx("input", { value: title, onChange: (e) => setTitle(e.target.value), placeholder: "عنوان الاجتماع (اختياري)", className: "mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" })
          ] }),
          /* @__PURE__ */ jsxs("button", { onClick: createInstant, disabled: creating, className: "mt-5 w-full rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.01] disabled:opacity-60 transition-all flex items-center justify-center gap-2", children: [
            creating ? "جاري الإنشاء..." : "ابدأ الاجتماع الآن",
            /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4 rotate-180" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-3xl p-6 flex flex-col justify-between hover:border-accent/40 transition-all duration-300", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-accent to-emerald-600 text-white shadow-lg shadow-accent/30", children: /* @__PURE__ */ jsx(LogIn, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx("h3", { className: "font-display text-xl font-bold text-white", children: "الانضمام لاجتماع" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground leading-relaxed", children: "ادخل باستخدام كود الاجتماع الذي تمت مشاركته معك." }),
            /* @__PURE__ */ jsx("input", { value: joinCode, onChange: (e) => setJoinCode(e.target.value), onKeyDown: (e) => e.key === "Enter" && join(), placeholder: "مثال: abc-def-ghi", className: "mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: join, className: "mt-5 w-full rounded-xl bg-white/10 border border-white/15 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/15 transition-all flex items-center justify-center gap-2", children: "انضم إلى الغرفة" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-3xl p-6 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30", children: /* @__PURE__ */ jsx(Calendar, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx("h3", { className: "font-display text-xl font-bold text-white", children: "جدولة موعد" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground leading-relaxed", children: "حدد موعداً مسبقاً للاجتماع لتنسيق الوقت مع الحضور." }),
            /* @__PURE__ */ jsx("input", { type: "datetime-local", value: scheduleAt, onChange: (e) => setScheduleAt(e.target.value), className: "mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20" })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: schedule, disabled: creating, className: "mt-5 w-full rounded-xl bg-white/10 border border-white/15 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/15 transition-all flex items-center justify-center gap-2", children: "جدولة الاجتماع" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-2xl p-5 mb-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-3 text-white font-bold text-sm", children: [
          /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4 text-emerald-400" }),
          /* @__PURE__ */ jsx("span", { children: "خيارات الأمان والتحكم (تنطبق على الاجتماع الذي تنشئه)" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1 block text-xs font-semibold text-white/70", children: "كلمة مرور الاجتماع (اختياري)" }),
            /* @__PURE__ */ jsx("input", { type: "text", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "اتركها فارغة بدون كلمة مرور", className: "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-primary" })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-2 cursor-pointer hover:bg-black/40 transition", children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", checked: waitingRoom, onChange: (e) => setWaitingRoom(e.target.checked), className: "h-4 w-4 rounded accent-primary cursor-pointer" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs sm:text-sm font-semibold text-white block", children: "تفعيل غرفة الانتظار" }),
              /* @__PURE__ */ jsx("span", { className: "text-[11px] text-muted-foreground block", children: "يتطلب دخول أي مشارك موافقة صريحة من المضيف" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-b border-white/10 pb-3 mb-6 overflow-x-auto", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => setActiveTab("meetings"), className: `flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === "meetings" ? "bg-primary text-white shadow-md shadow-primary/30" : "text-muted-foreground hover:text-white hover:bg-white/5"}`, children: [
          /* @__PURE__ */ jsx(Video, { className: "h-4 w-4" }),
          "اجتماعاتي (",
          meetings.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setActiveTab("recordings"), className: `flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === "recordings" ? "bg-primary text-white shadow-md shadow-primary/30" : "text-muted-foreground hover:text-white hover:bg-white/5"}`, children: [
          /* @__PURE__ */ jsx(Circle, { className: "h-3 w-3 fill-red-500 text-red-500" }),
          "التسجيلات"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setActiveTab("reports"), className: `flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === "reports" ? "bg-primary text-white shadow-md shadow-primary/30" : "text-muted-foreground hover:text-white hover:bg-white/5"}`, children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-accent" }),
          "تقارير الذكاء الاصطناعي"
        ] })
      ] }),
      activeTab === "meetings" && /* @__PURE__ */ jsx("div", { className: "space-y-3", children: meetings.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-2xl p-10 text-center", children: [
        /* @__PURE__ */ jsx(Video, { className: "h-10 w-10 text-white/20 mx-auto mb-3" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white/70", children: "لا توجد اجتماعات بعد" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: 'اضغط على زر "بدء اجتماع فوري" بالأعلى لبدء أول اجتماع لك.' })
      ] }) : meetings.map((m) => /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all shadow-md", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [
            m.title,
            m.scheduled_at && /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20", children: [
              /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
              " مجدول"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              "كود الغرفة: ",
              /* @__PURE__ */ jsx("span", { className: "font-mono text-white/90 bg-black/40 px-1.5 py-0.5 rounded", children: m.code })
            ] }),
            /* @__PURE__ */ jsx("span", { children: "•" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "أنشئ في: ",
              new Date(m.created_at).toLocaleDateString("ar")
            ] }),
            m.scheduled_at && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("span", { children: "•" }),
              /* @__PURE__ */ jsxs("span", { className: "text-amber-300", children: [
                "موعده: ",
                new Date(m.scheduled_at).toLocaleString("ar")
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 relative", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => copyLink(m.code), className: "rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:text-white hover:bg-white/10 transition", title: "نسخ الرابط", children: /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx("button", { onClick: () => nativeShare(m.code, m.title), className: "rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:text-white hover:bg-white/10 transition", title: "مشاركة", children: /* @__PURE__ */ jsx(Share2, { className: "h-4 w-4" }) }),
            shareOpen === m.code && /* @__PURE__ */ jsxs("div", { className: "absolute left-0 top-full mt-2 z-30 w-48 rounded-2xl border border-white/15 bg-[#161822] p-2 shadow-2xl backdrop-blur-xl", children: [
              /* @__PURE__ */ jsxs("button", { onClick: () => shareTo("whatsapp", m.code, m.title), className: "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/90 hover:bg-white/10", children: [
                /* @__PURE__ */ jsx(MessageCircle, { className: "h-4 w-4 text-emerald-400" }),
                " واتساب"
              ] }),
              /* @__PURE__ */ jsxs("button", { onClick: () => shareTo("telegram", m.code, m.title), className: "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/90 hover:bg-white/10", children: [
                /* @__PURE__ */ jsx(Send, { className: "h-4 w-4 text-sky-400" }),
                " تيليجرام"
              ] }),
              /* @__PURE__ */ jsxs("button", { onClick: () => shareTo("twitter", m.code, m.title), className: "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/90 hover:bg-white/10", children: [
                /* @__PURE__ */ jsx(Twitter, { className: "h-4 w-4 text-blue-400" }),
                " منصة X"
              ] }),
              /* @__PURE__ */ jsxs("button", { onClick: () => shareTo("email", m.code, m.title), className: "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/90 hover:bg-white/10", children: [
                /* @__PURE__ */ jsx(Mail, { className: "h-4 w-4 text-amber-400" }),
                " البريد الإلكتروني"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: () => deleteMeeting(m.id, m.code, m.title), className: "rounded-xl border border-white/10 bg-white/5 p-2 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition", title: "حذف", children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsx("button", { onClick: () => navigate({
            to: "/meeting/$code",
            params: {
              code: m.code
            }
          }), className: "rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 transition-all", children: "دخول الاجتماع" })
        ] })
      ] }, m.id)) }),
      activeTab === "recordings" && /* @__PURE__ */ jsx(RecordingsSection, {}),
      activeTab === "reports" && /* @__PURE__ */ jsx(ReportsSection, {})
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: !!confirmDelete, onOpenChange: (open) => {
      if (!open) setConfirmDelete(null);
    }, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-md bg-[#13151d] border-white/10 text-white", dir: "rtl", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30", children: /* @__PURE__ */ jsx(AlertTriangle, { className: "h-6 w-6" }) }),
        /* @__PURE__ */ jsx(DialogTitle, { className: "text-center text-lg font-bold text-white", children: "تأكيد حذف الاجتماع" }),
        /* @__PURE__ */ jsxs(DialogDescription, { className: "text-center text-xs text-white/70", children: [
          "أنت على وشك حذف الاجتماع ",
          /* @__PURE__ */ jsxs("strong", { children: [
            '"',
            confirmDelete?.title,
            '"'
          ] }),
          " بشكل نهائي."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3 py-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "الكود:" }),
          " ",
          /* @__PURE__ */ jsx("span", { className: "font-mono text-white font-bold", children: confirmDelete?.code })
        ] }),
        /* @__PURE__ */ jsx("label", { className: "block text-xs font-semibold text-white/80", children: "سبب الحذف (مطلوب)" }),
        /* @__PURE__ */ jsx("textarea", { value: deleteReason, onChange: (e) => setDeleteReason(e.target.value), placeholder: "مثال: تم بالخطأ، أو انتهت الحاجة للاجتماع...", className: "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-red-500 min-h-[80px] resize-none" })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { className: "flex gap-2 sm:justify-start", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setConfirmDelete(null), className: "flex-1 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/5", children: "إلغاء" }),
        /* @__PURE__ */ jsx("button", { onClick: doDelete, className: "flex-1 rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-white hover:bg-destructive/90 shadow-md shadow-destructive/30", children: "حذف نهائي" })
      ] })
    ] }) })
  ] });
}
function RecordingsSection() {
  const fetchList = useServerFn(listRecordings);
  const fetchUrl = useServerFn(getRecordingDownloadUrl);
  const removeRec = useServerFn(deleteRecording);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchList();
      setItems(r.recordings ?? []);
    } catch (e) {
      toast.error(e?.message ?? "تعذر تحميل التسجيلات");
    } finally {
      setLoading(false);
    }
  }, [fetchList]);
  useEffect(() => {
    reload();
  }, [reload]);
  async function download(id) {
    try {
      const {
        url
      } = await fetchUrl({
        data: {
          id
        }
      });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e?.message ?? "تعذر التنزيل");
    }
  }
  async function remove(id) {
    if (!confirm("حذف هذا التسجيل نهائياً؟")) return;
    try {
      await removeRec({
        data: {
          id
        }
      });
      toast.success("تم حذف التسجيل");
      reload();
    } catch (e) {
      toast.error(e?.message ?? "فشل الحذف");
    }
  }
  function fmtSize(b) {
    if (!b) return "—";
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  function fmtDur(s) {
    if (!s) return "—";
    const m = Math.floor(s / 60), ss = s % 60;
    return `${m}:${String(ss).padStart(2, "0")}`;
  }
  const statusLabel = (s) => ({
    completed: "مكتمل",
    active: "قيد التسجيل",
    starting: "يبدأ...",
    failed: "فشل",
    aborted: "ملغى"
  })[s] ?? s;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "قائمة التسجيلات المحفوظة لاجتماعاتك" }),
      /* @__PURE__ */ jsx("button", { onClick: reload, className: "rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10 transition", title: "تحديث", children: /* @__PURE__ */ jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }) })
    ] }),
    loading && items.length === 0 ? /* @__PURE__ */ jsx("div", { className: "glass-card rounded-2xl p-8 text-center text-xs text-muted-foreground", children: "جاري تحميل التسجيلات..." }) : items.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-2xl p-10 text-center", children: [
      /* @__PURE__ */ jsx(Circle, { className: "h-10 w-10 text-red-500/30 mx-auto mb-3" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white/70", children: "لا توجد تسجيلات بعد" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: 'ابدأ اجتماعاً واضغط على زر "تسجيل" ليُحفظ هنا تلقائياً.' })
    ] }) : items.map((r) => /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "font-bold flex items-center gap-2 text-sm text-white", children: [
          /* @__PURE__ */ jsx("span", { className: "font-mono bg-black/40 px-2 py-0.5 rounded text-white", children: r.meeting_code }),
          /* @__PURE__ */ jsxs("span", { className: `text-xs px-2 py-0.5 rounded-full font-semibold ${r.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`, children: [
            "● ",
            statusLabel(r.status)
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-1 text-xs text-muted-foreground", children: [
          new Date(r.created_at).toLocaleString("ar"),
          " · المدة: ",
          fmtDur(r.duration_seconds),
          " · الحجم: ",
          fmtSize(r.file_size_bytes)
        ] }),
        r.error_message && /* @__PURE__ */ jsxs("div", { className: "mt-1 text-xs text-destructive truncate", children: [
          "خطأ: ",
          r.error_message
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 shrink-0", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => download(r.id), disabled: r.status !== "completed", className: "rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition", title: "تنزيل الفيديو", children: /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsx("button", { onClick: () => remove(r.id), className: "rounded-xl border border-white/10 bg-white/5 p-2 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition", title: "حذف", children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
      ] })
    ] }, r.id))
  ] });
}
function ReportsSection() {
  const fetchList = useServerFn(listMeetingReports);
  const removeReport = useServerFn(deleteMeetingReport);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchList({
        data: {}
      });
      setItems(rows);
    } catch (e) {
      toast.error(e?.message ?? "تعذر تحميل التقارير");
    } finally {
      setLoading(false);
    }
  }, [fetchList]);
  useEffect(() => {
    reload();
  }, [reload]);
  async function remove(id) {
    if (!confirm("حذف هذا التقرير نهائياً؟")) return;
    try {
      await removeReport({
        data: {
          id
        }
      });
      toast.success("تم حذف التقرير");
      reload();
    } catch (e) {
      toast.error(e?.message ?? "فشل الحذف");
    }
  }
  function toExportable(r) {
    return {
      title: r.title,
      meetingCode: r.meeting_code,
      createdAt: r.created_at,
      participantsCount: r.participants_count,
      durationMinutes: r.duration_minutes,
      report: r.report
    };
  }
  function download(r) {
    const blob = new Blob([r.report], {
      type: "text/markdown;charset=utf-8"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `تقرير-${r.meeting_code}-${new Date(r.created_at).toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function asPdf(r) {
    const ok = downloadReportPdf(toExportable(r));
    if (!ok) toast.error("تعذر فتح نافذة الطباعة، اسمح بالنوافذ المنبثقة");
  }
  function asWord(r) {
    downloadReportWord(toExportable(r));
    toast.success("تم تنزيل ملف الوورد");
  }
  const groups = items.reduce((acc, r) => {
    (acc[r.meeting_code] ||= []).push(r);
    return acc;
  }, {});
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "تقارير التفاعل وتحليلات الحضور التي تم إنشاؤها بواسطة AI" }),
      /* @__PURE__ */ jsx("button", { onClick: reload, className: "rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10 transition", title: "تحديث", children: /* @__PURE__ */ jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }) })
    ] }),
    loading && items.length === 0 ? /* @__PURE__ */ jsx("div", { className: "glass-card rounded-2xl p-8 text-center text-xs text-muted-foreground", children: "جاري تحميل التقارير..." }) : items.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-2xl p-10 text-center", children: [
      /* @__PURE__ */ jsx(Sparkles, { className: "h-10 w-10 text-primary/30 mx-auto mb-3" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white/70", children: "لا توجد تقارير بعد" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: 'من داخل أي اجتماع، افتح قائمة "مساعد AI" واضغط على "تقرير عن المشاركين" ليُحفظ التقرير هنا تلقائياً.' })
    ] }) : Object.entries(groups).map(([code, list]) => /* @__PURE__ */ jsxs("div", { className: "glass-card rounded-2xl p-5 border border-white/10", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "font-bold text-sm text-white", children: list[0].title || code }),
          /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-muted-foreground", children: code })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "rounded-full bg-primary/20 border border-primary/30 px-2.5 py-0.5 text-xs text-primary font-bold", children: [
          list.length,
          " تقارير"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-2", children: list.map((r) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/10 bg-black/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/50 transition", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => setOpen(r), className: "text-right hover:text-primary transition group", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs font-bold text-white group-hover:text-primary", children: new Date(r.created_at).toLocaleString("ar") }),
          /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-muted-foreground mt-0.5", children: [
            r.participants_count,
            " مشارك · المدة: ",
            r.duration_minutes,
            " دقيقة"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [
          /* @__PURE__ */ jsxs("button", { onClick: () => setOpen(r), className: "rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-1", title: "عرض التقرير", children: [
            /* @__PURE__ */ jsx(FileText, { className: "h-3.5 w-3.5" }),
            /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "عرض" })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: () => asPdf(r), className: "rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white hover:bg-white/10 font-bold", title: "تصدير PDF", children: "PDF" }),
          /* @__PURE__ */ jsx("button", { onClick: () => asWord(r), className: "rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white hover:bg-white/10 font-bold", title: "تصدير Word", children: "Word" }),
          /* @__PURE__ */ jsx("button", { onClick: () => download(r), className: "rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10", title: "تنزيل Markdown", children: /* @__PURE__ */ jsx(Download, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("button", { onClick: () => remove(r.id), className: "rounded-lg border border-white/10 bg-white/5 p-2 text-red-400 hover:bg-red-500/10", title: "حذف", children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
        ] })
      ] }, r.id)) })
    ] }, code)),
    /* @__PURE__ */ jsx(Dialog, { open: !!open, onOpenChange: (o) => {
      if (!o) setOpen(null);
    }, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[85vh] max-w-3xl overflow-auto bg-[#13151d] border-white/10 text-white", dir: "rtl", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxs(DialogTitle, { className: "text-lg font-bold text-white flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "h-5 w-5 text-primary" }),
          open?.title || open?.meeting_code
        ] }),
        /* @__PURE__ */ jsx(DialogDescription, { className: "text-xs text-white/70", children: open && `${new Date(open.created_at).toLocaleString("ar")} · ${open.participants_count} مشارك · ${open.duration_minutes} دقيقة` })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "whitespace-pre-wrap text-xs sm:text-sm leading-7 text-white/90 p-4 rounded-2xl bg-black/40 border border-white/10 my-3", children: open?.report }),
      /* @__PURE__ */ jsx(DialogFooter, { children: open && /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 w-full justify-end", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => asPdf(open), className: "flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 shadow-md shadow-primary/30", children: [
          /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }),
          " تنزيل PDF"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => asWord(open), className: "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10", children: [
          /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4" }),
          " Word"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => download(open), className: "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10", children: [
          /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }),
          " Markdown"
        ] })
      ] }) })
    ] }) })
  ] });
}
export {
  Dashboard as component
};
