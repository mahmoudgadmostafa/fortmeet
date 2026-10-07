import React, { useState, useEffect } from "react";
import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Settings2,
  ChevronUp,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface MeetingControlBarProps {
  onLeave: () => void;
}

export default function MeetingControlBar({ onLeave }: MeetingControlBarProps) {
  const room = useRoomContext();
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();

  const [busyMic, setBusyMic] = useState(false);
  const [busyCam, setBusyCam] = useState(false);
  const [busyShare, setBusyShare] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [selectedCamId, setSelectedCamId] = useState<string>("");

  useEffect(() => {
    async function loadDevices() {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
          setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
        }
      } catch {}
    }
    loadDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", loadDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", loadDevices);
    };
  }, []);

  const toggleMic = async () => {
    if (busyMic) return;
    setBusyMic(true);
    try {
      const next = !isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(next);
      toast.success(next ? "تم تشغيل المايك" : "تم كتم المايك");
    } catch (err: any) {
      console.error("Mic toggle error:", err);
      const name = err?.name || "";
      if (name === "NotAllowedError" || err?.message?.includes("Permission")) {
        toast.error("تم حظر إذن الميكروفون بالمتصفح! انقر على القفل بجانب الرابط للسماح.");
      } else if (name === "NotFoundError") {
        toast.error("لم يتم العثور على ميكروفون متصل بالجهاز.");
      } else {
        toast.error("تعذر تغيير حالة الميكروفون: " + (err?.message || err));
      }
    } finally {
      setBusyMic(false);
    }
  };

  const toggleCam = async () => {
    if (busyCam) return;
    setBusyCam(true);
    try {
      const next = !isCameraEnabled;
      await localParticipant.setCameraEnabled(next);
      toast.success(next ? "تم تشغيل الكاميرا" : "تم إيقاف الكاميرا");
    } catch (err: any) {
      console.error("Cam toggle error:", err);
      const name = err?.name || "";
      if (name === "NotAllowedError" || err?.message?.includes("Permission")) {
        toast.error("تم حظر إذن الكاميرا بالمتصفح! انقر على القفل بجانب الرابط للسماح.");
      } else if (name === "NotReadableError") {
        toast.error("الكاميرا قيد الاستخدام من تطبيق آخر (Zoom أو Teams أو ويندوز).");
      } else if (name === "NotFoundError") {
        toast.error("لم يتم العثور على كاميرا متصلة بالجهاز.");
      } else {
        toast.error("تعذر تغيير حالة الكاميرا: " + (err?.message || err));
      }
    } finally {
      setBusyCam(false);
    }
  };

  const toggleScreenShare = async () => {
    if (busyShare) return;
    setBusyShare(true);
    try {
      const next = !isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(next);
      toast.success(next ? "بدأت مشاركة الشاشة" : "توقفت مشاركة الشاشة");
    } catch (err: any) {
      console.error("Screen share error:", err);
      if (err?.name !== "NotAllowedError") {
        toast.error("تعذر مشاركة الشاشة: " + (err?.message || err));
      }
    } finally {
      setBusyShare(false);
    }
  };

  const changeMicDevice = async (deviceId: string) => {
    try {
      setSelectedMicId(deviceId);
      await room.switchActiveDevice("audioinput", deviceId);
      toast.success("تم تبديل الميكروفون");
    } catch (e: any) {
      toast.error("تعذر تبديل الميكروفون: " + (e?.message || e));
    }
  };

  const changeCamDevice = async (deviceId: string) => {
    try {
      setSelectedCamId(deviceId);
      await room.switchActiveDevice("videoinput", deviceId);
      toast.success("تم تبديل الكاميرا");
    } catch (e: any) {
      toast.error("تعذر تبديل الكاميرا: " + (e?.message || e));
    }
  };

  return (
    <div className="relative flex items-center justify-center gap-3 py-2 px-4 bg-[#111216] border-t border-white/10" dir="rtl">
      {/* زر الميكروفون */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggleMic}
          disabled={busyMic}
          title={isMicrophoneEnabled ? "كتم المايك" : "تشغيل المايك"}
          className={`group flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            isMicrophoneEnabled
              ? "bg-[#1c1f26] text-white hover:bg-[#252a34] border border-white/10"
              : "bg-red-500/90 text-white hover:bg-red-500 shadow-md shadow-red-500/20"
          }`}
        >
          {isMicrophoneEnabled ? (
            <Mic className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          ) : (
            <MicOff className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
          )}
          <span className="hidden sm:inline">
            {isMicrophoneEnabled ? "كتم الصوت" : "تشغيل المايك"}
          </span>
        </button>
      </div>

      {/* زر الكاميرا */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggleCam}
          disabled={busyCam}
          title={isCameraEnabled ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
          className={`group flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            isCameraEnabled
              ? "bg-[#1c1f26] text-white hover:bg-[#252a34] border border-white/10"
              : "bg-red-500/90 text-white hover:bg-red-500 shadow-md shadow-red-500/20"
          }`}
        >
          {isCameraEnabled ? (
            <Video className="h-4 w-4 text-sky-400 group-hover:scale-110 transition-transform" />
          ) : (
            <VideoOff className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
          )}
          <span className="hidden sm:inline">
            {isCameraEnabled ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
          </span>
        </button>
      </div>

      {/* زر مشاركة الشاشة */}
      <button
        type="button"
        onClick={toggleScreenShare}
        disabled={busyShare}
        title={isScreenShareEnabled ? "إيقاف المشاركة" : "مشاركة الشاشة"}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
          isScreenShareEnabled
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-[#1c1f26] text-white hover:bg-[#252a34] border border-white/10"
        }`}
      >
        {isScreenShareEnabled ? (
          <MonitorOff className="h-4 w-4" />
        ) : (
          <MonitorUp className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {isScreenShareEnabled ? "إيقاف المشاركة" : "مشاركة الشاشة"}
        </span>
      </button>

      {/* زر الإعدادات والأجهزة */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold border transition-all ${
            showSettings
              ? "bg-white/15 border-white/20 text-white"
              : "bg-[#1c1f26] border-white/10 text-white/80 hover:bg-[#252a34] hover:text-white"
          }`}
          title="اختيار المايك والكاميرا"
        >
          <Settings2 className="h-4 w-4" />
          <ChevronUp className={`h-3 w-3 transition-transform ${showSettings ? "rotate-180" : ""}`} />
        </button>

        {showSettings && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 rounded-2xl border border-white/10 bg-[#16181e] p-3 text-xs shadow-2xl space-y-3 z-50">
            <div>
              <label className="text-white/60 font-semibold mb-1 block">ميكروفون الإدخال</label>
              <select
                value={selectedMicId}
                onChange={(e) => changeMicDevice(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white outline-none focus:border-primary text-xs"
              >
                {audioDevices.length === 0 ? (
                  <option value="">الميكروفون الافتراضي</option>
                ) : (
                  audioDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `ميكروفون ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-white/60 font-semibold mb-1 block">كاميرا الفيديو</label>
              <select
                value={selectedCamId}
                onChange={(e) => changeCamDevice(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white outline-none focus:border-primary text-xs"
              >
                {videoDevices.length === 0 ? (
                  <option value="">الكاميرا الافتراضية</option>
                ) : (
                  videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `كاميرا ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* زر مغادرة الاجتماع */}
      <button
        type="button"
        onClick={onLeave}
        title="مغادرة الاجتماع"
        className="flex items-center gap-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white px-4 py-2.5 text-xs font-semibold shadow-md transition-all ml-auto"
      >
        <PhoneOff className="h-4 w-4" />
        <span className="hidden sm:inline">مغادرة</span>
      </button>
    </div>
  );
}
