// Cloudflare Pages worker: adds the /proxy MoonLit looks for. Everything else is served as normal files.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
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
