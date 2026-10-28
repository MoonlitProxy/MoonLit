/* search: several engines at once, results merged. Pages are fetched through /proxy (raw). */
const clean=s=>(s||"").replace(/\s+/g," ").trim();
const dom=h=>new DOMParser().parseFromString(h,"text/html");
const okRes=x=>x&&x.t&&/^https?:\/\//.test(x.u)&&!/duckduckgo\.com\/(y\.js|l\/)/.test(x.u);
async function getHTML(u,ms){await PXP;const P=[...(PX?[rawPX]:[]),x=>"https://api.allorigins.win/raw?url="+encodeURIComponent(x),x=>"https://corsproxy.io/?url="+encodeURIComponent(x)];
 for(const p of P){try{const r=await fetch(p(u),{signal:AbortSignal.timeout(ms||9000)});if(!r.ok)continue;const t=await r.text();if(t&&t.length>500)return t}catch(e){}}return null}
function pDDG(h){const d=dom(h);return [...d.querySelectorAll(".result")].filter(e=>!e.classList.contains("result--ad")).map(e=>{const a=e.querySelector(".result__a");if(!a)return null;let u=a.getAttribute("href")||"";const m=u.match(/uddg=([^&]+)/);if(m)u=decodeURIComponent(m[1]);else if(u.startsWith("//"))u="https:"+u;const s=e.querySelector(".result__snippet");return{t:clean(a.textContent),u,s:clean(s&&s.textContent)}}).filter(okRes)}
function unBing(u){const m=u.match(/[?&]u=a1([^&]+)/);if(m){try{let b=m[1].replace(/-/g,"+").replace(/_/g,"/");while(b.length%4)b+="=";return decodeURIComponent(escape(atob(b)))}catch(e){}}return u}
function pBing(h){const d=dom(h);return [...d.querySelectorAll("li.b_algo")].map(e=>{const a=e.querySelector("h2 a");if(!a)return null;const s=e.querySelector(".b_caption p,.b_lineclamp2,.b_lineclamp3,.b_algoSlug");return{t:clean(a.textContent),u:unBing(a.getAttribute("href")||""),s:clean(s&&s.textContent)}}).filter(okRes)}
function pBrave(h){const d=dom(h);return [...d.querySelectorAll(".snippet[data-type=web]")].map(e=>{const a=e.querySelector("a[href^=http]");if(!a)return null;const t=e.querySelector(".title,.snippet-title"),s=e.querySelector(".snippet-description,.generic-snippet,.content");return{t:clean((t||a).textContent),u:a.getAttribute("href")||"",s:clean(s&&s.textContent)}}).filter(x=>okRes(x)&&!/brave\.com/.test(x.u))}
function pMojeek(h){const d=dom(h);return [...d.querySelectorAll(".results-standard li")].map(e=>{const a=e.querySelector("a.title")||e.querySelector("h2 a");if(!a)return null;const s=e.querySelector("p.s");return{t:clean(a.textContent),u:a.getAttribute("href")||"",s:clean(s&&s.textContent)}}).filter(okRes)}
const keyOf=u=>u.replace(/^https?:\/\/(www\.)?/,"").replace(/[#?].*$/,"").replace(/\/$/,"").toLowerCase();
async function webSearch(q){
 const E=[["DuckDuckGo","https://html.duckduckgo.com/html/?q=",pDDG],["Bing","https://www.bing.com/search?setlang=en&q=",pBing],["Brave","https://search.brave.com/search?source=web&q=",pBrave],["Mojeek","https://www.mojeek.com/search?q=",pMojeek]];
 const got=[];await new Promise(res=>{let left=E.length,tm=null;E.forEach((e,i)=>{(async()=>{const h=await getHTML(e[1]+encodeURIComponent(q));if(!h)return null;try{const r=e[2](h);return r.length?{i,n:e[0],r}:null}catch(x){return null}})().then(v=>{if(v){got.push(v);if(!tm)tm=setTimeout(res,1500)}if(--left===0){clearTimeout(tm);res()}})})});
 if(!got.length)return null;got.sort((a,b)=>a.i-b.i);const seen=new Set(),list=[];
 for(let k=0;list.length<20;k++){let any=false;for(const g of got){const x=g.r[k];if(!x)continue;any=true;const id=keyOf(x.u);if(seen.has(id))continue;seen.add(id);list.push(x)}if(!any)break}
 return{list,src:got.map(g=>g.n).join(" + ")}}
async function ytSearch(q){const h=await getHTML("https://www.youtube.com/results?hl=en&search_query="+encodeURIComponent(q),12000);if(!h)return null;
 const out=[],seen=new Set(),re=/"videoRenderer":\{"videoId":"([\w-]{11})"/g;let m;
 while((m=re.exec(h))&&out.length<16){const id=m[1];if(seen.has(id))continue;seen.add(id);const w=h.slice(m.index,m.index+3500);
  const g=rx=>{const x=w.match(rx);if(!x)return"";try{return JSON.parse('"'+x[1]+'"')}catch(e){return x[1]}};
  const t=g(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/),c=g(/"ownerText":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/),len=g(/"lengthText":\{[\s\S]{0,240}?"simpleText":"([^"]+)"/),v=g(/"viewCountText":\{"simpleText":"([^"]+)"/);
  if(t)out.push({id,t,s:[c,v,len].filter(Boolean).join(" \u00B7 ")})}
 return out.length?out:null}
const SITES={youtube:"https://www.youtube.com",google:"https://www.google.com",tiktok:"https://www.tiktok.com",reddit:"https://www.reddit.com",twitter:"https://x.com",x:"https://x.com",instagram:"https://www.instagram.com",facebook:"https://www.facebook.com",netflix:"https://www.netflix.com",spotify:"https://open.spotify.com",discord:"https://discord.com",twitch:"https://www.twitch.tv",amazon:"https://www.amazon.com",github:"https://github.com",wikipedia:"https://www.wikipedia.org",roblox:"https://www.roblox.com",minecraft:"https://www.minecraft.net",pinterest:"https://www.pinterest.com",snapchat:"https://www.snapchat.com",gmail:"https://mail.google.com",duckduckgo:"https://duckduckgo.com",bing:"https://www.bing.com",yahoo:"https://www.yahoo.com",imdb:"https://www.imdb.com",espn:"https://www.espn.com",weather:"https://weather.com"};
function quickSite(q){const k=q.toLowerCase().replace(/\s+/g,"").replace(/\.com$/,"");const u=SITES[k];const N={youtube:"YouTube",tiktok:"TikTok",github:"GitHub",imdb:"IMDb",espn:"ESPN",duckduckgo:"DuckDuckGo",x:"X"};return u?{t:N[k]||k[0].toUpperCase()+k.slice(1),u,s:"Official site"}:null}
