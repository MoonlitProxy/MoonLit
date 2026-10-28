/* paint: layers, eraser, shapes, fill, picker, undo/redo */
function paint(b){const W=960,H=600;let tool="brush",col="#e8478b",sz=8,op=1,dr=0,pts=[],st=null,A=0,L=[],U=[],R=[],n=0;
 b.innerHTML='<div class="pt"></div><div class="pm"><div class="pa"><div class="pw"></div></div><div class="pl"></div></div>';
 const pt=$(".pt",b),pw=$(".pw",b),pl=$(".pl",b),ov=mk("canvas");ov.width=W;ov.height=H;ov.style.cssText="z-index:999;cursor:crosshair;touch-action:none";pw.appendChild(ov);const o=ov.getContext("2d");
 const cx=i=>L[i].c.getContext("2d");
 const T=[["brush","Brush","Brush"],["eraser","Eraser","Eraser"],["line","Line","Line"],["rect","Rect","Rectangle"],["ell","Oval","Ellipse"],["fill","Fill","Fill"],["pick","Pick","Color picker"]];
 T.forEach(t=>{const x=mk("button","pb"+(t[0]===tool?" on":""),t[1]);x.title=t[2];x.dataset.t=t[0];x.onclick=()=>{tool=t[0];pt.querySelectorAll("[data-t]").forEach(y=>y.classList.toggle("on",y===x))};pt.appendChild(x)});
 const col_=mk("input");col_.type="color";col_.value=col;col_.oninput=()=>col=col_.value;col_.title="Color";
 const sw=mk("div","sw2");["#000000","#ffffff","#ff375f","#ff9f0a","#ffd60a","#30d158","#64d2ff","#2f7cf6","#bf5af2","#ac8e68"].forEach(c=>{const s=mk("i");s.style.background=c;s.onclick=()=>{col=c;col_.value=c};sw.appendChild(s)});
 const rs=mk("input");rs.type="range";rs.min=1;rs.max=60;rs.value=sz;rs.title="Size";rs.oninput=()=>sz=+rs.value;const ro=mk("input");ro.type="range";ro.min=5;ro.max=100;ro.value=100;ro.title="Opacity";ro.oninput=()=>{op=ro.value/100;ov.style.opacity=op};
 const bt=(t,ti,f)=>{const x=mk("button","pb",t);x.title=ti;x.onclick=f;pt.appendChild(x)};
 pt.append(col_,sw,rs,ro);bt("\u21B6","Undo",()=>undo());bt("\u21B7","Redo",()=>redo());bt("Clear","Clear layer",()=>{snap();cx(A).clearRect(0,0,W,H)});bt("Save","Save PNG",()=>{const c=flat(),a=mk("a");a.href=c.toDataURL("image/png");a.download="moonlit-paint.png";a.click()});
 function flat(){const c=mk("canvas");c.width=W;c.height=H;const x=c.getContext("2d");L.forEach(l=>{if(l.v){x.globalAlpha=l.o;x.drawImage(l.c,0,0)}});return c}
 function addLayer(name,white){const c=mk("canvas");c.width=W;c.height=H;if(white){const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,W,H)}pw.insertBefore(c,ov);L.push({c,v:true,o:1,name:name||"Layer "+(++n)});A=L.length-1;U=[];R=[];draw()}
 function sync(){L.forEach((l,k)=>{l.c.style.zIndex=k;l.c.style.display=l.v?"":"none";l.c.style.opacity=l.o})}
 function draw(){sync();pl.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><b>Layers</b><button class="pb" id="la" title="Add layer">+</button></div>';
  for(let k=L.length-1;k>=0;k--){const l=L[k],r=mk("div","ly"+(k===A?" on":""),'<button class="pb" data-a="v"></button><span class="ln"></span><button class="pb" data-a="u" title="Move up">\u25B2</button><button class="pb" data-a="d" title="Move down">\u25BC</button><button class="pb" data-a="x" title="Delete">\u2715</button>');
   $("[data-a=v]",r).textContent=l.v?"On":"Off";$(".ln",r).textContent=l.name;$(".ln",r).onclick=()=>{A=k;draw()};
   $("[data-a=v]",r).onclick=()=>{l.v=!l.v;draw()};$("[data-a=u]",r).onclick=()=>{if(k<L.length-1){[L[k],L[k+1]]=[L[k+1],L[k]];if(A===k)A=k+1;else if(A===k+1)A=k;U=[];R=[];draw()}};
   $("[data-a=d]",r).onclick=()=>{if(k>0){[L[k],L[k-1]]=[L[k-1],L[k]];if(A===k)A=k-1;else if(A===k-1)A=k;U=[];R=[];draw()}};
   $("[data-a=x]",r).onclick=()=>{if(L.length>1){l.c.remove();L.splice(k,1);A=Math.min(A,L.length-1);U=[];R=[];draw()}};pl.appendChild(r)}
  const lo=mk("input");lo.type="range";lo.min=5;lo.max=100;lo.value=L[A].o*100;lo.oninput=()=>{L[A].o=lo.value/100;sync()};const lb=mk("div",null,"<small>Layer opacity</small>");lb.style.marginTop="10px";lb.appendChild(lo);pl.appendChild(lb);$("#la",pl).onclick=()=>addLayer()}
 const snap=()=>{U.push({k:A,d:cx(A).getImageData(0,0,W,H)});if(U.length>30)U.shift();R=[]};
 const undo=()=>{const s=U.pop();if(!s||!L[s.k])return;R.push({k:s.k,d:cx(s.k).getImageData(0,0,W,H)});cx(s.k).putImageData(s.d,0,0)};
 const redo=()=>{const s=R.pop();if(!s||!L[s.k])return;U.push({k:s.k,d:cx(s.k).getImageData(0,0,W,H)});cx(s.k).putImageData(s.d,0,0)};
 const pos=e=>{const r=ov.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]};
 const hex=c=>[1,3,5].map(k=>parseInt(c.slice(k,k+2),16));
 function fill(p){const x=cx(A),id=x.getImageData(0,0,W,H),d=id.data,X=p[0]|0,Y=p[1]|0,i0=(Y*W+X)*4,t=[d[i0],d[i0+1],d[i0+2],d[i0+3]],f=hex(col);if(Math.abs(t[0]-f[0])+Math.abs(t[1]-f[1])+Math.abs(t[2]-f[2])+Math.abs(t[3]-255)<8)return;
  const same=i=>Math.abs(d[i]-t[0])+Math.abs(d[i+1]-t[1])+Math.abs(d[i+2]-t[2])+Math.abs(d[i+3]-t[3])<40,seen=new Uint8Array(W*H),s=[X+Y*W];
  while(s.length){const k=s.pop();if(seen[k])continue;seen[k]=1;const i=k*4;if(!same(i))continue;d[i]=f[0];d[i+1]=f[1];d[i+2]=f[2];d[i+3]=255;const c=k%W;if(c>0)s.push(k-1);if(c<W-1)s.push(k+1);if(k>=W)s.push(k-W);if(k<W*H-W)s.push(k+W)}x.putImageData(id,0,0)}
 function pick(p){const c=flat(),x=c.getContext("2d"),d=x.getImageData(p[0]|0,p[1]|0,1,1).data;const h=v=>v.toString(16).padStart(2,"0");col="#"+h(d[0])+h(d[1])+h(d[2]);col_.value=col}
 const shape=(x,a,p)=>{x.beginPath();if(tool==="line"){x.moveTo(a[0],a[1]);x.lineTo(p[0],p[1])}else if(tool==="rect")x.rect(a[0],a[1],p[0]-a[0],p[1]-a[1]);else x.ellipse((a[0]+p[0])/2,(a[1]+p[1])/2,Math.abs(p[0]-a[0])/2,Math.abs(p[1]-a[1])/2,0,0,7);x.stroke()};
 const style=x=>{x.strokeStyle=col;x.fillStyle=col;x.lineWidth=sz;x.lineCap=x.lineJoin="round";x.globalAlpha=1};
 ov.onpointerdown=e=>{if(!L[A].v)return;const p=pos(e);if(tool==="pick"){pick(p);return}ov.setPointerCapture(e.pointerId);snap();if(tool==="fill"){fill(p);return}dr=1;st=p;pts=[p];if(tool==="eraser")erase(p,p)};
 const erase=(a,p)=>{const x=cx(A);x.save();x.globalCompositeOperation="destination-out";x.lineWidth=sz*1.5;x.lineCap=x.lineJoin="round";x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(p[0],p[1]);x.stroke();x.restore()};
 ov.onpointermove=e=>{if(!dr)return;const p=pos(e);if(tool==="eraser"){erase(pts[pts.length-1],p);pts.push(p);return}o.clearRect(0,0,W,H);style(o);
  if(tool==="brush"){pts.push(p);o.beginPath();o.moveTo(pts[0][0],pts[0][1]);pts.forEach(q=>o.lineTo(q[0],q[1]));if(pts.length===1)o.lineTo(p[0]+.01,p[1]);o.stroke()}else shape(o,st,p)};
 ov.onpointerup=()=>{if(!dr)return;dr=0;if(tool!=="eraser"){const x=cx(A);x.save();x.globalAlpha=op;x.drawImage(ov,0,0);x.restore()}o.clearRect(0,0,W,H);pts=[]};
 addLayer("Background",true);addLayer()}
