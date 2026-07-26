(function(){
"use strict";

/* ---------------- state ---------------- */
var state = { sem:1, picked:{}, eng:null };   // picked: {code:true} for curriculum courses
var POOL = [];                                 // engineering catalogue rows (+ user additions)
ENG.forEach(function(r){
  POOL.push({code:r[0], slot:r[1], cr:r[2], title:r[3]||"Title not confirmed — check AIMS", dept:r[4], v:r[5], why:r[6]||0, custom:0, notitle:!r[3]});
});

var $ = function(id){ return document.getElementById(id); };
function el(tag, cls, txt){ var e=document.createElement(tag); if(cls)e.className=cls; if(txt!=null)e.textContent=txt; return e; }
function poolGet(code){ for(var i=0;i<POOL.length;i++){ if(POOL[i].code===code) return POOL[i]; } return null; }

/* ---------------- selection model ---------------- */
// returns [{code,title,cr,slot,grp,st}]
function selected(){
  var out=[], cur=CUR[state.sem];
  cur.groups.forEach(function(g){
    if(g.eng) return;
    g.courses.forEach(function(c){
      if(state.picked[c[0]]) out.push({code:c[0],title:c[1],cr:c[2],slot:c[3],grp:g.id,st:c[6]});
    });
  });
  if(state.eng){
    var p = poolGet(state.eng);
    if(p) out.push({code:p.code,title:p.title,cr:parseFloat(p.cr)||0,slot:p.slot,grp:"eng",st:p.custom?"custom":"ok"});
  }
  return out;
}
function occupancy(exclude){
  var m={};
  selected().forEach(function(c){
    if(!c.slot || c.code===exclude) return;
    (m[c.slot] = m[c.slot] || []).push(c);
  });
  return m;
}
function groupCredits(gid){
  var n=0;
  selected().forEach(function(c){ if(c.grp===gid) n += (parseFloat(c.cr)||0); });
  return n;
}
function isAdvisory(gid){
  var g = CUR[state.sem].groups.filter(function(x){ return x.id===gid; })[0];
  return !!(g && g.advisory);
}
function totalCredits(){
  var n=0;
  selected().forEach(function(c){ if(!isAdvisory(c.grp)) n += (parseFloat(c.cr)||0); });
  return n;
}

/* ---------------- render: course groups ---------------- */
var TYPEHINT = { core:"Departmental Core Theory", mgmt:"Departmental Elective",
                 eng:"Free Elective", mand:"Departmental Core Theory / Liberal Arts Elective" };

/* ---- static reference tables ---- */
(function slotRef(){
  var host=document.getElementById("slotref"); if(!host) return;
  var COLS=["09:00","10:00","11:00","12:00","LUNCH","14:30","16:00"];
  var at={};
  Object.keys(SLOTS).forEach(function(L){
    SLOTS[L].forEach(function(p){ at[p[0]+"|"+p[1]] = L; });
  });
  DAYS.forEach(function(day,di){
    var tr=document.createElement("tr");
    var th=document.createElement("td"); th.innerHTML="<b>"+day+"</b>"; tr.appendChild(th);
    COLS.forEach(function(t){
      var td=document.createElement("td");
      if(t==="LUNCH"){ td.innerHTML='<span style="color:#8b89a4;font-size:11px">lunch</span>'; }
      else {
        var L=at[di+"|"+t];
        if(L) td.innerHTML='<b class="mono" style="color:#3a55c4">'+L+'</b>';
        else if(di===2 && (t==="14:30"||t==="16:00")) td.innerHTML='<span style="color:#8b89a4;font-size:11px">challenge<br>lectures</span>';
        else td.innerHTML='<span style="color:#d6d4e6">&middot;</span>';
      }
      tr.appendChild(td);
    });
    host.appendChild(tr);
  });
})();

function renderGroups(){
  var host = $("groups"); host.innerHTML="";
  var cur = CUR[state.sem];
  cur.groups.forEach(function(g){
    var wrap = el("div","grp");
    var head = el("div","ghead");
    head.appendChild(el("span","gname", g.name));
    if(g.advisory){
      head.appendChild(el("span","gtally todo","verify"));
    } else {
      var got = groupCredits(g.id);
      head.appendChild(el("span","gtally " + (got===g.need ? "done" : got>g.need ? "over" : "todo"),
                          got + " / " + g.need + " cr"));
    }
    wrap.appendChild(head);

    var rule = el("div","grule");
    rule.innerHTML = g.rule + ' <span style="color:#8b89a4">&middot; register under <b style="color:#55536e">'
                   + TYPEHINT[g.id] + '</b></span>';
    wrap.appendChild(rule);

    if(g.eng){
      var cho = el("div","grule");
      cho.style.paddingTop = "0";
      var p = state.eng ? poolGet(state.eng) : null;
      if(p){
        cho.innerHTML = '<b style="color:#0c7d55">'+p.code+'</b> &mdash; '+esc(p.title)+
                        ' &middot; slot <b class="mono">'+(p.slot||"none")+'</b>';
      } else {
        cho.innerHTML = '<i style="color:#8b89a4">Nothing chosen yet &mdash; use the picker below.</i>';
      }
      wrap.appendChild(cho);
      host.appendChild(wrap);
      return;
    }

    var occ = occupancy();
    g.courses.forEach(function(c){
      var code=c[0], title=c[1], cr=c[2], slot=c[3], coord=c[4], room=c[5], st=c[6];
      var disabled = (st==="off");
      var lab = el("label","crs" + (disabled?" dis":""));
      var cb = el("input"); cb.type="checkbox"; cb.checked = !!state.picked[code]; cb.disabled = disabled;
      cb.addEventListener("change", function(){
        if(cb.checked) state.picked[code]=true; else delete state.picked[code];
        sync();
      });
      lab.appendChild(cb);

      var main = el("div","cmain");
      main.appendChild(el("div","ccode mono", code));
      main.appendChild(el("div","ctitle", title));
      var meta = coord && coord!=="—" ? coord + (room && room!=="—" ? " · " + room : "") : "";
      if(meta) main.appendChild(el("div","cmeta", meta));
      lab.appendChild(main);

      var right = el("div","cright");
      var sb = el("span","slotbadge" + (slot?"":" none"), slot ? slot : "no slot");
      right.appendChild(sb);
      right.appendChild(el("span","cr", cr + " cr"));
      if(st==="blocked") right.appendChild(el("span","flag blocked","not in picker"));
      else if(st==="off") right.appendChild(el("span","flag off","not running"));
      else if(st==="noslot") right.appendChild(el("span","flag noslot","slot tba"));
      else if(st==="next") right.appendChild(el("span","flag next","next term"));
      if(slot && occ[slot] && occ[slot].length>1 && state.picked[code])
        right.appendChild(el("span","flag clash","clash"));
      var ib=el("button","einfo","i"); ib.type="button";
      ib.setAttribute("aria-label","Details for "+code);
      ib.addEventListener("click",function(ev){
        ev.preventDefault(); ev.stopPropagation();
        openDetail({code:code,title:title,cr:cr,slot:slot,
                    coord:(coord&&coord!=="\u2014"?coord:""), room:(room&&room!=="\u2014"?room:""),
                    st:st, grp:g.id});
      });
      right.appendChild(ib);
      lab.appendChild(right);
      wrap.appendChild(lab);
    });
    host.appendChild(wrap);
  });
}

/* ---------------- render: engineering picker ---------------- */
function fillDepts(){
  var s=$("edept"); if(!s || s.options.length>1) return;
  var seen={}; POOL.forEach(function(p){ if(p.dept) seen[p.dept]=1; });
  Object.keys(seen).sort().forEach(function(d){
    var o=document.createElement("option"); o.value=d; o.textContent=d; s.appendChild(o);
  });
}
function renderElist(){
  fillDepts();
  var host = $("elist"); host.innerHTML="";
  var q = ($("esearch").value||"").trim().toLowerCase();
  var hide = $("onlyfree").checked;
  var dept = $("edept") ? $("edept").value : "";
  var occ = occupancy(state.eng);
  var shown=0, hidden=0, inelig=0;

  POOL.forEach(function(p){
    var clash = p.slot && occ[p.slot] && occ[p.slot].length>0;
    if(q && (p.code+" "+p.title+" "+p.dept).toLowerCase().indexOf(q)<0) return;
    if(dept && p.dept!==dept) return;
    var hasDoc = (typeof DESC!=="undefined") && !!DESC[p.code];
    var okPick = !p.why || p.why===4;
    if($("onlyok") && $("onlyok").checked && !okPick){ inelig++; return; }
    if($("onlydoc") && $("onlydoc").checked && !hasDoc) return;
    if(hide && clash && state.eng!==p.code){ hidden++; return; }
    shown++;
    var row = el("div","erow" + (state.eng===p.code?" sel":"") + (clash?" clash":"") + (p.notitle?" untitled":""));
    row.appendChild(el("span","vdot"+(p.v?"":" un")));
    row.appendChild(el("span","ecode mono", p.code));
    row.appendChild(el("span","etitle", p.title));
    row.appendChild(el("span","edept", p.dept));
    row.appendChild(el("span","slotbadge"+(p.slot?"":" none"), p.slot||"\u2014"));
    row.appendChild(el("span","cr", p.cr ? p.cr+" cr" : "cr ?"));
    if(clash) row.appendChild(el("span","flag clash","clash"));
    if(p.why && p.why!==4) row.appendChild(el("span","flag off","can\u2019t pick"));
    else if(p.why===4) row.appendChild(el("span","flag noslot","cr ?"));
    var ib=el("button","einfo"+(hasDoc?" hasdoc":""),"i"); ib.type="button";
    ib.setAttribute("aria-label","Details for "+p.code+(hasDoc?" (syllabus published)":""));
    ib.addEventListener("click",function(ev){ ev.stopPropagation(); openDetail(p); });
    row.appendChild(ib);
    row.addEventListener("click", function(){ state.eng=(state.eng===p.code)?null:p.code; sync(); });
    host.appendChild(row);
  });

  if(!shown){
    var x = el("div","erow"); x.style.color="var(--ink3)";
    x.textContent = hidden ? "Everything matching clashes with a course you have already picked. Untick \u201cHide clashes\u201d to see them anyway."
                           : "Nothing matches that search.";
    host.appendChild(x);
  }
  $("ecount").textContent = shown + " of " + POOL.length + " courses shown" +
    (inelig ? ", " + inelig + " hidden because you cannot use them as your engineering elective" : "") +
    (hidden ? ", " + hidden + " hidden because they clash" : "") +
    " \u00b7 a filled \u24d8 means IITH publishes a syllabus";
}

/* ---------------- render: week grid ---------------- */
function renderWeek(){
  var body = $("wkbody"); body.innerHTML="";
  var cells={};
  ROWS.forEach(function(t){
    var tr=el("tr");
    var th=el("th","mono", ROWLBL[t]); tr.appendChild(th);
    for(var d=0; d<5; d++){
      var td=el("td","c free");
      cells[d+"|"+t]=td; tr.appendChild(td);
    }
    body.appendChild(tr);
  });
  Object.keys(SLOTS).forEach(function(L){
    SLOTS[L].forEach(function(p){
      var td=cells[p[0]+"|"+p[1]]; if(!td) return;
      td.appendChild(el("span","sl mono", L));
      td.dataset.slot = L;
    });
  });

  var occ = occupancy();
  Object.keys(occ).forEach(function(L){
    if(!SLOTS[L]) return;
    var list = occ[L], bad = list.length>1;
    SLOTS[L].forEach(function(p){
      var td=cells[p[0]+"|"+p[1]]; if(!td) return;
      td.className="c";
      var b = el("div","bk " + (bad ? "bad" : list[0].grp));
      b.appendChild(el("div","a mono", list.map(function(c){return c.code;}).join(" / ")));
      b.appendChild(el("div","b", bad ? "two courses, same slot" : list[0].title.slice(0,30)));
      td.appendChild(b);
    });
  });
}

/* ---------------- render: status ---------------- */
function renderStatus(){
  var host=$("status"); host.innerHTML="";
  var cur=CUR[state.sem], sel=selected(), occ=occupancy(), msgs=[];

  var clashSlots = Object.keys(occ).filter(function(L){ return occ[L].length>1; });
  clashSlots.forEach(function(L){
    msgs.push({k:"bad", h:"Slot " + L + " clash",
      p:[occ[L].map(function(c){return c.code+" ("+c.title+")";}).join(" and ") +
         " are both in slot " + L + ", which meets " + slotHuman(L) + ".",
         "No instructor will move a slot for one student. Drop one of them."]});
  });

  sel.forEach(function(c){
    if(c.st==="blocked") msgs.push({k:"bad", h:c.code+" is not registerable right now",
      p:["It is timetabled and its registration window is open, but it does not appear in the AIMS course picker under any elective type. Email the department the same day you notice it."]});
    if(c.st==="noslot") msgs.push({k:"warn", h:c.code+" has no published slot",
      p:["A clash cannot be ruled out for this one. Confirm the timings with the department before you count on it."]});
    if(c.st==="custom"){
      var lvl=c.code[2], pre=c.code.slice(0,2), probs=[];
      if(!(lvl>="5"&&lvl<="6"))
        probs.push("Its level digit is "+lvl+". The engineering elective must be Level 5 or 6 — a Level "+lvl+" course will not count.");
      if(["DS","PH","CY","MA","EP","MP"].indexOf(pre)>=0)
        probs.push("The "+pre+" prefix is Design, Physics, Chemistry or Maths. Your department excludes all of those.");
      if(c.grp==="eng" && parseFloat(c.cr||0)!==3)
        probs.push("It is entered as "+(c.cr||"no")+" credits. The engineering elective must be exactly 3.");
      if(probs.length) msgs.push({k:"bad", h:c.code+" does not meet the rules", p:probs});
      else msgs.push({k:"warn", h:c.code+" was added by hand",
        p:["Level and department look right, but nothing here has been checked against AIMS. Confirm it is actually registerable and that your FA agrees before you rely on it."]});
    }
  });

  cur.groups.forEach(function(g){
    if(g.advisory) return;
    var got=groupCredits(g.id);
    if(got>g.need) msgs.push({k:"warn", h:"Too many credits in " + g.name.toLowerCase(),
      p:[got+" credits selected where the curriculum asks for "+g.need+". Anything extra normally has to be registered as Additional, which is a separate approval."]});
  });

  var tot=totalCredits();
  if(tot===cur.total && !clashSlots.length && !sel.some(function(c){return c.st==="blocked";})){
    msgs.unshift({k:"good", h:"This is a valid semester",
      p:[cur.total+" credits, no clashes, everything registerable. Print it or copy the link before you go into AIMS."]});
  }

  if(!sel.length){
    host.appendChild(mk({k:"warn", h:"Nothing selected yet",
      p:["Tick your courses on the left. Requirements and clashes update as you go."]}));
    return;
  }
  msgs.slice(0,6).forEach(function(m){ host.appendChild(mk(m)); });

  function mk(m){
    var d=el("div","stat "+m.k);
    d.appendChild(el("h3",null,m.h));
    m.p.forEach(function(t){ d.appendChild(el("p",null,t)); });
    return d;
  }
}
function slotHuman(L){
  if(!SLOTS[L]) return "an unlisted time";
  return SLOTS[L].map(function(p){ return DAYS[p[0]]+" "+ROWLBL[p[1]]; }).join(", ");
}

/* ---------------- print list + exports ---------------- */
function renderPrint(){
  var host=$("printlist"); host.innerHTML="";
  var t=el("table"), sel=selected();
  sel.forEach(function(c){
    var tr=el("tr");
    tr.appendChild(el("td","mono", c.code));
    tr.appendChild(el("td",null,c.title));
    tr.appendChild(el("td","mono", c.slot ? "Slot "+c.slot : "—"));
    tr.appendChild(el("td","mono", c.cr+" cr"));
    t.appendChild(tr);
  });
  host.appendChild(t);
}
function asText(){
  var cur=CUR[state.sem], sel=selected();
  var L=["IITH M.Tech Techno-Entrepreneurship — "+cur.label,"Jul–Nov 2026",""];
  sel.forEach(function(c){
    L.push(c.code+"  "+c.title+"  ["+(c.slot?"Slot "+c.slot:"no slot")+"]  "+c.cr+" cr");
    if(c.slot && SLOTS[c.slot]) L.push("      "+slotHuman(c.slot));
  });
  L.push("", "Total: "+totalCredits()+" / "+cur.total+" credits");
  var occ=occupancy(), cl=Object.keys(occ).filter(function(k){return occ[k].length>1;});
  if(cl.length) L.push("WARNING — clash in slot "+cl.join(", "));
  L.push("", "AIMS registration closes 31 Jul 2026, 23:59.");
  return L.join("\n");
}
function copy(txt, btn){
  var done=function(){ var o=btn.textContent; btn.textContent="Copied"; setTimeout(function(){btn.textContent=o;},1400); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(done, function(){ fallback(txt); done(); });
  } else { fallback(txt); done(); }
  function fallback(t){
    var ta=document.createElement("textarea"); ta.value=t;
    ta.style.cssText="position:fixed;left:-9999px"; document.body.appendChild(ta);
    ta.select(); try{document.execCommand("copy");}catch(e){} ta.remove();
  }
}

/* ---------------- hash ---------------- */
function writeHash(){
  var p=["s="+state.sem];
  var codes=Object.keys(state.picked);
  if(codes.length) p.push("c="+codes.join(","));
  if(state.eng) p.push("e="+state.eng);
  var cu=POOL.filter(function(x){return x.custom;})
             .map(function(x){ return [x.code,x.slot,x.cr,x.title].join("~"); });
  if(cu.length) p.push("x="+encodeURIComponent(cu.join("|")));
  try{ history.replaceState(null,"","#"+p.join("&")); }catch(e){}
}
function readHash(){
  var h=(location.hash||"").replace(/^#/,""); if(!h) return;
  var q={}; h.split("&").forEach(function(kv){ var i=kv.indexOf("="); if(i>0) q[kv.slice(0,i)]=kv.slice(i+1); });
  if(q.x){
    decodeURIComponent(q.x).split("|").forEach(function(s){
      var a=s.split("~"); if(!a[0]) return;
      if(!poolGet(a[0])) POOL.unshift({code:a[0],slot:a[1]||"",cr:a[2]||"",title:a[3]||"(added by hand)",dept:"Added by hand",v:0,custom:1});
    });
  }
  if(q.s==="2") state.sem=2;
  if(q.c) q.c.split(",").forEach(function(c){ if(c) state.picked[c]=true; });
  if(q.e) state.eng=q.e;
}

/* ---------------- misc ---------------- */
function esc(s){ var d=document.createElement("div"); d.textContent=s; return d.innerHTML; }

function sync(){
  renderGroups(); renderElist(); renderWeek(); renderStatus(); renderPrint();
  renderReadiness(); renderPreflight(); renderReady();
  var cur=CUR[state.sem], tot=totalCredits();
  var n=$("totn"); n.textContent = (Math.round(tot*100)/100);
  n.className = "n " + (tot===cur.total ? "ok" : tot>cur.total ? "no" : "");
  $("totneed").textContent = cur.total;
  $("semlab").textContent = cur.label;
  writeHash();
}

/* ---------------- wire up ---------------- */
Object.keys(SLOTS).forEach(function(L){
  var o=document.createElement("option"); o.value=L; o.textContent="Slot "+L; $("cslot").appendChild(o);
});

$("semtoggle").addEventListener("click", function(e){
  var b=e.target.closest("button"); if(!b) return;
  state.sem = parseInt(b.dataset.s,10);
  state.picked={}; state.eng=null;
  [].forEach.call(this.querySelectorAll("button"), function(x){ x.classList.toggle("on", x===b); });
  sync();
});
$("esearch").addEventListener("input", renderElist);
$("onlyfree").addEventListener("change", renderElist);
$("cadd").addEventListener("click", function(){
  var code=($("ccode").value||"").trim().toUpperCase();
  if(!code){ $("ccode").focus(); return; }
  if(poolGet(code)){ state.eng=code; sync(); return; }
  POOL.unshift({ code:code, slot:$("cslot").value, cr:($("ccr").value||"").trim(),
                 title:($("cname").value||"").trim()||"(added by hand)", dept:"Added by hand", v:0, custom:1 });
  state.eng=code;
  $("ccode").value=""; $("ccr").value=""; $("cname").value=""; $("cslot").value="";
  sync();
});
$("btnprint").addEventListener("click", function(){ window.print(); });
$("btncopy").addEventListener("click", function(){ copy(asText(), this); });
$("btnlink").addEventListener("click", function(){ writeHash(); copy(location.href, this); });
$("btnclear").addEventListener("click", function(){
  state.picked={}; state.eng=null; $("esearch").value=""; sync();
});


/* ==================== V3: guidance layer ==================== */

/* ---------- glossary popover ---------- */
var pop=document.getElementById("pop");
function showPop(btn){
  var k=btn.getAttribute("data-g"), g=GLOSS[k];
  if(!g) return;
  pop.innerHTML="";
  var t=document.createElement("div"); t.className="pt"; t.textContent=g[0]; pop.appendChild(t);
  var d=document.createElement("div"); d.textContent=g[1]; pop.appendChild(d);
  pop.classList.add("on");
  var r=btn.getBoundingClientRect(), sx=window.scrollX, sy=window.scrollY;
  var w=pop.offsetWidth, left=Math.min(r.left+sx, sx+document.documentElement.clientWidth-w-14);
  pop.style.left=Math.max(sx+8,left)+"px";
  var top=r.bottom+sy+8;
  if(r.bottom+pop.offsetHeight+14>window.innerHeight) top=r.top+sy-pop.offsetHeight-8;
  pop.style.top=top+"px";
}
function hidePop(){ pop.classList.remove("on"); }
document.addEventListener("click",function(e){
  var b=e.target.closest(".gterm");
  if(b){ e.preventDefault(); (pop.classList.contains("on")&&pop.__for===b)?hidePop():showPop(b); pop.__for=b; return; }
  if(!e.target.closest("#pop")) hidePop();
});
document.addEventListener("keydown",function(e){ if(e.key==="Escape"){ hidePop(); closeDrawer(); } });
window.addEventListener("scroll",hidePop,{passive:true});

/* ---------- course detail drawer ---------- */
var drawer=document.getElementById("drawer"), dbg=document.getElementById("dbg");
function closeDrawer(){ drawer.classList.remove("on"); dbg.classList.remove("on"); }
dbg.addEventListener("click",closeDrawer);
document.getElementById("dclose").addEventListener("click",closeDrawer);

var NATURE={"0":"theory","1":"lab","2":"design","3":"theory and lab","4":"design plus tutorial or lab",
            "5":"project or thesis","6":"seminar"};
var DEPTNAME={EM:"Entrepreneurship & Management",LA:"Liberal Arts",ME:"Mechanical & Aerospace",
  AE:"Mechanical & Aerospace",EE:"Electrical Engineering",CS:"Computer Science & Engineering",
  CE:"Civil Engineering",CH:"Chemical Engineering",AI:"Artificial Intelligence",CC:"Climate Change",
  ET:"Energy Science & Technology",BM:"Biomedical Engineering",BT:"Biotechnology",
  SE:"Sustainable Engineering",SM:"Smart Mobility",SD:"Semiconductor Materials & Devices",
  AM:"Additive Manufacturing",LW:"Light Weight Materials"};

function dropRule(cr){
  var n=parseFloat(cr)||0;
  if(n<=1) return "1 week from the start of the segment — 3 August 2026";
  if(n<1.6) return "10 days from the start of the segment — 5 August 2026";
  return "2 weeks from the start of the segment — 10 August 2026";
}
function openDetail(c){
  var host=document.getElementById("dbody"); host.innerHTML="";
  document.getElementById("dcode").textContent=c.code;
  document.getElementById("dtitle").textContent=c.title||"Title not confirmed";

  function sec(title){ var s=el("div","dsec"); if(title) s.appendChild(el("h5",null,title)); host.appendChild(s); return s; }
  function kv(s,k,v){
    if(v==null||v===""||v==="—") return;
    var r=el("div","dkv"); r.appendChild(el("span","k",k));
    var val=el("span","v"); val.textContent=v; r.appendChild(val); s.appendChild(r);
  }

  /* when it meets */
  var s1=sec("When it meets");
  if(c.slot && SLOTS[c.slot]){
    kv(s1,"Slot","Slot "+c.slot);
    var box=el("div","dmeet");
    SLOTS[c.slot].forEach(function(p){ box.appendChild(el("div",null, DAYS[p[0]]+"  "+ROWLBL[p[1]])); });
    s1.appendChild(box);
    var occ=occupancy(), other=(occ[c.slot]||[]).filter(function(x){ return x.code!==c.code; });
    if(other.length){
      var w=el("div","dkv"); w.style.marginTop="9px";
      w.appendChild(el("span","k","Clash"));
      var wv=el("span","v"); wv.style.color="var(--bad)"; wv.style.fontWeight="620";
      wv.textContent="Same slot as "+other.map(function(x){return x.code;}).join(", ");
      w.appendChild(wv); s1.appendChild(w);
    }
  } else {
    kv(s1,"Slot","Not published in AIMS. A clash cannot be ruled out — ask the department.");
  }

  /* the essentials */
  var s2=sec("The essentials");
  kv(s2,"Credits",(c.cr||"?")+" credits");
  kv(s2,"Department", c.dept || DEPTNAME[c.code.slice(0,2)] || "—");
  kv(s2,"Coordinator", c.coord);
  kv(s2,"Room", c.room);
  if(c.grp) kv(s2,"File under", TYPEHINT[c.grp]||"—");
  kv(s2,"Last date to drop", dropRule(c.cr));

  /* can you actually use this as your engineering elective? */
  if(c.why!==undefined && c.why!==null && typeof WHYTXT!=="undefined"){
    var sE=sec("Can you pick this?");
    var pe=el("p"); pe.style.cssText="margin:0;font-size:13px;line-height:1.55;font-weight:600";
    if(!c.why){ pe.style.color="var(--good)"; pe.textContent="Yes \u2014 Level 5 or 6, 3 credits, from a department your programme allows."; }
    else if(c.why===4){ pe.style.color="var(--warn)"; pe.textContent="Probably, but its credits are not published. Confirm it is exactly 3 credits in AIMS before you rely on it."; }
    else { pe.style.color="var(--bad)"; pe.textContent="No \u2014 "+WHYTXT[c.why]+". It is listed so you can see the whole timetable, not because you can register it."; }
    sE.appendChild(pe);
  }

  /* what it actually teaches — only where IITH publishes it */
  var dsc = (typeof DESC!=="undefined") ? DESC[c.code] : null;
  var sT=sec("What it teaches");
  if(dsc){
    var p0=el("p"); p0.style.cssText="margin:0;font-size:13px;line-height:1.6;color:var(--ink2)";
    p0.textContent=dsc[0]; sT.appendChild(p0);
    if(dsc[3]){
      var pr=el("div","dkv"); pr.style.marginTop="10px";
      pr.appendChild(el("span","k","Prerequisite"));
      var pv=el("span","v"); pv.textContent=dsc[3]; pr.appendChild(pv); sT.appendChild(pr);
    }
    var src=document.createElement("a");
    src.href=dsc[2]; src.target="_blank"; src.rel="noopener";
    src.style.cssText="display:inline-block;margin-top:10px;font-size:12px";
    src.textContent="Source: "+dsc[1]+" \u2197";
    sT.appendChild(src);
  } else {
    var p1=el("p"); p1.style.cssText="margin:0;font-size:13px;line-height:1.6;color:var(--ink3)";
    p1.textContent="IITH does not publish a syllabus for this course anywhere public. The department office or the course instructor is the only reliable source for what it covers \u2014 ask before you register.";
    sT.appendChild(p1);
  }

  /* code reused, titles disagree */
  var tc = (typeof TITLECONFLICT!=="undefined") ? TITLECONFLICT[c.code] : null;
  if(tc){
    var sC=sec("Check this title");
    var pc=el("p"); pc.style.cssText="margin:0;font-size:13px;line-height:1.55;color:var(--warn)";
    pc.textContent=tc; sC.appendChild(pc);
  }

  /* what the load actually is — derived only from credits and the code, nothing invented */
  var s25=sec("What the workload is");
  var n=parseFloat(c.cr)||0;
  var hours = n ? Math.round(n*14) : null;
  var weeks = n>=3 ? "the full semester, about 16 weeks"
            : n>=2 ? "four segments, about 11 weeks"
            : n>=1.5 ? "three segments, about 8 weeks"
            : n>=1 ? "two segments, about 5 weeks"
            : "one segment, about 3 weeks";
  var lb=el("div","loadbox");
  function lrow(k,v){ var r=el("div","lrow"); r.appendChild(el("span","lk",k));
                      r.appendChild(el("span","lv",v)); lb.appendChild(r); }
  if(hours){
    lrow("Teaching", hours+" hours in total");
    lrow("Runs for", weeks);
    lrow("Per week", "about "+(Math.round(n*10)/10)+" hours of class");
  } else lrow("Teaching","Credits not confirmed — check AIMS");
  lrow("Format", (NATURE[c.code[3]]||"unspecified")+"  (from the code\u2019s 2nd digit)");
  s25.appendChild(lb);
  var note=el("p");
  note.style.cssText="margin:9px 0 0;font-size:12px;color:var(--ink3);line-height:1.5";
  note.textContent="These are the only load facts IITH publishes. There is no official difficulty rating, no grade distribution and no course feedback, so nothing here tells you how hard it is \u2014 ask a senior or the instructor.";
  s25.appendChild(note);

  /* the code */
  var s3=sec("What the code means");
  var map=el("div","codemap");
  [["cm0",c.code.slice(0,2)],["cm1",c.code[2]],["cm2",c.code[3]],["cm3",c.code.slice(4)]]
    .forEach(function(p){ map.appendChild(el("span",p[0],p[1])); });
  s3.appendChild(map);
  var lvl=c.code[2], lvltxt = lvl>="5"&&lvl<="6" ? "Masters level — eligible as an engineering elective"
        : lvl>="7" ? "PhD level" : "Undergraduate level — NOT eligible as an engineering elective";
  kv(s3,"Department", DEPTNAME[c.code.slice(0,2)]||c.code.slice(0,2));
  kv(s3,"Level", lvl+" · "+lvltxt);
  kv(s3,"Nature", c.code[3]+" · "+(NATURE[c.code[3]]||"unspecified"));

  /* status */
  if(c.st && c.st!=="ok"){
    var s4=sec("Status");
    var p=el("p"); p.style.cssText="margin:0;font-size:13px;line-height:1.55;color:var(--ink2)";
    p.textContent =
      c.st==="blocked" ? "Timetabled and its registration window is open, but it does not appear in the AIMS course picker under any elective type. Email the DPGC the same day you notice it."
    : c.st==="off"     ? "Not running this term. It appears on the curriculum sheet but is not in the JUL26-NOV26 course list at all."
    : c.st==="noslot"  ? "Registerable, but AIMS publishes no slot or timings, so a clash cannot be ruled out."
    : c.st==="next"    ? "A Semester 2 course. Slots are published closer to the term."
    : c.st==="custom"  ? "You added this by hand. Nothing about it has been checked against the curriculum or against AIMS."
    : "";
    if(p.textContent) s4.appendChild(p);
  }
  if(c.notitle){
    var s5=sec("Title");
    var p2=el("p"); p2.style.cssText="margin:0;font-size:13px;line-height:1.55;color:var(--ink2)";
    p2.textContent="The department publishes this timetable as a PDF whose course titles wrap across lines and could not be read back reliably. The slot and credits are verified; confirm the title in AIMS before you register.";
    s5.appendChild(p2);
  }

  var gl = (typeof gcalLink==="function") ? gcalLink(c) : null;
  if(gl){
    var sG=sec("Add to your calendar");
    var ga=document.createElement("a");
    ga.className="btn ghost sm"; ga.href=gl; ga.target="_blank"; ga.rel="noopener";
    ga.textContent="Add this course to Google Calendar";
    sG.appendChild(ga);
    var gn=el("p"); gn.style.cssText="margin:9px 0 0;font-size:12px;color:var(--ink3);line-height:1.5";
    gn.textContent="This adds one weekly meeting. For every meeting of every course plus the deadlines, use the calendar download in section 3.";
    sG.appendChild(gn);
  }

  drawer.classList.add("on"); dbg.classList.add("on");
  document.getElementById("dclose").focus();
}

/* ---------- readiness ---------- */
var manual={fa:false};
function readiness(){
  var cur=CUR[state.sem], sel=selected(), occ=occupancy();
  var clashes=Object.keys(occ).filter(function(L){ return occ[L].length>1; });
  var blocked=sel.filter(function(c){ return c.st==="blocked"; });
  var steps=[];
  cur.groups.forEach(function(g){
    if(g.advisory) return;
    steps.push({k:g.name, done: groupCredits(g.id)===g.need});
  });
  steps.push({k:"No clashes", done: clashes.length===0, bad: clashes.length>0});
  steps.push({k:"Spoken to your FA", done: manual.fa});
  return {steps:steps, done:steps.filter(function(s){return s.done}).length, total:steps.length,
          clashes:clashes, blocked:blocked, sel:sel};
}
function renderReady(){
  var r=readiness(), card=$("readycard");
  var all = r.done===r.total;
  card.classList.toggle("on", all);
  if(!all) return;
  var sel=r.sel, cur=CUR[state.sem], blocked=r.blocked;
  var t = "Your plan is complete: "+totalCredits()+" of "+cur.total+" credits, no timetable clashes, and you have "+
          "spoken to your Faculty Advisor. Take the script below into AIMS, or hand this list to the department "+
          "office and ask them to enter it for you.";
  if(blocked.length) t += "  One course needs an email first \u2014 see the red row below.";
  $("readytext").textContent = t;

  var host=$("readysum"); host.innerHTML="";
  sel.forEach(function(c){
    var r2=el("div","rsrow");
    if(c.st==="blocked"){ r2.style.background="var(--bad-wash)"; }
    r2.appendChild(el("span","c",c.code));
    var tt=el("span","t",c.title);
    if(c.st==="blocked"){ tt.textContent=c.title+"  \u2014 not in the AIMS picker, email nakul@em.iith.ac.in"; tt.style.color="var(--bad)"; }
    r2.appendChild(tt);
    r2.appendChild(el("span","s",(c.slot?"Slot "+c.slot:"no slot")+" \u00b7 "+c.cr+" cr"));
    host.appendChild(r2);
  });
}
function renderReadiness(){
  var r=readiness(), host=document.getElementById("rsteps");
  document.getElementById("rbar").style.width=Math.round(r.done/r.total*100)+"%";
  document.getElementById("rcount").innerHTML="";
  document.getElementById("rcount").appendChild(el("b",null,r.done+" of "+r.total));
  document.getElementById("rcount").appendChild(document.createTextNode(" steps clear"));
  host.innerHTML="";
  r.steps.forEach(function(s){
    var d=el("div","rstep"+(s.done?" done":s.bad?" blocked":""));
    d.appendChild(el("span","tick", s.done?"✓":s.bad?"!":"○"));
    d.appendChild(document.createTextNode(s.k));
    host.appendChild(d);
  });
}

/* ---------- pre-flight script + checklist ---------- */
var ROWTYPE={core:"Departmental Core Theory", mgmt:"Departmental Elective",
             eng:"Free Elective", mand:"Departmental Core Theory"};
function renderPreflight(){
  var host=document.getElementById("scriptbody"); host.innerHTML="";
  var r=readiness(), sel=r.sel;
  var acts=document.getElementById("scriptactions");

  if(!sel.length || r.clashes.length){
    acts.hidden=true;
    var m=el("div","blockmsg");
    m.appendChild(el("b",null, r.clashes.length ? "Fix the clash first" : "Nothing planned yet"));
    m.appendChild(document.createTextNode(
      r.clashes.length ? "Two of your courses meet at the same time. AIMS will flag this too — fix it here before you go into the form."
                       : "Tick your courses above and the exact AIMS steps will be written out here."));
    host.appendChild(m);
  } else {
    acts.hidden=false;
    var ok=sel.filter(function(c){ return c.st!=="blocked"; });
    var no=sel.filter(function(c){ return c.st==="blocked"; });
    ok.forEach(function(c,i){
      var row=el("div","scriptrow");
      row.appendChild(el("div","srn","Row "+(i+1)));
      var t=el("div","srtype");
      t.appendChild(el("div","l","Elective type"));
      t.appendChild(el("div","v", ROWTYPE[c.grp]||"Free Elective"));
      row.appendChild(t);
      row.appendChild(el("div","srcode",c.code));
      host.appendChild(row);
    });
    no.forEach(function(c){
      var row=el("div","scriptrow"); row.style.background="var(--bad-wash)";
      row.appendChild(el("div","srn","Skip"));
      var t=el("div","srtype");
      t.appendChild(el("div","l","Do not add a row for this"));
      var v=el("div","v"); v.style.color="var(--bad)";
      v.textContent="Not in the AIMS picker \u2014 email the DPGC instead";
      t.appendChild(v); row.appendChild(t);
      var cd=el("div","srcode",c.code);
      cd.style.background="transparent"; cd.style.color="var(--bad)";
      cd.style.boxShadow="inset 0 0 0 1px var(--bad)";
      row.appendChild(cd);
      host.appendChild(row);
    });
  }

  var addable=sel.filter(function(c){ return c.st!=="blocked"; }).length;
  var CHECK=[
    ["Open the JUL26-NOV26 row, not the other two","Three terms show as Open. The other two are last year and the summer term."],
    ["Add one row per course with the + beside Regular","You need "+(addable||"—")+" rows for this plan."],
    ["Set the elective type before searching for the course","The search will not open until you do, and the wrong type can get the whole submission rejected."],
    ["Search by course code, not by scrolling","The browser opens at 10 per page across 60 pages, sorted by title."],
    ["If a code returns nothing, email the DPGC that day","190 of the 786 running courses are missing from the picker. It will not fix itself."],
    ["Press Register, then come back tomorrow","Your FA has to approve it. Rejections land in a collapsed list at the bottom that is easy to miss."],
    ["Watch for the Clean India email from NSS","Mandatory, non-credit, and never appears in course registration."]
  ];
  var cl=document.getElementById("checklist"); cl.innerHTML="";
  CHECK.forEach(function(c,i){
    var li=document.createElement("li");
    var cb=document.createElement("input"); cb.type="checkbox"; cb.id="chk"+i;
    li.appendChild(cb);
    var d=el("div");
    var lab=document.createElement("label"); lab.className="ct"; lab.htmlFor="chk"+i; lab.textContent=c[0];
    d.appendChild(lab); d.appendChild(el("div","cd",c[1]));
    li.appendChild(d); cl.appendChild(li);
  });
}
function scriptText(){
  var sel=selected();
  var L=["AIMS registration — "+CUR[state.sem].label+", JUL26-NOV26","",
         "Menu → Academic → Course Registration → JUL26-NOV26 → Go For Registration","",
         "Add "+sel.length+" rows with the + beside Regular, then fill them in:",""];
  var ok=sel.filter(function(c){ return c.st!=="blocked"; });
  var no=sel.filter(function(c){ return c.st==="blocked"; });
  ok.forEach(function(c,i){
    L.push("Row "+(i+1)+"   Elective type: "+(ROWTYPE[c.grp]||"Free Elective"));
    L.push("        Course code : "+c.code+"   ("+c.title+")");
  });
  if(no.length){
    L.push("", "DO NOT add rows for these \u2014 they are not in the AIMS picker:");
    no.forEach(function(c){ L.push("   "+c.code+"  "+c.title+"  \u2192 email nakul@em.iith.ac.in"); });
  }
  L.push("", "Total "+totalCredits()+" of "+CUR[state.sem].total+" credits.");
  L.push("Registration closes 31 Jul 2026, 23:59. Your FA still has to approve it.");
  return L.join("\n");
}

/* ---------- reference sections ---------- */
(function refs(){
  var m=document.getElementById("mistlist");
  if(m) MISTAKES.forEach(function(x,i){
    var d=el("div","fault");
    d.appendChild(el("div","n","Mistake "+String(i+1).padStart(2,"0")));
    d.appendChild(el("h4",null,x[0]));
    d.appendChild(el("p",null,x[1]));
    var f=el("div","fix"); f.appendChild(el("b",null,"Guard: ")); f.appendChild(document.createTextNode(x[2]));
    d.appendChild(f); m.appendChild(d);
  });
  var c=document.getElementById("codelist");
  if(c) CODEPARTS.forEach(function(p){
    var line=el("div"); line.style.marginBottom="6px";
    line.appendChild(el("b",null,p[0]));
    var s=document.createElement("span"); s.innerHTML=p[1]; line.appendChild(s);
    c.appendChild(line);
  });
  var g=document.getElementById("glosslist");
  if(g) Object.keys(GLOSS).forEach(function(k){
    var d=el("div","dcard");
    d.appendChild(el("div","dl",GLOSS[k][0]));
    d.appendChild(el("p",null,GLOSS[k][1]));
    g.appendChild(d);
  });
})();

/* ---------- start-here toggle ---------- */
(function start(){
  var h=document.getElementById("starthead"), b=document.getElementById("startbody"),
      hint=document.getElementById("starthint");
  function toggle(){
    var open=b.style.display!=="none";
    b.style.display=open?"none":"grid";
    hint.textContent=open?"Show":"Hide";
    h.setAttribute("aria-expanded",String(!open));
  }
  h.addEventListener("click",toggle);
  h.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); toggle(); } });
})();

