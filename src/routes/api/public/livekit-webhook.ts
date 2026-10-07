import { createFileRoute } from "@tanstack/react-router";

/**
 * LiveKit webhook receiver — updates recording rows when egress completes/fails.
 * Verifies the webhook using LiveKit's signed Authorization header (JWT).
 */
export const Route = createFileRoute("/api/public/livekit-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const auth = request.headers.get("authorization") ?? "";

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        if (!apiKey || !apiSecret) {
          return new Response("Server not configured", { status: 500 });
        }

        const { WebhookReceiver } = await import("livekit-server-sdk");
        const receiver = new WebhookReceiver(apiKey, apiSecret);

        let event;
        try {
          event = await receiver.receive(body, auth);
        } catch (e) {
          console.error("[livekit-webhook] verification failed", e);
          return new Response("Invalid signature", { status: 401 });
        }

        if (!event.egressInfo) {
          return new Response("ignored", { status: 200 });
        }

        const eg = event.egressInfo;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // status: 0=STARTING, 1=ACTIVE, 2=ENDING, 3=COMPLETE, 4=FAILED, 5=ABORTED
        const statusMap: Record<number, string> = {
          0: "starting", 1: "active", 2: "active", 3: "completed", 4: "failed", 5: "aborted",
        };
        const newStatus = statusMap[eg.status as number] ?? "active";

        // Pull file info from the first file result if present
        const fileRes = eg.fileResults?.[0];
        const update: Record<string, unknown> = { status: newStatus };
        if (fileRes) {
          if (fileRes.size) update.file_size_bytes = Number(fileRes.size);
          if (fileRes.duration) update.duration_seconds = Math.round(Number(fileRes.duration) / 1_000_000_000);
        }
        if (eg.error) update.error_message = eg.error;
        if (newStatus === "completed" || newStatus === "failed" || newStatus === "aborted") {
          update.ended_at = new Date().toISOString();
        }

        const { error } = await supabaseAdmin
          .from("recordings")
          .update(update as never)
          .eq("egress_id", eg.egressId);

        if (error) {
          console.error("[livekit-webhook] update error", error);
          return new Response("DB error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
