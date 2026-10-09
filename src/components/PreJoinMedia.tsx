import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Volume2,
} from "lucide-react";
import { stopMediaTracks } from "@/lib/stop-media-tracks";

interface PreJoinMediaProps {
  initialCam: boolean;
  setInitialCam: (enabled: boolean) => void;
  initialMic: boolean;
  setInitialMic: (enabled: boolean) => void;
}

export default function PreJoinMedia({
  initialCam,
  setInitialCam,
  initialMic,
  setInitialMic,
}: PreJoinMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewRequestRef = useRef(0);

  const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);
  const [permissionState, setPermissionState] = useState<"checking" | "granted" | "denied" | "prompt" | "not_found">("prompt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [devicesCount, setDevicesCount] = useState({ cams: 0, mics: 0 });

  // التحقق من أمان المتصفح (Secure Context)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const isHttps = window.location.protocol === "https:";
      const isSecure = window.isSecureContext || (isLocal && !isHttps);
      if (!isSecure && !isLocal) {
        setIsInsecureOrigin(true);
      }
    }
  }, []);

  const stopAllMedia = useCallback(() => {
    previewRequestRef.current += 1;
    if (streamRef.current) {
      stopMediaTracks(streamRef.current.getTracks());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMicLevel(0);
  }, []);

  // تشغيل المعاينة المباشرة
  const startPreview = useCallback(async () => {
    stopAllMedia();
    const requestId = previewRequestRef.current;
    setErrorMessage(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissionState("denied");
      setErrorMessage("متصفحك أو هذا الرابط لا يدعم الوصول للكاميرا والميكروفون.");
      return;
    }

    try {
      // نتحقق من عدد الأجهزة المتوفرة
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput").length;
        const mics = devices.filter((d) => d.kind === "audioinput").length;
        setDevicesCount({ cams, mics });
      } catch {}

      if (requestId !== previewRequestRef.current) return;

      if (!initialCam && !initialMic) {
        setPermissionState("granted");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: initialCam
          ? {
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 30, min: 24 },
            }
          : false,
        audio: initialMic
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
            }
          : false,
      });

      if (requestId !== previewRequestRef.current) {
        stopMediaTracks(stream.getTracks());
        return;
      }

      streamRef.current = stream;
      setPermissionState("granted");

      if (videoRef.current && initialCam) {
        videoRef.current.srcObject = stream;
      }

      // مؤشر مستوى صوت الميكروفون
      if (initialMic) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkVolume = () => {
              if (!audioCtxRef.current) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              // تحويل القيمة لنسبة مئوية
              setMicLevel(Math.min(100, Math.round((avg / 80) * 100)));
              animFrameRef.current = requestAnimationFrame(checkVolume);
            };
            checkVolume();
          }
        }
      }
    } catch (err: any) {
      if (requestId !== previewRequestRef.current) return;
      console.warn("Pre-join media preview warning:", err);
      const errName = err?.name || "";
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setPermissionState("denied");
        setErrorMessage("تم رفض إذن الكاميرا أو الميكروفون في المتصفح.");
        setShowGuide(true);
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setPermissionState("not_found");
        setErrorMessage("لم يتم العثور على كاميرا أو ميكروفون متصلين بهذا الجهاز.");
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setErrorMessage("الكاميرا أو الميكروفون قيد الاستخدام بواسطة برنامج آخر (مثل Zoom أو Teams أو الكاميرا الخاصة بويندوز).");
      } else {
        setErrorMessage(err?.message || "تعذر بدء معاينة الكاميرا أو المايك.");
      }
    }
  }, [initialCam, initialMic, stopAllMedia]);

  useEffect(() => {
    startPreview();
    window.addEventListener("pagehide", stopAllMedia);
    return () => {
      window.removeEventListener("pagehide", stopAllMedia);
      stopAllMedia();
    };
  }, [startPreview, stopAllMedia]);

  const toggleCam = () => {
    setInitialCam(!initialCam);
  };

  const toggleMic = () => {
    setInitialMic(!initialMic);
  };

  return (
    <div className="flex flex-col gap-3 w-full" dir="rtl">
      {/* تنبيه الرابط غير الآمن */}
      {isInsecureOrigin && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">
                المتصفح يُعطّل الكاميرا والميكروفون على روابط IP غير المشفرة!
              </p>
              <p className="mt-1 text-amber-200/80">
                لأسباب أمنية في Chrome و Edge، ميزة الصوت والفيديو تعمل فقط على{" "}
                <span className="font-mono bg-black/30 px-1 rounded">localhost</span> أو عبر{" "}
                <span className="font-mono bg-black/30 px-1 rounded">HTTPS</span>.
              </p>
              <a
                href={`http://localhost:8080${window.location.pathname}`}
                className="mt-2 inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/30"
              >
                <ExternalLink className="h-3 w-3" /> افتح عبر localhost:8080
              </a>
            </div>
          </div>
        </div>
      )}

      {/* شاشة المعاينة التفاعلية */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f14] shadow-inner flex items-center justify-center">
        {initialCam ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-white/50 gap-2">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/5 border border-white/10">
              <VideoOff className="h-8 w-8 text-white/40" />
            </div>
            <span className="text-xs">الكاميرا متوقفة</span>
          </div>
        )}

        {/* مؤشر الصوت المباشر */}
        {initialMic && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 border border-white/10 text-xs">
            <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-75"
                style={{ width: `${Math.min(100, micLevel * 1.5)}%` }}
              />
            </div>
          </div>
        )}

        {/* أزرار التحكم السريعة على المعاينة */}
        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleMic}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-md transition-all shadow-lg ${
              initialMic
                ? "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                : "bg-red-500/80 hover:bg-red-500 text-white border border-red-400/40"
            }`}
          >
            {initialMic ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4" />}
            {initialMic ? "المايك يعمل" : "المايك مكتوم"}
          </button>

          <button
            type="button"
            onClick={toggleCam}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-md transition-all shadow-lg ${
              initialCam
                ? "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                : "bg-red-500/80 hover:bg-red-500 text-white border border-red-400/40"
            }`}
          >
            {initialCam ? <Video className="h-4 w-4 text-sky-400" /> : <VideoOff className="h-4 w-4" />}
            {initialCam ? "الكاميرا تعمل" : "الكاميرا متوقفة"}
          </button>
        </div>
      </div>

      {/* رسالة الخطأ أو التوجيه إن وجدت */}
      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-300">{errorMessage}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startPreview}
                  className="flex items-center gap-1 rounded bg-red-500/20 px-2.5 py-1 text-red-100 hover:bg-red-500/30 font-medium"
                >
                  <RefreshCw className="h-3 w-3" /> إعادة المحاولة
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="flex items-center gap-1 rounded border border-red-400/30 px-2.5 py-1 text-red-200 hover:bg-white/5"
                >
                  <HelpCircle className="h-3 w-3" /> دليل السماح بالمتصفح
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* دليل تفعيل الأذونات في المتصفح */}
      {showGuide && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs space-y-2 text-white/80">
          <p className="font-bold text-white flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5 text-primary" /> خطوات السماح في متصفح Chrome أو Edge:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-white/70">
            <li>اضغط على أيقونة الإعدادات 🔒 أو ⚙️ على يسار رابط الموقع في شريط العناوين بالأعلى.</li>
            <li>تأكد من اختيار <span className="text-white font-semibold">"السماح" (Allow)</span> لكل من الكاميرا والميكروفون.</li>
            <li>إذا كان الخيار باللون الرمادي أو غير نشط، تأكد أنك تفتح الموقع من <span className="font-mono bg-black/40 px-1 rounded text-primary">localhost:8080</span> وليس من عنوان IP شبكة.</li>
            <li>تأكد في نظام ويندوز من الذهاب إلى Settings ➔ Privacy ➔ Camera/Microphone وتفعيل خيار "Allow apps to access".</li>
          </ol>
        </div>
      )}
    </div>
  );
}
