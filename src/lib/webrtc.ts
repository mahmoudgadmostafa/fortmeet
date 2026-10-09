import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { generateUUID } from "./uuid";

export type Participant = {
  id: string;
  name: string;
  stream?: MediaStream;
  audioOn: boolean;
  videoOn: boolean;
  isScreenSharing?: boolean;
  handRaised?: boolean;
  isHost?: boolean;
};

export type Reaction = { id: string; from: string; name: string; emoji: string; ts: number };
export type Knocker = { id: string; name: string };

type Events = {
  onParticipants: (list: Participant[]) => void;
  onChat: (msg: { from: string; name: string; text: string; ts: number }) => void;
  onReaction: (r: Reaction) => void;
  onKnockers?: (list: Knocker[]) => void; // host only
  onKicked?: () => void;
  onForceMute?: () => void;
  onAdmitted?: () => void;
  onDenied?: () => void;
};

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/* ===================== LOBBY (waiting room) ===================== */

export class Lobby {
  private channel: RealtimeChannel | null = null;
  selfId: string;

  constructor(public code: string, public selfName: string) {
    this.selfId = generateUUID();
  }

  /** Knocker side: wait until host admits or denies. */
  async knock(onResult: (admitted: boolean) => void) {
    const ch = supabase.channel(`lobby:${this.code}`, {
      config: { presence: { key: this.selfId } },
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
  async watch(onKnockers: (list: Knocker[]) => void) {
    const ch = supabase.channel(`lobby:${this.code}`, {
      config: { presence: { key: this.selfId } },
    });
    this.channel = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Array<{ name: string }>>;
      const list: Knocker[] = Object.entries(state)
        .filter(([id]) => id !== this.selfId)
        .map(([id, metas]) => ({ id, name: metas[0]?.name ?? "Guest" }));
      onKnockers(list);
    });
    await ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") await ch.track({ name: "__host__" });
    });
  }

  admit(target: string) {
    this.channel?.send({ type: "broadcast", event: "admit", payload: { target } });
  }
  deny(target: string) {
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

/* ===================== MEETING ROOM ===================== */

export class MeetingRoom {
  private channel: RealtimeChannel | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private participants = new Map<string, Participant>();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  selfId: string;

  constructor(
    public code: string,
    public selfName: string,
    public isHost: boolean,
    private events: Events,
  ) {
    this.selfId = generateUUID();
  }

  async join(localStream: MediaStream) {
    this.localStream = localStream;
    this.participants.set(this.selfId, {
      id: this.selfId,
      name: this.selfName + " (أنت)",
      stream: localStream,
      audioOn: localStream.getAudioTracks()[0]?.enabled ?? false,
      videoOn: localStream.getVideoTracks()[0]?.enabled ?? false,
      isHost: this.isHost,
    });
    this.emit();

    const channel = supabase.channel(`meeting:${this.code}`, {
      config: { presence: { key: this.selfId } },
    });
    this.channel = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, Array<{ name: string; isHost: boolean }>>;
      for (const id of this.peers.keys()) {
        if (!state[id]) this.removePeer(id);
      }
      for (const [id, metas] of Object.entries(state)) {
        if (id === this.selfId) continue;
        const meta = metas[0];
        if (!this.participants.has(id)) {
          this.participants.set(id, { id, name: meta.name, audioOn: true, videoOn: true, isHost: meta.isHost });
        }
        if (!this.peers.has(id) && this.selfId < id) {
          this.createPeer(id, true);
        }
      }
      this.emit();
    });

    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      if (payload.to !== this.selfId) return;
      this.handleSignal(payload);
    });
    channel.on("broadcast", { event: "chat" }, ({ payload }) => this.events.onChat(payload));
    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      const p = this.participants.get(payload.from);
      if (p) {
        p.audioOn = payload.audioOn;
        p.videoOn = payload.videoOn;
        p.handRaised = payload.handRaised;
        this.emit();
      }
    });
    channel.on("broadcast", { event: "reaction" }, ({ payload }) => {
      this.events.onReaction(payload);
    });
    channel.on("broadcast", { event: "kick" }, ({ payload }) => {
      if (payload.target === this.selfId) this.events.onKicked?.();
    });
    channel.on("broadcast", { event: "force_mute" }, ({ payload }) => {
      if (payload.target === this.selfId || payload.target === "all") {
        this.events.onForceMute?.();
      }
    });

    await channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ name: this.selfName, isHost: this.isHost });
      }
    });
  }

  private async handleSignal(payload: { from: string; type: string; data: any }) {
    const { from, type, data } = payload;
    let pc = this.peers.get(from);
    if (!pc && type === "offer") pc = this.createPeer(from, false);
    if (!pc) return;
    if (type === "offer") {
      await pc.setRemoteDescription(data);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.send(from, "answer", answer);
    } else if (type === "answer") {
      await pc.setRemoteDescription(data);
    } else if (type === "ice") {
      try { await pc.addIceCandidate(data); } catch {}
    }
  }

  private createPeer(id: string, initiator: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(id, pc);
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) pc.addTrack(track, this.localStream);
    }
    pc.onicecandidate = (e) => { if (e.candidate) this.send(id, "ice", e.candidate.toJSON()); };
    pc.ontrack = (e) => {
      const p = this.participants.get(id);
      if (p) { p.stream = e.streams[0]; this.emit(); }
    };
    if (initiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.send(id, "offer", offer);
      })();
    }
    return pc;
  }

  private send(to: string, type: string, data: any) {
    this.channel?.send({ type: "broadcast", event: "signal", payload: { from: this.selfId, to, type, data } });
  }

  private removePeer(id: string) {
    this.peers.get(id)?.close();
    this.peers.delete(id);
    this.participants.delete(id);
    this.emit();
  }

  private emit() {
    this.events.onParticipants(Array.from(this.participants.values()));
  }

  toggleAudio(on: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = on));
    const me = this.participants.get(this.selfId);
    if (me) me.audioOn = on;
    this.broadcastState();
    this.emit();
  }
  toggleVideo(on: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = on));
    const me = this.participants.get(this.selfId);
    if (me) me.videoOn = on;
    this.broadcastState();
    this.emit();
  }
  raiseHand(on: boolean) {
    const me = this.participants.get(this.selfId);
    if (me) me.handRaised = on;
    this.broadcastState();
    this.emit();
  }
  sendReaction(emoji: string) {
    const r: Reaction = { id: generateUUID(), from: this.selfId, name: this.selfName, emoji, ts: Date.now() };
    this.channel?.send({ type: "broadcast", event: "reaction", payload: r });
    this.events.onReaction(r);
  }

  private broadcastState() {
    const me = this.participants.get(this.selfId);
    if (!me) return;
    this.channel?.send({
      type: "broadcast",
      event: "state",
      payload: { from: this.selfId, audioOn: me.audioOn, videoOn: me.videoOn, handRaised: me.handRaised ?? false },
    });
  }

  /* Host actions */
  kick(target: string) {
    if (!this.isHost) return;
    this.channel?.send({ type: "broadcast", event: "kick", payload: { target } });
  }
  forceMute(target: string) {
    if (!this.isHost) return;
    this.channel?.send({ type: "broadcast", event: "force_mute", payload: { target } });
  }

  async startScreenShare() {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    this.screenStream = stream;
    const screenTrack = stream.getVideoTracks()[0];
    for (const pc of this.peers.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(screenTrack);
    }
    const me = this.participants.get(this.selfId);
    if (me) { me.stream = stream; me.isScreenSharing = true; this.emit(); }
    screenTrack.onended = () => this.stopScreenShare();
    return stream;
  }
  async stopScreenShare() {
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    const camTrack = this.localStream?.getVideoTracks()[0];
    if (camTrack) {
      for (const pc of this.peers.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender?.replaceTrack(camTrack);
      }
    }
    const me = this.participants.get(this.selfId);
    if (me) { me.stream = this.localStream ?? undefined; me.isScreenSharing = false; this.emit(); }
  }

  sendChat(text: string) {
    const msg = { from: this.selfId, name: this.selfName, text, ts: Date.now() };
    this.channel?.send({ type: "broadcast", event: "chat", payload: msg });
    this.events.onChat(msg);
  }

  async leave() {
    for (const pc of this.peers.values()) pc.close();
    this.peers.clear();
    this.participants.clear();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
    if (this.channel) {
      await this.channel.unsubscribe();
      supabase.removeChannel(this.channel);
    }
  }
}
