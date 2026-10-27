const ACC=["#2f7cf6","#8b5cf6","#ec4899","#f59e0b","#22c55e","#06b6d4","#ef4444","#14b8a6","#a3835b"];
function wall(k){S.set("ml-wp",k);$("#desk").style.background=WP[k][1]+" center/cover"}
function theme(k){S.set("ml-th",k);document.body.dataset.theme=k}
function accent(c){S.set("ml-ac",c);document.documentElement.style.setProperty("--acc",c)}
if(S.get("ml-cwp",null))WP.custom=["Custom",S.get("ml-cwp")];wall(WP[S.get("ml-wp","dusk")]?S.get("ml-wp","dusk"):"dusk");theme(S.get("ml-th","dark"));accent(S.get("ml-ac","#2f7cf6"));
function glyph(el,g){if(/^<svg/.test(g))el.innerHTML=g;else el.textContent=g}
let user="Guest",z=10,cnt=0;const wins={};
/* tab cloak */
const LOGO="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2218%22%20fill%3D%22%232b3a4a%22/%3E%3Cpath%20d%3D%22M62%2022a30%2030%200%201%200%2016%2046A26%2026%200%200%201%2062%2022z%22%20fill%3D%22%23e9e5d6%22/%3E%3C/svg%3E";
function imgFrom(u){u=(u||"").trim();if(!u)return"";if(/^data:image\//i.test(u)||/\.(png|jpe?g|gif|svg|webp|ico|avif)(\?|#|$)/i.test(u))return u;try{const h=new URL(/^https?:\/\//i.test(u)?u:"https://"+u).hostname;return"https://www.google.com/s2/favicons?domain="+h+"&sz=128"}catch(e){return""}}
function iconHref(i){i=(i||"").trim();if(!i)return LOGO;if([...i].length<=4&&!/[.\/:]/.test(i))return"data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">'+i.replace(/[<&]/g,"")+'</text></svg>');return imgFrom(i)||LOGO}
function cloak(t,i){S.set("ml-cl",[t,i]);document.title=t||"MoonLit";document.querySelectorAll("link[rel~=icon]").forEach(x=>x.remove());const l=document.createElement("link");l.rel="icon";l.href=iconHref(i);document.head.appendChild(l)}
{const c=S.get("ml-cl",null);if(c)cloak(c[0],c[1])}
/* clock, battery, weather */
function tick(){const d=new Date();$("#lc").textContent=d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}).replace(/ ?[AP]M/i,"");$("#ld").textContent=d.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"});$("#mc").textContent=d.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})+"  "+d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"})}
setInterval(tick,1000);tick();
if(navigator.getBattery)navigator.getBattery().then(b=>{const u=()=>$("#bt").textContent=Math.round(b.level*100)+"%";u();b.onlevelchange=u}).catch(()=>{});
fetch("https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m,weather_code&temperature_unit=fahrenheit").then(r=>r.json()).then(d=>{const c=d.current.weather_code,t=[[0,"\u2600\uFE0F","Clear"],[2,"\u26C5","Partly cloudy"],[3,"\u2601\uFE0F","Cloudy"],[48,"\uD83C\uDF2B\uFE0F","Foggy"],[67,"\uD83C\uDF27\uFE0F","Rain"],[77,"\u2744\uFE0F","Snow"],[82,"\uD83C\uDF27\uFE0F","Showers"],[99,"\u26C8\uFE0F","Thunderstorm"]].find(x=>c<=x[0]);$("#wt").textContent=Math.round(d.current.temperature_2m)+"\u00B0";$("#wd").textContent=t[2];$("#wx").style.display="block"}).catch(()=>{});
/* lock screen (accounts are saved only in this browser) */
let mode="in";const hs=p=>btoa(unescape(encodeURIComponent(p)));
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{mode=b.dataset.m;document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x===b));$("#go").textContent=mode==="in"?"Log in":"Create account";$("#err").textContent=""});
function enter(u){user=u;$("#av").textContent=u[0].toUpperCase();$("#lock").classList.add("off");$("#lp").value=""}
$("#go").onclick=()=>{const u=$("#lu").value.trim(),p=$("#lp").value,e=$("#err");e.textContent="";if(!u||!p){e.textContent="Enter a username and password.";return}const us=S.get("ml-users",{});
 if(mode==="up"){if(us[u]){e.textContent="That username is taken.";return}us[u]=hs(p);S.set("ml-users",us);enter(u)}else if(us[u]!==hs(p)){e.textContent="Wrong username or password.";return}else enter(u)};
$("#lp").onkeydown=e=>{if(e.key==="Enter")$("#go").click()};$("#guest").onclick=()=>enter("Guest");$("#lk").onclick=()=>$("#lock").classList.remove("off");
