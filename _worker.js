// Cloudflare Pages worker: adds the /proxy MoonLit looks for. Everything else is served as normal files.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/yt") return yt(req, u);
    if (u.pathname === "/ytv") return ytv(req, u);
    if (u.pathname !== "/proxy") return env.ASSETS.fetch(req);
    const cors = { "Access-Control-Allow-Origin": "*" };
    if (u.searchParams.has("ping")) return new Response("ok", { headers: { ...cors, "Content-Type": "text/plain" } });
    // only let MoonLit itself use the proxy, not strangers typing addresses
    const site = req.headers.get("Sec-Fetch-Site");
    if (site && site !== "same-origin") return new Response("not allowed", { status: 403 });
    const target = u.searchParams.get("url") || "";
    if (!/^https?:\/\//i.test(target)) return new Response("bad url", { status: 400 });
    let r;
    try {
      r = await fetch(target, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" }, redirect: "follow" });
    } catch (e) { return new Response(String(e), { status: 502 }); }
    const type = r.headers.get("Content-Type") || "text/html";
    const h = new Headers({ ...cors, "Content-Type": type });   // drops X-Frame-Options and CSP
    if (type.includes("text/html") && !u.searchParams.has("raw")) {
      let t = await r.text();
      const base = '<base href="' + target.replace(/"/g, "%22") + '">';
      t = /<head[^>]*>/i.test(t) ? t.replace(/<head[^>]*>/i, m => m + base) : base + t;
      return new Response(t, { status: r.status, headers: h });
    }
    return new Response(r.body, { status: r.status, headers: h });
  }
};

const J = (o, c = 200) => new Response(JSON.stringify(o), { status: c, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
const wrap = x => "/ytv?u=" + encodeURIComponent(x);
// asks YouTube the way its own VR app does, which hands back plain stream links
async function yt(req, u) {
  const site = req.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return J({ e: "not allowed" }, 403);
  const id = u.searchParams.get("id") || "";
  if (!/^[\w-]{11}$/.test(id)) return J({ e: "bad id" }, 400);
  const cl = { clientName: "ANDROID_VR", clientVersion: "1.60.19", deviceMake: "Oculus", deviceModel: "Quest 3", androidSdkVersion: 32, osName: "Android", osVersion: "12L", hl: "en", gl: "US" };
  let d;
  try {
    const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip", "X-YouTube-Client-Name": "28", "X-YouTube-Client-Version": "1.60.19" },
      body: JSON.stringify({ context: { client: cl }, videoId: id, contentCheckOk: true, racyCheckOk: true })
    });
    d = await r.json();
  } catch (e) { return J({ e: "lookup failed" }, 502); }
  const sd = d.streamingData;
  if (!sd) return J({ e: (d.playabilityStatus && d.playabilityStatus.reason) || "no streams" }, 404);
  const t = d.videoDetails && d.videoDetails.title;
  const mux = (sd.formats || []).filter(f => f.url && /mp4/.test(f.mimeType)).sort((a, b) => (b.height || 0) - (a.height || 0))[0];
  if (mux) return J({ t, v: wrap(mux.url) });
  const ad = sd.adaptiveFormats || [];
  const vf = ad.filter(f => f.url && /video\/mp4/.test(f.mimeType) && /avc1/.test(f.mimeType) && (f.height || 0) <= 720).sort((a, b) => (b.height || 0) - (a.height || 0))[0];
  const af = ad.filter(f => f.url && /audio\/mp4/.test(f.mimeType)).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  if (vf && af) return J({ t, v: wrap(vf.url), a: wrap(af.url) });
  return J({ e: "no playable streams" }, 404);
}
// passes the video bytes through (with seeking), since the links only work for the server that asked
async function ytv(req, u) {
  const site = req.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return new Response("not allowed", { status: 403 });
  let t;
  try { t = new URL(u.searchParams.get("u") || ""); } catch (e) { return new Response("bad", { status: 400 }); }
  if (!/(^|\.)googlevideo\.com$/.test(t.hostname)) return new Response("bad host", { status: 400 });
  const h = { "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip" };
  const rg = req.headers.get("Range");
  if (rg) h.Range = rg;
  const r = await fetch(t.href, { headers: h });
  const o = new Headers({ "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes" });
  ["Content-Type", "Content-Length", "Content-Range"].forEach(k => { const v = r.headers.get(k); if (v) o.set(k, v); });
  return new Response(r.body, { status: r.status, headers: o });
}
