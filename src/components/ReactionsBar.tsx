import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Hand, Smile } from "lucide-react";
import { toast } from "sonner";
import { generateUUID } from "@/lib/uuid";

const EMOJIS = ["👍", "❤️", "😂", "😮", "👏", "🎉", "🔥", "🙏"];

type Floating = { id: string; emoji: string; left: number; name: string };

export default function ReactionsBar({
  code,
  selfId,
  selfName,
  onHandsChange,
}: {
  code: string;
  selfId: string;
  selfName: string;
  onHandsChange?: (raisedNames: string[]) => void;
}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [floating, setFloating] = useState<Floating[]>([]);
  const [open, setOpen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const handsRef = useRef<Record<string, { name: string; raised: boolean }>>({});

  function emitHands() {
    const names = Object.values(handsRef.current).filter((h) => h.raised).map((h) => h.name);
    onHandsChange?.(names);
  }

  useEffect(() => {
    const ch = supabase.channel(`reactions:${code}`);
    channelRef.current = ch;
    ch.on("broadcast", { event: "emoji" }, ({ payload }) => spawn(payload.emoji, payload.name));
    ch.on("broadcast", { event: "hand" }, ({ payload }) => {
      handsRef.current = { ...handsRef.current, [payload.id]: { name: payload.name, raised: payload.raised } };
      if (payload.raised && payload.id !== selfId) {
        toast(`${payload.name} رفع يده ✋`);
      }
      emitHands();
    });
    ch.subscribe();
    return () => {
      ch.unsubscribe();
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function spawn(emoji: string, name: string) {
    const id = generateUUID();
    const left = 20 + Math.random() * 60;
    setFloating((f) => [...f, { id, emoji, left, name }]);
    setTimeout(() => setFloating((f) => f.filter((x) => x.id !== id)), 3500);
  }

  function send(emoji: string) {
    channelRef.current?.send({ type: "broadcast", event: "emoji", payload: { emoji, name: selfName, id: selfId } });
    spawn(emoji, selfName);
    setOpen(false);
  }

  function toggleHand() {
    const next = !handRaised;
    setHandRaised(next);
    handsRef.current = { ...handsRef.current, [selfId]: { name: selfName, raised: next } };
    emitHands();
    channelRef.current?.send({
      type: "broadcast",
      event: "hand",
      payload: { id: selfId, name: selfName, raised: next },
    });
  }

  return (
    <>
      {/* Floating reactions overlay */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {floating.map((f) => (
          <div
            key={f.id}
            className="absolute bottom-24 flex flex-col items-center animate-float-up"
            style={{ left: `${f.left}%` }}
          >
            <span className="text-4xl drop-shadow-lg">{f.emoji}</span>
            <span className="mt-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{f.name}</span>
          </div>
        ))}
      </div>

      {/* Bottom-center floating bar */}
      <div className="pointer-events-auto fixed bottom-24 left-1/2 z-50 -translate-x-1/2" dir="ltr">
        <div className="relative">
          {open && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 rounded-2xl border border-white/15 bg-[#0e1017]/95 p-2 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl animate-in zoom-in-95 duration-150">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => send(e)}
                  className="grid h-11 w-11 place-items-center rounded-xl text-2xl hover:bg-white/10 hover:scale-125 active:scale-100 transition-all duration-200"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0e1017]/90 px-2 py-1.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl">
            <button
              onClick={toggleHand}
              title={handRaised ? "إنزال اليد" : "رفع اليد"}
              className={`grid h-10 w-10 place-items-center rounded-full transition-all duration-200 ${
                handRaised
                  ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse scale-105"
                  : "bg-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.12] hover:scale-105"
              }`}
            >
              <Hand className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen((o) => !o)}
              title="تفاعل"
              className={`grid h-10 w-10 place-items-center rounded-full transition-all duration-200 ${
                open
                  ? "bg-primary text-white shadow-md shadow-primary/40 scale-105"
                  : "bg-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.12] hover:scale-105"
              }`}
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { transform: translateY(-20px) scale(1.15); opacity: 1; }
          80% { transform: translateY(-60vh) scale(1); opacity: 1; }
          100% { transform: translateY(-75vh) scale(0.8); opacity: 0; }
        }
        .animate-float-up { animation: float-up 3.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </>
  );
}
