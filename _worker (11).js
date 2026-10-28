// Cloudflare Pages worker: adds the /proxy MoonLit looks for. Everything else is served as normal files.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/yt") return yt(req, u);
    if (u.pathname === "/ytv") return ytv(req, u);
    if (u.pathname === "/ytp") return ytp(req, u);
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
  { n: "7", ua: "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version", c: { clientName: "TVHTML5", clientVersion: "7.20250219.14.00" } },
  { n: "56", ua: UA, c: { clientName: "WEB_EMBEDDED_PLAYER", clientVersion: "1.20250219.01.00" }, embed: true },
  { n: "14", ua: "com.google.android.apps.youtube.creator/24.45.100 (Linux; U; Android 11) gzip", c: { clientName: "ANDROID_CREATOR", clientVersion: "24.45.100", androidSdkVersion: 30, osName: "Android", osVersion: "11" } },
  { n: "3", ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip", c: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30, osName: "Android", osVersion: "11" } }
];
async function ask(k, id) {
  const body = { context: { client: { ...k.c, hl: "en", gl: "US" } }, videoId: id, contentCheckOk: true, racyCheckOk: true };
  if (k.embed) body.context.thirdParty = { embedUrl: "https://www.youtube.com/watch?v=" + id };
  const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": k.ua, "X-YouTube-Client-Name": k.n, "X-YouTube-Client-Version": k.c.clientVersion }, body: JSON.stringify(body) });
  return r.json();
}
// asks YouTube the way its phone/TV apps do, which hands back plain stream links
async function resolve(id, pin) {
  const why = [];
  for (const k of CLIENTS.filter(x => !pin || x.c.clientName === pin.c)) {
    let d;
    try { d = await ask(k, id); } catch (e) { why.push(k.c.clientName + ": request failed"); continue; }
    const sd = d.streamingData, t = d.videoDetails && d.videoDetails.title;
    if (!sd) { why.push(k.c.clientName + ": " + ((d.playabilityStatus && (d.playabilityStatus.reason || d.playabilityStatus.status)) || "no streams")); continue; }
    const all = f => (f || []).filter(x => x.url), hq = (a, b) => (b.height || 0) - (a.height || 0);
    const R = (v, a) => ({ t, v: v.url, a: a && a.url, vi: v.itag, ai: a && a.itag, c: k.c.clientName, ua: k.ua });
    if (pin && pin.vi) {
      const all2 = all(sd.formats).concat(all(sd.adaptiveFormats)), v = all2.find(x => x.itag === pin.vi), a = pin.ai && all2.find(x => x.itag === pin.ai);
      if (v && (!pin.ai || a)) return R(v, a);
      why.push(k.c.clientName + ": pinned format gone"); continue;
    }
    const mux = all(sd.formats).filter(f => /mp4/.test(f.mimeType) && /avc1/.test(f.mimeType)).sort(hq)[0];
    if (mux) return R(mux);
    const ad = all(sd.adaptiveFormats);
    const vf = ad.filter(f => /video\/mp4/.test(f.mimeType) && /avc1/.test(f.mimeType) && (f.height || 0) <= 720).sort(hq)[0];
    const af = ad.filter(f => /audio\/mp4/.test(f.mimeType)).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    if (vf && af) return R(vf, af);
    why.push(k.c.clientName + ": no usable links");
  }
  return { e: why.join(" | ") };
}
const same = req => { const s = req.headers.get("Sec-Fetch-Site"); return !s || s === "same-origin"; };
const PIPED = ["https://pipedapi.kavin.rocks", "https://pipedapi.adminforge.de", "https://api.piped.private.coffee", "https://pipedapi.leptons.xyz", "https://pipedapi.darkness.services", "https://pipedapi.nosebs.ru", "https://pipedapi.reallyaweso.me", "https://api.piped.yt", "https://pipedapi.orangenet.cc"];
const INV = ["https://inv.nadeko.net", "https://invidious.nerdvpn.net", "https://invidious.privacyredirect.com", "https://inv.tux.pizza", "https://invidious.jing.rocks", "https://yewtu.be", "https://iv.melmac.space", "https://inv.vern.cc", "https://invidious.protokolla.fi", "https://iv.ggtyler.dev"];
const jget = u => fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(7000) }).then(r => { if (!r.ok) throw 0; return r.json(); });
const q = s => parseInt(s) || 0, best = (l, f) => l.filter(f).sort((a, b) => (q(b.quality || b.qualityLabel || b.resolution) - q(a.quality || a.qualityLabel || a.resolution) || (b.bitrate || 0) - (a.bitrate || 0)))[0];
async function piped(h, id) {
  const d = await jget(h + "/streams/" + id), vs = d.videoStreams || [], n = "Piped " + new URL(h).hostname;
  const m = best(vs, s => !s.videoOnly && /mp4/.test(s.mimeType));
  if (m) return { n, t: d.title, v: m.url };
  const v = best(vs, s => s.videoOnly && /mp4/.test(s.mimeType) && q(s.quality) <= 720), a = best(d.audioStreams || [], s => /mp4/.test(s.mimeType));
  if (v && a) return { n, t: d.title, v: v.url, a: a.url };
  throw 0;
}
async function inv(h, id) {
  const d = await jget(h + "/api/v1/videos/" + id + "?local=true"), n = "Invidious " + new URL(h).hostname, A = x => new URL(x, h).href;
  const m = best(d.formatStreams || [], s => /mp4/.test(s.type));
  if (m) return { n, t: d.title, v: A(m.url) };
  const ad = d.adaptiveFormats || [], v = best(ad, s => /video\/mp4/.test(s.type) && /avc1/.test(s.type) && q(s.resolution) <= 720), a = best(ad, s => /audio\/mp4/.test(s.type));
  if (v && a) return { n, t: d.title, v: A(v.url), a: A(a.url) };
  throw 0;
}
async function yt(req, u) {
  if (!same(req)) return J({ e: "not allowed" }, 403);
  const id = u.searchParams.get("id") || "";
  if (!/^[\w-]{11}$/.test(id)) return J({ e: "bad id" }, 400);
  const [ownAll, ...alt] = await Promise.all([Promise.all(CLIENTS.map(k => resolve(id, { c: k.c.clientName }))), ...PIPED.map(h => piped(h, id).catch(() => null)), ...INV.map(h => inv(h, id).catch(() => null))]);
  const L = (o, k) => "/ytv?id=" + id + "&k=" + k + "&c=" + o.c + "&vi=" + o.vi + (o.ai ? "&ai=" + o.ai : ""), c = [];
  ownAll.filter(o => !o.e).forEach(o => c.push({ n: "MoonLit/" + o.c.toLowerCase() + " " + o.vi + (o.ai ? "+" + o.ai : ""), t: o.t, v: L(o, "v"), a: o.ai ? L(o, "a") : undefined }));
  const P = x => "/ytp?u=" + encodeURIComponent(x);
  alt.filter(Boolean).slice(0, 6).forEach(x => c.push({ ...x, v: P(x.v), a: x.a && P(x.a) }));
  if (!c.length) return J({ e: "No source answered. MoonLit: " + ownAll.map(o => o.e).join(" | ") + " \u00B7 the Piped and Invidious servers all failed or were blocked." }, 404);
  return J({ t: c[0].t, c });
}
// looks the link up again and fetches it in the same request, because the links only work for the server that asked
async function ytv(req, u) {
  if (!same(req)) return new Response("not allowed", { status: 403 });
  const id = u.searchParams.get("id") || "", k = u.searchParams.get("k") === "a" ? "a" : "v";
  if (!/^[\w-]{11}$/.test(id)) return new Response("bad id", { status: 400 });
  const pin = u.searchParams.get("c") ? { c: u.searchParams.get("c"), vi: +u.searchParams.get("vi"), ai: +u.searchParams.get("ai") || 0 } : null;
  const r = await resolve(id, pin);
  if (!r[k]) return new Response("lookup: " + (r.e || "no stream"), { status: 404 });
  const g = await fetch(r[k], { headers: { "User-Agent": r.ua, Range: req.headers.get("Range") || "bytes=0-" } });
  const o = new Headers({ "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes" });
  ["Content-Type", "Content-Length", "Content-Range"].forEach(x => { const v = g.headers.get(x); if (v) o.set(x, v); });
  if (!g.ok && g.status !== 206) return new Response("googlevideo said " + g.status, { status: 502 });
  return new Response(g.body, { status: g.status, headers: o });
}

// relays stream links from the Piped/Invidious servers through this worker, so devices or networks that block those servers can still play
async function ytp(req, u) {
  if (!same(req)) return new Response("not allowed", { status: 403 });
  let t;
  try { t = new URL(u.searchParams.get("u") || ""); } catch (e) { return new Response("bad url", { status: 400 }); }
  if (t.protocol !== "https:" || /^(\d+\.|\[|localhost)/i.test(t.hostname) || !t.hostname.includes(".")) return new Response("bad url", { status: 400 });
  let g;
  try { g = await fetch(t.href, { headers: { "User-Agent": UA, Range: req.headers.get("Range") || "bytes=0-" }, redirect: "follow" }); } catch (e) { return new Response("fetch failed", { status: 502 }); }
  const o = new Headers({ "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes" });
  ["Content-Type", "Content-Length", "Content-Range"].forEach(x => { const v = g.headers.get(x); if (v) o.set(x, v); });
  if (!g.ok && g.status !== 206) return new Response("source said " + g.status, { status: 502 });
  return new Response(g.body, { status: g.status, headers: o });
}
