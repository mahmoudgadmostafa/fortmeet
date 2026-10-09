import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { c as createSsrRpc, m as meetingUrl, u as useServerFn, e as generateMeetingReport, a as listMeetingReports, b as deleteMeetingReport, s as stopRecording, f as startRecording, h as getActiveRecording } from "./meeting-url-D7577DQ8.js";
import { s as supabase } from "./client-DweYJVoo.js";
import { a as createServerFn } from "./server-DpeWxidM.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-BQ-toWLv.js";
import { useParticipants, useRoomContext, useLocalParticipant, LiveKitRoom, RoomAudioRenderer, useTracks, GridLayout, ParticipantTile, ControlBar } from "@livekit/components-react";
import { a as Route } from "./router-C1Gq3I6k.js";
import { MousePointer2, Pencil, Eraser, Minus, ArrowRight, Square, Circle, Triangle, Type, Image as Image$1, FileText, Grid3x3, Palette, Undo2, Redo2, Download, Trash2, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, RotateCw, Share2, X, Check, Copy, Mail, Users, Plus, Lock, Settings2, Send, CheckSquare, Shuffle, LayoutGrid, Rows3, Save, Link2, GripVertical, LogIn, Megaphone, Hand, Smile, AlertTriangle, ExternalLink, VideoOff, Volume2, Mic, MicOff, Video, RefreshCw, HelpCircle, MonitorOff, MonitorUp, ChevronUp, PhoneOff, ShieldAlert, Clock, Crown, Unlock, BarChart3, MessageSquare, Network, Sparkles, UserPlus, SwitchCamera, UserX, Loader2 } from "lucide-react";
import { AudioPresets, VideoPresets, Track } from "livekit-client";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import "@supabase/supabase-js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "seroval";
import "@tanstack/history";
import "@tanstack/react-router/ssr/server";
import "@tanstack/react-query";
function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
    }
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = bytes[6] & 15 | 64;
      bytes[8] = bytes[8] & 63 | 128;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
