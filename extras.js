/* extras: look engine, wallpaper dim/blur, code apps, quick buttons, running list, new Settings tabs */
const UI=()=>S.get("ml-ui",{}),setUI=(k,v)=>{const u=UI();if(v===""||v==null)delete u[k];else u[k]=v;S.set("ml-ui",u);applyLook()};
const FONTS={sys:["System",""],serif:["Serif",'Georgia,"Times New Roman",serif'],mono:["Mono","ui-monospace,Menlo,Consolas,monospace"],round:["Rounded",'"Trebuchet MS","Segoe UI",sans-serif']};
function applyLook(){const u=UI(),v=(n,x)=>x?n+":"+x+"!important;":"";let c="";
 const bv=v("--wb",u.wb)+v("--bar",u.bar)+v("--wf",u.wf);if(bv)c+="body{"+bv+"}";
 if(u.menu)c+="#menu{background:"+u.menu+"!important}";if(u.dock)c+="#dock{background:"+u.dock+"!important}";if(u.lock)c+="#lock{background:"+u.lock+"!important}";
 if(u.rad!=null)c+=".win{border-radius:"+u.rad+"px!important}";if(u.op&&u.op<100)c+=".win{opacity:"+u.op/100+"}";
 if(u.font&&FONTS[u.font]&&FONTS[u.font][1])c+="html,body,button,input,textarea,select{font-family:"+FONTS[u.font][1]+"!important}";
 if(u.fs)c+="html,body{font-size:"+u.fs+"px!important}";if(u.css)c+=u.css;
 let st=$("#ml-look");if(!st){st=mk("style");st.id="ml-look";document.head.appendChild(st)}st.textContent=c;
 $("#menu b").textContent=u.name||"MoonLit";$(".lw p").textContent=u.welcome||"Welcome to MoonLit";
 let d=$("#wpd");if(!d){d=mk("div");d.id="wpd";d.style.cssText="position:absolute;inset:0;pointer-events:none";$("#desk").prepend(d)}
 d.style.background="rgba(0,0,0,"+(u.dim||0)/100+")";d.style.backdropFilter=d.style.webkitBackdropFilter=u.blur?"blur("+u.blur+"px)":""}
const card=(sc,h)=>{const c=mk("div","card");c.innerHTML='<h4 style="margin-top:0">'+h+'</h4>';sc.appendChild(c);return c};
const btn=(t,fn,cls)=>{const x=mk("button",cls||"btn gh");x.textContent=t;x.onclick=fn;return x};
/* wallpaper: dim, blur, shuffle */
{const o=tWall;tWall=function(sc,re){o(sc,re);const u=UI(),c=card(sc,"WALLPAPER LOOK"),r=(k,mi,ma)=>{const i=mk("input");i.type="range";i.min=mi;i.max=ma;i.value=u[k]||0;i.oninput=()=>setUI(k,+i.value||"");return i};
 c.append(rowEl("Darken",r("dim",0,80)),rowEl("Blur",r("blur",0,14)),rowEl("Random wallpaper at every start",tog("ml-shuf",false)))}}