function camera(b){b.innerHTML='<video autoplay playsinline muted style="flex:1;width:100%;background:#000;min-height:0"></video><div style="padding:10px;display:flex;gap:8px;justify-content:center"><button class="btn" id="sn">Take photo</button></div>';const v=$("video",b);
 navigator.mediaDevices&&navigator.mediaDevices.getUserMedia?navigator.mediaDevices.getUserMedia({video:true}).then(s=>{v.srcObject=s;const o=new MutationObserver(()=>{if(!b.isConnected){s.getTracks().forEach(t=>t.stop());o.disconnect()}});o.observe($("#desk"),{childList:true})}).catch(()=>b.insertAdjacentHTML("afterbegin",'<p style="padding:16px">Camera is blocked or unavailable.</p>')):0;
 $("#sn",b).onclick=()=>{const c=mk("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);const a=mk("a");a.href=c.toDataURL("image/png");a.download="moonlit-photo.png";a.click()}}
function idapp(b){b.style.cssText+="align-items:center;justify-content:center;text-align:center;gap:8px";b.innerHTML='<div class="lr" style="font-size:72px;margin:0"></div><h2 style="margin:6px 0 0"></h2><p style="opacity:.7;margin:0">MoonLit ID \u2014 saved on this device only</p><button class="btn gh" id="lo">Lock screen</button>';$("h2",b).textContent=user;$("#lo",b).onclick=()=>$("#lock").classList.remove("off")}
function links(b){const L=()=>S.get("ml-links",[["DuckDuckGo","https://duckduckgo.com"],["Wikipedia","https://www.wikipedia.org"]]);const draw=()=>{b.innerHTML='<div style="display:flex;gap:8px;padding:12px"><input class="in" id="ln" placeholder="Name" style="width:30%"><input class="in" id="lu2" placeholder="Address" style="flex:1"><button class="btn" id="la">Add</button></div><div id="ll" style="padding:0 12px 12px"></div>';L().forEach((l,k)=>{const r=mk("div",null,'<button class="btn gh" style="flex:1;text-align:left"></button><button class="btn gh">\u2715</button>');r.style.cssText="display:flex;gap:8px;margin-bottom:8px";$("button",r).textContent=l[0]+" \u2014 "+l[1];$("button",r).onclick=()=>openApp("browser",l[1]);r.lastChild.onclick=()=>{const a=L();a.splice(k,1);S.set("ml-links",a);draw()};$("#ll",b).appendChild(r)});
  $("#la",b).onclick=()=>{const n=$("#ln",b).value.trim(),u=$("#lu2",b).value.trim();if(n&&u){const a=L();a.push([n,/^https?:/.test(u)?u:"https://"+u]);S.set("ml-links",a);draw()}}};draw()}
function youtube(b,arg){let last=[];
 b.innerHTML='<div class="tb"><b style="white-space:nowrap">\u25B6 YouTube</b><input id="yq" placeholder="Search videos or paste a link" aria-label="Search YouTube"><button class="btn" id="yg">Search</button></div><div class="rv" id="yr"></div>';
 const yr=$("#yr",b),yq=$("#yq",b);
 const vid=v=>{const m=v.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/);return m&&m[1]};
 const msg=t=>{yr.innerHTML="";const p=mk("p");p.style.opacity=".75";p.textContent=t;yr.appendChild(p)};
 const list=()=>{yr.innerHTML="";const g=mk("div","yg");last.forEach(x=>{const c=mk("button","yc"),im=new Image(),t=mk("div","yt2"),s=mk("div","ys");im.src="https://i.ytimg.com/vi/"+x.id+"/mqdefault.jpg";im.alt="";t.textContent=x.t;s.textContent=x.s;c.append(im,t,s);c.onclick=()=>play(x.id);g.appendChild(c)});yr.appendChild(g)};
 const play=id=>{yr.innerHTML="";const bk=mk("button","btn gh","\u2039 Back"),f=mk("iframe");bk.onclick=()=>last.length?list():msg("Search for a video, or paste a YouTube link.");f.className="yp";f.allow="autoplay; fullscreen; encrypted-media; picture-in-picture";f.allowFullscreen=true;f.src="https://www.youtube-nocookie.com/embed/"+id+"?autoplay=1&rel=0";yr.append(bk,f)};
 const go=async()=>{const v=yq.value.trim();if(!v)return;const id=vid(v);if(id){play(id);return}
  msg("Searching\u2026");let r=await ytSearch(v);
  if(!r){const w=await webSearch(v+" site:youtube.com"),seen=new Set();r=((w&&w.list)||[]).map(x=>({id:/youtube\.com\/watch|youtu\.be\//.test(x.u)&&vid(x.u),t:x.t.replace(/ - YouTube$/,""),s:x.s})).filter(x=>x.id&&!seen.has(x.id)&&seen.add(x.id))}
  last=r||[];last.length?list():msg("No videos found. Try other words, or paste a YouTube link.")};
 $("#yg",b).onclick=go;yq.onkeydown=e=>{if(e.key==="Enter")go()};b.onArg=a=>{if(typeof a!=="string")return;if(a.indexOf("id:")===0)play(a.slice(3));else{yq.value=a;go()}};msg("Search for a video, or paste a YouTube link.");yq.focus();if(typeof arg==="string")b.onArg(arg)}
function appmaker(b){b.textContent="Open Settings → Apps"}
