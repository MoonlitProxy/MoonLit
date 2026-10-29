// Shared proxy core. Uses only standard Request/Response/fetch, so it runs
// unchanged on Cloudflare (Pages/Workers), Vercel Edge, Deno and Node 18+.
//
//   GET  /proxy?ping=1            -> "ok"  (the page uses this to detect the proxy)
//   ANY  /proxy?url=<encoded>     -> fetches the page, strips frame-blocking headers,
//                                    injects a small shim so links/forms/fetch keep
//                                    going through the proxy
//   ANY  /proxy?url=<..>&raw=1    -> untouched passthrough with CORS (search, etc.)

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
  "access-control-expose-headers": "*",
};

export function blockedHost(h) {
  h = String(h).toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (!h.includes(".") && !h.includes(":")) return true; // single-label / numeric hosts
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (h.includes(":")) return h === "::1" || h === "::" || /^(fc|fd|fe80)/.test(h) || h.startsWith("::ffff:");
  return false;
}

const reply = (status, msg, extra = {}) =>
  new Response(msg, { status, headers: { ...CORS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...extra } });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const js = (s) => JSON.stringify(s).replace(/</g, "\\u003c");

function errorPage(url, why) {
  const body = `<!doctype html><meta charset="utf-8"><body style="font:15px/1.6 system-ui,sans-serif;background:#23272e;color:#e6e8eb;display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:20px"><div><h2 style="margin:0 0 8px;font-weight:600">Couldn\u2019t load this page</h2><p style="opacity:.75;max-width:440px;margin:0 auto">${esc(why)}</p><p style="opacity:.5;font-size:12px;word-break:break-all">${esc(url)}</p></div></body>`;
  return new Response(body, { status: 502, headers: { ...CORS, "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

// Runs inside the proxied page.
function shim(P, U) {
  return `<base href="${esc(U)}"><meta name="referrer" content="no-referrer"><script>(function(){
var P=${js(P)},U=${js(U)};
function px(u){try{var a=new URL(u,U);if(!/^https?:$/.test(a.protocol)||a.href.indexOf(P)===0)return u;return P+encodeURIComponent(a.href)}catch(e){return u}}
var f=window.fetch;if(f)window.fetch=function(i,o){try{if(typeof i==="string"||i instanceof URL)i=px(String(i));else if(i&&i.url)i=new Request(px(i.url),i)}catch(e){}return f.call(this,i,o)};
var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){var a=[].slice.call(arguments);a[1]=px(String(u));return xo.apply(this,a)};
document.addEventListener("keydown",function(e){if(e.ctrlKey&&e.altKey&&!e.shiftKey&&!e.metaKey&&/^(Arrow(Left|Right)|Comma|Period|KeyT|KeyW|KeyH|Digit[1-9])$/.test(e.code)){e.preventDefault();parent.postMessage({ml:"key",c:e.code},"*")}},true);
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href]");if(!a||e.defaultPrevented)return;var h=a.getAttribute("href");if(!h||h[0]==="#"||/^(javascript|mailto|tel|blob|data):/i.test(h))return;e.preventDefault();parent.postMessage({ml:"go",u:a.href},"*")},true);
document.addEventListener("submit",function(e){var f=e.target;if(e.defaultPrevented)return;if(f.method&&f.method.toLowerCase()==="post"){f.action=px(f.action||U);return}e.preventDefault();var u=new URL(f.getAttribute("action")||"",document.baseURI);u.search=new URLSearchParams(new FormData(f)).toString();parent.postMessage({ml:"go",u:u.href},"*")},true);
})();<\/script>`;
}

function decode(buf, type) {
  const m = /charset=["']?([\w-]+)/i.exec(type);
  if (m && !/^utf-?8$/i.test(m[1])) { try { return new TextDecoder(m[1]).decode(buf); } catch (e) {} }
  return new TextDecoder().decode(buf);
}

export async function handleProxy(request, opts = {}) {
  const here = new URL(request.url);
  if (here.searchParams.has("ping")) return reply(200, "ok");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...CORS,
      "access-control-allow-headers": request.headers.get("access-control-request-headers") || "*",
      "access-control-max-age": "86400" } });
  }

  let target;
  try { target = new URL(here.searchParams.get("url") || ""); } catch (e) { return reply(400, "Bad or missing url"); }
  const allowed = async (u) =>
    /^https?:$/.test(u.protocol) && (opts.allowPrivate || !blockedHost(u.hostname)) && (!opts.check || (await opts.check(u.hostname)));
  if (!(await allowed(target))) return reply(403, "That address is not allowed");

  const raw = here.searchParams.has("raw");
  const h = new Headers();
  h.set("user-agent", UA);
  h.set("accept", request.headers.get("accept") || "*/*");
  h.set("accept-language", request.headers.get("accept-language") || "en-US,en;q=0.9");
  for (const k of ["content-type", "range"]) { const v = request.headers.get(k); if (v) h.set(k, v); }

  let method = request.method, body;
  if (method !== "GET" && method !== "HEAD") body = await request.arrayBuffer();

  // follow redirects by hand so every hop is checked
  let cur = target, res, hops = 0;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 25000);
  try {
    for (;;) {
      res = await fetch(cur, { method, headers: h, body, redirect: "manual", signal: ac.signal });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc && hops++ < 8) {
        const nx = new URL(loc, cur);
        if (!(await allowed(nx))) return reply(403, "Redirect to a blocked address");
        cur = nx;
        if (res.status <= 303 && method !== "GET" && method !== "HEAD") { method = "GET"; body = undefined; h.delete("content-type"); }
        continue;
      }
      break;
    }
  } catch (e) {
    clearTimeout(timer);
    return raw ? reply(502, "Upstream failed") : errorPage(target.href, ac.signal.aborted ? "The site took too long to answer." : "The site could not be reached.");
  }
  clearTimeout(timer);

  const type = res.headers.get("content-type") || "";
  const out = new Headers(CORS);
  for (const k of ["content-type", "content-range", "accept-ranges", "etag", "last-modified", "content-disposition"]) {
    const v = res.headers.get(k); if (v) out.set(k, v);
  }

  if (raw || !/html/i.test(type) || method === "HEAD") {
    const cc = res.headers.get("cache-control"); if (cc && !raw) out.set("cache-control", cc);
    return new Response(res.body, { status: res.status, headers: out });
  }

  let html = decode(await res.arrayBuffer(), type);
  html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy[^>]*>/gi, "").replace(/<base\b[^>]*>/gi, "");
  const P = here.origin + "/proxy?url=";
  const ins = shim(P, cur.href);
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + ins);
  else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>/i, (m) => m + ins);
  else html = ins + html;

  out.set("content-type", "text/html; charset=utf-8");
  out.set("cache-control", "no-store");
  return new Response(html, { status: res.status, headers: out });
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === "/proxy") return handleProxy(request);
    return env.ASSETS.fetch(request);
  },
};