/* ---------- wiring ---------- */
document.getElementById("btnscript").addEventListener("click",function(){ copy(scriptText(), this); });
var bc=document.getElementById("btncal");
if(bc) bc.addEventListener("click",function(){
  var n=downloadICS(); var o=this.textContent;
  this.textContent=n+" events downloaded"; var self=this;
  setTimeout(function(){ self.textContent=o; }, 2600);
});
document.getElementById("faack").addEventListener("change",function(){ manual.fa=this.checked; sync(); });
document.getElementById("edept").addEventListener("change",renderElist);
var od=document.getElementById("onlydoc"); if(od) od.addEventListener("change",renderElist);
var ok=document.getElementById("onlyok"); if(ok) ok.addEventListener("change",renderElist);



/* ==================== calendar export ==================== */
/* Real .ics: weekly recurring classes for the whole semester, plus the
   deadlines, plus a reminder 15 minutes before every class. Imports into
   Google Calendar, Apple Calendar and Outlook without any account access. */

var TERM={ start:[2026,7,27], end:"20261113T235959",
           firstDate:["20260727","20260728","20260729","20260730","20260731"] };
var ENDT={"09:00":"095500","10:00":"105500","11:00":"115500","12:00":"125500",
          "14:30":"155500","16:00":"172500"};
