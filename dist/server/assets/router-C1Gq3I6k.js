import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, useRouter, Link, Outlet, HeadContent, Scripts, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Toaster } from "sonner";
const appCss = "/assets/styles-DwsGBghU.css";
function NotFoundComponent() {
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", dir: "rtl", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "font-display text-8xl font-black text-gradient mb-4", children: "404" }),
    /* @__PURE__ */ jsx("h1", { className: "mt-2 text-xl font-bold text-foreground", children: "الصفحة غير موجودة" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "الصفحة التي تبحث عنها غير موجودة أو تمت إزالتها." }),
    /* @__PURE__ */ jsx("div", { className: "mt-8", children: /* @__PURE__ */ jsx(
      Link,
      {
        to: "/",
        className: "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all",
        children: "العودة للرئيسية"
      }
    ) })
  ] }) });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router2 = useRouter();
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", dir: "rtl", children: /* @__PURE__ */ jsxs("div", { className: "glass-card max-w-md w-full rounded-3xl p-10 text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-destructive/20 text-destructive border border-destructive/30", children: /* @__PURE__ */ jsx("span", { className: "text-2xl", children: "⚠" }) }),
    /* @__PURE__ */ jsx("h1", { className: "text-xl font-bold text-white", children: "حدث خطأ في تحميل الصفحة" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "يمكنك المحاولة مجدداً أو العودة للرئيسية." }),
    /* @__PURE__ */ jsxs("div", { className: "mt-8 flex flex-wrap justify-center gap-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            router2.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/30 hover:scale-[1.02] transition-all",
          children: "حاول مجدداً"
        }
      ),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition",
          children: "الرئيسية"
        }
      )
    ] })
  ] }) });
}
const Route$5 = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FortMeet — مؤتمرات الفيديو الذكية" },
      { name: "description", content: "FortMeet is a comprehensive video conferencing platform for seamless online meetings and collaboration." },
      { name: "author", content: "FortMeet" },
      { property: "og:title", content: "FortMeet" },
      { property: "og:description", content: "منصة اجتماعات ومؤتمرات فيديو ذكية وسريعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "FortMeet" },
      { name: "twitter:description", content: "FortMeet is a comprehensive video conferencing platform for seamless online meetings and collaboration." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/IF7ytjFq1WVIXgXBuZByOUmBUB62/social-images/social-1781713899195-fortmeet.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/IF7ytjFq1WVIXgXBuZByOUmBUB62/social-images/social-1781713899195-fortmeet.webp" }
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "ar", dir: "rtl", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx(HeadContent, {}),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://fonts.googleapis.com" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "preload",
          as: "style",
          href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;700&display=swap"
        }
      ),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;700&display=swap",
          media: "print",
          onLoad: "this.media='all'"
        }
      ),
      /* @__PURE__ */ jsx("noscript", { children: /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;700&display=swap"
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  const { queryClient } = Route$5.useRouteContext();
  return /* @__PURE__ */ jsxs(QueryClientProvider, { client: queryClient, children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(Toaster, { richColors: true, position: "top-center" })
  ] });
}
const $$splitComponentImporter$3 = () => import("./index-D6chbYES.js");
const Route$4 = createFileRoute("/")({
  head: () => ({
    meta: [{
      title: "FortMeet — مؤتمرات واجتماعات فيديو ذكية وفورية"
    }, {
      name: "description",
      content: "منصة مؤتمرات فيديو متكاملة بتقنية WebRTC و LiveKit — اجتماعات فورية بجودة عالية، مشاركة شاشة، ذكاء اصطناعي، تشفير كامل وبدون تعقيد."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./auth-BfowOYJV.js");
const Route$3 = createFileRoute("/auth")({
  head: () => ({
    meta: [{
      title: "تسجيل الدخول — FortMeet"
    }]
  }),
  validateSearch: (s) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : void 0
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./dashboard-Dxe4BVjO.js");
const Route$2 = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{
      title: "لوحة التحكم — FortMeet"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./meeting._code-DQ6qRa29.js");
const Route$1 = createFileRoute("/meeting/$code")({
  head: ({
    params
  }) => ({
    meta: [{
      title: `اجتماع ${params.code} — FortMeet`
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const Route = createFileRoute("/api/public/livekit-webhook")({
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
        const { supabaseAdmin } = await import("./client.server-C0CSld-n.js");
        const statusMap = {
          0: "starting",
          1: "active",
          2: "active",
          3: "completed",
          4: "failed",
          5: "aborted"
        };
        const newStatus = statusMap[eg.status] ?? "active";
        const fileRes = eg.fileResults?.[0];
        const update = { status: newStatus };
        if (fileRes) {
          if (fileRes.size) update.file_size_bytes = Number(fileRes.size);
          if (fileRes.duration) update.duration_seconds = Math.round(Number(fileRes.duration) / 1e9);
        }
        if (eg.error) update.error_message = eg.error;
        if (newStatus === "completed" || newStatus === "failed" || newStatus === "aborted") {
          update.ended_at = (/* @__PURE__ */ new Date()).toISOString();
        }
        const { error } = await supabaseAdmin.from("recordings").update(update).eq("egress_id", eg.egressId);
        if (error) {
          console.error("[livekit-webhook] update error", error);
          return new Response("DB error", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      }
    }
  }
});
const IndexRoute = Route$4.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$5
});
const AuthRoute = Route$3.update({
  id: "/auth",
  path: "/auth",
  getParentRoute: () => Route$5
});
const DashboardRoute = Route$2.update({
  id: "/dashboard",
  path: "/dashboard",
  getParentRoute: () => Route$5
});
const MeetingCodeRoute = Route$1.update({
  id: "/meeting/$code",
  path: "/meeting/$code",
  getParentRoute: () => Route$5
});
const ApiPublicLivekitWebhookRoute = Route.update({
  id: "/api/public/livekit-webhook",
  path: "/api/public/livekit-webhook",
  getParentRoute: () => Route$5
});
const rootRouteChildren = {
  IndexRoute,
  AuthRoute,
  DashboardRoute,
  MeetingCodeRoute,
  ApiPublicLivekitWebhookRoute
};
const routeTree = Route$5._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient();
  const router2 = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route$3 as R,
  Route$1 as a,
  router as r
};
