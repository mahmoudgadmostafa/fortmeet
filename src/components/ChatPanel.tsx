import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Send,
  Lock,
  Users,
  Plus,
  X,
  UserPlus,
  Trash2,
  CheckSquare,
  Square,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import { generateUUID } from "@/lib/uuid";
import { toast } from "sonner";

export type CustomPrivateRoom = {
  id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  members: string[]; // مصفوفة معرّفات المشاركين selfId
  createdAt: number;
};

export type ChatMsg = {
  id: string;
  from: string;
  fromName: string;
  text: string;
  ts: number;
  /** معرّف المستلم في الدردشة الفردية */
  to?: string;
  /** معرّف الغرفة الخاصة المخصصة إن وُجدت */
  roomId?: string;
  roomName?: string;
  isHost?: boolean;
};

type Peer = { id: string; name: string; isHost: boolean };

/** دردشة عامة + دردشات خاصة فردية + دردشات خاصة جماعية للمضيف مع بعض أو كل المشاركين. */
export default function ChatPanel({
  code,
  selfId,
  selfName,
  isHost,
  roomLabel,
}: {
  code: string;
  selfId: string;
  selfName: string;
  isHost: boolean;
  /** اسم الغرفة الحالية (الرئيسية أو مجموعة فرعية) */
  roomLabel?: string;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [customRooms, setCustomRooms] = useState<CustomPrivateRoom[]>([]);
  const [thread, setThread] = useState<string>("public"); // "public" أو معرّف مستخدم أو معرّف غرفة خاصة
  const [text, setText] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({});

  // حالات نافذة إنشاء/تعديل الدردشة الخاصة للمضيف
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const chRef = useRef<RealtimeChannel | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef(thread);
  threadRef.current = thread;
  const customRoomsRef = useRef<CustomPrivateRoom[]>([]);
  customRoomsRef.current = customRooms;

  // الغرف الخاصة المتاحة للمستخدم الحالي فقط
  const myCustomRooms = useMemo(() => {
    return customRooms.filter(
      (r) => r.createdBy === selfId || r.members.includes(selfId),
    );
  }, [customRooms, selfId]);

  useEffect(() => {
    setMsgs([]);
    setPeers([]);
    setThread("public");
    const ch = supabase.channel(`chat:${code}`, {
      config: { presence: { key: selfId } },
    });
    chRef.current = ch;

    // تتبع الحاضرين
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<
        string,
        Array<{ name: string; isHost: boolean }>
      >;
      setPeers(
        Object.entries(state)
          .filter(([id]) => id !== selfId)
          .map(([id, metas]) => ({
            id,
            name: metas[0]?.name ?? "ضيف",
            isHost: !!metas[0]?.isHost,
          })),
      );

      // إذا كنت المضيف، قم ببث الغرف الخاصة الحالية للحاضرين الجدد
      if (isHost && customRoomsRef.current.length > 0) {
        ch.send({
          type: "broadcast",
          event: "rooms_sync",
          payload: { rooms: customRoomsRef.current },
        });
      }
    });

    // استقبال الرسائل
    ch.on("broadcast", { event: "msg" }, ({ payload }) => {
      const m = payload as ChatMsg;

      // 1. فحص رسائل المجموعات الخاصة
      if (m.roomId) {
        const targetRoom = customRoomsRef.current.find((r) => r.id === m.roomId);
        // عزل تام: إذا لم أكن عضواً ولم أكن منشئ الغرفة، أهمل الرسالة
        if (
          !targetRoom ||
          (!targetRoom.members.includes(selfId) && targetRoom.createdBy !== selfId)
        ) {
          return;
        }
      } else if (m.to && m.to !== selfId && m.from !== selfId) {
        // 2. فحص رسائل الدردشة الفردية
        return;
      }

      setMsgs((prev) => [...prev, m]);
      const key = m.roomId ? m.roomId : m.to ? (m.from === selfId ? m.to : m.from) : "public";
      if (key !== threadRef.current && m.from !== selfId) {
        setUnread((u) => ({ ...u, [key]: (u[key] ?? 0) + 1 }));
      }
    });

    // استقبال مزامنة الغرف الخاصة المخصصة
    ch.on("broadcast", { event: "rooms_sync" }, ({ payload }) => {
      const incomingRooms = (payload?.rooms as CustomPrivateRoom[]) ?? [];
      setCustomRooms(incomingRooms);

      // إشعار المستخدم إذا تمت إضافته لغرفة خاصة جديدة
      incomingRooms.forEach((r) => {
        const wasIn = customRoomsRef.current.some((old) => old.id === r.id);
        if (!wasIn && r.members.includes(selfId) && r.createdBy !== selfId) {
          toast.info(`تمت إضافتك إلى دردشة خاصة جديدة: "${r.name}"`);
        }
      });
    });

    // طلب مزامنة الغرف من المضيف عند الانضمام
    ch.on("broadcast", { event: "request_rooms" }, () => {
      if (isHost && customRoomsRef.current.length > 0) {
        ch.send({
          type: "broadcast",
          event: "rooms_sync",
          payload: { rooms: customRoomsRef.current },
        });
      }
    });

    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        await ch.track({ name: selfName, isHost });
        if (!isHost) {
          ch.send({ type: "broadcast", event: "request_rooms", payload: {} });
        }
      }
    });

    return () => {
      ch.unsubscribe();
      supabase.removeChannel(ch);
      chRef.current = null;
    };
  }, [code, selfId, selfName, isHost]);

  // تصفية الرسائل المعروضة حسب التبويب النشط
  const visible = useMemo(() => {
    if (thread === "public") {
      return msgs.filter((m) => !m.to && !m.roomId);
    }
    const currentCustomRoom = myCustomRooms.find((r) => r.id === thread);
    if (currentCustomRoom) {
      return msgs.filter((m) => m.roomId === thread);
    }
    return msgs.filter(
      (m) => m.to && (m.from === thread || m.to === thread),
    );
  }, [msgs, thread, myCustomRooms]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible.length]);

  function openThread(key: string) {
    setThread(key);
    setUnread((u) => ({ ...u, [key]: 0 }));
  }

  function send() {
    const t = text.trim();
    if (!t || !chRef.current) return;

    const currentCustomRoom = myCustomRooms.find((r) => r.id === thread);

    const m: ChatMsg = {
      id: generateUUID(),
      from: selfId,
      fromName: selfName,
      text: t,
      ts: Date.now(),
      isHost,
      ...(currentCustomRoom
        ? { roomId: currentCustomRoom.id, roomName: currentCustomRoom.name }
        : thread === "public"
        ? {}
        : { to: thread }),
    };

    chRef.current.send({ type: "broadcast", event: "msg", payload: m });
    setMsgs((prev) => [...prev, m]);
    setText("");
  }

  // بث التحديث للغرف لجميع المتصلين
  function broadcastRooms(updatedRooms: CustomPrivateRoom[]) {
    setCustomRooms(updatedRooms);
    customRoomsRef.current = updatedRooms;
    if (chRef.current) {
      chRef.current.send({
        type: "broadcast",
        event: "rooms_sync",
        payload: { rooms: updatedRooms },
      });
    }
  }

  // فتح نافذة إنشاء دردشة خاصة جديدة
  function handleOpenCreateModal() {
    setEditingRoomId(null);
    setNewRoomName("");
    // افتراضياً بدون تحديد أي شخص، أو يمكن للمضيف اختيار "تحديد الكل"
    setSelectedMemberIds([]);
    setCreateModalOpen(true);
  }

  // فتح نافذة تعديل دردشة خاصة قائمة
  function handleOpenEditModal(room: CustomPrivateRoom) {
    setEditingRoomId(room.id);
    setNewRoomName(room.name);
    setSelectedMemberIds(room.members);
    setCreateModalOpen(true);
  }

  // حفظ الغرفة (إنشاء جديد أو تعديل)
  function handleSaveRoom() {
    const name = newRoomName.trim();
    if (!name) {
      toast.error("يرجى كتابة اسم للدردشة الخاصة");
      return;
    }
    if (selectedMemberIds.length === 0) {
      toast.error("يرجى اختيار مشارك واحد على الأقل للانضمام للدردشة");
      return;
    }

    if (editingRoomId) {
      // تعديل غرفة موجودة
      const updated = customRooms.map((r) =>
        r.id === editingRoomId
          ? { ...r, name, members: Array.from(new Set([...selectedMemberIds, selfId])) }
          : r,
      );
      broadcastRooms(updated);
      toast.success("تم تحديث أعضاء الدردشة الخاصة بنجاح");
    } else {
      // إنشاء غرفة خاصة جديدة
      const newRoom: CustomPrivateRoom = {
        id: generateUUID(),
        name,
        createdBy: selfId,
        createdByName: selfName,
        members: Array.from(new Set([...selectedMemberIds, selfId])),
        createdAt: Date.now(),
      };
      const updated = [...customRooms, newRoom];
      broadcastRooms(updated);
      toast.success(`تم إنشاء الدردشة الخاصة "${name}" بنجاح`);
      openThread(newRoom.id);
    }

    setCreateModalOpen(false);
  }

  // حذف الغرفة الخاصة (للمضيف فقط)
  function handleDeleteRoom(roomId: string, roomName: string) {
    if (!confirm(`هل أنت متأكد من حذف الدردشة الخاصة "${roomName}"؟`)) return;
    const updated = customRooms.filter((r) => r.id !== roomId);
    broadcastRooms(updated);
    if (thread === roomId) {
      openThread("public");
    }
    toast.success("تم حذف الدردشة الخاصة");
  }

  // تبديل اختيار مشارك
  function toggleMemberSelection(peerId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(peerId) ? prev.filter((id) => id !== peerId) : [...prev, peerId],
    );
  }

  // تحديد أو إلغاء تحديد الكل
  function toggleSelectAll() {
    if (selectedMemberIds.length === peers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(peers.map((p) => p.id));
    }
  }

  const threadPeers = isHost ? peers : peers.filter((p) => p.isHost);
  const activeCustomRoom = myCustomRooms.find((r) => r.id === thread);

  let activeTitle = "الدردشة العامة";
  let activeSubtitle = "يراها جميع المشاركين في الاجتماع";
  if (activeCustomRoom) {
    const memberNames = peers
      .filter((p) => activeCustomRoom.members.includes(p.id))
      .map((p) => p.name);
    activeTitle = activeCustomRoom.name;
    activeSubtitle = `دردشة خاصة ومغلقة • الأعضاء: ${activeCustomRoom.members.length} مشارك (${[selfName, ...memberNames].slice(0, 3).join("، ")}${memberNames.length > 2 ? "..." : ""})`;
  } else if (thread !== "public") {
    const targetPeer = peers.find((p) => p.id === thread);
    activeTitle = targetPeer?.name ?? "دردشة خاصة";
    activeSubtitle = `دردشة فردية مشفرة ومحمية مع ${activeTitle}`;
  }

  return (
    <div className="relative flex h-full flex-col bg-[#0e1017] text-white" dir="rtl">
      {/* Header bar / Room label */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/30 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>غرفة الدردشة</span>
              {roomLabel && (
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">
                  {roomLabel}
                </span>
              )}
            </div>
            <div className="text-[11px] text-white/50">{peers.length + 1} متواجد حالياً</div>
          </div>
        </div>

        {/* زر إتاحة إنشاء دردشة خاصة للمضيف */}
        {isHost && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-md shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all"
            title="إنشاء دردشة خاصة جديدة تضم بعض أو كل المشتركين"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>دردشة خاصة</span>
          </button>
        )}
      </div>

      {/* شريط التبويبات الفاخر (عامة + مجموعات خاصة + أفراد) */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.08] p-2 bg-black/20 text-xs no-scrollbar">
        {/* التبويب العام */}
        <button
          onClick={() => openThread("public")}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold transition-all ${
            thread === "public"
              ? "bg-primary text-white shadow-md shadow-primary/30"
              : "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> عامة
          {!!unread["public"] && (
            <span className="rounded-full bg-destructive px-1.5 py-0.2 text-[10px] font-bold text-white">
              {unread["public"]}
            </span>
          )}
        </button>

        {/* تبويبات الدردشات الخاصة الجماعية التي أنشأها المضيف */}
        {myCustomRooms.map((r) => (
          <div key={r.id} className="relative flex shrink-0 items-center">
            <button
              onClick={() => openThread(r.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold transition-all ${
                thread === r.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-white"
              }`}
              title={`دردشة خاصة تضم ${r.members.length} مشارك`}
            >
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span className="max-w-[110px] truncate">{r.name}</span>
              <span className="text-[10px] opacity-75 font-mono">({r.members.length})</span>
              {!!unread[r.id] && (
                <span className="rounded-full bg-destructive px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {unread[r.id]}
                </span>
              )}
            </button>
          </div>
        ))}

        {/* التبويبات الفردية 1-to-1 للمشاركين والمضيف */}
        {threadPeers.map((p) => (
          <button
            key={p.id}
            onClick={() => openThread(p.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-semibold transition-all ${
              thread === p.id
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Lock className="h-3 w-3 text-white/50" />
            <span className="max-w-[90px] truncate">{p.name}</span>
            {!!unread[p.id] && (
              <span className="rounded-full bg-destructive px-1.5 py-0.2 text-[10px] font-bold text-white">
                {unread[p.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* شريط معلومات المحادثة الحالية وأدوات إدارة المجموعة الخاصة للمضيف */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[11px] text-white/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="truncate">{activeSubtitle}</span>
        </div>

        {/* أدوات المضيف عند تواجده في غرفة خاصة أنشأها */}
        {isHost && activeCustomRoom && (
          <div className="flex items-center gap-1.5 shrink-0 mr-2">
            <button
              onClick={() => handleOpenEditModal(activeCustomRoom)}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/10 hover:text-white transition"
              title="تعديل الأعضاء أو اسم الدردشة"
            >
              <Settings2 className="h-3 w-3" />
              <span>الأعضاء</span>
            </button>
            <button
              onClick={() => handleDeleteRoom(activeCustomRoom.id, activeCustomRoom.name)}
              className="grid h-6 w-6 place-items-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
              title="حذف هذه الدردشة الخاصة"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* سجل الرسائل */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
        {visible.length === 0 && (
          <div className="pt-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.03] border border-white/10 text-white/30">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs text-white/40">لا توجد رسائل بعد في "{activeTitle}"</p>
            <p className="text-[11px] text-white/30">كن أول من يكتب في هذه المحادثة</p>
          </div>
        )}
        {visible.map((m) => {
          const isMe = m.from === selfId;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}>
              <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] text-white/50">
                <span className="font-semibold text-white/80">{m.fromName}</span>
                {m.roomId && (
                  <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1 py-0.2 text-amber-300 text-[9px] flex items-center gap-0.5">
                    <Lock className="h-2.5 w-2.5" /> خاص بالمجموعة
                  </span>
                )}
                {m.to && !m.roomId && (
                  <span className="rounded bg-accent/20 px-1 py-0.2 text-accent text-[9px]">
                    فردي
                  </span>
                )}
                <span>·</span>
                <span>{new Date(m.ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
                  isMe
                    ? "rounded-tr-none bg-gradient-to-br from-primary to-indigo-600 text-white border border-white/15 shadow-primary/20"
                    : "rounded-tl-none bg-white/[0.06] text-white/95 border border-white/[0.09] backdrop-blur-md"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* حقل الإدخال وزر الإرسال */}
      <div className="border-t border-white/[0.08] bg-[#0c0d14] p-3">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              activeCustomRoom
                ? `رسالة خاصة في "${activeCustomRoom.name}"...`
                : thread === "public"
                ? "اكتب رسالة للجميع..."
                : `رسالة خاصة إلى ${activeTitle}...`
            }
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary active:scale-95 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Modal نافذة إنشاء / تعديل الدردشة الخاصة للمضيف */}
      {createModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#14161f] p-5 shadow-2xl flex flex-col max-h-[90%] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-md">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingRoomId ? "تعديل الدردشة الخاصة" : "إنشاء دردشة خاصة جديدة"}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    حدد الأعضاء المسموح لهم برؤية والمشاركة في الدردشة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 py-3 flex-1 overflow-y-auto">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/80">
                  اسم الدردشة الخاصة
                </label>
                <input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="مثال: فريق الإدارة، لجنة التحكيم، سرية..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-white/80">
                    اختيار الأعضاء ({selectedMemberIds.length} من {peers.length})
                  </label>
                  {peers.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      {selectedMemberIds.length === peers.length ? (
                        <>
                          <Square className="h-3 w-3" /> إلغاء تحديد الكل
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-3 w-3" /> تحديد كل المشاركين
                        </>
                      )}
                    </button>
                  )}
                </div>

                {peers.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/40">
                    لا يوجد مشاركون آخرون في الاجتماع حالياً
                  </div>
                ) : (
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-2">
                    {peers.map((p) => {
                      const selected = selectedMemberIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleMemberSelection(p.id)}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition ${
                            selected
                              ? "bg-primary/20 text-white border border-primary/30"
                              : "hover:bg-white/5 text-white/70 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 font-bold text-[10px]">
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate font-medium">{p.name}</span>
                            {p.isHost && (
                              <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                                مضيف
                              </span>
                            )}
                          </div>
                          {selected ? (
                            <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-white/30 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveRoom}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-2 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 transition"
              >
                {editingRoomId ? "حفظ التعديلات" : "إنشاء وبدء الدردشة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
