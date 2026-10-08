import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Lobby, type Knocker } from "@/lib/webrtc";
import { getLivekitToken } from "@/lib/livekit.functions";
import { livekitHostAction } from "@/lib/livekit-admin.functions";
import { startRecording, stopRecording, getActiveRecording } from "@/lib/recording.functions";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Video, VideoOff, Mic, Copy, Lock, Unlock, BarChart3, Check, X, Crown, ShieldAlert, Users, UserX, MicOff, Circle, Square, Pencil, UserPlus, Hand, SwitchCamera, Settings2, Sparkles, Loader2, Download, MessageSquare, Network, Clock } from "lucide-react";
import { VideoPresets, AudioPresets, Track } from "livekit-client";
import { toast } from "sonner";
import Whiteboard from "@/components/Whiteboard";
import InviteModal from "@/components/InviteModal";
import ChatPanel from "@/components/ChatPanel";
import BreakoutPanel from "@/components/BreakoutPanel";
import ReactionsBar from "@/components/ReactionsBar";
import { generateMeetingReport, listMeetingReports, deleteMeetingReport } from "@/lib/ai-report.functions";
import { getMeetingInfo } from "@/lib/meeting-access.functions";
import { meetingUrl } from "@/lib/meeting-url";
import { generateUUID } from "@/lib/uuid";
import PreJoinMedia from "@/components/PreJoinMedia";
import MeetingControlBar from "@/components/MeetingControlBar";

export const Route = createFileRoute("/meeting/$code")({
  head: ({ params }) => ({ meta: [{ title: `اجتماع ${params.code} — FortMeet` }] }),
  component: MeetingPage,
});

type Poll = {
  id: string;
  meeting_code: string;
  host_id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  is_active: boolean;
};
type MeetingRow = {
  title: string;
  host_id: string;
  password: string | null;
  locked: boolean;
  waiting_room: boolean;
};

function MeetingPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const fetchToken = useServerFn(getLivekitToken);
  const meetingInfo = useServerFn(getMeetingInfo);
  const startRec = useServerFn(startRecording);
  const stopRec = useServerFn(stopRecording);
  const fetchActiveRec = useServerFn(getActiveRecording);
  const [recording, setRecording] = useState(false);
  const [recBusy, setRecBusy] = useState(false);

  const [name, setName] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [joined, setJoined] = useState(false);
  const [live, setLive] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const joinedRef = useRef(false);
  const [waiting, setWaiting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [meta, setMeta] = useState<MeetingRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isHost = !!(currentUserId && meta && currentUserId === meta.host_id);

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [knockers, setKnockers] = useState<Knocker[]>([]);
  const [panel, setPanel] = useState<"polls" | "lobby" | "people" | "whiteboard" | "ai" | "chat" | "breakout" | null>(null);
  const [group, setGroup] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [initialCam, setInitialCam] = useState(true);
  const [initialMic, setInitialMic] = useState(true);
  const selfIdRef = useRef<string>(generateUUID());

  const lobbyHostRef = useRef<Lobby | null>(null);
  const lobbyKnockerRef = useRef<Lobby | null>(null);

  useEffect(() => {
    let stop = false;
    async function refresh() {
      try {
        const info = await meetingInfo({ data: { code } });
        if (stop) return;
        if (!info.found) { setNotFound(true); return; }
        setNotFound(false);
        setMeta({
          title: info.title,
          host_id: info.hostId,
          password: info.hasPassword ? "•" : null,
          locked: info.locked,
          waiting_room: info.waitingRoom,
        });
        setLocked(info.locked);
        setLive(info.live);
      } catch (err) {
        console.warn("meetingInfo server function error, falling back to direct query:", err);
        try {
          const { data: m, error } = await supabase
            .from("meetings")
            .select("title,host_id,password,locked,waiting_room")
            .eq("code", code)
            .maybeSingle();
          if (stop) return;
          if (error || !m) {
            setNotFound(true);
            return;
          }
          setNotFound(false);
          setMeta({
            title: m.title,
            host_id: m.host_id,
            password: m.password ? "•" : null,
            locked: !!m.locked,
            waiting_room: !!m.waiting_room,
          });
          setLocked(!!m.locked);
        } catch { /* ignore fallback errors */ }
      }
    }
    refresh();
    const t = setInterval(() => { if (!joinedRef.current) refresh(); }, 8000);
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
      const m = data.user?.user_metadata as any;
      if (m?.display_name) setName(m.display_name);
      else if (data.user?.email) setName(data.user.email.split("@")[0]);
    });
    return () => { stop = true; clearInterval(t); };
  }, [code, meetingInfo]);

  const loadPolls = useCallback(async () => {
    const { data } = await supabase.from("polls").select("*").eq("meeting_code", code).order("created_at", { ascending: false });
    setPolls((data as any) ?? []);
  }, [code]);

  useEffect(() => {
    const ch = supabase
      .channel(`meeting-meta:${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "meetings", filter: `code=eq.${code}` },
        (p) => setLocked((p.new as any).locked))
      .on("postgres_changes", { event: "*", schema: "public", table: "polls", filter: `meeting_code=eq.${code}` },
        () => loadPolls())
      .subscribe();
    loadPolls();
    return () => { supabase.removeChannel(ch); };
  }, [code, loadPolls]);

  async function handleJoin() {
    if (!meta) {
      if (notFound) return toast.error("الاجتماع غير موجود");
      return toast.error("جاري تحميل بيانات الاجتماع من الخادم، يرجى المحاولة بعد قليل...");
    }
    if (!name.trim()) return toast.error("أدخل اسمك");
    if (locked && !isHost) return toast.error("الاجتماع مقفل");
    if (!isHost && !live) return toast.error("لم يبدأ المضيف الاجتماع بعد");

    if (meta.waiting_room && !isHost) {
      const lobby = new Lobby(code, name.trim());
      lobbyKnockerRef.current = lobby;
      setWaiting(true);
      await lobby.knock(async (admitted) => {
        if (admitted) {
          await lobby.close();
          lobbyKnockerRef.current = null;
          setWaiting(false);
          await actuallyJoin();
        } else { setWaiting(false); setDenied(true); }
      });
      return;
    }
    await actuallyJoin();
  }

  async function actuallyJoin() {
    try {
      // رابط دعوة لغرفة معينة: ?room=N يدخل المدعو مباشرة إلى تلك الغرفة
      const roomParam = Number(new URLSearchParams(window.location.search).get("room"));
      const invitedGroup = Number.isInteger(roomParam) && roomParam > 0 && roomParam <= 20 ? roomParam : null;
      const res = await fetchToken({
        data: { room: code, name: name.trim(), isHost, password: pwInput || undefined, ...(invitedGroup ? { group: invitedGroup } : {}) },
      });
      setToken(res.token);
      setServerUrl(res.url);
      if (invitedGroup) setGroup(invitedGroup);
      setJoined(true);
      joinedRef.current = true;
      if (isHost && meta?.waiting_room) {
        const lobby = new Lobby(code, "host");
        lobbyHostRef.current = lobby;
        await lobby.watch(setKnockers);
      }
      if (isHost) {
        try {
          const a = await fetchActiveRec({ data: { code } });
          if (a.active) setRecording(true);
        } catch {}
      }
    } catch (e: any) {
      toast.error("تعذر الانضمام: " + (e?.message ?? e));
    }
  }

  /** ينقل المستخدم بين الاجتماع الرئيسي ومجموعة فرعية. */
  const switchGroup = useCallback(async (g: number | null) => {
    try {
      const res = await fetchToken({
        data: { room: code, name: (name || "ضيف").trim(), isHost, password: pwInput || undefined, ...(g ? { group: g } : {}) },
      });
      setToken(res.token);
      setServerUrl(res.url);
      setGroup(g);
      toast.success(g ? `انتقلت إلى المجموعة ${g}` : "عدت إلى الاجتماع الرئيسي");
    } catch (e: any) {
      toast.error("تعذر الانتقال: " + (e?.message ?? e));
    }
  }, [code, name, isHost, pwInput, fetchToken]);

  // استقبال أوامر المجموعات الفرعية من المضيف
  useEffect(() => {
    if (!joined) return;
    const myName = (name || "ضيف").trim();
    const ch = supabase.channel(`breakout:${code}`);
    ch.on("broadcast", { event: "assign" }, ({ payload }) => {
      const g = (payload?.assignments ?? {})[myName];
      if (typeof g === "number" && g !== (group ?? 0)) switchGroup(g > 0 ? g : null);
    });
    ch.on("broadcast", { event: "close" }, () => { if (group !== null) switchGroup(null); });
    ch.on("broadcast", { event: "announce" }, ({ payload }) => {
      if (payload?.text) toast.info(`إعلان المضيف: ${payload.text}`);
    });
    ch.subscribe();
    return () => { ch.unsubscribe(); supabase.removeChannel(ch); };
  }, [joined, code, name, group, switchGroup]);

  async function toggleRecording() {
    if (!isHost || recBusy) return;
    setRecBusy(true);
    try {
      if (recording) {
        await stopRec({ data: { code } });
        setRecording(false);
        toast.success("تم إيقاف التسجيل — سيظهر في لوحة التحكم");
      } else {
        await startRec({ data: { code } });
        setRecording(true);
        toast.success("بدأ التسجيل");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر تنفيذ العملية");
    } finally {
      setRecBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      lobbyHostRef.current?.close();
      lobbyKnockerRef.current?.close();
    };
  }, []);

  function leave() {
    lobbyHostRef.current?.close();
    navigate({ to: "/" });
  }

  function copyLink() {
    navigator.clipboard.writeText(meetingUrl(code));
    toast.success("تم نسخ الرابط");
  }

  async function toggleLock() {
    if (!isHost) return;
    const next = !locked;
    const { error } = await supabase.from("meetings").update({ locked: next }).eq("code", code);
    if (error) toast.error(error.message);
    else toast.success(next ? "تم قفل الاجتماع" : "تم فتح الاجتماع");
  }

  function admit(id: string) { lobbyHostRef.current?.admit(id); }
  function deny(id: string) { lobbyHostRef.current?.deny(id); }

  const [newQ, setNewQ] = useState("");
  const [newOpts, setNewOpts] = useState(["", ""]);
  async function createPoll() {
    if (!isHost || !currentUserId) return;
    const q = newQ.trim();
    const opts = newOpts.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return toast.error("أدخل سؤالاً وخيارين على الأقل");
    const { error } = await supabase.from("polls").insert({
      meeting_code: code, host_id: currentUserId, question: q, options: opts as any,
    });
    if (error) return toast.error(error.message);
    setNewQ(""); setNewOpts(["", ""]);
    toast.success("تم نشر الاستطلاع");
  }
  async function vote(poll: Poll, idx: number) {
    const next = { ...poll.votes, [idx]: (poll.votes[idx] ?? 0) + 1 };
    const { error } = await supabase.from("polls").update({ votes: next as any }).eq("id", poll.id);
    if (error) toast.error(error.message);
  }
  async function closePoll(id: string) {
    await supabase.from("polls").update({ is_active: false }).eq("id", id);
  }

  /* ============== PRE-JOIN STATES ============== */
  if (notFound && !joined) {
    return (
      <div className="min-h-screen grid place-items-center px-4" dir="rtl">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e1017]/90 p-8 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">الاجتماع غير موجود</h1>
          <p className="mt-2 text-sm text-white/60">تأكد من صحة الرابط أو كود الاجتماع المدخل وحاول مجدداً.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20 hover:border-white/25 transition-all"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }
  if (denied) {
    return (
      <div className="min-h-screen grid place-items-center px-4" dir="rtl">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e1017]/90 p-8 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">تم رفض طلب الانضمام</h1>
          <p className="mt-2 text-sm text-white/60">اعتذر المضيف عن قبول انضمامك إلى هذا الاجتماع حالياً.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20 hover:border-white/25 transition-all"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }
  if (waiting) {
    return (
      <div className="min-h-screen grid place-items-center px-4" dir="rtl">
        <div className="w-full max-w-md rounded-3xl border border-primary/20 bg-[#0e1017]/90 p-8 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_30px_rgba(99,102,241,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl">
          <div className="relative mx-auto mb-6 h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 border border-primary/40 text-primary">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">أنت في غرفة الانتظار...</h1>
          <p className="mt-2 text-sm text-white/60">تم إرسال إشعار للمضيف، وسيتم إدخالك تلقائياً بمجرد الموافقة على طلبك.</p>
          <div className="mt-6 flex justify-center">
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
              <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              جارٍ الاتصال بالمضيف
            </span>
          </div>
        </div>
      </div>
    );
  }
  if (!joined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8" dir="rtl">
        <div className="w-full max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2.5 font-display text-xl font-black text-white hover:opacity-90 transition">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg shadow-primary/30 border border-white/20">
                <Video className="h-5 w-5" />
              </div>
              <span className="tracking-tight">Fort<span className="text-primary">Meet</span></span>
            </Link>

            <div className="flex items-center gap-2 text-xs text-white/60 bg-white/[0.04] border border-white/10 px-3.5 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> اتصال مشفّر وآمن
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* معاينة الفيديو والصوت وفحص الأذونات */}
            <div className="w-full md:col-span-7">
              <PreJoinMedia
                initialCam={initialCam}
                setInitialCam={setInitialCam}
                initialMic={initialMic}
                setInitialMic={setInitialMic}
              />
            </div>

            {/* بطاقة معلومات الاجتماع وزر الدخول */}
            <div className="md:col-span-5 rounded-3xl border border-white/10 bg-[#0e1017]/90 p-6 md:p-8 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-white">جاهز للانضمام؟</h1>
                    <p className="mt-1 text-xs text-white/60">
                      اضبط إعداداتك واسمك قبل بدء الاجتماع
                    </p>
                  </div>
                  {isHost && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                      <Crown className="h-3.5 w-3.5" /> مضيف
                    </span>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 space-y-1">
                  <div className="text-xs text-white/50">عنوان الاجتماع</div>
                  <div className="text-sm font-semibold text-white truncate">{meta?.title ?? "اجتماع مباشر"}</div>
                  <div className="font-mono text-xs text-primary font-bold tracking-wider">{code}</div>
                </div>

                {!isHost && !live && !locked && (
                  <div className="mt-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
                    <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>الاجتماع لم يبدأ بعد — انتظر حتى يفتحه المضيف، وسيُفعَّل زر الانضمام تلقائياً.</span>
                  </div>
                )}
                {locked && !isHost && (
                  <div className="mt-3.5 rounded-2xl border border-destructive/50 bg-destructive/10 p-3 text-xs text-red-200 flex items-start gap-2">
                    <Lock className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                    <span>هذا الاجتماع مقفل حالياً بواسطة المضيف.</span>
                  </div>
                )}

                <div className="mt-5 space-y-3.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white/80">اسمك في الاجتماع</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اكتب اسمك الظاهر..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {meta?.password && !isHost && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-white/80">كلمة مرور الاجتماع</label>
                      <input
                        type="password"
                        value={pwInput}
                        onChange={(e) => setPwInput(e.target.value)}
                        placeholder="أدخل كلمة المرور المطلوبة"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  )}

                  {meta?.waiting_room && !isHost && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-[11px] text-white/60 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-accent" />
                      <span>غرفة الانتظار مفعّلة — سيتطلب الدخول موافقة المضيف</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleJoin}
                  disabled={(locked || !live) && !isHost}
                  className="w-full rounded-2xl bg-gradient-to-r from-primary via-indigo-600 to-primary bg-size-200 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:hover:brightness-100 transition-all"
                >
                  انضم للاجتماع الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============== IN-MEETING: LIVEKIT ROOM ============== */
  if (!token || !serverUrl) return null;

  return (
    <div className="flex h-screen flex-col bg-[#0b0c10] text-white" dir="ltr" data-lk-theme="default">
      {/* الشريط العلوي لغرفة الاجتماع */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-xs sm:text-sm bg-[#0e1017]/90 backdrop-blur-xl z-20" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white shadow-md shadow-primary/30">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-2 text-white">
              <span>{meta?.title ?? "اجتماع"}</span>
              {locked && <span title="الاجتماع مقفل"><Lock className="h-3.5 w-3.5 text-amber-400" /></span>}
              {recording && (
                <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" /> REC
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">{code}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
          {isHost && (
            <button
              onClick={toggleRecording}
              disabled={recBusy}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 transition-all ${
                recording
                  ? "border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {recording ? <><Square className="h-3.5 w-3.5" /> إيقاف التسجيل</> : <><Circle className="h-3.5 w-3.5 text-red-400" /> تسجيل</>}
            </button>
          )}

          {isHost && (
            <button
              onClick={toggleLock}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                locked
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {locked ? <><Unlock className="h-3.5 w-3.5" /> فتح</> : <><Lock className="h-3.5 w-3.5" /> قفل</>}
            </button>
          )}

          <button
            onClick={() => setPanel(panel === "people" ? null : "people")}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              panel === "people" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> المشاركون
          </button>

          <button
            onClick={() => setPanel(panel === "whiteboard" ? null : "whiteboard")}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              panel === "whiteboard" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" /> سبورة
          </button>

          <button
            onClick={() => setPanel(panel === "polls" ? null : "polls")}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              panel === "polls" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> استطلاعات
          </button>

          <button
            onClick={() => setPanel(panel === "chat" ? null : "chat")}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              panel === "chat" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> الدردشة
          </button>

          {isHost && (
            <button
              onClick={() => setPanel(panel === "breakout" ? null : "breakout")}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                panel === "breakout" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Network className="h-3.5 w-3.5" /> المجموعات
            </button>
          )}

          {isHost && (
            <button
              onClick={() => setPanel(panel === "ai" ? null : "ai")}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                panel === "ai" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" /> مساعد AI
            </button>
          )}

          {isHost && meta?.waiting_room && (
            <button
              onClick={() => setPanel(panel === "lobby" ? null : "lobby")}
              className={`relative flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                panel === "lobby" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              الانتظار
              {knockers.length > 0 && (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {knockers.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all"
          >
            <UserPlus className="h-3.5 w-3.5" /> دعوة
          </button>

          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition"
            title="نسخ رابط الاجتماع"
          >
            <Copy className="h-3.5 w-3.5" /> نسخ الرابط
          </button>
        </div>
      </div>

      <LiveKitRoom
        key={token}
        token={token}
        serverUrl={serverUrl}
        connect
        video={initialCam}
        audio={initialMic}
        onError={(err) => {
          console.error("LiveKit Room Error:", err);
          toast.error("خطأ في الاتصال بالصوت/الفيديو: " + (err?.message ?? err));
        }}
        onMediaDeviceFailure={(failure, kind) => {
          console.warn("Media device failure:", failure, kind);
          toast.error(
            kind === "videoinput"
              ? "تعذر تشغيل الكاميرا: قد تكون مستخدمة بواسطة تطبيق آخر أو لم يتم منح الإذن بالمتصفح."
              : "تعذر تشغيل الميكروفون: تأكد من إعطاء الإذن للمتصفح وتوصيل الجهاز."
          );
        }}
        onDisconnected={leave}
        data-lk-theme="default"
        style={{ flex: 1, minHeight: 0, display: "flex" }}
        options={{
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h1080.resolution,
          },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          publishDefaults: {
            videoCodec: "vp8",
            videoEncoding: VideoPresets.h1080.encoding,
            videoSimulcastLayers: [
              VideoPresets.h1080,
              VideoPresets.h720,
              VideoPresets.h360,
            ],
            audioPreset: AudioPresets.musicHighQualityStereo,
            simulcast: true,
            dtx: false,
            red: true,
          },
        }}
      >
        <div className="flex flex-1 overflow-hidden h-full w-full">
          <div className={`relative flex flex-col ${panel === "whiteboard" ? "w-full md:w-52 md:shrink-0" : "flex-1 min-w-0"}`}>
            <MeetingStage compact={panel === "whiteboard"} onLeave={leave} />
            <RoomAudioRenderer />
            <ReactionsBar code={code} selfId={selfIdRef.current} selfName={name || "ضيف"} onHandsChange={setRaisedHands} />
          </div>

          {panel === "whiteboard" && (
            <aside className="hidden flex-1 min-w-0 flex-col border-r border-white/10 bg-[#15171c] md:flex" dir="rtl">
              <Whiteboard code={group ? `${code}-g${group}` : code} />
            </aside>
          )}
          {panel && panel !== "whiteboard" && (
            <aside className={`hidden flex-col border-r border-white/10 bg-[#15171c] md:flex ${panel === "ai" ? "w-96" : "w-80"}`} dir="rtl">
              {panel === "people" && <PeoplePanel room={code} isHost={isHost} raisedHands={raisedHands} />}
              {panel === "ai" && isHost && <AIPanel room={code} title={meta?.title ?? "اجتماع"} raisedHands={raisedHands} />}
              {panel === "chat" && (
                <ChatPanel
                  code={group ? `${code}-g${group}` : code}
                  roomLabel={group ? `مجموعة ${group}` : "الاجتماع الرئيسي"}
                  selfId={selfIdRef.current}
                  selfName={name || "ضيف"}
                  isHost={isHost}
                />
              )}
              {panel === "breakout" && isHost && <BreakoutPanel code={code} selfGroup={group} onJoinGroup={switchGroup} />}
              {panel === "polls" && (
                <PollsPanel
                  isHost={isHost} polls={polls}
                  newQ={newQ} setNewQ={setNewQ} newOpts={newOpts} setNewOpts={setNewOpts}
                  createPoll={createPoll} vote={vote} closePoll={closePoll}
                />
              )}
              {panel === "lobby" && isHost && (
                <div className="flex-1 overflow-auto p-3 space-y-2">
                  <div className="text-xs text-white/60 mb-2">في الانتظار ({knockers.length})</div>
                  {knockers.length === 0 && <p className="text-center text-xs text-white/40">لا أحد ينتظر</p>}
                  {knockers.map((k) => (
                    <div key={k.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                      <span>{k.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => admit(k.id)} className="rounded-md bg-primary/80 p-1.5 hover:bg-primary"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deny(k.id)} className="rounded-md bg-destructive/80 p-1.5 hover:bg-destructive"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      </LiveKitRoom>
      {inviteOpen && <InviteModal code={code} title={meta?.title ?? "اجتماع"} onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

function PeoplePanel({ room, isHost, raisedHands = [] }: { room: string; isHost: boolean; raisedHands?: string[] }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const hostAction = useServerFn(livekitHostAction);

  async function doAction(identity: string, action: "kick" | "mute_audio" | "mute_video") {
    if (action === "kick" && !confirm("طرد هذا المشارك؟")) return;
    try {
      await hostAction({ data: { room, identity, action } });
      toast.success(
        action === "kick" ? "تم الطرد" : action === "mute_video" ? "تم إيقاف الفيديو" : "تم كتم الصوت",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر التنفيذ");
    }
  }

  async function toggleSelfMic() {
    try {
      await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    } catch (e: any) { toast.error(e?.message ?? "تعذر تغيير المايك"); }
  }
  async function toggleSelfCam() {
    try {
      await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
    } catch (e: any) { toast.error(e?.message ?? "تعذر تغيير الكاميرا"); }
  }

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentCamId, setCurrentCamId] = useState<string | null>(null);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");

  useEffect(() => {
    async function loadDevices() {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(list.filter((d) => d.kind === "videoinput"));
      } catch {}
    }
    loadDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", loadDevices);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", loadDevices);
  }, []);

  useEffect(() => {
    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    const id = (pub?.track as any)?.mediaStreamTrack?.getSettings?.()?.deviceId ?? null;
    setCurrentCamId(id);
  }, [localParticipant, videoDevices.length]);

  async function switchCamera() {
    if (videoDevices.length === 0) return toast.error("لا توجد كاميرات");
    const idx = videoDevices.findIndex((d) => d.deviceId === currentCamId);
    const next = videoDevices[(idx + 1) % videoDevices.length];
    try {
      const pub = localParticipant.getTrackPublication(Track.Source.Camera);
      const track = pub?.track as any;
      if (track?.restartTrack) {
        await track.restartTrack({ deviceId: { exact: next.deviceId } });
      } else {
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setCameraEnabled(true, { deviceId: next.deviceId });
      }
      setCurrentCamId(next.deviceId);
      toast.success(`الكاميرا: ${next.label || "تم التبديل"}`);
    } catch (e: any) { toast.error(e?.message ?? "تعذر التبديل"); }
  }


  async function changeQuality(q: "low" | "medium" | "high") {
    setQuality(q);
    const resolution =
      q === "low" ? VideoPresets.h360.resolution :
      q === "medium" ? VideoPresets.h720.resolution :
      VideoPresets.h1080.resolution;
    try {
      if (localParticipant.isCameraEnabled) {
        await localParticipant.setCameraEnabled(false);
      }
      await localParticipant.setCameraEnabled(true, { resolution });
      toast.success(`الجودة: ${q === "low" ? "منخفضة (360p)" : q === "medium" ? "متوسطة (720p HD)" : "أعلى دقة (1080p Full HD)"}`);
    } catch (e: any) { toast.error(e?.message ?? "تعذر تغيير الجودة"); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#0e1017] text-white">
      {raisedHands.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 shadow-sm">
          <div className="flex items-center gap-1.5 font-bold">
            <Hand className="h-4 w-4 text-amber-400 animate-bounce" /> أيدٍ مرفوعة ({raisedHands.length})
          </div>
          <div className="mt-1 text-amber-100/90 font-medium">{raisedHands.join("، ")}</div>
        </div>
      )}

      {/* Camera & Video Quality Settings */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-white/80">
            <Settings2 className="h-3.5 w-3.5 text-primary" /> إعدادات الكاميرا
          </span>
          <button
            onClick={switchCamera}
            disabled={videoDevices.length < 2}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 transition"
          >
            <SwitchCamera className="h-3.5 w-3.5" /> تبديل
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-white/50 text-[11px]">الجودة:</span>
          {(["low", "medium", "high"] as const).map((q) => (
            <button
              key={q}
              onClick={() => changeQuality(q)}
              className={`flex-1 rounded-xl border py-1 font-medium transition ${
                quality === q
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {q === "low" ? "منخفضة" : q === "medium" ? "متوسطة" : "عالية"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-white/60 font-semibold">
        <span>المشاركون</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono text-white/80">
          {participants.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {participants.map((p) => {
          const isMe = p.identity === localParticipant.identity;
          const meta = (() => { try { return JSON.parse(p.metadata ?? "{}"); } catch { return {}; } })();
          const micOn = p.isMicrophoneEnabled;
          const camOn = p.isCameraEnabled;
          return (
            <div
              key={p.identity}
              className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-xs sm:text-sm hover:border-white/15 transition-all"
            >
              <span className="flex items-center gap-2 truncate min-w-0">
                {meta.isHost ? (
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                    <Crown className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/5 text-white/50 shrink-0 font-bold text-[10px]">
                    {(p.name || p.identity || "U").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate font-medium">{p.name || p.identity}</span>
                {isMe && <span className="text-[11px] text-white/40 shrink-0 font-normal">(أنت)</span>}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {isMe ? (
                  <>
                    <button
                      onClick={toggleSelfMic}
                      title={micOn ? "كتم المايك" : "تشغيل المايك"}
                      className={`grid h-7 w-7 place-items-center rounded-lg border transition ${
                        micOn
                          ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                          : "border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      }`}
                    >
                      {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={toggleSelfCam}
                      title={camOn ? "إيقاف الفيديو" : "تشغيل الفيديو"}
                      className={`grid h-7 w-7 place-items-center rounded-lg border transition ${
                        camOn
                          ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                          : "border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      }`}
                    >
                      {camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-md ${
                        micOn ? "text-emerald-400" : "text-red-400/80"
                      }`}
                      title={micOn ? "المايك مفتوح" : "مكتوم"}
                    >
                      {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    </span>
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-md ${
                        camOn ? "text-emerald-400" : "text-red-400/80"
                      }`}
                      title={camOn ? "الكاميرا مفتوحة" : "متوقفة"}
                    >
                      {camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                    </span>
                    {isHost && (
                      <div className="flex items-center gap-0.5 mr-1 border-r border-white/10 pr-1">
                        <button
                          onClick={() => doAction(p.identity, "mute_audio")}
                          disabled={!micOn}
                          title="كتم المايك"
                          className="grid h-6 w-6 place-items-center rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-20"
                        >
                          <MicOff className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => doAction(p.identity, "mute_video")}
                          disabled={!camOn}
                          title="إيقاف الفيديو"
                          className="grid h-6 w-6 place-items-center rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-20"
                        >
                          <VideoOff className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => doAction(p.identity, "kick")}
                          title="طرد المشارك"
                          className="grid h-6 w-6 place-items-center rounded hover:bg-red-500/20 text-red-400 hover:text-red-300"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PollsPanel({
  isHost,
  polls,
  newQ,
  setNewQ,
  newOpts,
  setNewOpts,
  createPoll,
  vote,
  closePoll,
}: {
  isHost: boolean;
  polls: Poll[];
  newQ: string;
  setNewQ: (v: string) => void;
  newOpts: string[];
  setNewOpts: (v: string[]) => void;
  createPoll: () => void;
  vote: (p: Poll, i: number) => void;
  closePoll: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#0e1017] text-white" dir="rtl">
      {isHost && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white/80">
            <BarChart3 className="h-3.5 w-3.5 text-primary" /> إنشاء استطلاع رأي جديد
          </div>
          <input
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder="اكتب سؤال الاستطلاع..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs sm:text-sm text-white placeholder-white/40 outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20"
          />
          <div className="space-y-1.5">
            {newOpts.map((o, i) => (
              <input
                key={i}
                value={o}
                onChange={(e) => {
                  const n = [...newOpts];
                  n[i] = e.target.value;
                  setNewOpts(n);
                }}
                placeholder={`الخيار ${i + 1}`}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-primary/80"
              />
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setNewOpts([...newOpts, ""])}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              + إضافة خيار
            </button>
            <button
              onClick={createPoll}
              disabled={!newQ.trim()}
              className="flex-1 rounded-xl bg-primary py-1.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:bg-primary/90 disabled:opacity-40 transition"
            >
              نشر الاستطلاع
            </button>
          </div>
        </div>
      )}

      {polls.length === 0 && (
        <div className="pt-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.03] border border-white/10 text-white/30">
            <BarChart3 className="h-5 w-5" />
          </div>
          <p className="mt-3 text-xs text-white/40">لا توجد استطلاعات رأي بعد</p>
        </div>
      )}

      {polls.map((p) => {
        const total = Object.values(p.votes).reduce((a, b) => a + b, 0) || 1;
        return (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold text-xs sm:text-sm text-white leading-snug">{p.question}</div>
              {isHost && p.is_active && (
                <button
                  onClick={() => closePoll(p.id)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                  إغلاق
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {p.options.map((opt, i) => {
                const c = p.votes[i] ?? 0;
                const pct = Math.round((c / total) * 100);
                return (
                  <button
                    key={i}
                    onClick={() => p.is_active && vote(p, i)}
                    disabled={!p.is_active}
                    className="group block w-full text-right"
                  >
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs transition group-hover:border-white/20">
                      <div
                        className="absolute inset-y-0 right-0 bg-gradient-to-l from-primary/30 to-indigo-600/30 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex items-center justify-between font-medium">
                        <span className="text-white/90">{opt}</span>
                        <span className="font-mono text-[11px] text-white/60">
                          {c} ({pct}%)
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!p.is_active && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                استطلاع منتهٍ
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===================== AI Assistant Panel ===================== */

function AIPanel({ room, title, raisedHands = [] }: { room: string; title: string; raisedHands?: string[] }) {
  const participants = useParticipants();
  const genReport = useServerFn(generateMeetingReport);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const startedAt = useRef(Date.now());

  // تتبع زمن التحدث لكل مشارك لحساب نسبة المشاركة
  const speakRef = useRef<Record<string, number>>({});
  // تتبع أوقات الدخول والخروج لكل مشارك
  const presenceRef = useRef<Record<string, { joinedAt: number; lastSeen: number; present: boolean; isHost: boolean }>>({});
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const live = new Set<string>();
      for (const p of participants as any[]) {
        const key = p.name || p.identity;
        if (!key) continue;
        live.add(key);
        speakRef.current[key] = (speakRef.current[key] ?? 0) + (p.isSpeaking ? 1 : 0);
        const isHost = (() => { try { return !!JSON.parse(p.metadata || "{}").isHost; } catch { return false; } })();
        const joined = p.joinedAt ? new Date(p.joinedAt).getTime() : now;
        const rec = presenceRef.current[key];
        if (!rec) presenceRef.current[key] = { joinedAt: joined, lastSeen: now, present: true, isHost };
        else { rec.lastSeen = now; rec.present = true; rec.isHost = isHost; }
      }
      for (const [key, rec] of Object.entries(presenceRef.current)) {
        if (!live.has(key)) rec.present = false;
      }
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [participants]);

  function stats() {
    const total = Object.values(speakRef.current).reduce((a, b) => a + b, 0);
    return (participants as any[]).map((p) => {
      const key = p.name || p.identity;
      const secs = speakRef.current[key] ?? 0;
      return {
        key,
        speakingSeconds: secs,
        participationPercent: total > 0 ? Math.round((secs / total) * 100) : 0,
      };
    });
  }

  const [live, setLive] = useState(false);
  const [intervalSec, setIntervalSec] = useState(60);
  const [lastAt, setLastAt] = useState<Date | null>(null);
  const runningRef = useRef(false);
  const runRef = useRef<() => Promise<void>>(async () => {});
  const fetchSaved = useServerFn(listMeetingReports);
  const removeSaved = useServerFn(deleteMeetingReport);
  const [saved, setSaved] = useState<Array<{ id: string; title: string; created_at: string; participants_count: number; duration_minutes: number; report: string }>>([]);

  const refreshSaved = useCallback(async () => {
    try {
      const rows = await fetchSaved({ data: { meetingCode: room } });
      setSaved(rows as any);
    } catch { /* تجاهل */ }
  }, [fetchSaved, room]);

  useEffect(() => { void refreshSaved(); }, [refreshSaved]);

  async function run(save = false) {
    if (runningRef.current) return;
    runningRef.current = true;
    setLoading(true);
    try {
      const s = stats();
      const now = Date.now();
      const byName = new Map<string, any>();
      for (const p of participants as any[]) byName.set(p.name || p.identity, p);
      const totalSpeak = Object.values(speakRef.current).reduce((a, b) => a + b, 0);

      const payload = Object.entries(presenceRef.current).map(([name, rec]) => {
        const p = byName.get(name);
        const secs = speakRef.current[name] ?? 0;
        const endMs = rec.present ? now : rec.lastSeen;
        return {
          name,
          isHost: rec.isHost,
          audioOn: !!p?.isMicrophoneEnabled,
          videoOn: !!p?.isCameraEnabled,
          screenSharing: !!p?.isScreenShareEnabled,
          handRaised: raisedHands.includes(name),
          joinedMinutesAgo: Math.max(0, Math.round((now - rec.joinedAt) / 60000)),
          connectionQuality: String(p?.connectionQuality ?? (rec.present ? "unknown" : "disconnected")),
          speakingSeconds: secs,
          speakingMinutes: Math.round((secs / 60) * 10) / 10,
          participationPercent: totalSpeak > 0 ? Math.round((secs / totalSpeak) * 100) : 0,
          joinedAt: new Date(rec.joinedAt).toISOString(),
          leftAt: rec.present ? undefined : new Date(rec.lastSeen).toISOString(),
          stillPresent: rec.present,
          presentMinutes: Math.max(0, Math.round((endMs - rec.joinedAt) / 60000)),
        };
      });
      void s;
      const res = await genReport({
        data: {
          room,
          title,
          durationMinutes: Math.round((Date.now() - startedAt.current) / 60000),
          participants: payload,
          notes: notes.trim() || undefined,
          save,
        },
      });
      setReport(res.report);
      setLastAt(new Date());
      if (save) {
        if (res.saved) toast.success("تم حفظ التقرير في سجل تقارير الاجتماع");
        void refreshSaved();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر توليد التقرير");
      setLive(false);
    } finally {
      runningRef.current = false;
      setLoading(false);
    }
  }
  runRef.current = run;

  // تحديث لحظي للتقرير أثناء الاجتماع
  useEffect(() => {
    if (!live) return;
    void runRef.current();
    const iv = setInterval(() => { void runRef.current(); }, intervalSec * 1000);
    return () => clearInterval(iv);
  }, [live, intervalSec]);

  function download() {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `تقرير-${room}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }


  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" /> مساعد الذكاء الاصطناعي
      </div>
      <div className="space-y-2 border-b border-white/10 p-3">
        <div className="text-xs text-white/60">المشاركون الحاليون: {participants.length}</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="ملاحظات إضافية للتقرير (اختياري)"
          className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs outline-none focus:border-primary/60"
        />
        <div className="flex gap-2">
          <button
            onClick={() => void run(true)}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ التحليل…</> : <><Sparkles className="h-3.5 w-3.5" /> تقرير عن المشاركين</>}
          </button>
          {report && (
            <button onClick={download} title="تنزيل التقرير" className="rounded-md border border-white/10 p-2 hover:bg-white/5">
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="accent-[hsl(var(--primary))]" />
            <span className={live ? "text-primary" : "text-white/70"}>تحديث لحظي</span>
          </label>
          <select
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            className="rounded border border-white/10 bg-transparent px-1 py-0.5 outline-none [&>option]:bg-slate-900"
          >
            <option value={30}>كل 30 ثانية</option>
            <option value={60}>كل دقيقة</option>
            <option value={120}>كل دقيقتين</option>
            <option value={300}>كل 5 دقائق</option>
          </select>
          {live && <span className="ml-auto flex items-center gap-1 text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> مباشر</span>}
        </div>
        {lastAt && <div className="text-[11px] text-white/40">آخر تحديث: {lastAt.toLocaleTimeString("ar-EG")}</div>}
      </div>

      <div className="space-y-1.5 border-b border-white/10 p-3">
        <div className="text-xs text-white/60">نسبة مشاركة كل عضو (زمن التحدث)</div>
        {stats().map((s) => (
          <div key={s.key} className="space-y-0.5">
            <div className="flex justify-between text-[11px] text-white/70">
              <span className="truncate">{s.key}</span>
              <span>{s.participationPercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary" style={{ width: `${s.participationPercent}%` }} />
            </div>
          </div>
        ))}
      </div>

      {saved.length > 0 && (
        <div className="space-y-1 border-b border-white/10 p-3">
          <div className="text-xs text-white/60">تقارير محفوظة لهذا الاجتماع ({saved.length})</div>
          {saved.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-[11px]">
              <button onClick={() => setReport(r.report)} className="flex-1 truncate text-right hover:text-primary">
                {new Date(r.created_at).toLocaleString("ar-EG")} — {r.participants_count} مشارك / {r.duration_minutes} د
              </button>
              <button
                title="حذف التقرير"
                onClick={async () => { try { await removeSaved({ data: { id: r.id } }); void refreshSaved(); } catch (e: any) { toast.error(e?.message ?? "تعذر الحذف"); } }}
                className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-destructive"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 text-sm leading-6 whitespace-pre-wrap">
        {report ? report : <p className="text-center text-xs text-white/40">اضغط الزر لإنشاء تقرير ذكي عن المشاركين وتفاعلهم وجودة الاتصال، ويُحفظ تلقائياً في سجل تقارير الاجتماع.</p>}
      </div>
    </div>
  );
}

/** مسرح الاجتماع: عند مشاركة الشاشة/السبورة يملأ العرض الشاشة وتُصفّ نوافذ المشاركين صغيرة على اليمين. */
function MeetingStage({ compact = false, onLeave }: { compact?: boolean; onLeave?: () => void }) {
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false },
  );

  const screenTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const camTracks = tracks.filter((t) => t.source === Track.Source.Camera);
  const focused = !!screenTrack || compact;

  return (
    <div className="flex h-full min-h-0 flex-col" dir="ltr">
      <div className="min-h-0 flex-1 overflow-hidden">
        {!focused ? (
          <GridLayout tracks={camTracks} style={{ height: "100%" }}>
            <ParticipantTile />
          </GridLayout>
        ) : (
          <div className="flex h-full min-h-0 gap-2 p-2">
            {screenTrack && (
              <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-black">
                <ParticipantTile trackRef={screenTrack} style={{ height: "100%", width: "100%" }} />
              </div>
            )}
            <div
              className={`flex shrink-0 flex-col gap-2 overflow-y-auto ${screenTrack ? "w-44" : "w-full"}`}
            >
              {camTracks.map((t) => (
                <div
                  key={`${t.participant.identity}-${t.source}`}
                  className="aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-black"
                >
                  <ParticipantTile trackRef={t} style={{ height: "100%", width: "100%" }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {onLeave ? (
        <MeetingControlBar onLeave={onLeave} />
      ) : (
        <div className="border-t border-white/10 bg-[#121318] py-2">
          <ControlBar variation="verbose" controls={{ chat: false, leave: true, microphone: true, camera: true, screenShare: true }} />
        </div>
      )}
    </div>
  );
}
