import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker url import
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { generateUUID } from "@/lib/uuid";
import {
  Eraser, Trash2, Palette, Pencil, Minus, Square, Circle as CircleIcon,
  Triangle, ArrowRight, Type, Image as ImageIcon, Undo2, Redo2, Download, MousePointer2,
  Grid3x3, RotateCw, FileText,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Point = { x: number; y: number };
type BaseShape = { id: string; color: string; size: number; rotation?: number };
type PenShape = BaseShape & { type: "pen" | "eraser"; points: Point[] };
type LineShape = BaseShape & { type: "line" | "arrow"; from: Point; to: Point };
type RectShape = BaseShape & { type: "rect"; from: Point; to: Point; fill?: string };
type EllipseShape = BaseShape & { type: "ellipse"; from: Point; to: Point; fill?: string };
type TriShape = BaseShape & { type: "triangle"; from: Point; to: Point; fill?: string };
type TextShape = BaseShape & { type: "text"; at: Point; text: string; w?: number; h?: number };
type ImageShape = BaseShape & { type: "image"; at: Point; w: number; h: number; src: string };
type Shape = PenShape | LineShape | RectShape | EllipseShape | TriShape | TextShape | ImageShape;

type Tool = "select" | "pen" | "eraser" | "line" | "arrow" | "rect" | "ellipse" | "triangle" | "text" | "image" | "pdf";
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rot" | "move";

const COLORS = ["#ffffff", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#ec4899", "#a855f7", "#000000"];
const GRID = 20;

const imgCache = new Map<string, HTMLImageElement>();
function getImg(src: string, onLoad: () => void) {
  let img = imgCache.get(src);
  if (img) return img;
  img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = onLoad;
  img.src = src;
  imgCache.set(src, img);
  return img;
}

function bboxOf(s: Shape): { x: number; y: number; w: number; h: number } {
  if (s.type === "pen" || s.type === "eraser") {
    if (!s.points.length) return { x: 0, y: 0, w: 1, h: 1 };
    const xs = s.points.map((p) => p.x), ys = s.points.map((p) => p.y);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(1, Math.max(...xs) - x), h: Math.max(1, Math.max(...ys) - y) };
  }
  if (s.type === "text") {
    const w = s.w ?? Math.max(20, s.text.length * s.size * 3.5);
    const h = s.h ?? Math.max(12, s.size * 6);
    return { x: s.at.x, y: s.at.y, w, h };
  }
  if (s.type === "image") return { x: s.at.x, y: s.at.y, w: s.w, h: s.h };
  const ls = s as LineShape | RectShape | EllipseShape | TriShape;
  const x = Math.min(ls.from.x, ls.to.x), y = Math.min(ls.from.y, ls.to.y);
  return { x, y, w: Math.max(1, Math.abs(ls.to.x - ls.from.x)), h: Math.max(1, Math.abs(ls.to.y - ls.from.y)) };

}
function centerOf(s: Shape) { const b = bboxOf(s); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }

function transformShape(s: Shape, sx: number, sy: number, ox: number, oy: number, dx: number, dy: number): Shape {
  const tx = (p: Point): Point => ({ x: (p.x - ox) * sx + ox + dx, y: (p.y - oy) * sy + oy + dy });
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
  const ls = s as LineShape | RectShape | EllipseShape | TriShape;
  return { ...ls, from: tx(ls.from), to: tx(ls.to) };

}
function moveShape(s: Shape, dx: number, dy: number): Shape {
  return transformShape(s, 1, 1, 0, 0, dx, dy);
}

export default function Whiteboard({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const shapesRef = useRef<Shape[]>([]);
  const undoStackRef = useRef<Shape[][]>([]);
  const redoStackRef = useRef<Shape[][]>([]);
  const draftRef = useRef<Shape | null>(null);
  const startRef = useRef<Point | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ handle: Handle; startP: Point; original: Shape } | null>(null);
  const erasingRef = useRef(false);


  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(3);
  const [filled, setFilled] = useState(false);
  const [snap, setSnap] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const snapRef = useRef(snap); snapRef.current = snap;
  const selectedIdRef = useRef(selectedId); selectedIdRef.current = selectedId;
  const showGridRef = useRef(showGrid); showGridRef.current = showGrid;

  function snapP(p: Point): Point {
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
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#15171c";
    ctx.fillRect(0, 0, c.width, c.height);
    if (showGridRef.current) drawGrid(ctx, c.width, c.height);
    for (const s of shapesRef.current) drawWithRotation(ctx, s);
    if (draftRef.current) drawWithRotation(ctx, draftRef.current);
    const sel = shapesRef.current.find((s) => s.id === selectedIdRef.current);
    if (sel) drawSelection(ctx, sel);
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.restore();
  }

  function drawWithRotation(ctx: CanvasRenderingContext2D, s: Shape) {
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

  function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
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
      ctx.beginPath(); ctx.moveTo(s.from.x, s.from.y); ctx.lineTo(s.to.x, s.to.y); ctx.stroke();
    } else if (s.type === "arrow") {
      ctx.beginPath(); ctx.moveTo(s.from.x, s.from.y); ctx.lineTo(s.to.x, s.to.y); ctx.stroke();
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
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fillRect(x, y, w, h); }
      ctx.strokeRect(x, y, w, h);
    } else if (s.type === "ellipse") {
      const cx = (s.from.x + s.to.x) / 2, cy = (s.from.y + s.to.y) / 2;
      const rx = Math.abs(s.to.x - s.from.x) / 2, ry = Math.abs(s.to.y - s.from.y) / 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      ctx.stroke();
    } else if (s.type === "triangle") {
      const x1 = s.from.x, y1 = s.to.y;
      const x2 = s.to.x, y2 = s.to.y;
      const x3 = (s.from.x + s.to.x) / 2, y3 = s.from.y;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
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

  function handlesFor(s: Shape): { key: Handle; x: number; y: number }[] {
    const b = bboxOf(s);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    return [
      { key: "nw", x: b.x, y: b.y }, { key: "n", x: cx, y: b.y }, { key: "ne", x: b.x + b.w, y: b.y },
      { key: "e", x: b.x + b.w, y: cy }, { key: "se", x: b.x + b.w, y: b.y + b.h },
      { key: "s", x: cx, y: b.y + b.h }, { key: "sw", x: b.x, y: b.y + b.h }, { key: "w", x: b.x, y: cy },
      { key: "rot", x: cx, y: b.y - 24 },
    ];
  }

  function drawSelection(ctx: CanvasRenderingContext2D, s: Shape) {
    const b = bboxOf(s);
    const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const rot = s.rotation ?? 0;
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(rot); ctx.translate(-c.x, -c.y);
    ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(c.x, b.y); ctx.lineTo(c.x, b.y - 24); ctx.stroke();
    for (const h of handlesFor(s)) {
      ctx.fillStyle = h.key === "rot" ? "#22c55e" : "#3b82f6";
      ctx.beginPath();
      if (h.key === "rot") ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
      else ctx.rect(h.x - 4, h.y - 4, 8, 8);
      ctx.fill();
    }
    ctx.restore();
  }

  function localPoint(s: Shape, p: Point): Point {
    const rot = s.rotation ?? 0;
    if (!rot) return p;
    const c = centerOf(s);
    const cos = Math.cos(-rot), sin = Math.sin(-rot);
    const dx = p.x - c.x, dy = p.y - c.y;
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
  }
  function hitHandle(s: Shape, p: Point): Handle | null {
    const lp = localPoint(s, p);
    for (const h of handlesFor(s)) {
      const r = h.key === "rot" ? 8 : 6;
      if (Math.abs(lp.x - h.x) <= r && Math.abs(lp.y - h.y) <= r) return h.key;
    }
    return null;
  }
  function hitShape(p: Point): Shape | null {
    for (let i = shapesRef.current.length - 1; i >= 0; i--) {
      const s = shapesRef.current[i];
      const lp = localPoint(s, p);
      const b = bboxOf(s);
      if (lp.x >= b.x - 4 && lp.x <= b.x + b.w + 4 && lp.y >= b.y - 4 && lp.y <= b.y + b.h + 4) return s;
    }
    return null;
  }

  /* ===== ممحاة الكائنات: لمس أي خط يمسح الكلمة/الجملة كاملة ===== */
  function distToSeg(p: Point, a: Point, b: Point) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const cx = a.x + t * dx, cy = a.y + t * dy;
    return Math.hypot(p.x - cx, p.y - cy);
  }
  function shapeNearPoint(s: Shape, p: Point, tol: number) {
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
  function bboxGap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
    const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
    return Math.hypot(dx, dy);
  }
  /** يجمع ضربات القلم المتجاورة (حروف الكلمة الواحدة) في مجموعة واحدة */
  function clusterOf(seed: Shape): Shape[] {
    if (seed.type !== "pen") return [seed];
    const group = [seed];
    const ids = new Set([seed.id]);
    let grew = true;
    const GAP = 18;
    while (grew) {
      grew = false;
      for (const s of shapesRef.current) {
        if (ids.has(s.id) || s.type !== "pen") continue;
        const sb = bboxOf(s);
        if (group.some((g) => bboxGap(bboxOf(g), sb) <= GAP)) {
          group.push(s); ids.add(s.id); grew = true;
        }
      }
    }
    return group;
  }
  function eraseAt(p: Point, tol: number) {
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
      const r = c.parentElement!.getBoundingClientRect();
      c.width = r.width; c.height = r.height;
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);

    const ch = supabase.channel(`whiteboard:${code}`);
    channelRef.current = ch;
    ch.on("broadcast", { event: "shape" }, ({ payload }) => {
      shapesRef.current.push(payload as Shape); redraw();
    });
    ch.on("broadcast", { event: "update" }, ({ payload }) => {
      const s = payload as Shape;
      const i = shapesRef.current.findIndex((x) => x.id === s.id);
      if (i >= 0) shapesRef.current[i] = s;
      redraw();
    });
    ch.on("broadcast", { event: "remove" }, ({ payload }) => {
      shapesRef.current = shapesRef.current.filter((s) => s.id !== payload.id);
      if (selectedIdRef.current === payload.id) setSelectedId(null);
      redraw();
    });
    ch.on("broadcast", { event: "clear" }, () => { shapesRef.current = []; setSelectedId(null); redraw(); });
    ch.on("broadcast", { event: "sync_request" }, () => {
      ch.send({ type: "broadcast", event: "sync_state", payload: shapesRef.current });
    });
    ch.on("broadcast", { event: "sync_state" }, ({ payload }) => {
      if (Array.isArray(payload)) { shapesRef.current = payload as Shape[]; redraw(); }
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") ch.send({ type: "broadcast", event: "sync_request", payload: {} });
    });
    return () => {
      window.removeEventListener("resize", resize);
      ch.unsubscribe();
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => { redraw(); /* eslint-disable-next-line */ }, [selectedId, showGrid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
        removeSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault(); e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault(); redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, []);

  function pos(e: React.PointerEvent): Point {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function broadcastUpdate(s: Shape) {
    channelRef.current?.send({ type: "broadcast", event: "update", payload: s });
  }
  function broadcastRemove(id: string) {
    channelRef.current?.send({ type: "broadcast", event: "remove", payload: { id } });
  }
  function commit(s: Shape) {
    pushHistory();
    shapesRef.current.push(s);
    channelRef.current?.send({ type: "broadcast", event: "shape", payload: s });
    redraw();
  }

  function onDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
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
      const base = { id, color, size, from: p, to: p, fill: filled ? color : undefined };
      if (tool === "line" || tool === "arrow") draftRef.current = { ...base, type: tool } as LineShape;
      else if (tool === "rect") draftRef.current = { ...base, type: "rect" } as RectShape;
      else if (tool === "ellipse") draftRef.current = { ...base, type: "ellipse" } as EllipseShape;
      else if (tool === "triangle") draftRef.current = { ...base, type: "triangle" } as TriShape;
    }
    redraw();
  }

  function onMove(e: React.PointerEvent) {
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
      let updated: Shape;
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
        const lp: Point = {
          x: c.x + (rawP.x - c.x) * cos - (rawP.y - c.y) * sin,
          y: c.y + (rawP.x - c.x) * sin + (rawP.y - c.y) * cos,
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
    if (erasingRef.current) { erasingRef.current = false; return; }
    if (dragRef.current) { dragRef.current = null; return; }

    const d = draftRef.current;
    draftRef.current = null;
    startRef.current = null;
    if (!d) return;
    commit(d);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current!;
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

  async function onPdfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const c = canvasRef.current!;
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
        const octx = off.getContext("2d")!;
        octx.fillStyle = "#ffffff";
        octx.fillRect(0, 0, off.width, off.height);
        await page.render({ canvasContext: octx, viewport: vp, canvas: off } as any).promise;
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
    shapesRef.current = []; setSelectedId(null); redraw();
    channelRef.current?.send({ type: "broadcast", event: "clear", payload: {} });
  }
  function removeSelected() {
    const id = selectedIdRef.current; if (!id) return;
    pushHistory();
    shapesRef.current = shapesRef.current.filter((s) => s.id !== id);
    setSelectedId(null);
    broadcastRemove(id);
    redraw();
  }
  function download() {
    const c = canvasRef.current!;
    const a = document.createElement("a");
    a.download = `whiteboard-${code}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }

  function align(dir: "l" | "cx" | "r" | "t" | "cy" | "b") {
    const id = selectedIdRef.current; if (!id) return;
    const c = canvasRef.current!;
    const idx = shapesRef.current.findIndex((s) => s.id === id);
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

  function rotateSelected(deg: number) {
    const id = selectedIdRef.current; if (!id) return;
    const idx = shapesRef.current.findIndex((s) => s.id === id);
    if (idx < 0) return;
    pushHistory();
    const s = shapesRef.current[idx];
    const updated = { ...s, rotation: (s.rotation ?? 0) + (deg * Math.PI) / 180 };
    shapesRef.current[idx] = updated;
    broadcastUpdate(updated);
    redraw();
  }

  function recolorSelected(c: string) {
    setColor(c);
    const id = selectedIdRef.current; if (!id) return;
    const idx = shapesRef.current.findIndex((s) => s.id === id);
    if (idx < 0) return;
    pushHistory();
    const s = shapesRef.current[idx];
    const updated: Shape = { ...s, color: c, ...(("fill" in s && s.fill) ? { fill: c } : {}) } as Shape;
    shapesRef.current[idx] = updated;
    broadcastUpdate(updated);
    redraw();
  }

  const ToolBtn = ({ t, icon: Icon, label }: { t: Tool; icon: typeof Pencil; label: string }) => (
    <button
      onClick={() => setTool(t)}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
        tool === t
          ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
          : "text-white/70 hover:text-white hover:bg-white/[0.08]"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
  const IconBtn = ({
    onClick,
    title,
    icon: Icon,
    active,
    danger,
  }: {
    onClick: () => void;
    title: string;
    icon: typeof Pencil;
    active?: boolean;
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
        active
          ? "bg-primary text-white shadow-md shadow-primary/30"
          : danger
            ? "text-red-400 hover:bg-red-500/20 hover:text-red-300"
            : "text-white/70 hover:text-white hover:bg-white/[0.08]"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  const hasSelection = !!selectedId;

  return (
    <div className="flex flex-1 flex-col bg-[#0e1017]">
      <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.08] bg-[#0c0d14]/90 backdrop-blur-md p-2" dir="rtl">
        <ToolBtn t="select" icon={MousePointer2} label="تحديد" />
        <ToolBtn t="pen" icon={Pencil} label="قلم" />
        <ToolBtn t="eraser" icon={Eraser} label="ممحاة" />
        <div className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn t="line" icon={Minus} label="خط" />
        <ToolBtn t="arrow" icon={ArrowRight} label="سهم" />
        <ToolBtn t="rect" icon={Square} label="مستطيل" />
        <ToolBtn t="ellipse" icon={CircleIcon} label="دائرة" />
        <ToolBtn t="triangle" icon={Triangle} label="مثلث" />
        <ToolBtn t="text" icon={Type} label="نص" />
        <ToolBtn t="image" icon={ImageIcon} label="صورة" />
        <ToolBtn t="pdf" icon={FileText} label="PDF" />
        <div className="mx-1 h-5 w-px bg-white/10" />
        <button
          onClick={() => setFilled((v) => !v)}
          title="تعبئة"
          className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
            filled ? "bg-primary text-white shadow-sm" : "text-white/70 hover:bg-white/[0.08]"
          }`}
        >
          تعبئة
        </button>
        <IconBtn onClick={() => setSnap((v) => !v)} title="الالتقاط للشبكة" icon={Grid3x3} active={snap} />
        <button
          onClick={() => setShowGrid((v) => !v)}
          title="عرض الشبكة"
          className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
            showGrid ? "bg-primary text-white shadow-sm" : "text-white/70 hover:bg-white/[0.08]"
          }`}
        >
          شبكة
        </button>
        <div className="mx-1 h-5 w-px bg-white/10" />
        <Palette className="h-4 w-4 text-white/50" />
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => recolorSelected(c)}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                color === c ? "border-primary scale-110 shadow-sm" : "border-white/20"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={30}
          value={size}
          onChange={(e) => setSize(+e.target.value)}
          className="w-16 accent-primary"
          title={`سمك: ${size}`}
        />
        <div className="mx-1 h-5 w-px bg-white/10" />
        <IconBtn onClick={undo} title="تراجع" icon={Undo2} />
        <IconBtn onClick={redo} title="إعادة" icon={Redo2} />
        <IconBtn onClick={download} title="تنزيل كصورة" icon={Download} />
        <IconBtn onClick={clearAll} title="مسح الكل" icon={Trash2} danger />
      </div>

      {hasSelection && (
        <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.08] bg-primary/10 px-3 py-1.5" dir="rtl">
          <span className="mx-2 text-xs text-white/60">المحدد:</span>
          <IconBtn onClick={() => align("l")} title="محاذاة يسار" icon={AlignHorizontalJustifyStart} />
          <IconBtn onClick={() => align("cx")} title="توسيط أفقي" icon={AlignHorizontalJustifyCenter} />
          <IconBtn onClick={() => align("r")} title="محاذاة يمين" icon={AlignHorizontalJustifyEnd} />
          <div className="mx-1 h-5 w-px bg-white/10" />
          <IconBtn onClick={() => align("t")} title="محاذاة أعلى" icon={AlignVerticalJustifyStart} />
          <IconBtn onClick={() => align("cy")} title="توسيط عمودي" icon={AlignVerticalJustifyCenter} />
          <IconBtn onClick={() => align("b")} title="محاذاة أسفل" icon={AlignVerticalJustifyEnd} />
          <div className="mx-1 h-5 w-px bg-white/10" />
          <IconBtn onClick={() => rotateSelected(-15)} title="تدوير -15°" icon={RotateCw} />
          <button onClick={() => rotateSelected(15)} title="تدوير +15°"
            className="rounded p-1.5 hover:bg-white/10">
            <RotateCw className="h-4 w-4 -scale-x-100" />
          </button>
          <button onClick={() => rotateSelected(90)} className="rounded px-2 py-1 text-xs hover:bg-white/10">90°</button>
          <button onClick={() => {
            const id = selectedIdRef.current; if (!id) return;
            const idx = shapesRef.current.findIndex((s) => s.id === id); if (idx < 0) return;
            pushHistory();
            const upd: Shape = { ...shapesRef.current[idx], rotation: 0 };
            shapesRef.current[idx] = upd; broadcastUpdate(upd); redraw();
          }} className="rounded px-2 py-1 text-xs hover:bg-white/10">تصفير الدوران</button>
          <button onClick={removeSelected} className="mr-auto rounded p-1.5 text-red-400 hover:bg-white/10" title="حذف">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPdfFile} />
      <div className="relative flex-1 bg-[#15171c]">
        <canvas ref={canvasRef}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          className={`absolute inset-0 touch-none ${tool === "select" ? "cursor-default" : "cursor-crosshair"}`} />
      </div>
    </div>
  );
}