function hhmmss(t){ return t.replace(":","")+"00"; }

function icsEscape(s){
  return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,")
                      .replace(/\r?\n/g,"\\n");
}
function fold(line){
  if(line.length<=73) return line;
  var out=line.slice(0,73), rest=line.slice(73);
  while(rest.length){ out+="\r\n "+rest.slice(0,72); rest=rest.slice(72); }
  return out;
}
function buildICS(){
  var sel=selected(), cur=CUR[state.sem], L=[];
  var stamp="20260725T000000Z";            // fixed: the day this plan was generated
  L.push("BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//IITH EM Course Planner//EN",
         "CALSCALE:GREGORIAN","METHOD:PUBLISH",
         "X-WR-CALNAME:IITH "+cur.label+" \u2014 Jul-Nov 2026",
         "X-WR-TIMEZONE:Asia/Kolkata",
         "BEGIN:VTIMEZONE","TZID:Asia/Kolkata","BEGIN:STANDARD",
         "DTSTART:19700101T000000","TZOFFSETFROM:+0530","TZOFFSETTO:+0530",
         "TZNAME:IST","END:STANDARD","END:VTIMEZONE");

  var n=0;
  sel.forEach(function(c){
    if(!c.slot || !SLOTS[c.slot]) return;
    SLOTS[c.slot].forEach(function(p,i){
      var day=p[0], t=p[1];
      var dt=TERM.firstDate[day]+"T"+hhmmss(t);
      var de=TERM.firstDate[day]+"T"+ENDT[t];
      n++;
      L.push("BEGIN:VEVENT");
      L.push("UID:"+c.code+"-"+day+"-"+t.replace(":","")+"-iithplanner@local");
      L.push("DTSTAMP:"+stamp);
      L.push("DTSTART;TZID=Asia/Kolkata:"+dt);
      L.push("DTEND;TZID=Asia/Kolkata:"+de);
      L.push("RRULE:FREQ=WEEKLY;UNTIL="+TERM.end+"Z");
      L.push(fold("SUMMARY:"+icsEscape(c.code+" "+c.title)));
      if(c.room) L.push(fold("LOCATION:"+icsEscape(c.room)));
      L.push(fold("DESCRIPTION:"+icsEscape(
        "Slot "+c.slot+" \u00b7 "+c.cr+" credits"+(c.coord?" \u00b7 "+c.coord:"")+
        "\nGenerated by the IITH EM course planner. Verify against AIMS.")));
      L.push("BEGIN:VALARM","TRIGGER:-PT15M","ACTION:DISPLAY",
             fold("DESCRIPTION:"+icsEscape(c.code+" starts in 15 minutes")),"END:VALARM");
      L.push("END:VEVENT");
    });
  });

  /* the dates that cost you if you miss them */
  var DEADLINES=[
    ["20260731","AIMS registration closes today, 23:59","Every course record in AIMS says student registration ends today. The department email's 3 August date is later and will not help you."],
    ["20260803","Last date to ADD a course","Also the last date to drop a 1-credit course."],
    ["20260810","Last date to DROP a 3-credit course","No dropping after this, even with a fine."],
    ["20260727","Classes begin","Semester 1 of the Jul-Nov 2026 term."]
  ];
  DEADLINES.forEach(function(d,i){
    L.push("BEGIN:VEVENT");
    L.push("UID:deadline-"+i+"-iithplanner@local");
    L.push("DTSTAMP:"+stamp);
    L.push("DTSTART;VALUE=DATE:"+d[0]);
    L.push("DTEND;VALUE=DATE:"+d[0]);
    L.push(fold("SUMMARY:"+icsEscape("IITH \u2014 "+d[1])));
    L.push(fold("DESCRIPTION:"+icsEscape(d[2])));
    L.push("BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY",
           fold("DESCRIPTION:"+icsEscape(d[1])),"END:VALARM");
    L.push("END:VEVENT");
    n++;
  });

  L.push("END:VCALENDAR");
  return {text:L.join("\r\n"), count:n};
}
function downloadICS(){
  var r=buildICS();
  var blob=new Blob([r.text],{type:"text/calendar;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url; a.download="iith-"+CUR[state.sem].label.toLowerCase().replace(/\s+/g,"-")+".ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  return r.count;
}
/* one-click Google link for a single course, used in the drawer */
function gcalLink(c){
  if(!c.slot || !SLOTS[c.slot]) return null;
  var p=SLOTS[c.slot][0], day=p[0], t=p[1];
  var q=["action=TEMPLATE",
    "text="+encodeURIComponent(c.code+" "+c.title),
    "dates="+TERM.firstDate[day]+"T"+hhmmss(t)+"/"+TERM.firstDate[day]+"T"+ENDT[t],
    "ctz=Asia/Kolkata",
    "recur="+encodeURIComponent("RRULE:FREQ=WEEKLY;UNTIL="+TERM.end+"Z"),
    "details="+encodeURIComponent("Slot "+c.slot+". This link adds only the first weekly meeting of the slot \u2014 use the full .ics download for every meeting.")];
  if(c.room) q.push("location="+encodeURIComponent(c.room));
  return "https://calendar.google.com/calendar/render?"+q.join("&");
}

/* ---------- boot (last, so every module above is defined) ---------- */
readHash();
if(state.sem===2){
  [].forEach.call($("semtoggle").querySelectorAll("button"), function(x){ x.classList.toggle("on", x.dataset.s==="2"); });
}
sync();
})();
