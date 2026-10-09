// رابط الاجتماع للمشاركة/النسخ — يستخدم عنوان الموقع الحالي تلقائياً
function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getBaseUrlFromRequest(request?: Request): string | undefined {
  if (!request) return undefined;

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? request.headers.get("host") ?? undefined;

  if (!host) return undefined;

  const protocol = forwardedProto ?? (request.url.startsWith("https://") ? "https" : "http");
  return `${protocol}://${host}`;
}

export function getBaseUrl(request?: Request): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const fromRequest = getBaseUrlFromRequest(request);
  const fromEnv = normalizeBaseUrl(
    process.env.VITE_APP_URL ??
      process.env.APP_URL ??
      process.env.PUBLIC_URL ??
      process.env.URL ??
      process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  );

  return fromRequest ?? fromEnv ?? "http://localhost:8080";
}

export function meetingUrl(code: string, room?: number, request?: Request) {
  const base = `${getBaseUrl(request)}/meeting/${code}`;
  return room && room > 0 ? `${base}?room=${room}` : base;
}
