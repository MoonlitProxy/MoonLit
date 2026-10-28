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
const CLIENTS = [
  { n: "28", ua: "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip", c: { clientName: "ANDROID_VR", clientVersion: "1.60.19", deviceMake: "Oculus", deviceModel: "Quest 3", androidSdkVersion: 32, osName: "Android", osVersion: "12L" } },
  { n: "5", ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)", c: { clientName: "IOS", clientVersion: "20.10.4", deviceMake: "Apple", deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "18.3.2.22D82" } },
  { n: "85", ua: "Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15", c: { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0" }, embed: true },
  { n: "3", ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip", c: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30, osName: "Android", osVersion: "11" } }
];
async function ask(k, id) {
  const body = { context: { client: { ...k.c, hl: "en", gl: "US" } }, videoId: id, contentCheckOk: true, racyCheckOk: true };
  if (k.embed) body.context.thirdParty = { embedUrl: "https://www.youtube.com/watch?v=" + id };
  const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": k.ua, "X-YouTube-Client-Name": k.n, "X-YouTube-Client-Version": k.c.clientVersion }, body: JSON.stringify(body) });
  return r.json();
}
// asks YouTube the way its phone/TV apps do, which hands back plain stream links
async function resolve(id) {
  const why = [];
  for (const k of CLIENTS) {
    let d;
    try { d = await ask(k, id); } catch (e) { why.push(k.c.clientName + ": request failed"); continue; }
    const sd = d.streamingData, t = d.videoDetails && d.videoDetails.title;
    if (!sd) { why.push(k.c.clientName + ": " + ((d.playabilityStatus && (d.playabilityStatus.reason || d.playabilityStatus.status)) || "no streams")); continue; }
    const mux = (sd.formats || []).filter(f => f.url && /mp4/.test(f.mimeType)).sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    if (mux) return { t, v: mux.url, ua: k.ua };
    const ad = sd.adaptiveFormats || [];
    const vf = ad.filter(f => f.url && /video\/mp4/.test(f.mimeType) && /avc1/.test(f.mimeType) && (f.height || 0) <= 720).sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    const af = ad.filter(f => f.url && /audio\/mp4/.test(f.mimeType)).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    if (vf && af) return { t, v: vf.url, a: af.url, ua: k.ua };
    why.push(k.c.clientName + ": no usable links");
  }
  return { e: why.join(" | ") };
}
const same = req => { const s = req.headers.get("Sec-Fetch-Site"); return !s || s === "same-origin"; };
async function yt(req, u) {
  if (!same(req)) return J({ e: "not allowed" }, 403);
  const id = u.searchParams.get("id") || "";
  if (!/^[\w-]{11}$/.test(id)) return J({ e: "bad id" }, 400);
  const r = await resolve(id);
  if (r.e) return J({ e: r.e }, 404);
  const L = k => "/ytv?id=" + id + "&k=" + k;
  return J({ t: r.t, v: L("v"), a: r.a ? L("a") : undefined });
}
// looks the link up again and fetches it in the same request, because the links only work for the server that asked
async function ytv(req, u) {
  if (!same(req)) return new Response("not allowed", { status: 403 });
  const id = u.searchParams.get("id") || "", k = u.searchParams.get("k") === "a" ? "a" : "v";
  if (!/^[\w-]{11}$/.test(id)) return new Response("bad id", { status: 400 });
  const r = await resolve(id);
  if (!r[k]) return new Response("lookup: " + (r.e || "no stream"), { status: 404 });
  const g = await fetch(r[k], { headers: { "User-Agent": r.ua, Range: req.headers.get("Range") || "bytes=0-" } });
  const o = new Headers({ "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes" });
  ["Content-Type", "Content-Length", "Content-Range"].forEach(x => { const v = g.headers.get(x); if (v) o.set(x, v); });
  if (!g.ok && g.status !== 206) return new Response("googlevideo said " + g.status, { status: 502 });
  return new Response(g.body, { status: g.status, headers: o });
}