/* code apps: paste HTML/CSS/JS and it becomes a real app */
const htmlApp=code=>b=>{b.innerHTML="";const f=mk("iframe");f.setAttribute("sandbox","allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock");f.srcdoc=code;b.appendChild(f)};
const TPL='<!doctype html>\n<body style="font-family:sans-serif;padding:20px">\n<h2>My app</h2>\n<button onclick="this.textContent=\'Clicked \'+(++n)">Click me</button>\n<script>let n=0<\/script>\n</body>';
function codeForm(host,a,done){const L=()=>S.get("ml-capps",[]),cu=a&&L().find(c=>c.id===a[0]);
 host.innerHTML='<div class="fm"><div class="fr"><input class="in" data-f="n" placeholder="App name" maxlength="24"><input class="in" data-f="g" placeholder="Icon (emoji)" maxlength="3" style="max-width:110px"><input type="color" data-f="c" value="#2f7cf6"></div><textarea class="in" data-f="h" rows="9" placeholder="Paste HTML / CSS / JavaScript here" spellcheck="false"></textarea><div class="fr">'+(a?"":'<label class="ck"><input type="checkbox" data-f="p" checked> Pin to dock</label>')+'<button class="btn" data-f="s">'+(a?"Save":"Add code app")+'</button><button class="btn gh" data-f="t">Insert template</button>'+(a?'<button class="btn gh" data-f="x">Cancel</button>':"")+'<span data-f="e" style="color:#ef6b6b;font-size:12.5px"></span></div></div>';
 const F=n=>$('[data-f="'+n+'"]',host);if(cu){F("n").value=cu.name;F("g").value=cu.g||"";F("c").value=cu.color||"#2f7cf6";F("h").value=cu.html}
 F("t").onclick=()=>{F("h").value=TPL};if(a)F("x").onclick=()=>host.innerHTML="";
 F("s").onclick=()=>{const n=F("n").value.trim(),h=F("h").value;if(!n||!h.trim()){F("e").textContent="Add a name and some code.";return}
  const rec={id:cu?cu.id:"c"+Date.now(),name:n,url:"(code app)",g:F("g").value.trim(),color:F("c").value,html:h},l=L(),i=l.findIndex(c=>c.id===rec.id);if(i>-1)l[i]=rec;else l.push(rec);S.set("ml-capps",l);
  if(!a&&F("p").checked){const d=S.get("ml-dockset",DEF_DOCK).slice();d.push(rec.id);S.set("ml-dockset",d)}
  const w=a&&wins[a[0]];if(w)$(".r",w).click();done()}}
{const o=tApps;tApps=function(sc,re){const done=()=>{rebuildApps();refresh();re()},c=card(sc,"ADD A CODE APP");c.insertAdjacentHTML("beforeend",'<p style="opacity:.7;margin:0 0 10px;font-size:12.5px">Write or paste your own page and it runs as an app in its own window.</p><div></div>');codeForm($("div",c),null,done);o(sc,re)}}
/* quick buttons */
const QB=()=>S.get("ml-qb",[]),ACT=[["open","Open an app"],["close","Close an app"],["toggle","Open / close an app"],["url","Open a website"],["lock","Lock screen"],["desk","Show desktop"],["closeall","Close all windows"],["wall","Next wallpaper"],["theme","Next theme"],["max","Maximize / restore all"]];
function runQB(q){const w=wins[q.t],ws=()=>Object.values(wins),m={open:()=>openApp(q.t),close:()=>w&&$(".r",w).click(),toggle:()=>w?$(".r",w).click():openApp(q.t),url:()=>window.open(/^https?:/i.test(q.t)?q.t:"https://"+q.t,"_blank","noopener"),lock:()=>$("#lock").classList.remove("off"),desk:()=>ws().forEach(x=>x.style.display="none"),closeall:()=>ws().forEach(x=>$(".r",x).click()),
 wall:()=>{const k=Object.keys(WP),i=k.indexOf(S.get("ml-wp","dusk"));wall(k[(i+1)%k.length])},theme:()=>{const t=["dark","light","black","mono"];theme(t[(t.indexOf(document.body.dataset.theme)+1)%4])},max:()=>ws().forEach(x=>x.classList.toggle("max"))};(m[q.a]||(()=>{}))();markOpen()}
function renderQB(){document.querySelectorAll(".qb").forEach(x=>x.remove());QB().forEach(q=>{const b=mk("button","qb");b.title=q.n;b.onclick=()=>runQB(q);
 if(q.w==="dock"){b.className="ic qb";b.innerHTML='<span class="tl"></span>';const t=$(".tl",b);glyph(t,q.g||q.n[0].toUpperCase());t.style.background=q.c||"#59616f";dock.appendChild(b)}
 else{b.style.cssText="background:none;border:0;cursor:pointer;padding:0 4px;font-size:12.5px";b.textContent=(q.g?q.g+" ":"")+q.n;$("#menu").insertBefore(b,$("#menu .sp"))}})}
{const o=buildDock;buildDock=function(){o();renderQB()}}
function tButtons(sc,re){const c=card(sc,"ADD A BUTTON");c.insertAdjacentHTML("beforeend",'<div class="fm"><div class="fr"><input class="in" data-f="n" placeholder="Button name" maxlength="16"><input class="in" data-f="g" placeholder="Icon (emoji)" maxlength="3" style="max-width:110px"><input type="color" data-f="c" value="#2f7cf6"></div><div class="fr"><select class="in" data-f="a"></select><select class="in" data-f="t"></select><input class="in" data-f="u" placeholder="example.com" hidden></div><div class="fr"><select class="in" data-f="w"><option value="menu">Put it in the menu bar</option><option value="dock">Put it in the dock</option></select><button class="btn" data-f="s">Add button</button><span data-f="e" style="color:#ef6b6b;font-size:12.5px"></span></div></div>');
 const F=n=>$('[data-f="'+n+'"]',c);ACT.forEach(a=>F("a").add(new Option(a[1],a[0])));APPS.forEach(a=>F("t").add(new Option(a[1],a[0])));
 const sh=()=>{const a=F("a").value,ap=/^(open|close|toggle)$/.test(a);F("t").hidden=!ap;F("u").hidden=a!=="url"};F("a").onchange=sh;sh();
 F("s").onclick=()=>{const a=F("a").value,t=a==="url"?F("u").value.trim():/^(open|close|toggle)$/.test(a)?F("t").value:"",n=F("n").value.trim()||ACT.find(x=>x[0]===a)[1];if(a==="url"&&!t){F("e").textContent="Enter a website.";return}
  const l=QB();l.push({id:"q"+Date.now(),n,g:F("g").value.trim(),c:F("c").value,a,t,w:F("w").value});S.set("ml-qb",l);buildDock();re()};
 const l=QB();if(l.length)sc.appendChild(mk("h4",null,"YOUR BUTTONS"));
 l.forEach((q,i)=>{const r=mk("div","ar"),m=mk("div","am"),ab=mk("div","ab");m.innerHTML="<b></b><small></small>";$("b",m).textContent=(q.g?q.g+" ":"")+q.n;$("small",m).textContent=ACT.find(x=>x[0]===q.a)[1]+(q.t?" \u2013 "+(APPS.find(x=>x[0]===q.t)||[0,q.t])[1]:"")+" \u00B7 "+(q.w==="dock"?"dock":"menu bar");
  ab.append(btn("Run",()=>runQB(q)),btn(q.w==="dock"?"Move to menu":"Move to dock",()=>{q.w=q.w==="dock"?"menu":"dock";S.set("ml-qb",l);buildDock();re()}),btn("Delete",()=>{l.splice(i,1);S.set("ml-qb",l);buildDock();re()}));r.append(m,ab);sc.appendChild(r)})}
