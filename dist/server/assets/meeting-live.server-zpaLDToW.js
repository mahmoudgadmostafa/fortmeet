async function isMeetingLive(code) {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return false;
  try {
    const { RoomServiceClient } = await import("livekit-server-sdk");
    const svc = new RoomServiceClient(url.replace(/^ws/, "http"), apiKey, apiSecret);
    const parts = await svc.listParticipants(code);
    return parts.some((p) => {
      try {
        return !!JSON.parse(p.metadata || "{}").isHost;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
export {
  isMeetingLive
};
