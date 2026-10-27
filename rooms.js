/* Rooms: chat over the free ntfy.sh relay; messages are encrypted in the browser with a key made from the room name + password */
const NTFY=window.MOONLIT_NTFY||"https://ntfy.sh",DIR="ml-directory-v1";
const PUB=[["general","General"],["games","Games"],["music","Music"],["study","Study"],["random","Random"]];
const hex=buf=>[...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("");
const b64=u=>btoa(String.fromCharCode(...u)),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function roomKey(salt,pw){const e=new TextEncoder(),base=await crypto.subtle.importKey("raw",e.encode(pw),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:e.encode("moonlit:"+salt),iterations:100000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function seal(key,o){const iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(o)))),r=new Uint8Array(12+ct.length);r.set(iv);r.set(ct,12);return b64(r)}
async function unseal(key,s){try{const u=unb64(s);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:u.slice(0,12)},key,u.slice(12))))}catch(e){return null}}
async function loadDir(){try{const t=await(await fetch(NTFY+"/"+DIR+"/json?poll=1&since=12h")).text(),m=new Map;t.split("\n").forEach(l=>{try{const j=JSON.parse(l);if(j.event!=="message")return;const o=JSON.parse(j.message);if(o&&typeof o.n==="string"&&o.n.length<=30)m.set(o.n.toLowerCase(),{n:o.n,lk:!!o.lk,ts:j.time})}catch(e){}});return[...m.values()].sort((a,c)=>c.ts-a.ts)}catch(e){return null}}
async function announce(n,lk){try{await fetch(NTFY+"/"+DIR,{method:"POST",body:JSON.stringify({n,lk})})}catch(e){}}
function rooms(b){let es=null,cur=null,seen=new Set,msgs=[],good=0,bad=0,dir=[],fixed=false;const nick=user==="Guest"?"Guest"+(1000+Math.random()*9000|0):user;
 b.innerHTML='<div class="rm"><div class="rs"><input class="in" id="rq" placeholder="Search rooms" aria-label="Search rooms"><div id="rr"></div><h4>PUBLIC ROOMS</h4><div id="rp"></div><h4>YOUR ROOMS</h4><div id="ry"></div><button class="btn" id="rn" style="margin-top:8px">+ Make a room</button><p class="rno">Public rooms are open to everyone. Don\u2019t share personal info.</p></div><div class="rc2"><div class="rh2" id="rh">Pick a room</div><div class="rl" id="rl"></div><form class="rf" id="rf"><input class="in" id="ri" placeholder="Message" maxlength="400" autocomplete="off" aria-label="Message"><button class="btn">Send</button></form><div class="mo" id="rj" hidden><div><b id="rt"></b><p id="rd" style="opacity:.7;font-size:12.5px;margin:6px 0"></p><input class="in" id="rname" placeholder="Room name" maxlength="30" style="width:100%;margin-bottom:8px"><input class="in" id="rpw" type="password" placeholder="Password" style="width:100%;margin-bottom:8px"><label id="rlw" style="display:flex;gap:8px;align-items:center;font-size:12.5px;margin-bottom:8px"><input type="checkbox" id="rls" checked> Show this room in search</label><div id="rerr" style="min-height:1.4em;font-size:12.5px;color:#ff6b6b"></div><div style="display:flex;gap:8px"><button type="button" class="btn gh" id="rc" style="flex:1">Cancel</button><button type="button" class="btn" id="rg" style="flex:1">Join</button></div></div></div></div></div>';
 const rl=$("#rl",b),rh=$("#rh",b),rj=$("#rj",b),stop=()=>{if(es){es.close();es=null}};
 const draw=()=>{rl.innerHTML="";msgs.sort((a,c)=>a.ts-c.ts).forEach(m=>{const d=mk("div","mg"+(m.u===nick?" me":"")),s=mk("small"),t=mk("div");s.textContent=m.u+" \u00B7 "+new Date(m.ts).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});t.textContent=m.t;d.append(s,t);rl.appendChild(d)});rl.scrollTop=rl.scrollHeight};
 const note=t=>{const d=mk("div","rn");d.textContent=t;rl.appendChild(d);rl.scrollTop=rl.scrollHeight};
 const connect=(r,check)=>new Promise(res=>{stop();seen=new Set;msgs=[];good=bad=0;draw();cur=r;
  es=new EventSource(NTFY+"/"+r.topic+"/sse?since=12h");es.onopen=()=>{rh.dataset.s=""};es.onerror=()=>{rh.dataset.s="reconnecting"};
  es.onmessage=async ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}if(m.event!=="message"||seen.has(m.id))return;seen.add(m.id);const o=await unseal(r.key,m.message);if(!o||typeof o.t!=="string"){bad++;return}good++;msgs.push({u:String(o.u).slice(0,24),t:o.t.slice(0,400),ts:+o.ts||m.time*1000});draw()};
  setTimeout(()=>res(check&&bad>0&&good===0?"wrong":"ok"),check?2500:300)});
 const open=async(name,pw,pub)=>{const r={name,pub,topic:"",key:null};
  if(pub){r.topic="ml-pub-"+name;r.key=await roomKey("pub-"+name,"")}else{r.topic="ml-"+hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode("moonlit-room:"+name.toLowerCase()))).slice(0,32);r.key=await roomKey(name.toLowerCase(),pw)}
  if(await connect(r,!pub)==="wrong"){stop();cur=null;return false}
  rh.textContent=(pub?"# ":"")+name;$("#ri",b).focus();note("You joined as "+nick+".");return true};
 const remember=n=>{const L=S.get("ml-rooms",[]).filter(x=>x.toLowerCase()!==n.toLowerCase());L.unshift(n);S.set("ml-rooms",L.slice(0,8));list()};
 const ask=(name,lock)=>{fixed=lock;$("#rt",b).textContent=lock?"Enter the password":"Make or join a room";$("#rd",b).textContent=lock?"This room has a password.":"Type a room name. If it already has a password, type that too. A new name makes a new room.";
  const n=$("#rname",b);n.value=name;n.readOnly=lock;n.style.opacity=lock?".6":"";$("#rpw",b).value="";$("#rerr",b).textContent="";$("#rlw",b).style.display=lock?"none":"flex";rj.hidden=false;(lock?$("#rpw",b):n).focus()};
 const list=()=>{const p=$("#rp",b),y=$("#ry",b);p.innerHTML=y.innerHTML="";PUB.forEach(x=>{const k=mk("button","pb ri");k.textContent="# "+x[1];k.onclick=()=>open(x[0],"",true);p.appendChild(k)});
  S.get("ml-rooms",[]).forEach(n=>{const k=mk("button","pb ri");k.textContent=n;k.onclick=()=>ask(n,true);y.appendChild(k)})};list();
 const found=()=>{const q=$("#rq",b).value.trim().toLowerCase(),r=$("#rr",b);r.innerHTML="";if(!q)return;const h=mk("h4");h.textContent="SEARCH RESULTS";r.appendChild(h);
  const m=dir.filter(x=>x.n.toLowerCase().includes(q)).slice(0,8);if(!m.length){const d=mk("div","rno");d.textContent="No rooms found. Make it with + Make a room.";r.appendChild(d)}
  m.forEach(x=>{const k=mk("button","pb ri");k.textContent=x.n+(x.lk?" (password)":"");k.onclick=async()=>{if(x.lk){ask(x.n,true);return}if(await open(x.n,"",false)){remember(x.n);announce(x.n,false)}};r.appendChild(k)})};
 const refresh=()=>loadDir().then(d=>{dir=d||dir;found()});refresh();$("#rq",b).oninput=found;$("#rq",b).onfocus=refresh;
 $("#rn",b).onclick=()=>ask("",false);$("#rc",b).onclick=()=>rj.hidden=true;
 $("#rg",b).onclick=async()=>{const n=$("#rname",b).value.trim(),e=$("#rerr",b);if(!n){e.textContent="Type a room name.";return}e.style.color="#8bd5ff";e.textContent="Joining\u2026";const pw=$("#rpw",b).value;
  if(!await open(n,pw,false)){e.style.color="#ff6b6b";e.textContent="Wrong password for this room.";return}
  remember(n);if(fixed||$("#rls",b).checked)announce(n,fixed?true:!!pw);rj.hidden=true;$("#rpw",b).value=""};
 $("#rpw",b).onkeydown=$("#rname",b).onkeydown=e=>{if(e.key==="Enter")$("#rg",b).click()};
 $("#rf",b).onsubmit=async e=>{e.preventDefault();const i=$("#ri",b),t=i.value.trim();if(!t||!cur)return;i.value="";
  try{const r=await fetch(NTFY+"/"+cur.topic,{method:"POST",body:await seal(cur.key,{u:nick,t,ts:Date.now()})});if(!r.ok)throw 0}catch(x){note("Couldn\u2019t send that message. Try again in a moment.")}};
 new MutationObserver((_,o)=>{if(!b.isConnected){stop();o.disconnect()}}).observe($("#desk"),{childList:true});
 note("Search for a room, pick a public room, or make your own.")}