/* running apps */
function tRunning(sc,re){const c=card(sc,"OPEN WINDOWS"),k=Object.keys(wins);if(!k.length)c.appendChild(mk("p",null,"No apps are open.")).style.opacity=".7";
 k.forEach(id=>{const w=wins[id],r=mk("div","ar"),m=mk("div","am"),ab=mk("div","ab");m.innerHTML="<b></b><small></small>";$("b",m).textContent=$("b",w).textContent;$("small",m).textContent=w.style.display==="none"?"Minimized":w.classList.contains("max")?"Maximized":"Open";
  ab.append(btn("Show",()=>{w.style.display="";focus(w);re()}),btn("Minimize",()=>{w.style.display="none";re()}),btn("Maximize",()=>{w.classList.toggle("max");re()}),btn("Close",()=>{$(".r",w).click();re()}));r.append(m,ab);c.appendChild(r)});
 const ab=mk("div","ab");ab.style.cssText="gap:8px;margin-top:8px";ab.append(btn("Refresh",re),btn("Minimize all",()=>{Object.values(wins).forEach(w=>w.style.display="none");re()}),btn("Close all",()=>{Object.values(wins).forEach(w=>$(".r",w).click());re()}));sc.appendChild(ab)}
/* customize: names, colors, windows, font, custom CSS */
function tCustom(sc,re){const u=UI();
 const nm=card(sc,"NAMES");[["name","Menu bar name (MoonLit)"],["welcome","Lock screen title (Welcome to MoonLit)"]].forEach(x=>{const i=mk("input","in");i.style.cssText="width:100%;margin-top:8px";i.placeholder=x[1];i.maxLength=40;i.value=u[x[0]]||"";i.oninput=()=>setUI(x[0],i.value.trim());nm.appendChild(i)});
 const co=card(sc,"COLORS"),cl=(k,d)=>{const i=mk("input");i.type="color";i.value=u[k]||d;i.oninput=()=>setUI(k,i.value);return i};
 co.append(rowEl("Window background",cl("wb","#23252f")),rowEl("Title bar",cl("bar","#1a1c26")),rowEl("Text",cl("wf","#e8e9ee")),rowEl("Menu bar",cl("menu","#1d1530")),rowEl("Dock",cl("dock","#1d1530")),rowEl("Lock screen",cl("lock","#241538")),rowEl("",btn("Reset colors",()=>{["wb","bar","wf","menu","dock","lock"].forEach(k=>setUI(k,""));re()})));
 const wi=card(sc,"WINDOWS & TEXT"),rg=(k,mi,ma,d)=>{const i=mk("input");i.type="range";i.min=mi;i.max=ma;i.value=u[k]!=null?u[k]:d;i.oninput=()=>setUI(k,+i.value);return i};
 wi.append(rowEl("Corner roundness",rg("rad",0,28,8)),rowEl("Window opacity",rg("op",60,100,100)),rowEl("Text size",rg("fs",12,19,14)),rowEl("Font",segEl(Object.keys(FONTS).map(k=>[k,FONTS[k][0]]),u.font||"sys",v=>{setUI("font",v==="sys"?"":v);re()})));
 const cs=card(sc,"CUSTOM CSS");cs.insertAdjacentHTML("beforeend",'<p style="opacity:.7;margin:0 0 8px;font-size:12.5px">Advanced: any CSS you type here is applied to the whole desktop right away.</p><textarea class="in" rows="6" placeholder="#dock{border-radius:24px}" spellcheck="false"></textarea>');const ta=$("textarea",cs);ta.value=u.css||"";ta.oninput=()=>setUI("css",ta.value);
 sc.appendChild(btn("Reset all customization",()=>{if(confirm("Reset names, colors, windows and custom CSS?")){S.set("ml-ui",{});applyLook();re()}}))}
/* start up */
if(S.get("ml-shuf",false)){const k=Object.keys(WP).filter(x=>x!=="custom");$("#desk").style.background=WP[k[Math.random()*k.length|0]][1]+" center/cover"}
applyLook();buildDock();