class Lobby {
  constructor(code, selfName) {
    this.code = code;
    this.selfName = selfName;
    this.selfId = generateUUID();
  }
  code;
  selfName;
  channel = null;
  selfId;
  /** Knocker side: wait until host admits or denies. */
  async knock(onResult) {
    const ch = supabase.channel(`lobby:${this.code}`, {
      config: { presence: { key: this.selfId } }
    });
    this.channel = ch;
    ch.on("broadcast", { event: "admit" }, ({ payload }) => {
      if (payload.target === this.selfId) onResult(true);
    });
    ch.on("broadcast", { event: "deny" }, ({ payload }) => {
      if (payload.target === this.selfId) onResult(false);
    });
    await ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") await ch.track({ name: this.selfName });
    });
  }
  /** Host side: watch knockers list. */
  async watch(onKnockers) {
    const ch = supabase.channel(`lobby:${this.code}`, {
      config: { presence: { key: this.selfId } }
    });
    this.channel = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const list = Object.entries(state).filter(([id]) => id !== this.selfId).map(([id, metas]) => ({ id, name: metas[0]?.name ?? "Guest" }));
      onKnockers(list);
    });
    await ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") await ch.track({ name: "__host__" });
    });
  }
  admit(target) {
    this.channel?.send({ type: "broadcast", event: "admit", payload: { target } });
  }
  deny(target) {
    this.channel?.send({ type: "broadcast", event: "deny", payload: { target } });
  }
  async close() {
    if (this.channel) {
      await this.channel.unsubscribe();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
const InputSchema$1 = z.object({
  room: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(64),
  isHost: z.boolean().optional(),
  password: z.string().max(128).optional(),
  /** رقم المجموعة الفرعية (Breakout room) إن وُجد */
  group: z.number().int().min(1).max(20).optional()
});
const getLivekitToken = createServerFn({
  method: "POST"
}).validator((input) => InputSchema$1.parse(input)).handler(createSsrRpc("ac19c3a08d9409a0859dec5fece6e5a4551fb340c5e74aeee72226112ab0fcf3"));
const ActionSchema = z.object({
  room: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  identity: z.string().min(1).max(128),
  action: z.enum(["kick", "mute", "mute_audio", "mute_video"])
});
const livekitHostAction = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => ActionSchema.parse(input)).handler(createSsrRpc("a58582f36b8a420b4797fa6b9ca4c9d7966dca0530a335d405e575d572fa1435"));
const pdfWorkerUrl = "/assets/pdf.worker.min-CjEcRF4W.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const COLORS = ["#ffffff", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#ec4899", "#a855f7", "#000000"];
const GRID = 20;
const imgCache = /* @__PURE__ */ new Map();
function getImg(src, onLoad) {
  let img = imgCache.get(src);
  if (img) return img;
  img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = onLoad;
  img.src = src;
  imgCache.set(src, img);
  return img;
}
function bboxOf(s) {
  if (s.type === "pen" || s.type === "eraser") {
    if (!s.points.length) return { x: 0, y: 0, w: 1, h: 1 };
    const xs = s.points.map((p) => p.x), ys = s.points.map((p) => p.y);
    const x2 = Math.min(...xs), y2 = Math.min(...ys);
    return { x: x2, y: y2, w: Math.max(1, Math.max(...xs) - x2), h: Math.max(1, Math.max(...ys) - y2) };
  }
  if (s.type === "text") {
    const w = s.w ?? Math.max(20, s.text.length * s.size * 3.5);
    const h = s.h ?? Math.max(12, s.size * 6);
    return { x: s.at.x, y: s.at.y, w, h };
  }
  if (s.type === "image") return { x: s.at.x, y: s.at.y, w: s.w, h: s.h };
  const ls = s;
  const x = Math.min(ls.from.x, ls.to.x), y = Math.min(ls.from.y, ls.to.y);
  return { x, y, w: Math.max(1, Math.abs(ls.to.x - ls.from.x)), h: Math.max(1, Math.abs(ls.to.y - ls.from.y)) };
}
function centerOf(s) {
  const b = bboxOf(s);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}
function transformShape(s, sx, sy, ox, oy, dx, dy) {
  const tx = (p) => ({ x: (p.x - ox) * sx + ox + dx, y: (p.y - oy) * sy + oy + dy });
  if (s.type === "pen" || s.type === "eraser") return { ...s, points: s.points.map(tx) };
  if (s.type === "text") {
    const at = tx(s.at);
    const b = bboxOf(s);
    return { ...s, at, w: b.w * Math.abs(sx), h: b.h * Math.abs(sy), size: Math.max(1, s.size * Math.abs(sy)) };
  }
  if (s.type === "image") {
    const at = tx(s.at);
    return { ...s, at, w: s.w * Math.abs(sx), h: s.h * Math.abs(sy) };
  }
  const ls = s;
  return { ...ls, from: tx(ls.from), to: tx(ls.to) };
}
function moveShape(s, dx, dy) {
  return transformShape(s, 1, 1, 0, 0, dx, dy);
}
function Whiteboard({ code }) {
  const canvasRef = useRef(null);
  const channelRef = useRef(null);
  const shapesRef = useRef([]);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const draftRef = useRef(null);
  const startRef = useRef(null);
  const fileRef = useRef(null);
  const pdfInputRef = useRef(null);
  const dragRef = useRef(null);
  const erasingRef = useRef(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(3);
  const [filled, setFilled] = useState(false);
  const [snap, setSnap] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const showGridRef = useRef(showGrid);
  showGridRef.current = showGrid;
  function snapP(p) {
    if (!snapRef.current) return p;
    return { x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID };
  }
  function pushHistory() {
    undoStackRef.current.push(JSON.parse(JSON.stringify(shapesRef.current)));
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
  }
  function redraw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#15171c";
    ctx.fillRect(0, 0, c.width, c.height);
    if (showGridRef.current) drawGrid(ctx, c.width, c.height);
    for (const s of shapesRef.current) drawWithRotation(ctx, s);
    if (draftRef.current) drawWithRotation(ctx, draftRef.current);
    const sel = shapesRef.current.find((s) => s.id === selectedIdRef.current);
    if (sel) drawSelection(ctx, sel);
  }
  function drawGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += GRID) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += GRID) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawWithRotation(ctx, s) {
    const rot = s.rotation ?? 0;
    if (!rot) return drawShape(ctx, s);
    const c = centerOf(s);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(rot);
    ctx.translate(-c.x, -c.y);
    drawShape(ctx, s);
    ctx.restore();
  }
  function drawShape(ctx, s) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (s.type === "pen" || s.type === "eraser") {
      if (s.points.length < 1) return;
      if (s.type === "eraser") ctx.strokeStyle = "#15171c";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
    } else if (s.type === "line") {
      ctx.beginPath();
      ctx.moveTo(s.from.x, s.from.y);
      ctx.lineTo(s.to.x, s.to.y);
      ctx.stroke();
    } else if (s.type === "arrow") {
      ctx.beginPath();
      ctx.moveTo(s.from.x, s.from.y);
      ctx.lineTo(s.to.x, s.to.y);
      ctx.stroke();
      const ang = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x);
      const h = 10 + s.size * 2;
      ctx.beginPath();
      ctx.moveTo(s.to.x, s.to.y);
      ctx.lineTo(s.to.x - h * Math.cos(ang - Math.PI / 6), s.to.y - h * Math.sin(ang - Math.PI / 6));
      ctx.moveTo(s.to.x, s.to.y);
      ctx.lineTo(s.to.x - h * Math.cos(ang + Math.PI / 6), s.to.y - h * Math.sin(ang + Math.PI / 6));
      ctx.stroke();
    } else if (s.type === "rect") {
      const x = Math.min(s.from.x, s.to.x), y = Math.min(s.from.y, s.to.y);
      const w = Math.abs(s.to.x - s.from.x), h = Math.abs(s.to.y - s.from.y);
      if (s.fill) {
        ctx.fillStyle = s.fill;
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeRect(x, y, w, h);
    } else if (s.type === "ellipse") {
      const cx = (s.from.x + s.to.x) / 2, cy = (s.from.y + s.to.y) / 2;
      const rx = Math.abs(s.to.x - s.from.x) / 2, ry = Math.abs(s.to.y - s.from.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (s.fill) {
        ctx.fillStyle = s.fill;
        ctx.fill();
      }
      ctx.stroke();
    } else if (s.type === "triangle") {
      const x1 = s.from.x, y1 = s.to.y;
      const x2 = s.to.x, y2 = s.to.y;
      const x3 = (s.from.x + s.to.x) / 2, y3 = s.from.y;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      if (s.fill) {
        ctx.fillStyle = s.fill;
        ctx.fill();
      }
      ctx.stroke();
    } else if (s.type === "text") {
      ctx.fillStyle = s.color;
      ctx.font = `${Math.max(12, s.size * 6)}px system-ui, sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(s.text, s.at.x, s.at.y);
    } else if (s.type === "image") {
      const img = getImg(s.src, redraw);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, s.at.x, s.at.y, s.w, s.h);
    }
  }
  function handlesFor(s) {
    const b = bboxOf(s);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    return [
      { key: "nw", x: b.x, y: b.y },
      { key: "n", x: cx, y: b.y },
      { key: "ne", x: b.x + b.w, y: b.y },
      { key: "e", x: b.x + b.w, y: cy },
      { key: "se", x: b.x + b.w, y: b.y + b.h },
      { key: "s", x: cx, y: b.y + b.h },
      { key: "sw", x: b.x, y: b.y + b.h },
      { key: "w", x: b.x, y: cy },
      { key: "rot", x: cx, y: b.y - 24 }
    ];
  }
  function drawSelection(ctx, s) {
    const b = bboxOf(s);
    const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const rot = s.rotation ?? 0;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(rot);
    ctx.translate(-c.x, -c.y);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(c.x, b.y);
    ctx.lineTo(c.x, b.y - 24);
    ctx.stroke();
    for (const h of handlesFor(s)) {
      ctx.fillStyle = h.key === "rot" ? "#22c55e" : "#3b82f6";
      ctx.beginPath();
      if (h.key === "rot") ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
      else ctx.rect(h.x - 4, h.y - 4, 8, 8);
      ctx.fill();
    }
    ctx.restore();
  }
  function localPoint(s, p) {
    const rot = s.rotation ?? 0;
    if (!rot) return p;
    const c = centerOf(s);
    const cos = Math.cos(-rot), sin = Math.sin(-rot);
    const dx = p.x - c.x, dy = p.y - c.y;
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
  }
  function hitHandle(s, p) {
    const lp = localPoint(s, p);
    for (const h of handlesFor(s)) {
      const r = h.key === "rot" ? 8 : 6;
      if (Math.abs(lp.x - h.x) <= r && Math.abs(lp.y - h.y) <= r) return h.key;
    }
    return null;
  }
  function hitShape(p) {
    for (let i = shapesRef.current.length - 1; i >= 0; i--) {
      const s = shapesRef.current[i];
      const lp = localPoint(s, p);
      const b = bboxOf(s);
      if (lp.x >= b.x - 4 && lp.x <= b.x + b.w + 4 && lp.y >= b.y - 4 && lp.y <= b.y + b.h + 4) return s;
    }
    return null;
  }
  function distToSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const cx = a.x + t * dx, cy = a.y + t * dy;
    return Math.hypot(p.x - cx, p.y - cy);
  }
  function shapeNearPoint(s, p, tol) {
    const lp = localPoint(s, p);
    if (s.type === "pen" || s.type === "eraser") {
      const r = tol + s.size;
      if (s.points.length === 1) return Math.hypot(lp.x - s.points[0].x, lp.y - s.points[0].y) <= r;
      for (let i = 1; i < s.points.length; i++) {
        if (distToSeg(lp, s.points[i - 1], s.points[i]) <= r) return true;
      }
      return false;
    }
    const b = bboxOf(s);
    return lp.x >= b.x - tol && lp.x <= b.x + b.w + tol && lp.y >= b.y - tol && lp.y <= b.y + b.h + tol;
  }
  function bboxGap(a, b) {
    const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
    return Math.hypot(dx, dy);
  }
  function clusterOf(seed) {
    if (seed.type !== "pen") return [seed];
    const group = [seed];
    const ids = /* @__PURE__ */ new Set([seed.id]);
    let grew = true;
    const GAP = 18;
    while (grew) {
      grew = false;
      for (const s of shapesRef.current) {
        if (ids.has(s.id) || s.type !== "pen") continue;
        const sb = bboxOf(s);
        if (group.some((g) => bboxGap(bboxOf(g), sb) <= GAP)) {
          group.push(s);
          ids.add(s.id);
          grew = true;
        }
      }
    }
    return group;
  }
  function eraseAt(p, tol) {
    for (let i = shapesRef.current.length - 1; i >= 0; i--) {
      const s = shapesRef.current[i];
      if (!shapeNearPoint(s, p, tol)) continue;
      const group = clusterOf(s);
      pushHistory();
      const ids = new Set(group.map((g) => g.id));
      shapesRef.current = shapesRef.current.filter((sh) => !ids.has(sh.id));
      for (const id of ids) broadcastRemove(id);
      if (selectedIdRef.current && ids.has(selectedIdRef.current)) setSelectedId(null);
      redraw();
      return true;
    }
    return false;
  }
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => {
      const r = c.parentElement.getBoundingClientRect();
      c.width = r.width;
      c.height = r.height;
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    const ch = supabase.channel(`whiteboard:${code}`);
    channelRef.current = ch;
    ch.on("broadcast", { event: "shape" }, ({ payload }) => {
      shapesRef.current.push(payload);
      redraw();
    });
    ch.on("broadcast", { event: "update" }, ({ payload }) => {
      const s = payload;
      const i = shapesRef.current.findIndex((x) => x.id === s.id);
      if (i >= 0) shapesRef.current[i] = s;
      redraw();
    });
    ch.on("broadcast", { event: "remove" }, ({ payload }) => {
      shapesRef.current = shapesRef.current.filter((s) => s.id !== payload.id);
      if (selectedIdRef.current === payload.id) setSelectedId(null);
      redraw();
    });
    ch.on("broadcast", { event: "clear" }, () => {
      shapesRef.current = [];
      setSelectedId(null);
      redraw();
    });
    ch.on("broadcast", { event: "sync_request" }, () => {
      ch.send({ type: "broadcast", event: "sync_state", payload: shapesRef.current });
    });
    ch.on("broadcast", { event: "sync_state" }, ({ payload }) => {
      if (Array.isArray(payload)) {
        shapesRef.current = payload;
        redraw();
      }
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") ch.send({ type: "broadcast", event: "sync_request", payload: {} });
    });
    return () => {
      window.removeEventListener("resize", resize);
      ch.unsubscribe();
      supabase.removeChannel(ch);
    };
  }, [code]);
  useEffect(() => {
    redraw();
  }, [selectedId, showGrid]);
  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
        removeSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function pos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function broadcastUpdate(s) {
    channelRef.current?.send({ type: "broadcast", event: "update", payload: s });
  }
  function broadcastRemove(id) {
    channelRef.current?.send({ type: "broadcast", event: "remove", payload: { id } });
  }
  function commit(s) {
    pushHistory();
    shapesRef.current.push(s);
    channelRef.current?.send({ type: "broadcast", event: "shape", payload: s });
    redraw();
  }
  function onDown(e) {
    e.target.setPointerCapture(e.pointerId);
    const rawP = pos(e);
    const p = snapP(rawP);
    if (tool === "select") {
      const sel = shapesRef.current.find((s) => s.id === selectedIdRef.current);
      if (sel) {
        const h = hitHandle(sel, rawP);
        if (h) {
          dragRef.current = { handle: h, startP: rawP, original: JSON.parse(JSON.stringify(sel)) };
          pushHistory();
          return;
        }
      }
      const hit = hitShape(rawP);
      if (hit) {
        setSelectedId(hit.id);
        dragRef.current = { handle: "move", startP: rawP, original: JSON.parse(JSON.stringify(hit)) };
        pushHistory();
      } else setSelectedId(null);
      return;
    }
    if (tool === "eraser") {
      erasingRef.current = true;
      eraseAt(rawP, Math.max(6, size * 2));
      return;
    }
    const id = generateUUID();
    if (tool === "pen") {
      draftRef.current = { id, type: tool, color, size, points: [p] };
    } else if (tool === "text") {
      const text = window.prompt("النص:");
      if (text) commit({ id, type: "text", color, size, at: p, text });
      return;
    } else if (tool === "image") {
      fileRef.current?.click();
      startRef.current = p;
      return;
    } else if (tool === "pdf") {
      pdfInputRef.current?.click();
      startRef.current = p;
      return;
    } else {
      startRef.current = p;
      const base = { id, color, size, from: p, to: p, fill: filled ? color : void 0 };
      if (tool === "line" || tool === "arrow") draftRef.current = { ...base, type: tool };
      else if (tool === "rect") draftRef.current = { ...base, type: "rect" };
      else if (tool === "ellipse") draftRef.current = { ...base, type: "ellipse" };
      else if (tool === "triangle") draftRef.current = { ...base, type: "triangle" };
    }
    redraw();
  }
  function onMove(e) {
    const rawP = pos(e);
    if (erasingRef.current) {
      eraseAt(rawP, Math.max(6, size * 2));
      return;
    }
    if (dragRef.current) {
      const { handle, startP, original } = dragRef.current;
      const idx = shapesRef.current.findIndex((s) => s.id === original.id);
      if (idx < 0) return;
      const b = bboxOf(original);
      let updated;
      if (handle === "move") {
        let dx = rawP.x - startP.x, dy = rawP.y - startP.y;
        if (snapRef.current) {
          dx = Math.round((b.x + dx) / GRID) * GRID - b.x;
          dy = Math.round((b.y + dy) / GRID) * GRID - b.y;
        }
        updated = moveShape(original, dx, dy);
      } else if (handle === "rot") {
        const c = centerOf(original);
        const ang = Math.atan2(rawP.y - c.y, rawP.x - c.x) + Math.PI / 2;
        updated = { ...original, rotation: snapRef.current ? Math.round(ang / (Math.PI / 12)) * (Math.PI / 12) : ang };
      } else {
        const anchorX = handle.includes("w") ? b.x + b.w : handle.includes("e") ? b.x : b.x + b.w / 2;
        const anchorY = handle.includes("n") ? b.y + b.h : handle.includes("s") ? b.y : b.y + b.h / 2;
        const affectX = handle.includes("e") || handle.includes("w");
        const affectY = handle.includes("n") || handle.includes("s");
        const rot = original.rotation ?? 0;
        const cos = Math.cos(-rot), sin = Math.sin(-rot);
        const c = centerOf(original);
        const lp = {
          x: c.x + (rawP.x - c.x) * cos - (rawP.y - c.y) * sin,
          y: c.y + (rawP.x - c.x) * sin + (rawP.y - c.y) * cos
        };
        const newW = affectX ? Math.max(4, Math.abs(lp.x - anchorX)) : b.w;
        const newH = affectY ? Math.max(4, Math.abs(lp.y - anchorY)) : b.h;
        const sx = newW / b.w, sy = newH / b.h;
        updated = transformShape(original, sx, sy, anchorX, anchorY, 0, 0);
      }
      shapesRef.current[idx] = updated;
      redraw();
      broadcastUpdate(updated);
      return;
    }
    if (!draftRef.current) return;
    const p = snapP(rawP);
    const d = draftRef.current;
    if (d.type === "pen" || d.type === "eraser") d.points.push(p);
    else if ("to" in d) d.to = p;
    redraw();
  }
  function onUp() {
    if (erasingRef.current) {
      erasingRef.current = false;
      return;
    }
    if (dragRef.current) {
      dragRef.current = null;
      return;
    }
    const d = draftRef.current;
    draftRef.current = null;
    startRef.current = null;
    if (!d) return;
    commit(d);
  }
  function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current;
        const maxW = c.width * 0.5;
        const scale = Math.min(1, maxW / img.width);
        const w = img.width * scale, h = img.height * scale;
        const at = startRef.current ?? { x: (c.width - w) / 2, y: (c.height - h) / 2 };
        commit({ id: generateUUID(), type: "image", color, size, at, w, h, src });
        startRef.current = null;
      };
      img.src = src;
    };
    reader.readAsDataURL(f);
  }
  async function onPdfFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const c = canvasRef.current;
      const maxW = Math.min(c.width * 0.6, 800);
      const start = startRef.current ?? { x: 40, y: 40 };
      startRef.current = null;
      let cursorY = start.y;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp1 = page.getViewport({ scale: 1 });
        const scale = Math.min(2, maxW / vp1.width);
        const vp = page.getViewport({ scale });
        const off = document.createElement("canvas");
        off.width = Math.ceil(vp.width);
        off.height = Math.ceil(vp.height);
        const octx = off.getContext("2d");
        octx.fillStyle = "#ffffff";
        octx.fillRect(0, 0, off.width, off.height);
        await page.render({ canvasContext: octx, viewport: vp, canvas: off }).promise;
        const src = off.toDataURL("image/png");
        const w = off.width, h = off.height;
        commit({ id: generateUUID(), type: "image", color, size, at: { x: start.x, y: cursorY }, w, h, src });
        cursorY += h + 16;
      }
    } catch (err) {
      console.error("PDF load failed", err);
      window.alert("تعذر تحميل ملف PDF");
    }
  }
  function undo() {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(JSON.parse(JSON.stringify(shapesRef.current)));
    shapesRef.current = prev;
    channelRef.current?.send({ type: "broadcast", event: "sync_state", payload: shapesRef.current });
    redraw();
  }
  function redo() {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(JSON.parse(JSON.stringify(shapesRef.current)));
    shapesRef.current = next;
    channelRef.current?.send({ type: "broadcast", event: "sync_state", payload: shapesRef.current });
    redraw();
  }
  function clearAll() {
    if (!window.confirm("مسح جميع المحتوى؟")) return;
    pushHistory();
    shapesRef.current = [];
    setSelectedId(null);
    redraw();
    channelRef.current?.send({ type: "broadcast", event: "clear", payload: {} });
  }
  function removeSelected() {
    const id = selectedIdRef.current;
    if (!id) return;
    pushHistory();
    shapesRef.current = shapesRef.current.filter((s) => s.id !== id);
    setSelectedId(null);
    broadcastRemove(id);
    redraw();
  }
  function download() {
    const c = canvasRef.current;
    const a = document.createElement("a");
    a.download = `whiteboard-${code}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }
  function align(dir) {
    const id = selectedIdRef.current;
    if (!id) return;
    const c = canvasRef.current;
    const idx = shapesRef.current.findIndex((s2) => s2.id === id);
    if (idx < 0) return;
    const s = shapesRef.current[idx];
    const b = bboxOf(s);
    let dx = 0, dy = 0;
    if (dir === "l") dx = -b.x;
    else if (dir === "cx") dx = (c.width - b.w) / 2 - b.x;
    else if (dir === "r") dx = c.width - (b.x + b.w);
    else if (dir === "t") dy = -b.y;
    else if (dir === "cy") dy = (c.height - b.h) / 2 - b.y;
    else if (dir === "b") dy = c.height - (b.y + b.h);
    pushHistory();
    const updated = moveShape(s, dx, dy);
    shapesRef.current[idx] = updated;
    broadcastUpdate(updated);
    redraw();
  }
  function rotateSelected(deg) {
    const id = selectedIdRef.current;
    if (!id) return;
    const idx = shapesRef.current.findIndex((s2) => s2.id === id);
    if (idx < 0) return;
    pushHistory();
    const s = shapesRef.current[idx];
    const updated = { ...s, rotation: (s.rotation ?? 0) + deg * Math.PI / 180 };
    shapesRef.current[idx] = updated;
    broadcastUpdate(updated);
    redraw();
  }
  function recolorSelected(c) {
    setColor(c);
    const id = selectedIdRef.current;
    if (!id) return;
    const idx = shapesRef.current.findIndex((s2) => s2.id === id);
    if (idx < 0) return;
    pushHistory();
    const s = shapesRef.current[idx];
    const updated = { ...s, color: c, ..."fill" in s && s.fill ? { fill: c } : {} };
    shapesRef.current[idx] = updated;
    broadcastUpdate(updated);
    redraw();
  }
  const ToolBtn = ({ t, icon: Icon, label }) => /* @__PURE__ */ jsx(
    "button",
    {
      onClick: () => setTool(t),
      title: label,
      className: `grid h-8 w-8 place-items-center rounded-xl transition-all ${tool === t ? "bg-primary text-white shadow-md shadow-primary/30 scale-105" : "text-white/70 hover:text-white hover:bg-white/[0.08]"}`,
      children: /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" })
    }
  );
  const IconBtn = ({
    onClick,
    title,
    icon: Icon,
    active,
    danger
  }) => /* @__PURE__ */ jsx(
    "button",
    {
      onClick,
      title,
      className: `grid h-8 w-8 place-items-center rounded-xl transition-all ${active ? "bg-primary text-white shadow-md shadow-primary/30" : danger ? "text-red-400 hover:bg-red-500/20 hover:text-red-300" : "text-white/70 hover:text-white hover:bg-white/[0.08]"}`,
      children: /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" })
    }
  );
  const hasSelection = !!selectedId;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col bg-[#0e1017]", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-1 border-b border-white/[0.08] bg-[#0c0d14]/90 backdrop-blur-md p-2", dir: "rtl", children: [
      /* @__PURE__ */ jsx(ToolBtn, { t: "select", icon: MousePointer2, label: "تحديد" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "pen", icon: Pencil, label: "قلم" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "eraser", icon: Eraser, label: "ممحاة" }),
      /* @__PURE__ */ jsx("div", { className: "mx-1 h-5 w-px bg-white/10" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "line", icon: Minus, label: "خط" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "arrow", icon: ArrowRight, label: "سهم" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "rect", icon: Square, label: "مستطيل" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "ellipse", icon: Circle, label: "دائرة" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "triangle", icon: Triangle, label: "مثلث" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "text", icon: Type, label: "نص" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "image", icon: Image$1, label: "صورة" }),
      /* @__PURE__ */ jsx(ToolBtn, { t: "pdf", icon: FileText, label: "PDF" }),
      /* @__PURE__ */ jsx("div", { className: "mx-1 h-5 w-px bg-white/10" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setFilled((v) => !v),
          title: "تعبئة",
          className: `rounded-xl px-2.5 py-1 text-xs font-semibold transition ${filled ? "bg-primary text-white shadow-sm" : "text-white/70 hover:bg-white/[0.08]"}`,
          children: "تعبئة"
        }
      ),
      /* @__PURE__ */ jsx(IconBtn, { onClick: () => setSnap((v) => !v), title: "الالتقاط للشبكة", icon: Grid3x3, active: snap }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setShowGrid((v) => !v),
          title: "عرض الشبكة",
          className: `rounded-xl px-2.5 py-1 text-xs font-semibold transition ${showGrid ? "bg-primary text-white shadow-sm" : "text-white/70 hover:bg-white/[0.08]"}`,
          children: "شبكة"
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "mx-1 h-5 w-px bg-white/10" }),
      /* @__PURE__ */ jsx(Palette, { className: "h-4 w-4 text-white/50" }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1", children: COLORS.map((c) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => recolorSelected(c),
          className: `h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-primary scale-110 shadow-sm" : "border-white/20"}`,
          style: { background: c }
        },
        c
      )) }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "range",
          min: 1,
          max: 30,
          value: size,
          onChange: (e) => setSize(+e.target.value),
          className: "w-16 accent-primary",
          title: `سمك: ${size}`
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "mx-1 h-5 w-px bg-white/10" }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: undo, title: "تراجع", icon: Undo2 }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: redo, title: "إعادة", icon: Redo2 }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: download, title: "تنزيل كصورة", icon: Download }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: clearAll, title: "مسح الكل", icon: Trash2, danger: true })
    ] }),
    hasSelection && /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-1 border-b border-white/[0.08] bg-primary/10 px-3 py-1.5", dir: "rtl", children: [
      /* @__PURE__ */ jsx("span", { className: "mx-2 text-xs text-white/60", children: "المحدد:" }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: () => align("l"), title: "محاذاة يسار", icon: AlignHorizontalJustifyStart }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: () => align("cx"), title: "توسيط أفقي", icon: AlignHorizontalJustifyCenter }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: () => align("r"), title: "محاذاة يمين", icon: AlignHorizontalJustifyEnd }),
      /* @__PURE__ */ jsx("div", { className: "mx-1 h-5 w-px bg-white/10" }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: () => align("t"), title: "محاذاة أعلى", icon: AlignVerticalJustifyStart }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: () => align("cy"), title: "توسيط عمودي", icon: AlignVerticalJustifyCenter }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: () => align("b"), title: "محاذاة أسفل", icon: AlignVerticalJustifyEnd }),
      /* @__PURE__ */ jsx("div", { className: "mx-1 h-5 w-px bg-white/10" }),
      /* @__PURE__ */ jsx(IconBtn, { onClick: () => rotateSelected(-15), title: "تدوير -15°", icon: RotateCw }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => rotateSelected(15),
          title: "تدوير +15°",
          className: "rounded p-1.5 hover:bg-white/10",
          children: /* @__PURE__ */ jsx(RotateCw, { className: "h-4 w-4 -scale-x-100" })
        }
      ),
      /* @__PURE__ */ jsx("button", { onClick: () => rotateSelected(90), className: "rounded px-2 py-1 text-xs hover:bg-white/10", children: "90°" }),
      /* @__PURE__ */ jsx("button", { onClick: () => {
        const id = selectedIdRef.current;
        if (!id) return;
        const idx = shapesRef.current.findIndex((s) => s.id === id);
        if (idx < 0) return;
        pushHistory();
        const upd = { ...shapesRef.current[idx], rotation: 0 };
        shapesRef.current[idx] = upd;
        broadcastUpdate(upd);
        redraw();
      }, className: "rounded px-2 py-1 text-xs hover:bg-white/10", children: "تصفير الدوران" }),
      /* @__PURE__ */ jsx("button", { onClick: removeSelected, className: "mr-auto rounded p-1.5 text-red-400 hover:bg-white/10", title: "حذف", children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsx("input", { ref: fileRef, type: "file", accept: "image/*", className: "hidden", onChange: onFile }),
    /* @__PURE__ */ jsx("input", { ref: pdfInputRef, type: "file", accept: "application/pdf,.pdf", className: "hidden", onChange: onPdfFile }),
    /* @__PURE__ */ jsx("div", { className: "relative flex-1 bg-[#15171c]", children: /* @__PURE__ */ jsx(
      "canvas",
      {
        ref: canvasRef,
        onPointerDown: onDown,
        onPointerMove: onMove,
        onPointerUp: onUp,
        onPointerCancel: onUp,
        className: `absolute inset-0 touch-none ${tool === "select" ? "cursor-default" : "cursor-crosshair"}`
      }
    ) })
  ] });
}
function InviteModal({ code, title, onClose }) {
  const [copied, setCopied] = useState(null);
  const [emails, setEmails] = useState("");
  const link = meetingUrl(code);
  function copy(text, what) {
    navigator.clipboard.writeText(text);
    setCopied(what);
    toast.success("تم النسخ");
    setTimeout(() => setCopied(null), 1500);
  }
  function sendEmails() {
    const list = emails.split(/[,\s;]+/).map((e) => e.trim()).filter(Boolean);
    if (!list.length) return toast.error("أدخل بريداً واحداً على الأقل");
    const subject = encodeURIComponent(`دعوة للانضمام لاجتماع: ${title}`);
    const body = encodeURIComponent(`أنت مدعو للانضمام للاجتماع "${title}".

الرابط: ${link}
كود الاجتماع: ${code}`);
    window.location.href = `mailto:${list.join(",")}?subject=${subject}&body=${body}`;
  }
  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `دعوة: ${title}`, text: `انضم للاجتماع: ${code}`, url: link });
      } catch {
      }
    } else {
      copy(link, "link");
    }
  }
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200", onClick: onClose, dir: "rtl", children: /* @__PURE__ */ jsxs(
    "div",
    {
      onClick: (e) => e.stopPropagation(),
      className: "w-full max-w-md rounded-3xl border border-white/10 bg-[#0e1017]/95 p-6 sm:p-7 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-white/[0.08]", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-primary/30 to-accent/20 border border-primary/40 text-primary", children: /* @__PURE__ */ jsx(Share2, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h2", { className: "text-base sm:text-lg font-bold", children: "دعوة مشاركين" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-white/50 truncate max-w-[240px]", children: title })
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onClose,
              className: "grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition",
              children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-5 space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1.5 block text-xs font-medium text-white/70", children: "رابط الاجتماع المباشر" }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  readOnly: true,
                  value: link,
                  className: "flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white/90 outline-none select-all"
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => copy(link, "link"),
                  className: "flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all",
                  children: [
                    copied === "link" ? /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5 text-emerald-300" }) : /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }),
                    copied === "link" ? "تم" : "نسخ"
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1.5 block text-xs font-medium text-white/70", children: "كود الدخول" }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  readOnly: true,
                  value: code,
                  className: "flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 font-mono text-sm tracking-widest text-primary font-bold outline-none select-all"
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => copy(code, "code"),
                  className: "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 active:scale-95 transition-all",
                  children: [
                    copied === "code" ? /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5 text-emerald-300" }) : /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }),
                    copied === "code" ? "تم" : "نسخ"
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1.5 block text-xs font-medium text-white/70", children: "دعوة عبر البريد الإلكتروني" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                value: emails,
                onChange: (e) => setEmails(e.target.value),
                placeholder: "name@company.com, coworker@domain.com",
                rows: 2,
                className: "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: sendEmails,
                className: "mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white/90 hover:bg-white/10 hover:border-white/20 transition-all",
                children: [
                  /* @__PURE__ */ jsx(Mail, { className: "h-4 w-4 text-primary" }),
                  " إرسال عبر تطبيق البريد"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "pt-2", children: /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: nativeShare,
              className: "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:brightness-110 active:scale-[0.99] transition-all",
              children: [
                /* @__PURE__ */ jsx(Share2, { className: "h-4 w-4" }),
                " مشاركة الرابط مع الآخرين"
              ]
            }
          ) })
        ] })
      ]
    }
  ) });
}
function ChatPanel({
  code,
  selfId,
  selfName,
  isHost,
  roomLabel
}) {
  const [msgs, setMsgs] = useState([]);
  const [peers, setPeers] = useState([]);
  const [customRooms, setCustomRooms] = useState([]);
  const [thread, setThread] = useState("public");
  const [text, setText] = useState("");
  const [unread, setUnread] = useState({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const chRef = useRef(null);
  const bottomRef = useRef(null);
  const threadRef = useRef(thread);
  threadRef.current = thread;
  const customRoomsRef = useRef([]);
  customRoomsRef.current = customRooms;
  const myCustomRooms = useMemo(() => {
    return customRooms.filter(
      (r) => r.createdBy === selfId || r.members.includes(selfId)
    );
  }, [customRooms, selfId]);
  useEffect(() => {
    setMsgs([]);
    setPeers([]);
    setThread("public");
    const ch = supabase.channel(`chat:${code}`, {
      config: { presence: { key: selfId } }
    });
    chRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setPeers(
        Object.entries(state).filter(([id]) => id !== selfId).map(([id, metas]) => ({
          id,
          name: metas[0]?.name ?? "ضيف",
          isHost: !!metas[0]?.isHost
        }))
      );
      if (isHost && customRoomsRef.current.length > 0) {
        ch.send({
          type: "broadcast",
          event: "rooms_sync",
          payload: { rooms: customRoomsRef.current }
        });
      }
    });
    ch.on("broadcast", { event: "msg" }, ({ payload }) => {
      const m = payload;
      if (m.roomId) {
        const targetRoom = customRoomsRef.current.find((r) => r.id === m.roomId);
        if (!targetRoom || !targetRoom.members.includes(selfId) && targetRoom.createdBy !== selfId) {
          return;
        }
      } else if (m.to && m.to !== selfId && m.from !== selfId) {
        return;
      }
      setMsgs((prev) => [...prev, m]);
      const key = m.roomId ? m.roomId : m.to ? m.from === selfId ? m.to : m.from : "public";
      if (key !== threadRef.current && m.from !== selfId) {
        setUnread((u) => ({ ...u, [key]: (u[key] ?? 0) + 1 }));
      }
    });
    ch.on("broadcast", { event: "rooms_sync" }, ({ payload }) => {
      const incomingRooms = payload?.rooms ?? [];
      setCustomRooms(incomingRooms);
      incomingRooms.forEach((r) => {
        const wasIn = customRoomsRef.current.some((old) => old.id === r.id);
        if (!wasIn && r.members.includes(selfId) && r.createdBy !== selfId) {
          toast.info(`تمت إضافتك إلى دردشة خاصة جديدة: "${r.name}"`);
        }
      });
    });
    ch.on("broadcast", { event: "request_rooms" }, () => {
      if (isHost && customRoomsRef.current.length > 0) {
        ch.send({
          type: "broadcast",
          event: "rooms_sync",
          payload: { rooms: customRoomsRef.current }
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
  const visible = useMemo(() => {
    if (thread === "public") {
      return msgs.filter((m) => !m.to && !m.roomId);
    }
    const currentCustomRoom = myCustomRooms.find((r) => r.id === thread);
    if (currentCustomRoom) {
      return msgs.filter((m) => m.roomId === thread);
    }
    return msgs.filter(
      (m) => m.to && (m.from === thread || m.to === thread)
    );
  }, [msgs, thread, myCustomRooms]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible.length]);
  function openThread(key) {
    setThread(key);
    setUnread((u) => ({ ...u, [key]: 0 }));
  }
  function send() {
    const t = text.trim();
    if (!t || !chRef.current) return;
    const currentCustomRoom = myCustomRooms.find((r) => r.id === thread);
    const m = {
      id: generateUUID(),
      from: selfId,
      fromName: selfName,
      text: t,
      ts: Date.now(),
      isHost,
      ...currentCustomRoom ? { roomId: currentCustomRoom.id, roomName: currentCustomRoom.name } : thread === "public" ? {} : { to: thread }
    };
    chRef.current.send({ type: "broadcast", event: "msg", payload: m });
    setMsgs((prev) => [...prev, m]);
    setText("");
  }
  function broadcastRooms(updatedRooms) {
    setCustomRooms(updatedRooms);
    customRoomsRef.current = updatedRooms;
    if (chRef.current) {
      chRef.current.send({
        type: "broadcast",
        event: "rooms_sync",
        payload: { rooms: updatedRooms }
      });
    }
  }
  function handleOpenCreateModal() {
    setEditingRoomId(null);
    setNewRoomName("");
    setSelectedMemberIds([]);
    setCreateModalOpen(true);
  }
  function handleOpenEditModal(room) {
    setEditingRoomId(room.id);
    setNewRoomName(room.name);
    setSelectedMemberIds(room.members);
    setCreateModalOpen(true);
  }
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
      const updated = customRooms.map(
        (r) => r.id === editingRoomId ? { ...r, name, members: Array.from(/* @__PURE__ */ new Set([...selectedMemberIds, selfId])) } : r
      );
      broadcastRooms(updated);
      toast.success("تم تحديث أعضاء الدردشة الخاصة بنجاح");
    } else {
      const newRoom = {
        id: generateUUID(),
        name,
        createdBy: selfId,
        createdByName: selfName,
        members: Array.from(/* @__PURE__ */ new Set([...selectedMemberIds, selfId])),
        createdAt: Date.now()
      };
      const updated = [...customRooms, newRoom];
      broadcastRooms(updated);
      toast.success(`تم إنشاء الدردشة الخاصة "${name}" بنجاح`);
      openThread(newRoom.id);
    }
    setCreateModalOpen(false);
  }
  function handleDeleteRoom(roomId, roomName) {
    if (!confirm(`هل أنت متأكد من حذف الدردشة الخاصة "${roomName}"؟`)) return;
    const updated = customRooms.filter((r) => r.id !== roomId);
    broadcastRooms(updated);
    if (thread === roomId) {
      openThread("public");
    }
    toast.success("تم حذف الدردشة الخاصة");
  }
  function toggleMemberSelection(peerId) {
    setSelectedMemberIds(
      (prev) => prev.includes(peerId) ? prev.filter((id) => id !== peerId) : [...prev, peerId]
    );
  }
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
    const memberNames = peers.filter((p) => activeCustomRoom.members.includes(p.id)).map((p) => p.name);
    activeTitle = activeCustomRoom.name;
    activeSubtitle = `دردشة خاصة ومغلقة • الأعضاء: ${activeCustomRoom.members.length} مشارك (${[selfName, ...memberNames].slice(0, 3).join("، ")}${memberNames.length > 2 ? "..." : ""})`;
  } else if (thread !== "public") {
    const targetPeer = peers.find((p) => p.id === thread);
    activeTitle = targetPeer?.name ?? "دردشة خاصة";
    activeSubtitle = `دردشة فردية مشفرة ومحمية مع ${activeTitle}`;
  }
  return /* @__PURE__ */ jsxs("div", { className: "relative flex h-full flex-col bg-[#0e1017] text-white", dir: "rtl", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-white/[0.08] bg-black/30 px-3.5 py-2.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-primary", children: /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "text-xs font-bold text-white flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx("span", { children: "غرفة الدردشة" }),
            roomLabel && /* @__PURE__ */ jsx("span", { className: "rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80", children: roomLabel })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-white/50", children: [
            peers.length + 1,
            " متواجد حالياً"
          ] })
        ] })
      ] }),
      isHost && /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: handleOpenCreateModal,
          className: "flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-md shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all",
          title: "إنشاء دردشة خاصة جديدة تضم بعض أو كل المشتركين",
          children: [
            /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }),
            /* @__PURE__ */ jsx("span", { children: "دردشة خاصة" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5 overflow-x-auto border-b border-white/[0.08] p-2 bg-black/20 text-xs no-scrollbar", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => openThread("public"),
          className: `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold transition-all ${thread === "public" ? "bg-primary text-white shadow-md shadow-primary/30" : "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"}`,
          children: [
            /* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5" }),
            " عامة",
            !!unread["public"] && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-destructive px-1.5 py-0.2 text-[10px] font-bold text-white", children: unread["public"] })
          ]
        }
      ),
      myCustomRooms.map((r) => /* @__PURE__ */ jsx("div", { className: "relative flex shrink-0 items-center", children: /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => openThread(r.id),
          className: `flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold transition-all ${thread === r.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-white"}`,
          title: `دردشة خاصة تضم ${r.members.length} مشارك`,
          children: [
            /* @__PURE__ */ jsx(Lock, { className: "h-3.5 w-3.5 text-amber-400" }),
            /* @__PURE__ */ jsx("span", { className: "max-w-[110px] truncate", children: r.name }),
            /* @__PURE__ */ jsxs("span", { className: "text-[10px] opacity-75 font-mono", children: [
              "(",
              r.members.length,
              ")"
            ] }),
            !!unread[r.id] && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-destructive px-1.5 py-0.2 text-[10px] font-bold text-white", children: unread[r.id] })
          ]
        }
      ) }, r.id)),
      threadPeers.map((p) => /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => openThread(p.id),
          className: `flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-semibold transition-all ${thread === p.id ? "bg-primary text-white shadow-md shadow-primary/30" : "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"}`,
          children: [
            /* @__PURE__ */ jsx(Lock, { className: "h-3 w-3 text-white/50" }),
            /* @__PURE__ */ jsx("span", { className: "max-w-[90px] truncate", children: p.name }),
            !!unread[p.id] && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-destructive px-1.5 py-0.2 text-[10px] font-bold text-white", children: unread[p.id] })
          ]
        },
        p.id
      ))
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[11px] text-white/60", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [
        /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" }),
        /* @__PURE__ */ jsx("span", { className: "truncate", children: activeSubtitle })
      ] }),
      isHost && activeCustomRoom && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 shrink-0 mr-2", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => handleOpenEditModal(activeCustomRoom),
            className: "flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/10 hover:text-white transition",
            title: "تعديل الأعضاء أو اسم الدردشة",
            children: [
              /* @__PURE__ */ jsx(Settings2, { className: "h-3 w-3" }),
              /* @__PURE__ */ jsx("span", { children: "الأعضاء" })
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleDeleteRoom(activeCustomRoom.id, activeCustomRoom.name),
            className: "grid h-6 w-6 place-items-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition",
            title: "حذف هذه الدردشة الخاصة",
            children: /* @__PURE__ */ jsx(Trash2, { className: "h-3 w-3" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-3 overflow-y-auto p-3.5", children: [
      visible.length === 0 && /* @__PURE__ */ jsxs("div", { className: "pt-12 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.03] border border-white/10 text-white/30", children: /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsxs("p", { className: "mt-3 text-xs text-white/40", children: [
          'لا توجد رسائل بعد في "',
          activeTitle,
          '"'
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-[11px] text-white/30", children: "كن أول من يكتب في هذه المحادثة" })
      ] }),
      visible.map((m) => {
        const isMe = m.from === selfId;
        return /* @__PURE__ */ jsxs("div", { className: `flex flex-col ${isMe ? "items-start" : "items-end"}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-1 flex items-center gap-1.5 px-1 text-[10px] text-white/50", children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-white/80", children: m.fromName }),
            m.roomId && /* @__PURE__ */ jsxs("span", { className: "rounded bg-amber-500/20 border border-amber-500/30 px-1 py-0.2 text-amber-300 text-[9px] flex items-center gap-0.5", children: [
              /* @__PURE__ */ jsx(Lock, { className: "h-2.5 w-2.5" }),
              " خاص بالمجموعة"
            ] }),
            m.to && !m.roomId && /* @__PURE__ */ jsx("span", { className: "rounded bg-accent/20 px-1 py-0.2 text-accent text-[9px]", children: "فردي" }),
            /* @__PURE__ */ jsx("span", { children: "·" }),
            /* @__PURE__ */ jsx("span", { children: new Date(m.ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) })
          ] }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: `max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${isMe ? "rounded-tr-none bg-gradient-to-br from-primary to-indigo-600 text-white border border-white/15 shadow-primary/20" : "rounded-tl-none bg-white/[0.06] text-white/95 border border-white/[0.09] backdrop-blur-md"}`,
              children: /* @__PURE__ */ jsx("div", { className: "whitespace-pre-wrap break-words", children: m.text })
            }
          )
        ] }, m.id);
      }),
      /* @__PURE__ */ jsx("div", { ref: bottomRef })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "border-t border-white/[0.08] bg-[#0c0d14] p-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          value: text,
          onChange: (e) => setText(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          },
          placeholder: activeCustomRoom ? `رسالة خاصة في "${activeCustomRoom.name}"...` : thread === "public" ? "اكتب رسالة للجميع..." : `رسالة خاصة إلى ${activeTitle}...`,
          className: "flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 transition-all"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: send,
          disabled: !text.trim(),
          className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary active:scale-95 transition-all",
          children: /* @__PURE__ */ jsx(Send, { className: "h-4 w-4" })
        }
      )
    ] }) }),
    createModalOpen && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-sm rounded-3xl border border-white/15 bg-[#14161f] p-5 shadow-2xl flex flex-col max-h-[90%] overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-white/10", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-md", children: /* @__PURE__ */ jsx(Lock, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-white", children: editingRoomId ? "تعديل الدردشة الخاصة" : "إنشاء دردشة خاصة جديدة" }),
            /* @__PURE__ */ jsx("p", { className: "text-[11px] text-white/50", children: "حدد الأعضاء المسموح لهم برؤية والمشاركة في الدردشة" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setCreateModalOpen(false),
            className: "rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white",
            children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3.5 py-3 flex-1 overflow-y-auto", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "mb-1 block text-xs font-semibold text-white/80", children: "اسم الدردشة الخاصة" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              value: newRoomName,
              onChange: (e) => setNewRoomName(e.target.value),
              placeholder: "مثال: فريق الإدارة، لجنة التحكيم، سرية...",
              className: "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-primary"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxs("label", { className: "text-xs font-semibold text-white/80", children: [
              "اختيار الأعضاء (",
              selectedMemberIds.length,
              " من ",
              peers.length,
              ")"
            ] }),
            peers.length > 0 && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: toggleSelectAll,
                className: "text-[11px] font-bold text-primary hover:underline flex items-center gap-1",
                children: selectedMemberIds.length === peers.length ? /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(Square, { className: "h-3 w-3" }),
                  " إلغاء تحديد الكل"
                ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(CheckSquare, { className: "h-3 w-3" }),
                  " تحديد كل المشاركين"
                ] })
              }
            )
          ] }),
          peers.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/40", children: "لا يوجد مشاركون آخرون في الاجتماع حالياً" }) : /* @__PURE__ */ jsx("div", { className: "max-h-44 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-2", children: peers.map((p) => {
            const selected = selectedMemberIds.includes(p.id);
            return /* @__PURE__ */ jsxs(
              "div",
              {
                onClick: () => toggleMemberSelection(p.id),
                className: `flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition ${selected ? "bg-primary/20 text-white border border-primary/30" : "hover:bg-white/5 text-white/70 hover:text-white"}`,
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 truncate", children: [
                    /* @__PURE__ */ jsx("span", { className: "grid h-6 w-6 place-items-center rounded-full bg-white/10 font-bold text-[10px]", children: p.name.charAt(0).toUpperCase() }),
                    /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: p.name }),
                    p.isHost && /* @__PURE__ */ jsx("span", { className: "rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300", children: "مضيف" })
                  ] }),
                  selected ? /* @__PURE__ */ jsx(CheckSquare, { className: "h-4 w-4 text-primary shrink-0" }) : /* @__PURE__ */ jsx(Square, { className: "h-4 w-4 text-white/30 shrink-0" })
                ]
              },
              p.id
            );
          }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 pt-2 border-t border-white/10", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setCreateModalOpen(false),
            className: "flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white hover:bg-white/10 transition",
            children: "إلغاء"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: handleSaveRoom,
            className: "flex-1 rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-2 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 transition",
            children: editingRoomId ? "حفظ التعديلات" : "إنشاء وبدء الدردشة"
          }
        )
      ] })
    ] }) })
  ] });
}
const RowSchema = z.object({
  name: z.string().max(80),
  group: z.number().int().min(0).max(20),
  joinedAt: z.string().max(40).optional(),
  speakingMinutes: z.number().min(0).max(1e5).optional(),
  screenShares: z.number().int().min(0).max(1e4).optional()
});
const InputSchema = z.object({
  room: z.string().min(1).max(64),
  title: z.string().max(200).optional(),
  rows: z.array(RowSchema).max(300)
});
const saveBreakoutReport = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((input) => InputSchema.parse(input)).handler(createSsrRpc("98f6affcc01edf6cf350ae712cebdfbf242653529cfdca582e96c1e896f5f343"));
function BreakoutPanel({
  code,
  selfGroup,
  onJoinGroup
}) {
  const participants = useParticipants();
  const [groups, setGroups] = useState(2);
  const [assignments, setAssignments] = useState({});
  const [entryTimes, setEntryTimes] = useState({});
  const [announce, setAnnounce] = useState("");
  const [dragOver, setDragOver] = useState(null);
  const [view, setView] = useState("rooms");
  const [saving, setSaving] = useState(false);
  const chRef = useRef(null);
  const statsRef = useRef({});
  useEffect(() => {
    const ch = supabase.channel(`breakout:${code}`);
    chRef.current = ch;
    ch.subscribe();
    return () => {
      ch.unsubscribe();
      supabase.removeChannel(ch);
      chRef.current = null;
    };
  }, [code]);
  const partsRef = useRef(participants);
  partsRef.current = participants;
  useEffect(() => {
    const t = setInterval(() => {
      for (const p of partsRef.current) {
        const n = p.name || p.identity;
        if (!n) continue;
        const s = statsRef.current[n] ||= { speakSec: 0, shares: 0, sharing: false };
        if (p.isSpeaking) s.speakSec += 1;
        const sharing = !!p.isScreenShareEnabled;
        if (sharing && !s.sharing) s.shares += 1;
        s.sharing = sharing;
      }
    }, 1e3);
    return () => clearInterval(t);
  }, []);
  function copyInvite(g) {
    navigator.clipboard.writeText(meetingUrl(code, g));
    toast.success(g ? `نُسخ رابط دعوة مجموعة ${g}` : "نُسخ رابط الاجتماع");
  }
  const names = participants.map((p) => p.name || p.identity).filter(Boolean);
  const roomsList = [0, ...Array.from({ length: groups }, (_, i) => i + 1)];
  function setFor(name, g) {
    setAssignments((a) => ({ ...a, [name]: g }));
  }
  function autoSplit() {
    const next = {};
    names.forEach((n, i) => {
      next[n] = i % groups + 1;
    });
    setAssignments(next);
    toast.success(`تم توزيع ${names.length} مشاركاً على ${groups} مجموعات`);
  }
  function apply() {
    chRef.current?.send({ type: "broadcast", event: "assign", payload: { assignments, groups } });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    setEntryTimes((prev) => {
      const next = { ...prev };
      for (const n of names) if ((assignments[n] ?? 0) !== 0 && !next[n]) next[n] = now;
      return next;
    });
    toast.success("تم فتح المجموعات");
  }
  async function saveReport() {
    setSaving(true);
    try {
      const rows = names.map((n) => ({
        name: n,
        group: assignments[n] ?? 0,
        joinedAt: entryTimes[n],
        speakingMinutes: Math.round((statsRef.current[n]?.speakSec ?? 0) / 60 * 10) / 10,
        screenShares: statsRef.current[n]?.shares ?? 0
      }));
      await saveBreakoutReport({ data: { room: code, title: code, rows } });
      toast.success("حُفظ تقرير التوزيع في لوحة التقارير");
    } catch (e) {
      toast.error(e?.message ?? "تعذّر حفظ التقرير");
    } finally {
      setSaving(false);
    }
  }
  function closeAll() {
    chRef.current?.send({ type: "broadcast", event: "close", payload: {} });
    setAssignments({});
    setEntryTimes({});
    onJoinGroup(null);
    toast.success("عاد الجميع إلى الاجتماع الرئيسي");
  }
  function broadcastMsg() {
    const t = announce.trim();
    if (!t) return;
    chRef.current?.send({ type: "broadcast", event: "announce", payload: { text: t } });
    setAnnounce("");
    toast.success("أُرسل الإعلان لكل المجموعات");
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col overflow-y-auto bg-[#0e1017] p-4 text-xs sm:text-sm text-white", dir: "rtl", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-4 flex items-center justify-between pb-3 border-b border-white/[0.08]", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-xl bg-primary/20 border border-primary/30 text-primary", children: /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "font-bold text-sm", children: "المجموعات الفرعية" }),
        /* @__PURE__ */ jsx("p", { className: "text-[11px] text-white/50", children: "توزيع المشاركين على غرف مستقلة" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "mb-3.5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-2.5", children: [
      /* @__PURE__ */ jsx("span", { className: "text-xs text-white/70", children: "عدد المجموعات" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            min: 2,
            max: 10,
            value: groups,
            onChange: (e) => setGroups(Math.min(10, Math.max(2, Number(e.target.value) || 2))),
            className: "w-16 rounded-xl border border-white/10 bg-black/40 px-2 py-1.5 text-center font-bold text-primary outline-none focus:border-primary/80"
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: autoSplit,
            className: "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition",
            children: [
              /* @__PURE__ */ jsx(Shuffle, { className: "h-3.5 w-3.5 text-accent" }),
              " توزيع تلقائي"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setView("rooms"),
          className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${view === "rooms" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10"}`,
          children: [
            /* @__PURE__ */ jsx(LayoutGrid, { className: "h-3.5 w-3.5" }),
            " الغرف"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setView("table"),
          className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${view === "table" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10"}`,
          children: [
            /* @__PURE__ */ jsx(Rows3, { className: "h-3.5 w-3.5" }),
            " الجدول"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: saveReport,
          disabled: saving || names.length === 0,
          className: "mr-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-40 transition",
          children: [
            /* @__PURE__ */ jsx(Save, { className: "h-3.5 w-3.5" }),
            " ",
            saving ? "حفظ..." : "حفظ التقرير"
          ]
        }
      )
    ] }),
    view === "table" && /* @__PURE__ */ jsx("div", { className: "mb-3.5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-right text-xs", children: [
      /* @__PURE__ */ jsx("thead", { className: "border-b border-white/10 bg-white/[0.04] text-white/60", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "المشارك" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "الغرفة" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "وقت الدخول" })
      ] }) }),
      /* @__PURE__ */ jsxs("tbody", { className: "divide-y divide-white/[0.06]", children: [
        names.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 3, className: "px-3 py-4 text-center text-white/40", children: "لا يوجد مشاركون" }) }),
        names.map((n) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-white/[0.02]", children: [
          /* @__PURE__ */ jsx("td", { className: "max-w-32 truncate px-3 py-2 font-medium", children: n }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxs(
            "select",
            {
              value: assignments[n] ?? 0,
              onChange: (e) => setFor(n, Number(e.target.value)),
              className: "rounded-lg border border-white/10 bg-[#141622] px-2 py-1 text-xs outline-none focus:border-primary",
              children: [
                /* @__PURE__ */ jsx("option", { value: 0, children: "الرئيسي" }),
                Array.from({ length: groups }, (_, i) => i + 1).map((x) => /* @__PURE__ */ jsxs("option", { value: x, children: [
                  "مجموعة ",
                  x
                ] }, x))
              ]
            }
          ) }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2 text-white/50 font-mono text-[11px]", children: entryTimes[n] ? new Date(entryTimes[n]).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : "—" })
        ] }, n))
      ] })
    ] }) }),
    view === "rooms" && /* @__PURE__ */ jsxs("div", { className: "mb-3.5 space-y-2.5", children: [
      names.length === 0 && /* @__PURE__ */ jsx("p", { className: "py-6 text-center text-xs text-white/40", children: "لا يوجد مشاركون في الاجتماع حالياً" }),
      roomsList.map((g) => {
        const members = names.filter((n) => (assignments[n] ?? 0) === g);
        const isTarget = dragOver === g;
        return /* @__PURE__ */ jsxs(
          "div",
          {
            onDragOver: (e) => {
              e.preventDefault();
              setDragOver(g);
            },
            onDragLeave: () => setDragOver((d) => d === g ? null : d),
            onDrop: (e) => {
              e.preventDefault();
              const n = e.dataTransfer.getData("text/plain");
              if (n) setFor(n, g);
              setDragOver(null);
            },
            className: `rounded-2xl border p-3 transition-all ${isTarget ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "border-white/10 bg-white/[0.03] hover:border-white/15"}`,
            children: [
              /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-center justify-between", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 font-bold text-xs", children: [
                  /* @__PURE__ */ jsx("span", { className: `h-2 w-2 rounded-full ${g === 0 ? "bg-primary" : "bg-accent"}` }),
                  /* @__PURE__ */ jsx("span", { children: g === 0 ? "الاجتماع الرئيسي" : `مجموعة ${g}` })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxs("span", { className: "rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60", children: [
                    members.length,
                    " مشارك"
                  ] }),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => copyInvite(g),
                      title: "نسخ رابط دعوة لهذه الغرفة",
                      className: "flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 hover:text-white hover:bg-white/10",
                      children: [
                        /* @__PURE__ */ jsx(Link2, { className: "h-3 w-3" }),
                        " رابط"
                      ]
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1.5 min-h-8", children: [
                members.length === 0 && /* @__PURE__ */ jsx("span", { className: "text-[11px] text-white/30 self-center", children: "فارغة — اسحب مشاركاً هنا" }),
                members.map((n) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    draggable: true,
                    onDragStart: (e) => e.dataTransfer.setData("text/plain", n),
                    className: "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.07] px-2.5 py-1 text-xs cursor-grab active:cursor-grabbing hover:bg-white/[0.12] transition",
                    children: [
                      /* @__PURE__ */ jsx(GripVertical, { className: "h-3 w-3 text-white/40" }),
                      /* @__PURE__ */ jsx("span", { className: "max-w-28 truncate font-medium", children: n }),
                      /* @__PURE__ */ jsxs(
                        "select",
                        {
                          value: g,
                          onChange: (e) => setFor(n, Number(e.target.value)),
                          className: "rounded border border-white/10 bg-[#10121d] px-1 py-0.5 text-[10px] outline-none",
                          children: [
                            /* @__PURE__ */ jsx("option", { value: 0, children: "الرئيسي" }),
                            Array.from({ length: groups }, (_, i) => i + 1).map((x) => /* @__PURE__ */ jsxs("option", { value: x, children: [
                              "مجموعة ",
                              x
                            ] }, x))
                          ]
                        }
                      )
                    ]
                  },
                  n
                ))
              ] })
            ]
          },
          g
        );
      })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex gap-2", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: apply,
          className: "flex-1 rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:brightness-110 active:scale-98 transition",
          children: "فتح وتفعيل المجموعات"
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: closeAll,
          className: "flex items-center gap-1 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition",
          children: [
            /* @__PURE__ */ jsx(Undo2, { className: "h-3.5 w-3.5" }),
            " إنهاء"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-2 text-xs font-semibold text-white/70", children: "انضم إلى مجموعة بنفسك" }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1.5", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => onJoinGroup(null),
            className: `rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${selfGroup === null ? "border-primary bg-primary text-white shadow-sm" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`,
            children: "الرئيسي"
          }
        ),
        Array.from({ length: groups }, (_, i) => i + 1).map((g) => /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => onJoinGroup(g),
            className: `flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${selfGroup === g ? "border-primary bg-primary text-white shadow-sm" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`,
            children: [
              /* @__PURE__ */ jsx(LogIn, { className: "h-3 w-3" }),
              " مجموعة ",
              g
            ]
          },
          g
        ))
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-auto pt-3 border-t border-white/[0.08]", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-1.5 text-xs font-semibold text-white/70", children: "إعلان عام لجميع المجموعات" }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            value: announce,
            onChange: (e) => setAnnounce(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") broadcastMsg();
            },
            placeholder: "اكتب إعلاناً يظهر للجميع فوراً...",
            className: "flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 transition"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: broadcastMsg,
            disabled: !announce.trim(),
            className: "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90 disabled:opacity-40 transition",
            children: /* @__PURE__ */ jsx(Megaphone, { className: "h-4 w-4" })
          }
        )
      ] })
    ] })
  ] });
}
const EMOJIS = ["👍", "❤️", "😂", "😮", "👏", "🎉", "🔥", "🙏"];
function ReactionsBar({
  code,
  selfId,
  selfName,
  onHandsChange
}) {
  const channelRef = useRef(null);
  const [floating, setFloating] = useState([]);
  const [open, setOpen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const handsRef = useRef({});
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
  }, [code]);
  function spawn(emoji, name) {
    const id = generateUUID();
    const left = 20 + Math.random() * 60;
    setFloating((f) => [...f, { id, emoji, left, name }]);
    setTimeout(() => setFloating((f) => f.filter((x) => x.id !== id)), 3500);
  }
  function send(emoji) {
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
      payload: { id: selfId, name: selfName, raised: next }
    });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none fixed inset-0 z-40 overflow-hidden", children: floating.map((f) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: "absolute bottom-24 flex flex-col items-center animate-float-up",
        style: { left: `${f.left}%` },
        children: [
          /* @__PURE__ */ jsx("span", { className: "text-4xl drop-shadow-lg", children: f.emoji }),
          /* @__PURE__ */ jsx("span", { className: "mt-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white", children: f.name })
        ]
      },
      f.id
    )) }),
    /* @__PURE__ */ jsx("div", { className: "pointer-events-auto fixed bottom-24 left-1/2 z-50 -translate-x-1/2", dir: "ltr", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      open && /* @__PURE__ */ jsx("div", { className: "absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 rounded-2xl border border-white/15 bg-[#0e1017]/95 p-2 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl animate-in zoom-in-95 duration-150", children: EMOJIS.map((e) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => send(e),
          className: "grid h-11 w-11 place-items-center rounded-xl text-2xl hover:bg-white/10 hover:scale-125 active:scale-100 transition-all duration-200",
          children: e
        },
        e
      )) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0e1017]/90 px-2 py-1.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: toggleHand,
            title: handRaised ? "إنزال اليد" : "رفع اليد",
            className: `grid h-10 w-10 place-items-center rounded-full transition-all duration-200 ${handRaised ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse scale-105" : "bg-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.12] hover:scale-105"}`,
            children: /* @__PURE__ */ jsx(Hand, { className: "h-4 w-4" })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setOpen((o) => !o),
            title: "تفاعل",
            className: `grid h-10 w-10 place-items-center rounded-full transition-all duration-200 ${open ? "bg-primary text-white shadow-md shadow-primary/40 scale-105" : "bg-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.12] hover:scale-105"}`,
            children: /* @__PURE__ */ jsx(Smile, { className: "h-4 w-4" })
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("style", { children: `
        @keyframes float-up {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { transform: translateY(-20px) scale(1.15); opacity: 1; }
          80% { transform: translateY(-60vh) scale(1); opacity: 1; }
          100% { transform: translateY(-75vh) scale(0.8); opacity: 0; }
        }
        .animate-float-up { animation: float-up 3.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      ` })
  ] });
}
const CodeSchema = z.object({
  code: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
});
const getMeetingInfo = createServerFn({
  method: "POST"
}).validator((input) => CodeSchema.parse(input)).handler(createSsrRpc("585a3be2727accc71bfe7ae1e5474bb432f66837295e46f6471820c54a99357d"));
function PreJoinMedia({
  initialCam,
  setInitialCam,
  initialMic,
  setInitialMic
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);
  const [permissionState, setPermissionState] = useState("prompt");
  const [errorMessage, setErrorMessage] = useState(null);
  const [micLevel, setMicLevel] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [devicesCount, setDevicesCount] = useState({ cams: 0, mics: 0 });
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const isHttps = window.location.protocol === "https:";
      const isSecure = window.isSecureContext || isLocal && !isHttps;
      if (!isSecure && !isLocal) {
        setIsInsecureOrigin(true);
      }
    }
  }, []);
  const stopAllMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
        }
      });
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
      }
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
  const startPreview = useCallback(async () => {
    stopAllMedia();
    setErrorMessage(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissionState("denied");
      setErrorMessage("متصفحك أو هذا الرابط لا يدعم الوصول للكاميرا والميكروفون.");
      return;
    }
    try {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput").length;
        const mics = devices.filter((d) => d.kind === "audioinput").length;
        setDevicesCount({ cams, mics });
      } catch {
      }
      if (!initialCam && !initialMic) {
        setPermissionState("granted");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: initialCam ? {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 24 }
        } : false,
        audio: initialMic ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48e3
        } : false
      });
      streamRef.current = stream;
      setPermissionState("granted");
      if (videoRef.current && initialCam) {
        videoRef.current.srcObject = stream;
      }
      if (initialMic) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
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
              setMicLevel(Math.min(100, Math.round(avg / 80 * 100)));
              animFrameRef.current = requestAnimationFrame(checkVolume);
            };
            checkVolume();
          }
        }
      }
    } catch (err) {
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
    return () => {
      stopAllMedia();
    };
  }, [startPreview, stopAllMedia]);
  const toggleCam = () => {
    setInitialCam(!initialCam);
  };
  const toggleMic = () => {
    setInitialMic(!initialMic);
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 w-full", dir: "rtl", children: [
    isInsecureOrigin && /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-200", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
      /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4 shrink-0 text-amber-400 mt-0.5" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "font-semibold text-amber-300", children: "المتصفح يُعطّل الكاميرا والميكروفون على روابط IP غير المشفرة!" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 text-amber-200/80", children: [
          "لأسباب أمنية في Chrome و Edge، ميزة الصوت والفيديو تعمل فقط على",
          " ",
          /* @__PURE__ */ jsx("span", { className: "font-mono bg-black/30 px-1 rounded", children: "localhost" }),
          " أو عبر",
          " ",
          /* @__PURE__ */ jsx("span", { className: "font-mono bg-black/30 px-1 rounded", children: "HTTPS" }),
          "."
        ] }),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: `http://localhost:8080${window.location.pathname}`,
            className: "mt-2 inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/30",
            children: [
              /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3" }),
              " افتح عبر localhost:8080"
            ]
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f14] shadow-inner flex items-center justify-center", children: [
      initialCam ? /* @__PURE__ */ jsx(
        "video",
        {
          ref: videoRef,
          autoPlay: true,
          playsInline: true,
          muted: true,
          className: "h-full w-full object-cover scale-x-[-1]"
        }
      ) : /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center text-white/50 gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-16 w-16 place-items-center rounded-full bg-white/5 border border-white/10", children: /* @__PURE__ */ jsx(VideoOff, { className: "h-8 w-8 text-white/40" }) }),
        /* @__PURE__ */ jsx("span", { className: "text-xs", children: "الكاميرا متوقفة" })
      ] }),
      initialMic && /* @__PURE__ */ jsxs("div", { className: "absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 border border-white/10 text-xs", children: [
        /* @__PURE__ */ jsx(Volume2, { className: "h-3.5 w-3.5 text-emerald-400" }),
        /* @__PURE__ */ jsx("div", { className: "w-12 h-1.5 bg-white/20 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
          "div",
          {
            className: "h-full bg-emerald-400 transition-all duration-75",
            style: { width: `${Math.min(100, micLevel * 1.5)}%` }
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "absolute bottom-3 inset-x-0 flex items-center justify-center gap-3", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: toggleMic,
            className: `flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-md transition-all shadow-lg ${initialMic ? "bg-white/10 hover:bg-white/20 text-white border border-white/15" : "bg-red-500/80 hover:bg-red-500 text-white border border-red-400/40"}`,
            children: [
              initialMic ? /* @__PURE__ */ jsx(Mic, { className: "h-4 w-4 text-emerald-400" }) : /* @__PURE__ */ jsx(MicOff, { className: "h-4 w-4" }),
              initialMic ? "المايك يعمل" : "المايك مكتوم"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: toggleCam,
            className: `flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-md transition-all shadow-lg ${initialCam ? "bg-white/10 hover:bg-white/20 text-white border border-white/15" : "bg-red-500/80 hover:bg-red-500 text-white border border-red-400/40"}`,
            children: [
              initialCam ? /* @__PURE__ */ jsx(Video, { className: "h-4 w-4 text-sky-400" }) : /* @__PURE__ */ jsx(VideoOff, { className: "h-4 w-4" }),
              initialCam ? "الكاميرا تعمل" : "الكاميرا متوقفة"
            ]
          }
        )
      ] })
    ] }),
    errorMessage && /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
      /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4 shrink-0 text-red-400 mt-0.5" }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsx("p", { className: "font-semibold text-red-300", children: errorMessage }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: startPreview,
              className: "flex items-center gap-1 rounded bg-red-500/20 px-2.5 py-1 text-red-100 hover:bg-red-500/30 font-medium",
              children: [
                /* @__PURE__ */ jsx(RefreshCw, { className: "h-3 w-3" }),
                " إعادة المحاولة"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setShowGuide(!showGuide),
              className: "flex items-center gap-1 rounded border border-red-400/30 px-2.5 py-1 text-red-200 hover:bg-white/5",
              children: [
                /* @__PURE__ */ jsx(HelpCircle, { className: "h-3 w-3" }),
                " دليل السماح بالمتصفح"
              ]
            }
          )
        ] })
      ] })
    ] }) }),
    showGuide && /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 p-3 text-xs space-y-2 text-white/80", children: [
      /* @__PURE__ */ jsxs("p", { className: "font-bold text-white flex items-center gap-1", children: [
        /* @__PURE__ */ jsx(HelpCircle, { className: "h-3.5 w-3.5 text-primary" }),
        " خطوات السماح في متصفح Chrome أو Edge:"
      ] }),
      /* @__PURE__ */ jsxs("ol", { className: "list-decimal list-inside space-y-1 text-white/70", children: [
        /* @__PURE__ */ jsx("li", { children: "اضغط على أيقونة الإعدادات 🔒 أو ⚙️ على يسار رابط الموقع في شريط العناوين بالأعلى." }),
        /* @__PURE__ */ jsxs("li", { children: [
          "تأكد من اختيار ",
          /* @__PURE__ */ jsx("span", { className: "text-white font-semibold", children: '"السماح" (Allow)' }),
          " لكل من الكاميرا والميكروفون."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "إذا كان الخيار باللون الرمادي أو غير نشط، تأكد أنك تفتح الموقع من ",
          /* @__PURE__ */ jsx("span", { className: "font-mono bg-black/40 px-1 rounded text-primary", children: "localhost:8080" }),
          " وليس من عنوان IP شبكة."
        ] }),
        /* @__PURE__ */ jsx("li", { children: 'تأكد في نظام ويندوز من الذهاب إلى Settings ➔ Privacy ➔ Camera/Microphone وتفعيل خيار "Allow apps to access".' })
      ] })
    ] })
  ] });
}
function MeetingControlBar({ onLeave }) {
  const room = useRoomContext();
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled
  } = useLocalParticipant();
  const [busyMic, setBusyMic] = useState(false);
  const [busyCam, setBusyCam] = useState(false);
  const [busyShare, setBusyShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState("");
  const [selectedCamId, setSelectedCamId] = useState("");
  useEffect(() => {
    async function loadDevices() {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
          setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
        }
      } catch {
      }
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      console.error("Screen share error:", err);
      if (err?.name !== "NotAllowedError") {
        toast.error("تعذر مشاركة الشاشة: " + (err?.message || err));
      }
    } finally {
      setBusyShare(false);
    }
  };
  const changeMicDevice = async (deviceId) => {
    try {
      setSelectedMicId(deviceId);
      await room.switchActiveDevice("audioinput", deviceId);
      toast.success("تم تبديل الميكروفون");
    } catch (e) {
      toast.error("تعذر تبديل الميكروفون: " + (e?.message || e));
    }
  };
  const changeCamDevice = async (deviceId) => {
    try {
      setSelectedCamId(deviceId);
      await room.switchActiveDevice("videoinput", deviceId);
      toast.success("تم تبديل الكاميرا");
    } catch (e) {
      toast.error("تعذر تبديل الكاميرا: " + (e?.message || e));
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "relative flex items-center justify-center gap-3 py-2 px-4 bg-[#111216] border-t border-white/10", dir: "rtl", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center", children: /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: toggleMic,
        disabled: busyMic,
        title: isMicrophoneEnabled ? "كتم المايك" : "تشغيل المايك",
        className: `group flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${isMicrophoneEnabled ? "bg-[#1c1f26] text-white hover:bg-[#252a34] border border-white/10" : "bg-red-500/90 text-white hover:bg-red-500 shadow-md shadow-red-500/20"}`,
        children: [
          isMicrophoneEnabled ? /* @__PURE__ */ jsx(Mic, { className: "h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" }) : /* @__PURE__ */ jsx(MicOff, { className: "h-4 w-4 text-white group-hover:scale-110 transition-transform" }),
          /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: isMicrophoneEnabled ? "كتم الصوت" : "تشغيل المايك" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx("div", { className: "flex items-center", children: /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: toggleCam,
        disabled: busyCam,
        title: isCameraEnabled ? "إيقاف الكاميرا" : "تشغيل الكاميرا",
        className: `group flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${isCameraEnabled ? "bg-[#1c1f26] text-white hover:bg-[#252a34] border border-white/10" : "bg-red-500/90 text-white hover:bg-red-500 shadow-md shadow-red-500/20"}`,
        children: [
          isCameraEnabled ? /* @__PURE__ */ jsx(Video, { className: "h-4 w-4 text-sky-400 group-hover:scale-110 transition-transform" }) : /* @__PURE__ */ jsx(VideoOff, { className: "h-4 w-4 text-white group-hover:scale-110 transition-transform" }),
          /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: isCameraEnabled ? "إيقاف الكاميرا" : "تشغيل الكاميرا" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: toggleScreenShare,
        disabled: busyShare,
        title: isScreenShareEnabled ? "إيقاف المشاركة" : "مشاركة الشاشة",
        className: `flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${isScreenShareEnabled ? "bg-primary text-primary-foreground shadow-md" : "bg-[#1c1f26] text-white hover:bg-[#252a34] border border-white/10"}`,
        children: [
          isScreenShareEnabled ? /* @__PURE__ */ jsx(MonitorOff, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(MonitorUp, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: isScreenShareEnabled ? "إيقاف المشاركة" : "مشاركة الشاشة" })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => setShowSettings(!showSettings),
          className: `flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold border transition-all ${showSettings ? "bg-white/15 border-white/20 text-white" : "bg-[#1c1f26] border-white/10 text-white/80 hover:bg-[#252a34] hover:text-white"}`,
          title: "اختيار المايك والكاميرا",
          children: [
            /* @__PURE__ */ jsx(Settings2, { className: "h-4 w-4" }),
            /* @__PURE__ */ jsx(ChevronUp, { className: `h-3 w-3 transition-transform ${showSettings ? "rotate-180" : ""}` })
          ]
        }
      ),
      showSettings && /* @__PURE__ */ jsxs("div", { className: "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 rounded-2xl border border-white/10 bg-[#16181e] p-3 text-xs shadow-2xl space-y-3 z-50", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-white/60 font-semibold mb-1 block", children: "ميكروفون الإدخال" }),
          /* @__PURE__ */ jsx(
            "select",
            {
              value: selectedMicId,
              onChange: (e) => changeMicDevice(e.target.value),
              className: "w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white outline-none focus:border-primary text-xs",
              children: audioDevices.length === 0 ? /* @__PURE__ */ jsx("option", { value: "", children: "الميكروفون الافتراضي" }) : audioDevices.map((d, i) => /* @__PURE__ */ jsx("option", { value: d.deviceId, children: d.label || `ميكروفون ${i + 1}` }, d.deviceId || i))
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-white/60 font-semibold mb-1 block", children: "كاميرا الفيديو" }),
          /* @__PURE__ */ jsx(
            "select",
            {
              value: selectedCamId,
              onChange: (e) => changeCamDevice(e.target.value),
              className: "w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white outline-none focus:border-primary text-xs",
              children: videoDevices.length === 0 ? /* @__PURE__ */ jsx("option", { value: "", children: "الكاميرا الافتراضية" }) : videoDevices.map((d, i) => /* @__PURE__ */ jsx("option", { value: d.deviceId, children: d.label || `كاميرا ${i + 1}` }, d.deviceId || i))
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: onLeave,
        title: "مغادرة الاجتماع",
        className: "flex items-center gap-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white px-4 py-2.5 text-xs font-semibold shadow-md transition-all ml-auto",
        children: [
          /* @__PURE__ */ jsx(PhoneOff, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "مغادرة" })
        ]
      }
    )
  ] });
}
function MeetingPage() {
  const {
    code
  } = Route.useParams();
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
  const [meta, setMeta] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const isHost = !!(currentUserId && meta && currentUserId === meta.host_id);
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [locked, setLocked] = useState(false);
  const [polls, setPolls] = useState([]);
  const [knockers, setKnockers] = useState([]);
  const [panel, setPanel] = useState(null);
  const [group, setGroup] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [raisedHands, setRaisedHands] = useState([]);
  const [initialCam, setInitialCam] = useState(true);
  const [initialMic, setInitialMic] = useState(true);
  const selfIdRef = useRef(generateUUID());
  const lobbyHostRef = useRef(null);
  const lobbyKnockerRef = useRef(null);
  useEffect(() => {
    let stop = false;
    async function refresh() {
      try {
        const info = await meetingInfo({
          data: {
            code
          }
        });
        if (stop) return;
        if (!info.found) {
          setNotFound(true);
          return;
        }
        setNotFound(false);
        setMeta({
          title: info.title,
          host_id: info.hostId,
          password: info.hasPassword ? "•" : null,
          locked: info.locked,
          waiting_room: info.waitingRoom
        });
        setLocked(info.locked);
        setLive(info.live);
      } catch {
      }
    }
    refresh();
    const t = setInterval(() => {
      if (!joinedRef.current) refresh();
    }, 8e3);
    supabase.auth.getUser().then(({
      data
    }) => {
      setCurrentUserId(data.user?.id ?? null);
      const m = data.user?.user_metadata;
      if (m?.display_name) setName(m.display_name);
      else if (data.user?.email) setName(data.user.email.split("@")[0]);
    });
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [code, meetingInfo]);
  const loadPolls = useCallback(async () => {
    const {
      data
    } = await supabase.from("polls").select("*").eq("meeting_code", code).order("created_at", {
      ascending: false
    });
    setPolls(data ?? []);
  }, [code]);
  useEffect(() => {
    const ch = supabase.channel(`meeting-meta:${code}`).on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "meetings",
      filter: `code=eq.${code}`
    }, (p) => setLocked(p.new.locked)).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "polls",
      filter: `meeting_code=eq.${code}`
    }, () => loadPolls()).subscribe();
    loadPolls();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [code, loadPolls]);
  async function handleJoin() {
    if (!meta) return toast.error("الاجتماع غير موجود");
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
        } else {
          setWaiting(false);
          setDenied(true);
        }
      });
      return;
    }
    await actuallyJoin();
  }
  async function actuallyJoin() {
    try {
      const roomParam = Number(new URLSearchParams(window.location.search).get("room"));
      const invitedGroup = Number.isInteger(roomParam) && roomParam > 0 && roomParam <= 20 ? roomParam : null;
      const res = await fetchToken({
        data: {
          room: code,
          name: name.trim(),
          isHost,
          password: pwInput || void 0,
          ...invitedGroup ? {
            group: invitedGroup
          } : {}
        }
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
          const a = await fetchActiveRec({
            data: {
              code
            }
          });
          if (a.active) setRecording(true);
        } catch {
        }
      }
    } catch (e) {
      toast.error("تعذر الانضمام: " + (e?.message ?? e));
    }
  }
  const switchGroup = useCallback(async (g) => {
    try {
      const res = await fetchToken({
        data: {
          room: code,
          name: (name || "ضيف").trim(),
          isHost,
          password: pwInput || void 0,
          ...g ? {
            group: g
          } : {}
        }
      });
      setToken(res.token);
      setServerUrl(res.url);
      setGroup(g);
      toast.success(g ? `انتقلت إلى المجموعة ${g}` : "عدت إلى الاجتماع الرئيسي");
    } catch (e) {
      toast.error("تعذر الانتقال: " + (e?.message ?? e));
    }
  }, [code, name, isHost, pwInput, fetchToken]);
  useEffect(() => {
    if (!joined) return;
    const myName = (name || "ضيف").trim();
    const ch = supabase.channel(`breakout:${code}`);
    ch.on("broadcast", {
      event: "assign"
    }, ({
      payload
    }) => {
      const g = (payload?.assignments ?? {})[myName];
      if (typeof g === "number" && g !== (group ?? 0)) switchGroup(g > 0 ? g : null);
    });
    ch.on("broadcast", {
      event: "close"
    }, () => {
      if (group !== null) switchGroup(null);
    });
    ch.on("broadcast", {
      event: "announce"
    }, ({
      payload
    }) => {
      if (payload?.text) toast.info(`إعلان المضيف: ${payload.text}`);
    });
    ch.subscribe();
    return () => {
      ch.unsubscribe();
      supabase.removeChannel(ch);
    };
  }, [joined, code, name, group, switchGroup]);
  async function toggleRecording() {
    if (!isHost || recBusy) return;
    setRecBusy(true);
    try {
      if (recording) {
        await stopRec({
          data: {
            code
          }
        });
        setRecording(false);
        toast.success("تم إيقاف التسجيل — سيظهر في لوحة التحكم");
      } else {
        await startRec({
          data: {
            code
          }
        });
        setRecording(true);
        toast.success("بدأ التسجيل");
      }
    } catch (e) {
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
    navigate({
      to: "/"
    });
  }
  function copyLink() {
    navigator.clipboard.writeText(meetingUrl(code));
    toast.success("تم نسخ الرابط");
  }
  async function toggleLock() {
    if (!isHost) return;
    const next = !locked;
    const {
      error
    } = await supabase.from("meetings").update({
      locked: next
    }).eq("code", code);
    if (error) toast.error(error.message);
    else toast.success(next ? "تم قفل الاجتماع" : "تم فتح الاجتماع");
  }
  function admit(id) {
    lobbyHostRef.current?.admit(id);
  }
  function deny(id) {
    lobbyHostRef.current?.deny(id);
  }
  const [newQ, setNewQ] = useState("");
  const [newOpts, setNewOpts] = useState(["", ""]);
  async function createPoll() {
    if (!isHost || !currentUserId) return;
    const q = newQ.trim();
    const opts = newOpts.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return toast.error("أدخل سؤالاً وخيارين على الأقل");
    const {
      error
    } = await supabase.from("polls").insert({
      meeting_code: code,
      host_id: currentUserId,
      question: q,
      options: opts
    });
    if (error) return toast.error(error.message);
    setNewQ("");
    setNewOpts(["", ""]);
    toast.success("تم نشر الاستطلاع");
  }
  async function vote(poll, idx) {
    const next = {
      ...poll.votes,
      [idx]: (poll.votes[idx] ?? 0) + 1
    };
    const {
      error
    } = await supabase.from("polls").update({
      votes: next
    }).eq("id", poll.id);
    if (error) toast.error(error.message);
  }
  async function closePoll(id) {
    await supabase.from("polls").update({
      is_active: false
    }).eq("id", id);
  }
  if (notFound && !joined) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen grid place-items-center px-4", dir: "rtl", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md rounded-3xl border border-white/10 bg-[#0e1017]/90 p-8 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive mb-4", children: /* @__PURE__ */ jsx(ShieldAlert, { className: "h-8 w-8" }) }),
      /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl font-bold text-white", children: "الاجتماع غير موجود" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-white/60", children: "تأكد من صحة الرابط أو كود الاجتماع المدخل وحاول مجدداً." }),
      /* @__PURE__ */ jsx(Link, { to: "/", className: "mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20 hover:border-white/25 transition-all", children: "العودة للرئيسية" })
    ] }) });
  }
  if (denied) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen grid place-items-center px-4", dir: "rtl", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md rounded-3xl border border-white/10 bg-[#0e1017]/90 p-8 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive mb-4", children: /* @__PURE__ */ jsx(ShieldAlert, { className: "h-8 w-8" }) }),
      /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl font-bold text-white", children: "تم رفض طلب الانضمام" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-white/60", children: "اعتذر المضيف عن قبول انضمامك إلى هذا الاجتماع حالياً." }),
      /* @__PURE__ */ jsx(Link, { to: "/", className: "mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20 hover:border-white/25 transition-all", children: "العودة للرئيسية" })
    ] }) });
  }
  if (waiting) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen grid place-items-center px-4", dir: "rtl", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md rounded-3xl border border-primary/20 bg-[#0e1017]/90 p-8 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_30px_rgba(99,102,241,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative mx-auto mb-6 h-16 w-16", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 animate-ping rounded-full bg-primary/20" }),
        /* @__PURE__ */ jsx("div", { className: "relative grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 border border-primary/40 text-primary", children: /* @__PURE__ */ jsx(Clock, { className: "h-8 w-8 animate-pulse" }) })
      ] }),
      /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl font-bold text-white", children: "أنت في غرفة الانتظار..." }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-white/60", children: "تم إرسال إشعار للمضيف، وسيتم إدخالك تلقائياً بمجرد الموافقة على طلبك." }),
      /* @__PURE__ */ jsx("div", { className: "mt-6 flex justify-center", children: /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60", children: [
        /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-primary animate-ping" }),
        "جارٍ الاتصال بالمضيف"
      ] }) })
    ] }) });
  }
  if (!joined) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex flex-col items-center justify-center p-4 md:p-8", dir: "rtl", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-5xl space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-2.5 font-display text-xl font-black text-white hover:opacity-90 transition", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg shadow-primary/30 border border-white/20", children: /* @__PURE__ */ jsx(Video, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxs("span", { className: "tracking-tight", children: [
            "Fort",
            /* @__PURE__ */ jsx("span", { className: "text-primary", children: "Meet" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-white/60 bg-white/[0.04] border border-white/10 px-3.5 py-1.5 rounded-full", children: [
          /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-emerald-400" }),
          " اتصال مشفّر وآمن"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch", children: [
        /* @__PURE__ */ jsx("div", { className: "w-full md:col-span-7", children: /* @__PURE__ */ jsx(PreJoinMedia, { initialCam, setInitialCam, initialMic, setInitialMic }) }),
        /* @__PURE__ */ jsxs("div", { className: "md:col-span-5 rounded-3xl border border-white/10 bg-[#0e1017]/90 p-6 md:p-8 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl flex flex-col justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl font-bold text-white", children: "جاهز للانضمام؟" }),
                /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-white/60", children: "اضبط إعداداتك واسمك قبل بدء الاجتماع" })
              ] }),
              isHost && /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300", children: [
                /* @__PURE__ */ jsx(Crown, { className: "h-3.5 w-3.5" }),
                " مضيف"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 space-y-1", children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs text-white/50", children: "عنوان الاجتماع" }),
              /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold text-white truncate", children: meta?.title ?? "اجتماع مباشر" }),
              /* @__PURE__ */ jsx("div", { className: "font-mono text-xs text-primary font-bold tracking-wider", children: code })
            ] }),
            !isHost && !live && !locked && /* @__PURE__ */ jsxs("div", { className: "mt-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2", children: [
              /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4 shrink-0 mt-0.5 text-amber-400" }),
              /* @__PURE__ */ jsx("span", { children: "الاجتماع لم يبدأ بعد — انتظر حتى يفتحه المضيف، وسيُفعَّل زر الانضمام تلقائياً." })
            ] }),
            locked && !isHost && /* @__PURE__ */ jsxs("div", { className: "mt-3.5 rounded-2xl border border-destructive/50 bg-destructive/10 p-3 text-xs text-red-200 flex items-start gap-2", children: [
              /* @__PURE__ */ jsx(Lock, { className: "h-4 w-4 shrink-0 mt-0.5 text-destructive" }),
              /* @__PURE__ */ jsx("span", { children: "هذا الاجتماع مقفل حالياً بواسطة المضيف." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mt-5 space-y-3.5", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "mb-1.5 block text-xs font-semibold text-white/80", children: "اسمك في الاجتماع" }),
                /* @__PURE__ */ jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "اكتب اسمك الظاهر...", className: "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 transition-all" })
              ] }),
              meta?.password && !isHost && /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "mb-1.5 block text-xs font-semibold text-white/80", children: "كلمة مرور الاجتماع" }),
                /* @__PURE__ */ jsx("input", { type: "password", value: pwInput, onChange: (e) => setPwInput(e.target.value), placeholder: "أدخل كلمة المرور المطلوبة", className: "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 transition-all" })
              ] }),
              meta?.waiting_room && !isHost && /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-[11px] text-white/60 flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Clock, { className: "h-3.5 w-3.5 text-accent" }),
                /* @__PURE__ */ jsx("span", { children: "غرفة الانتظار مفعّلة — سيتطلب الدخول موافقة المضيف" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "pt-6", children: /* @__PURE__ */ jsx("button", { onClick: handleJoin, disabled: (locked || !live) && !isHost, className: "w-full rounded-2xl bg-gradient-to-r from-primary via-indigo-600 to-primary bg-size-200 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:hover:brightness-100 transition-all", children: "انضم للاجتماع الآن" }) })
        ] })
      ] })
    ] }) });
  }
  if (!token || !serverUrl) return null;
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen flex-col bg-[#0b0c10] text-white", dir: "ltr", "data-lk-theme": "default", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-xs sm:text-sm bg-[#0e1017]/90 backdrop-blur-xl z-20", dir: "rtl", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white shadow-md shadow-primary/30", children: /* @__PURE__ */ jsx(Video, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "font-bold flex items-center gap-2 text-white", children: [
            /* @__PURE__ */ jsx("span", { children: meta?.title ?? "اجتماع" }),
            locked && /* @__PURE__ */ jsx("span", { title: "الاجتماع مقفل", children: /* @__PURE__ */ jsx(Lock, { className: "h-3.5 w-3.5 text-amber-400" }) }),
            recording && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300", children: [
              /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-red-500 animate-ping" }),
              " REC"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground font-mono", children: code })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1", children: [
        isHost && /* @__PURE__ */ jsx("button", { onClick: toggleRecording, disabled: recBusy, className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 transition-all ${recording ? "border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"}`, children: recording ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Square, { className: "h-3.5 w-3.5" }),
          " إيقاف التسجيل"
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Circle, { className: "h-3.5 w-3.5 text-red-400" }),
          " تسجيل"
        ] }) }),
        isHost && /* @__PURE__ */ jsx("button", { onClick: toggleLock, className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${locked ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"}`, children: locked ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Unlock, { className: "h-3.5 w-3.5" }),
          " فتح"
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Lock, { className: "h-3.5 w-3.5" }),
          " قفل"
        ] }) }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setPanel(panel === "people" ? null : "people"), className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${panel === "people" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"}`, children: [
          /* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5" }),
          " المشاركون"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setPanel(panel === "whiteboard" ? null : "whiteboard"), className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${panel === "whiteboard" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"}`, children: [
          /* @__PURE__ */ jsx(Pencil, { className: "h-3.5 w-3.5" }),
          " سبورة"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setPanel(panel === "polls" ? null : "polls"), className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${panel === "polls" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"}`, children: [
          /* @__PURE__ */ jsx(BarChart3, { className: "h-3.5 w-3.5" }),
          " استطلاعات"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setPanel(panel === "chat" ? null : "chat"), className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${panel === "chat" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"}`, children: [
          /* @__PURE__ */ jsx(MessageSquare, { className: "h-3.5 w-3.5" }),
          " الدردشة"
        ] }),
        isHost && /* @__PURE__ */ jsxs("button", { onClick: () => setPanel(panel === "breakout" ? null : "breakout"), className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${panel === "breakout" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"}`, children: [
          /* @__PURE__ */ jsx(Network, { className: "h-3.5 w-3.5" }),
          " المجموعات"
        ] }),
        isHost && /* @__PURE__ */ jsxs("button", { onClick: () => setPanel(panel === "ai" ? null : "ai"), className: `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${panel === "ai" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"}`, children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5 text-accent" }),
          " مساعد AI"
        ] }),
        isHost && meta?.waiting_room && /* @__PURE__ */ jsxs("button", { onClick: () => setPanel(panel === "lobby" ? null : "lobby"), className: `relative flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${panel === "lobby" ? "border-primary/50 bg-primary/20 text-primary shadow-sm" : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"}`, children: [
          "الانتظار",
          knockers.length > 0 && /* @__PURE__ */ jsx("span", { className: "grid h-4 w-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white", children: knockers.length })
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setInviteOpen(true), className: "flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all", children: [
          /* @__PURE__ */ jsx(UserPlus, { className: "h-3.5 w-3.5" }),
          " دعوة"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: copyLink, className: "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition", title: "نسخ رابط الاجتماع", children: [
          /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }),
          " نسخ الرابط"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(LiveKitRoom, { token, serverUrl, connect: true, video: initialCam, audio: initialMic, onError: (err) => {
      console.error("LiveKit Room Error:", err);
      toast.error("خطأ في الاتصال بالصوت/الفيديو: " + (err?.message ?? err));
    }, onMediaDeviceFailure: (failure, kind) => {
      console.warn("Media device failure:", failure, kind);
      toast.error(kind === "videoinput" ? "تعذر تشغيل الكاميرا: قد تكون مستخدمة بواسطة تطبيق آخر أو لم يتم منح الإذن بالمتصفح." : "تعذر تشغيل الميكروفون: تأكد من إعطاء الإذن للمتصفح وتوصيل الجهاز.");
    }, onDisconnected: leave, "data-lk-theme": "default", style: {
      flex: 1,
      minHeight: 0,
      display: "flex"
    }, options: {
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h1080.resolution
      },
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      publishDefaults: {
        videoCodec: "vp8",
        videoEncoding: VideoPresets.h1080.encoding,
        videoSimulcastLayers: [VideoPresets.h1080, VideoPresets.h720, VideoPresets.h360],
        audioPreset: AudioPresets.musicHighQualityStereo,
        simulcast: true,
        dtx: false,
        red: true
      }
    }, children: /* @__PURE__ */ jsxs("div", { className: "flex flex-1 overflow-hidden h-full w-full", children: [
      /* @__PURE__ */ jsxs("div", { className: `relative flex flex-col ${panel === "whiteboard" ? "w-full md:w-52 md:shrink-0" : "flex-1 min-w-0"}`, children: [
        /* @__PURE__ */ jsx(MeetingStage, { compact: panel === "whiteboard", onLeave: leave }),
        /* @__PURE__ */ jsx(RoomAudioRenderer, {}),
        /* @__PURE__ */ jsx(ReactionsBar, { code, selfId: selfIdRef.current, selfName: name || "ضيف", onHandsChange: setRaisedHands })
      ] }),
      panel === "whiteboard" && /* @__PURE__ */ jsx("aside", { className: "hidden flex-1 min-w-0 flex-col border-r border-white/10 bg-[#15171c] md:flex", dir: "rtl", children: /* @__PURE__ */ jsx(Whiteboard, { code: group ? `${code}-g${group}` : code }) }),
      panel && panel !== "whiteboard" && /* @__PURE__ */ jsxs("aside", { className: `hidden flex-col border-r border-white/10 bg-[#15171c] md:flex ${panel === "ai" ? "w-96" : "w-80"}`, dir: "rtl", children: [
        panel === "people" && /* @__PURE__ */ jsx(PeoplePanel, { room: code, isHost, raisedHands }),
        panel === "ai" && isHost && /* @__PURE__ */ jsx(AIPanel, { room: code, title: meta?.title ?? "اجتماع", raisedHands }),
        panel === "chat" && /* @__PURE__ */ jsx(ChatPanel, { code: group ? `${code}-g${group}` : code, roomLabel: group ? `مجموعة ${group}` : "الاجتماع الرئيسي", selfId: selfIdRef.current, selfName: name || "ضيف", isHost }),
        panel === "breakout" && isHost && /* @__PURE__ */ jsx(BreakoutPanel, { code, selfGroup: group, onJoinGroup: switchGroup }),
        panel === "polls" && /* @__PURE__ */ jsx(PollsPanel, { isHost, polls, newQ, setNewQ, newOpts, setNewOpts, createPoll, vote, closePoll }),
        panel === "lobby" && isHost && /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-auto p-3 space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-white/60 mb-2", children: [
            "في الانتظار (",
            knockers.length,
            ")"
          ] }),
          knockers.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-center text-xs text-white/40", children: "لا أحد ينتظر" }),
          knockers.map((k) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm", children: [
            /* @__PURE__ */ jsx("span", { children: k.name }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
              /* @__PURE__ */ jsx("button", { onClick: () => admit(k.id), className: "rounded-md bg-primary/80 p-1.5 hover:bg-primary", children: /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }) }),
              /* @__PURE__ */ jsx("button", { onClick: () => deny(k.id), className: "rounded-md bg-destructive/80 p-1.5 hover:bg-destructive", children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" }) })
            ] })
          ] }, k.id))
        ] })
      ] })
    ] }) }, token),
    inviteOpen && /* @__PURE__ */ jsx(InviteModal, { code, title: meta?.title ?? "اجتماع", onClose: () => setInviteOpen(false) })
  ] });
}
function PeoplePanel({
  room,
  isHost,
  raisedHands = []
}) {
  const participants = useParticipants();
  const {
    localParticipant
  } = useLocalParticipant();
  const hostAction = useServerFn(livekitHostAction);
  async function doAction(identity, action) {
    if (action === "kick" && !confirm("طرد هذا المشارك؟")) return;
    try {
      await hostAction({
        data: {
          room,
          identity,
          action
        }
      });
      toast.success(action === "kick" ? "تم الطرد" : action === "mute_video" ? "تم إيقاف الفيديو" : "تم كتم الصوت");
    } catch (e) {
      toast.error(e?.message ?? "تعذر التنفيذ");
    }
  }
  async function toggleSelfMic() {
    try {
      await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    } catch (e) {
      toast.error(e?.message ?? "تعذر تغيير المايك");
    }
  }
  async function toggleSelfCam() {
    try {
      await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
    } catch (e) {
      toast.error(e?.message ?? "تعذر تغيير الكاميرا");
    }
  }
  const [videoDevices, setVideoDevices] = useState([]);
  const [currentCamId, setCurrentCamId] = useState(null);
  const [quality, setQuality] = useState("high");
  useEffect(() => {
    async function loadDevices() {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(list.filter((d) => d.kind === "videoinput"));
      } catch {
      }
    }
    loadDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", loadDevices);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", loadDevices);
  }, []);
  useEffect(() => {
    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    const id = pub?.track?.mediaStreamTrack?.getSettings?.()?.deviceId ?? null;
    setCurrentCamId(id);
  }, [localParticipant, videoDevices.length]);
  async function switchCamera() {
    if (videoDevices.length === 0) return toast.error("لا توجد كاميرات");
    const idx = videoDevices.findIndex((d) => d.deviceId === currentCamId);
    const next = videoDevices[(idx + 1) % videoDevices.length];
    try {
      const pub = localParticipant.getTrackPublication(Track.Source.Camera);
      const track = pub?.track;
      if (track?.restartTrack) {
        await track.restartTrack({
          deviceId: {
            exact: next.deviceId
          }
        });
      } else {
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setCameraEnabled(true, {
          deviceId: next.deviceId
        });
      }
      setCurrentCamId(next.deviceId);
      toast.success(`الكاميرا: ${next.label || "تم التبديل"}`);
    } catch (e) {
      toast.error(e?.message ?? "تعذر التبديل");
    }
  }
  async function changeQuality(q) {
    setQuality(q);
    const resolution = q === "low" ? VideoPresets.h360.resolution : q === "medium" ? VideoPresets.h720.resolution : VideoPresets.h1080.resolution;
    try {
      if (localParticipant.isCameraEnabled) {
        await localParticipant.setCameraEnabled(false);
      }
      await localParticipant.setCameraEnabled(true, {
        resolution
      });
      toast.success(`الجودة: ${q === "low" ? "منخفضة (360p)" : q === "medium" ? "متوسطة (720p HD)" : "أعلى دقة (1080p Full HD)"}`);
    } catch (e) {
      toast.error(e?.message ?? "تعذر تغيير الجودة");
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#0e1017] text-white", children: [
    raisedHands.length > 0 && /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 font-bold", children: [
        /* @__PURE__ */ jsx(Hand, { className: "h-4 w-4 text-amber-400 animate-bounce" }),
        " أيدٍ مرفوعة (",
        raisedHands.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 text-amber-100/90 font-medium", children: raisedHands.join("، ") })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5 font-semibold text-white/80", children: [
          /* @__PURE__ */ jsx(Settings2, { className: "h-3.5 w-3.5 text-primary" }),
          " إعدادات الكاميرا"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: switchCamera, disabled: videoDevices.length < 2, className: "flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 transition", children: [
          /* @__PURE__ */ jsx(SwitchCamera, { className: "h-3.5 w-3.5" }),
          " تبديل"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs", children: [
        /* @__PURE__ */ jsx("span", { className: "text-white/50 text-[11px]", children: "الجودة:" }),
        ["low", "medium", "high"].map((q) => /* @__PURE__ */ jsx("button", { onClick: () => changeQuality(q), className: `flex-1 rounded-xl border py-1 font-medium transition ${quality === q ? "border-primary bg-primary text-white shadow-sm" : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.06] hover:text-white"}`, children: q === "low" ? "منخفضة" : q === "medium" ? "متوسطة" : "عالية" }, q))
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-1 text-xs text-white/60 font-semibold", children: [
      /* @__PURE__ */ jsx("span", { children: "المشاركون" }),
      /* @__PURE__ */ jsx("span", { className: "rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono text-white/80", children: participants.length })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: participants.map((p) => {
      const isMe = p.identity === localParticipant.identity;
      const meta = (() => {
        try {
          return JSON.parse(p.metadata ?? "{}");
        } catch {
          return {};
        }
      })();
      const micOn = p.isMicrophoneEnabled;
      const camOn = p.isCameraEnabled;
      return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-xs sm:text-sm hover:border-white/15 transition-all", children: [
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2 truncate min-w-0", children: [
          meta.isHost ? /* @__PURE__ */ jsx("span", { className: "grid h-6 w-6 place-items-center rounded-lg bg-amber-500/20 text-amber-400 shrink-0", children: /* @__PURE__ */ jsx(Crown, { className: "h-3.5 w-3.5" }) }) : /* @__PURE__ */ jsx("span", { className: "grid h-6 w-6 place-items-center rounded-lg bg-white/5 text-white/50 shrink-0 font-bold text-[10px]", children: (p.name || p.identity || "U").charAt(0).toUpperCase() }),
          /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: p.name || p.identity }),
          isMe && /* @__PURE__ */ jsx("span", { className: "text-[11px] text-white/40 shrink-0 font-normal", children: "(أنت)" })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "flex items-center gap-1 shrink-0", children: isMe ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("button", { onClick: toggleSelfMic, title: micOn ? "كتم المايك" : "تشغيل المايك", className: `grid h-7 w-7 place-items-center rounded-lg border transition ${micOn ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"}`, children: micOn ? /* @__PURE__ */ jsx(Mic, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(MicOff, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("button", { onClick: toggleSelfCam, title: camOn ? "إيقاف الفيديو" : "تشغيل الفيديو", className: `grid h-7 w-7 place-items-center rounded-lg border transition ${camOn ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"}`, children: camOn ? /* @__PURE__ */ jsx(Video, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(VideoOff, { className: "h-3.5 w-3.5" }) })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { className: `grid h-6 w-6 place-items-center rounded-md ${micOn ? "text-emerald-400" : "text-red-400/80"}`, title: micOn ? "المايك مفتوح" : "مكتوم", children: micOn ? /* @__PURE__ */ jsx(Mic, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(MicOff, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("span", { className: `grid h-6 w-6 place-items-center rounded-md ${camOn ? "text-emerald-400" : "text-red-400/80"}`, title: camOn ? "الكاميرا مفتوحة" : "متوقفة", children: camOn ? /* @__PURE__ */ jsx(Video, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(VideoOff, { className: "h-3.5 w-3.5" }) }),
          isHost && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-0.5 mr-1 border-r border-white/10 pr-1", children: [
            /* @__PURE__ */ jsx("button", { onClick: () => doAction(p.identity, "mute_audio"), disabled: !micOn, title: "كتم المايك", className: "grid h-6 w-6 place-items-center rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-20", children: /* @__PURE__ */ jsx(MicOff, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsx("button", { onClick: () => doAction(p.identity, "mute_video"), disabled: !camOn, title: "إيقاف الفيديو", className: "grid h-6 w-6 place-items-center rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-20", children: /* @__PURE__ */ jsx(VideoOff, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsx("button", { onClick: () => doAction(p.identity, "kick"), title: "طرد المشارك", className: "grid h-6 w-6 place-items-center rounded hover:bg-red-500/20 text-red-400 hover:text-red-300", children: /* @__PURE__ */ jsx(UserX, { className: "h-3.5 w-3.5" }) })
          ] })
        ] }) })
      ] }, p.identity);
    }) })
  ] });
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
  closePoll
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#0e1017] text-white", dir: "rtl", children: [
    isHost && /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs font-bold text-white/80", children: [
        /* @__PURE__ */ jsx(BarChart3, { className: "h-3.5 w-3.5 text-primary" }),
        " إنشاء استطلاع رأي جديد"
      ] }),
      /* @__PURE__ */ jsx("input", { value: newQ, onChange: (e) => setNewQ(e.target.value), placeholder: "اكتب سؤال الاستطلاع...", className: "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs sm:text-sm text-white placeholder-white/40 outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20" }),
      /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: newOpts.map((o, i) => /* @__PURE__ */ jsx("input", { value: o, onChange: (e) => {
        const n = [...newOpts];
        n[i] = e.target.value;
        setNewOpts(n);
      }, placeholder: `الخيار ${i + 1}`, className: "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-primary/80" }, i)) }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 pt-1", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setNewOpts([...newOpts, ""]), className: "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition", children: "+ إضافة خيار" }),
        /* @__PURE__ */ jsx("button", { onClick: createPoll, disabled: !newQ.trim(), className: "flex-1 rounded-xl bg-primary py-1.5 text-xs font-bold text-white shadow-md shadow-primary/30 hover:bg-primary/90 disabled:opacity-40 transition", children: "نشر الاستطلاع" })
      ] })
    ] }),
    polls.length === 0 && /* @__PURE__ */ jsxs("div", { className: "pt-10 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.03] border border-white/10 text-white/30", children: /* @__PURE__ */ jsx(BarChart3, { className: "h-5 w-5" }) }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 text-xs text-white/40", children: "لا توجد استطلاعات رأي بعد" })
    ] }),
    polls.map((p) => {
      const total = Object.values(p.votes).reduce((a, b) => a + b, 0) || 1;
      return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "font-bold text-xs sm:text-sm text-white leading-snug", children: p.question }),
          isHost && p.is_active && /* @__PURE__ */ jsx("button", { onClick: () => closePoll(p.id), className: "rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition", children: "إغلاق" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: p.options.map((opt, i) => {
          const c = p.votes[i] ?? 0;
          const pct = Math.round(c / total * 100);
          return /* @__PURE__ */ jsx("button", { onClick: () => p.is_active && vote(p, i), disabled: !p.is_active, className: "group block w-full text-right", children: /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs transition group-hover:border-white/20", children: [
            /* @__PURE__ */ jsx("div", { className: "absolute inset-y-0 right-0 bg-gradient-to-l from-primary/30 to-indigo-600/30 transition-all duration-300", style: {
              width: `${pct}%`
            } }),
            /* @__PURE__ */ jsxs("div", { className: "relative flex items-center justify-between font-medium", children: [
              /* @__PURE__ */ jsx("span", { className: "text-white/90", children: opt }),
              /* @__PURE__ */ jsxs("span", { className: "font-mono text-[11px] text-white/60", children: [
                c,
                " (",
                pct,
                "%)"
              ] })
            ] })
          ] }) }, i);
        }) }),
        !p.is_active && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-[11px] text-white/40", children: [
          /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-white/40" }),
          "استطلاع منتهٍ"
        ] })
      ] }, p.id);
    })
  ] });
}
function AIPanel({
  room,
  title,
  raisedHands = []
}) {
  const participants = useParticipants();
  const genReport = useServerFn(generateMeetingReport);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [notes, setNotes] = useState("");
  const startedAt = useRef(Date.now());
  const speakRef = useRef({});
  const presenceRef = useRef({});
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const live2 = /* @__PURE__ */ new Set();
      for (const p of participants) {
        const key = p.name || p.identity;
        if (!key) continue;
        live2.add(key);
        speakRef.current[key] = (speakRef.current[key] ?? 0) + (p.isSpeaking ? 1 : 0);
        const isHost = (() => {
          try {
            return !!JSON.parse(p.metadata || "{}").isHost;
          } catch {
            return false;
          }
        })();
        const joined = p.joinedAt ? new Date(p.joinedAt).getTime() : now;
        const rec = presenceRef.current[key];
        if (!rec) presenceRef.current[key] = {
          joinedAt: joined,
          lastSeen: now,
          present: true,
          isHost
        };
        else {
          rec.lastSeen = now;
          rec.present = true;
          rec.isHost = isHost;
        }
      }
      for (const [key, rec] of Object.entries(presenceRef.current)) {
        if (!live2.has(key)) rec.present = false;
      }
      setTick((t) => t + 1);
    }, 1e3);
    return () => clearInterval(iv);
  }, [participants]);
  function stats() {
    const total = Object.values(speakRef.current).reduce((a, b) => a + b, 0);
    return participants.map((p) => {
      const key = p.name || p.identity;
      const secs = speakRef.current[key] ?? 0;
      return {
        key,
        speakingSeconds: secs,
        participationPercent: total > 0 ? Math.round(secs / total * 100) : 0
      };
    });
  }
  const [live, setLive] = useState(false);
  const [intervalSec, setIntervalSec] = useState(60);
  const [lastAt, setLastAt] = useState(null);
  const runningRef = useRef(false);
  const runRef = useRef(async () => {
  });
  const fetchSaved = useServerFn(listMeetingReports);
  const removeSaved = useServerFn(deleteMeetingReport);
  const [saved, setSaved] = useState([]);
  const refreshSaved = useCallback(async () => {
    try {
      const rows = await fetchSaved({
        data: {
          meetingCode: room
        }
      });
      setSaved(rows);
    } catch {
    }
  }, [fetchSaved, room]);
  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved]);
  async function run(save = false) {
    if (runningRef.current) return;
    runningRef.current = true;
    setLoading(true);
    try {
      const s = stats();
      const now = Date.now();
      const byName = /* @__PURE__ */ new Map();
      for (const p of participants) byName.set(p.name || p.identity, p);
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
          joinedMinutesAgo: Math.max(0, Math.round((now - rec.joinedAt) / 6e4)),
          connectionQuality: String(p?.connectionQuality ?? (rec.present ? "unknown" : "disconnected")),
          speakingSeconds: secs,
          speakingMinutes: Math.round(secs / 60 * 10) / 10,
          participationPercent: totalSpeak > 0 ? Math.round(secs / totalSpeak * 100) : 0,
          joinedAt: new Date(rec.joinedAt).toISOString(),
          leftAt: rec.present ? void 0 : new Date(rec.lastSeen).toISOString(),
          stillPresent: rec.present,
          presentMinutes: Math.max(0, Math.round((endMs - rec.joinedAt) / 6e4))
        };
      });
      void s;
      const res = await genReport({
        data: {
          room,
          title,
          durationMinutes: Math.round((Date.now() - startedAt.current) / 6e4),
          participants: payload,
          notes: notes.trim() || void 0,
          save
        }
      });
      setReport(res.report);
      setLastAt(/* @__PURE__ */ new Date());
      if (save) {
        if (res.saved) toast.success("تم حفظ التقرير في سجل تقارير الاجتماع");
        void refreshSaved();
      }
    } catch (e) {
      toast.error(e?.message ?? "تعذر توليد التقرير");
      setLive(false);
    } finally {
      runningRef.current = false;
      setLoading(false);
    }
  }
  runRef.current = run;
  useEffect(() => {
    if (!live) return;
    void runRef.current();
    const iv = setInterval(() => {
      void runRef.current();
    }, intervalSec * 1e3);
    return () => clearInterval(iv);
  }, [live, intervalSec]);
  function download() {
    if (!report) return;
    const blob = new Blob([report], {
      type: "text/markdown;charset=utf-8"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `تقرير-${room}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-b border-white/10 px-3 py-2 text-sm font-semibold", children: [
      /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-primary" }),
      " مساعد الذكاء الاصطناعي"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-2 border-b border-white/10 p-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-xs text-white/60", children: [
        "المشاركون الحاليون: ",
        participants.length
      ] }),
      /* @__PURE__ */ jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), rows: 2, placeholder: "ملاحظات إضافية للتقرير (اختياري)", className: "w-full resize-none rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs outline-none focus:border-primary/60" }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => void run(true), disabled: loading, className: "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50", children: loading ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
          " جارٍ التحليل…"
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5" }),
          " تقرير عن المشاركين"
        ] }) }),
        report && /* @__PURE__ */ jsx("button", { onClick: download, title: "تنزيل التقرير", className: "rounded-md border border-white/10 p-2 hover:bg-white/5", children: /* @__PURE__ */ jsx(Download, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px]", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-1.5 cursor-pointer", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: live, onChange: (e) => setLive(e.target.checked), className: "accent-[hsl(var(--primary))]" }),
          /* @__PURE__ */ jsx("span", { className: live ? "text-primary" : "text-white/70", children: "تحديث لحظي" })
        ] }),
        /* @__PURE__ */ jsxs("select", { value: intervalSec, onChange: (e) => setIntervalSec(Number(e.target.value)), className: "rounded border border-white/10 bg-transparent px-1 py-0.5 outline-none [&>option]:bg-slate-900", children: [
          /* @__PURE__ */ jsx("option", { value: 30, children: "كل 30 ثانية" }),
          /* @__PURE__ */ jsx("option", { value: 60, children: "كل دقيقة" }),
          /* @__PURE__ */ jsx("option", { value: 120, children: "كل دقيقتين" }),
          /* @__PURE__ */ jsx("option", { value: 300, children: "كل 5 دقائق" })
        ] }),
        live && /* @__PURE__ */ jsxs("span", { className: "ml-auto flex items-center gap-1 text-emerald-400", children: [
          /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" }),
          " مباشر"
        ] })
      ] }),
      lastAt && /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-white/40", children: [
        "آخر تحديث: ",
        lastAt.toLocaleTimeString("ar-EG")
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 border-b border-white/10 p-3", children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs text-white/60", children: "نسبة مشاركة كل عضو (زمن التحدث)" }),
      stats().map((s) => /* @__PURE__ */ jsxs("div", { className: "space-y-0.5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[11px] text-white/70", children: [
          /* @__PURE__ */ jsx("span", { className: "truncate", children: s.key }),
          /* @__PURE__ */ jsxs("span", { children: [
            s.participationPercent,
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "h-1.5 w-full overflow-hidden rounded-full bg-white/10", children: /* @__PURE__ */ jsx("div", { className: "h-full rounded-full bg-primary", style: {
          width: `${s.participationPercent}%`
        } }) })
      ] }, s.key))
    ] }),
    saved.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-1 border-b border-white/10 p-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-xs text-white/60", children: [
        "تقارير محفوظة لهذا الاجتماع (",
        saved.length,
        ")"
      ] }),
      saved.map((r) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-[11px]", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => setReport(r.report), className: "flex-1 truncate text-right hover:text-primary", children: [
          new Date(r.created_at).toLocaleString("ar-EG"),
          " — ",
          r.participants_count,
          " مشارك / ",
          r.duration_minutes,
          " د"
        ] }),
        /* @__PURE__ */ jsx("button", { title: "حذف التقرير", onClick: async () => {
          try {
            await removeSaved({
              data: {
                id: r.id
              }
            });
            void refreshSaved();
          } catch (e) {
            toast.error(e?.message ?? "تعذر الحذف");
          }
        }, className: "rounded p-1 text-white/50 hover:bg-white/10 hover:text-destructive", children: "✕" })
      ] }, r.id))
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto p-3 text-sm leading-6 whitespace-pre-wrap", children: report ? report : /* @__PURE__ */ jsx("p", { className: "text-center text-xs text-white/40", children: "اضغط الزر لإنشاء تقرير ذكي عن المشاركين وتفاعلهم وجودة الاتصال، ويُحفظ تلقائياً في سجل تقارير الاجتماع." }) })
  ] });
}
function MeetingStage({
  compact = false,
  onLeave
}) {
  const tracks = useTracks([{
    source: Track.Source.ScreenShare,
    withPlaceholder: false
  }, {
    source: Track.Source.Camera,
    withPlaceholder: true
  }], {
    onlySubscribed: false
  });
  const screenTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const camTracks = tracks.filter((t) => t.source === Track.Source.Camera);
  const focused = !!screenTrack || compact;
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full min-h-0 flex-col", dir: "ltr", children: [
    /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-hidden", children: !focused ? /* @__PURE__ */ jsx(GridLayout, { tracks: camTracks, style: {
      height: "100%"
    }, children: /* @__PURE__ */ jsx(ParticipantTile, {}) }) : /* @__PURE__ */ jsxs("div", { className: "flex h-full min-h-0 gap-2 p-2", children: [
      screenTrack && /* @__PURE__ */ jsx("div", { className: "min-w-0 flex-1 overflow-hidden rounded-xl bg-black", children: /* @__PURE__ */ jsx(ParticipantTile, { trackRef: screenTrack, style: {
        height: "100%",
        width: "100%"
      } }) }),
      /* @__PURE__ */ jsx("div", { className: `flex shrink-0 flex-col gap-2 overflow-y-auto ${screenTrack ? "w-44" : "w-full"}`, children: camTracks.map((t) => /* @__PURE__ */ jsx("div", { className: "aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-black", children: /* @__PURE__ */ jsx(ParticipantTile, { trackRef: t, style: {
        height: "100%",
        width: "100%"
      } }) }, `${t.participant.identity}-${t.source}`)) })
    ] }) }),
    onLeave ? /* @__PURE__ */ jsx(MeetingControlBar, { onLeave }) : /* @__PURE__ */ jsx("div", { className: "border-t border-white/10 bg-[#121318] py-2", children: /* @__PURE__ */ jsx(ControlBar, { variation: "verbose", controls: {
      chat: false,
      leave: true,
      microphone: true,
      camera: true,
      screenShare: true
    } }) })
  ] });
}
export {
  MeetingPage as component
};
