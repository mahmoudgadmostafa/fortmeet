/** تصدير تقارير الاجتماعات إلى PDF (عبر الطباعة) أو ملف وورد. */

export type ExportableReport = {
  title: string;
  meetingCode: string;
  createdAt: string;
  participantsCount: number;
  durationMinutes: number;
  report: string;
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** تحويل Markdown مبسّط (عناوين، قوائم، جداول، فقرات) إلى HTML. */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let table: string[][] | null = null;

  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const closeTable = () => {
    if (!table) return;
    const [head, ...rows] = table;
    out.push("<table><thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>");
    for (const r of rows) out.push("<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>");
    out.push("</tbody></table>");
    table = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      closeList();
      (table ||= []).push(cells);
      continue;
    }
    closeTable();

    if (!line) { closeList(); continue; }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }

    const ul = /^[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ol) {
      if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  closeTable();
  return out.join("\n");
}

function documentHtml(r: ExportableReport) {
  const meta = `${new Date(r.createdAt).toLocaleString("ar-EG")} · ${r.participantsCount} مشارك · ${r.durationMinutes} دقيقة · كود ${r.meetingCode}`;
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${esc(r.title || r.meetingCode)}</title>
<style>
 body{font-family:"Segoe UI","Tahoma",Arial,sans-serif;direction:rtl;color:#111;margin:32px;line-height:1.9}
 h1{font-size:22pt;margin:0 0 4px} h2{font-size:15pt;margin:18px 0 6px;color:#3b2fa8}
 h3{font-size:13pt;margin:14px 0 4px}
 .meta{color:#666;font-size:10pt;margin-bottom:18px;border-bottom:1px solid #ddd;padding-bottom:10px}
 table{border-collapse:collapse;width:100%;margin:10px 0;font-size:10.5pt}
 th,td{border:1px solid #bbb;padding:6px 8px;text-align:right}
 th{background:#eee9ff}
 ul,ol{padding-right:22px} p{margin:6px 0}
 .foot{margin-top:24px;border-top:1px solid #ddd;padding-top:8px;color:#888;font-size:9pt}
</style></head><body>
<h1>${esc(r.title || r.meetingCode)}</h1>
<div class="meta">${esc(meta)}</div>
${markdownToHtml(r.report)}
<div class="foot">تم إنشاء التقرير بواسطة FortMeet</div>
</body></html>`;
}

function fileBase(r: ExportableReport) {
  return `تقرير-${r.meetingCode}-${new Date(r.createdAt).toISOString().slice(0, 10)}`;
}

/** تنزيل التقرير كملف وورد (.doc) قابل للفتح في Word. */
export function downloadReportWord(r: ExportableReport) {
  const blob = new Blob(["\ufeff" + documentHtml(r)], { type: "application/msword;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileBase(r)}.doc`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** فتح نافذة طباعة لحفظ التقرير كملف PDF. */
export function downloadReportPdf(r: ExportableReport) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;
  w.document.write(documentHtml(r));
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
  return true;
}
