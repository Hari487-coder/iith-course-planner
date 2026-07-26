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
  renderReadiness(); renderGuide(); renderPreflight(); renderReady();
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
  /* Engineering electives come from other departments; this planner has no
     instructor list for them, and inventing one is forbidden. Point to the
     authoritative source instead of leaving the field silently blank. */
  if(!c.coord && c.why!==undefined){
    kv(s2,"Instructor","Not listed here — the offering department’s course page or AIMS shows who teaches it. Confirm there before you register.");
  }
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
  var weeksNum = n>=3 ? 16 : n>=2 ? 11 : n>=1.5 ? 8 : n>=1 ? 5 : 3;
  var weeks = n>=3 ? "the full semester, about 16 weeks"
            : n>=2 ? "four segments, about 11 weeks"
            : n>=1.5 ? "three segments, about 8 weeks"
            : n>=1 ? "two segments, about 5 weeks"
            : "one segment, about 3 weeks";
  /* Per-week class hours come from the ACTUAL weekly meetings in the slot
     (A–G are 55-min sessions, P–S are 90-min), not from the credit number —
     the old code printed the credit count as hours ("1 hours" for a 1-credit
     course, when it really meets ~3 h/week over fewer weeks). Falls back to
     total hours ÷ weeks when no slot is published. */
  function weeklyHours(slot){
    if(!slot || !SLOTS[slot]) return null;
    var perSession = /^[A-G]$/.test(slot) ? 55 : 85;
    return SLOTS[slot].length * perSession / 60;
  }
  var lb=el("div","loadbox");
  function lrow(k,v){ var r=el("div","lrow"); r.appendChild(el("span","lk",k));
                      r.appendChild(el("span","lv",v)); lb.appendChild(r); }
  if(hours){
    lrow("Teaching", hours+" hours in total");
    lrow("Runs for", weeks);
    var wk = weeklyHours(c.slot) || (hours/weeksNum);
    var wr = Math.round(wk*2)/2;
    lrow("Per week", "about "+wr+" hour"+(wr===1?"":"s")+" of class");
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

/* ---------- active next-step guide ----------
   The readiness strip shows what is done; this shows what to do next. It
   reads the plan and states the single next action in one plain line, with
   a control that jumps to it. Priority: a clash outranks everything (it
   blocks registration), then the first unfilled requirement group in order,
   then the Faculty-Advisor confirmation, then the AIMS hand-off. Reuses
   readiness()/groupCredits() so it can never disagree with the stepper. */
var GUIDE_NUDGE={
  core:{start:"Start here — tick your core courses. All of them are compulsory.", more:"Finish ticking your core courses.", to:"pickcard"},
  mgmt:{start:"Pick your department electives.", more:"Pick your department electives.", to:"pickcard"},
  eng: {start:"Choose one 3-credit engineering elective from another department.", more:"Choose one 3-credit engineering elective from another department.", to:"esearch"},
  mand:{start:"Add the mandatory courses for this semester.", more:"Add the mandatory courses for this semester.", to:"pickcard"}
};
function guideState(){
  var r=readiness(), cur=CUR[state.sem];
  if(r.clashes.length) return {tone:"bad", label:"Fix this",
    msg:"Two of your courses meet in slot "+r.clashes.join(", ")+". Untick one — no instructor moves a slot for a single student.",
    cta:"Show the clash", to:"wkcard"};
  var g=null;
  for(var i=0;i<cur.groups.length;i++){
    var gr=cur.groups[i];
    if(gr.advisory) continue;
    if(groupCredits(gr.id)!==gr.need){ g=gr; break; }
  }
  if(g){
    var n=GUIDE_NUDGE[g.id]||{start:"Complete "+g.name+".", more:"Complete "+g.name+".", to:"pickcard"};
    var fresh=r.sel.length===0;
    return {tone:"", label: fresh?"Start here":"Next step", msg: fresh?n.start:n.more, cta:"Take me there", to:n.to};
  }
  if(!manual.fa) return {tone:"", label:"Last step",
    msg:"Confirm you have spoken to your Faculty Advisor about the engineering elective — the department requires it.",
    cta:"Go to that step", to:"faack"};
  return {tone:"good", label:"Ready",
    msg:"Your plan checks out: every credit filled, no clashes. Open AIMS and copy your rows straight in.",
    cta:"Open AIMS →", href:"https://aims.iith.ac.in/"};
}
function renderGuide(){
  var host=$("guide"); if(!host) return;
  var s=guideState();
  host.hidden=false;
  host.className="guide"+(s.tone?" "+s.tone:"");
  host.innerHTML="";
  host.appendChild(el("span","glabel",s.label));
  host.appendChild(el("span","gt",s.msg));
  var btn;
  if(s.href){
    btn=document.createElement("a");
    btn.className="btn sm"; btn.href=s.href; btn.target="_blank"; btn.rel="noopener";
  } else {
    btn=document.createElement("button");
    btn.type="button"; btn.className="btn ghost sm";
    btn.addEventListener("click",function(){
      var t=document.getElementById(s.to); if(!t) return;
      var smooth=!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      t.scrollIntoView({behavior: smooth?"smooth":"auto", block:"center"});
      if(s.to==="faack" || s.to==="esearch"){ try{ t.focus({preventScroll:true}); }catch(e){ t.focus(); } }
    });
  }
  btn.textContent=s.cta;
  host.appendChild(btn);
}
/* One genuine click -> the single most critical date lands in Google
   Calendar. Google's template URL adds one event at a time, so the full
   timetable plus every deadline stays the job of the .ics (buildICS). */
function gcalDeadlineLink(){
  var q=["action=TEMPLATE",
    "text="+encodeURIComponent("IITH AIMS registration closes (Jul-Nov 2026)"),
    "dates=20260731/20260801",
    "ctz=Asia/Kolkata",
    "details="+encodeURIComponent("Last day to register for JUL26-NOV26 in AIMS, 23:59. Your Faculty Advisor still has to approve after you submit. Added from the IITH EM course planner — verify against AIMS.")];
  return "https://calendar.google.com/calendar/render?"+q.join("&");
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
/* Mobile nav: hamburger toggles the link sheet; it closes on link tap,
   Escape, or a tap outside the header. Desktop nav is untouched (CSS-gated). */
(function mobileNav(){
  var t=document.getElementById("navtoggle"),
      h=document.querySelector("header"),
      n=document.getElementById("navmain");
  if(!t||!h||!n) return;
  function set(open){ h.classList.toggle("navopen",open); t.setAttribute("aria-expanded",String(open)); }
  t.addEventListener("click",function(){ set(!h.classList.contains("navopen")); });
  n.addEventListener("click",function(e){ if(e.target.closest("a")) set(false); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape") set(false); });
  document.addEventListener("click",function(e){ if(!h.contains(e.target)) set(false); });
})();
document.getElementById("btnscript").addEventListener("click",function(){ copy(scriptText(), this); });
var bc=document.getElementById("btncal");
if(bc) bc.addEventListener("click",function(){
  var n=downloadICS(); var o=this.textContent;
  this.textContent=n+" events downloaded"; var self=this;
  setTimeout(function(){ self.textContent=o; }, 2600);
});
document.getElementById("faack").addEventListener("change",function(){ manual.fa=this.checked; sync(); });
var bri=document.getElementById("btnReadyIcs");
if(bri) bri.addEventListener("click",function(){
  var n=downloadICS(), o=this.textContent, self=this;
  this.textContent=n+" events downloaded";
  setTimeout(function(){ self.textContent=o; }, 2600);
});
var brg=document.getElementById("btnReadyGcal");
if(brg) brg.href=gcalDeadlineLink();
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

/* ================== Ask assistant ==================
   A grounded, offline helper. It answers ONLY from this tool's own
   verified data (glossary, mistakes, curriculum, course catalogue,
   deadlines) and the student's live selection — so it can explain things
   in plain words without ever inventing a course fact. No network, no
   keys, nothing leaves the browser: the same guarantees as the rest of
   the page. */
(function askAssistant(){
  var fab=$("askfab"), panel=$("askpanel"), log=$("asklog"), chipbar=$("askchips"),
      form=$("askform"), input=$("askinput"), closeBtn=$("askclose");
  if(!fab||!panel||!form) return;
  var started=false;
  var DEFAULT_CHIPS=["What's an engineering elective?","When's the deadline?","How do I register in AIMS?","What is a slot?","Am I ready?"];

  function reduced(){ return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function open(){
    panel.hidden=false; document.body.classList.add("askopen");
    fab.setAttribute("aria-expanded","true");
    if(!started){ started=true; greet(); }
    setTimeout(function(){ input.focus(); }, 60);
  }
  function close(){
    panel.hidden=true; document.body.classList.remove("askopen");
    fab.setAttribute("aria-expanded","false"); fab.focus();
  }
  function goTo(id){
    var t=$(id); if(!t) return;
    if(window.innerWidth<=560) close();
    t.scrollIntoView({behavior: reduced()?"auto":"smooth", block:"start"});
  }
  function bubble(who, text, link){
    var d=el("div","askmsg "+who);
    d.appendChild(el("span",null,text));
    if(link){
      var a=el("button","asklink",link.text); a.type="button";
      a.addEventListener("click",function(){ goTo(link.to); });
      d.appendChild(a);
    }
    log.appendChild(d); log.scrollTop=log.scrollHeight;
  }
  function setChips(list){
    chipbar.innerHTML="";
    (list||DEFAULT_CHIPS).forEach(function(q){
      var b=el("button","askchip",q); b.type="button";
      b.addEventListener("click",function(){ send(q); });
      chipbar.appendChild(b);
    });
  }
  function greet(){
    bubble("bot","Hi! I explain how to register for Jul–Nov 2026 in plain words — slots, credits, the engineering elective, clashes, deadlines, or any course code like EM5090. What would you like to know?");
    setChips();
  }
  function send(q){
    q=(q||"").trim(); if(!q) return;
    bubble("me", q);
    var r=respond(q);
    bubble("bot", r.text, r.link);
    setChips(r.chips);
  }

  /* ---- resolvers, all grounded in this tool's data ---- */
  function norm(s){ return (s||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim(); }

  function curGet(code){
    code=code.toUpperCase();
    for(var s=1;s<=2;s++){ var gs=CUR[s].groups;
      for(var i=0;i<gs.length;i++){ var cs=gs[i].courses||[];
        for(var j=0;j<cs.length;j++){ if((cs[j][0]||"").toUpperCase()===code)
          return {code:cs[j][0],title:cs[j][1],cr:cs[j][2],slot:cs[j][3],st:cs[j][6],gname:gs[i].name}; } } }
    return null;
  }
  function courseAnswer(code){
    code=code.toUpperCase();
    var cu=curGet(code), p=poolGet(code);
    if(!cu && !p) return {text: code+" isn't in the Jul–Nov 2026 catalogue I have. If AIMS lists it, it may be from a department whose timetable isn't public — confirm the details there before you rely on it.", chips:DEFAULT_CHIPS};
    var slot=cu?cu.slot:p.slot, cr=cu?cu.cr:p.cr, title=cu?cu.title:(p.notitle?"":p.title);
    var L=[];
    L.push(code+(title?" — "+title:" (title not confirmed — check AIMS)"));
    L.push(cu ? ("One of your "+cu.gname+" courses.") : ("Offered by "+p.dept+"."));
    L.push(slot && SLOTS[slot] ? ("Meets in slot "+slot+" — "+slotHuman(slot)+".") : "No slot or timing is published for it yet.");
    L.push(cr ? (cr+" credits.") : "Credits aren't published — confirm in AIMS.");
    if(!cu && p){
      if(p.why===0) L.push("You can take this as your engineering elective (Level 5–6, 3 credits, an allowed department).");
      else if(p.why===4) L.push("It might work as your engineering elective, but confirm it's exactly 3 credits in AIMS first.");
      else if(typeof WHYTXT!=="undefined" && WHYTXT[p.why]) L.push("You can't use it as your engineering elective — "+WHYTXT[p.why].toLowerCase()+".");
    }
    var d=(typeof DESC!=="undefined") && DESC[code];
    if(d && d[0]) L.push("What it covers: "+d[0]);
    if((cu && state.picked[code]) || state.eng===code) L.push("It's in your plan right now.");
    return {text:L.join("\n"), chips:["Am I ready?","When's the deadline?","How do I register in AIMS?"]};
  }
  function readyAnswer(){
    var r=readiness(), cur=CUR[state.sem], s=guideState();
    if(s.label==="Ready") return {text:"You're all set for "+cur.label+": "+totalCredits()+" of "+cur.total+" credits, no clashes, and your Faculty Advisor is confirmed. Open AIMS and copy your rows straight in.", link:{text:"Open the AIMS steps →",to:"how"}, chips:["When's the deadline?","Add reminders to my calendar"]};
    return {text:"Not yet — you're "+r.done+" of "+r.total+" steps in.\nNext: "+s.msg, chips:["What's an engineering elective?","How do I register in AIMS?","When's the deadline?"]};
  }
  function creditsAnswer(){
    var cur=CUR[state.sem], L=["Semester "+state.sem+" is "+cur.total+" credits. You've picked "+totalCredits()+" so far.","The split:"];
    cur.groups.forEach(function(g){ if(g.advisory) return; L.push("• "+g.name+": "+g.need+" credit"+(g.need===1?"":"s")); });
    return {text:L.join("\n"), chips:["What's an engineering elective?","What is a credit?"]};
  }

  var GLOSS_SYN={"faculty advisor":"fa","advisor":"fa","committee":"dpgc","non credit":"clean india","nss":"clean india","gpa":"cgpa"};
  function glossaryMatch(q){
    var hasQ=/\b(what|whats|define|meaning|means|mean|explain)\b/.test(q);
    var key=null, len=0;
    function consider(term,k){ var n=term.split(" ").length; if(q.indexOf(term)>=0 && n>=len){ len=n; key=k; } }
    for(var g in GLOSS){ consider(g,g); }
    for(var syn in GLOSS_SYN){ consider(syn,GLOSS_SYN[syn]); }
    if(!key || !GLOSS[key]) return null;
    return {score: len+(hasQ?1:0), ans:{text: GLOSS[key][0]+" — "+GLOSS[key][1], chips:DEFAULT_CHIPS}};
  }

  var INTENTS=[
    {kw:["how do i register","how to register","register in aims","registration steps","fill the form","fill aims","steps in aims","use aims","how do i submit"], build:function(){
      return {text:"In AIMS, the whole thing is:\n1. Menu → Academic → Course Registration.\n2. Choose the JUL26-NOV26 term (not the summer or last-year one) → Go For Registration.\n3. For each course, press the + beside ‘Regular’ to add a row.\n4. Set the elective type FIRST, then search by course code.\n5. Press Register — then come back the next day to check your Faculty Advisor approved it.", link:{text:"Open the full step-by-step →",to:"how"}, chips:["What elective type do I pick?","When's the deadline?","Am I ready?"]}; }},
    {kw:["deadline","last date","last day","when is registration","when does registration","closes","due date","register by","how long do i have","cutoff","cut off","important dates","key dates"], build:function(){
      return {text:"The dates that matter for Jul–Nov 2026:\n• Classes begin: 27 July 2026\n• Registration closes: 31 July 2026, 23:59 — treat this as the real one. A department email says 3 August, but every AIMS record says 31 July.\n• Last day to add a course (and to drop a 1-credit one): 3 August\n• Last day to drop a 3-credit course: 10 August", link:{text:"See the dates table →",to:"dates"}, chips:["Add reminders to my calendar","How do I register in AIMS?"]}; }},
    {kw:["clash","clashes","overlap","same time","same slot","conflict"], build:function(){
      return {text:"A clash means two of your courses sit in the same slot (same letter), so they'd meet at the same time. No instructor moves a class for one student, so you have to swap one out. This planner flags a clash the moment it happens and hides clashing options in the picker — AIMS will let you register both and you'd only find out in week one.", chips:["What is a slot?","Am I ready?"]}; }},
    {kw:["engineering elective","eng elective","free elective","other department","another department","open elective","which elective can i take"], build:function(){
      return {text:"Your engineering elective is one 3-credit course from another department that you pick yourself. The rules:\n• The code must start with 5 or 6 (Masters level).\n• It can't be from Design, Physics, Chemistry or Maths.\n• It must be worth exactly 3 credits.\n• Talk to your Faculty Advisor before choosing.\nIn the picker, anything you can actually take is shown; the rest is hidden by default.", link:{text:"Go to the picker →",to:"esearch"}, chips:["Why can't I pick some courses?","What elective type do I pick?"]}; }},
    {kw:["elective type","which type","what type","category to pick","file it under","file under","registration type","departmental core"], build:function(){
      return {text:"When AIMS asks for an ‘elective type’, use:\n• Core (EM) courses → Departmental Core Theory\n• Department electives → Departmental Elective\n• Engineering elective → Free Elective\nChoose the type BEFORE you search — the search won't open until you do, and the wrong type can get your whole submission rejected. This planner writes the exact type beside every course.", chips:["How do I register in AIMS?","Am I ready?"]}; }},
    {kw:["how many credits","total credits","credits do i need","credit requirement","how many credit","credits needed","credit total"], build:creditsAnswer},
    {kw:["fractal","segment","segments","modules","blocks","half a credit","module system"], build:function(){
      return {text:"The semester is six blocks (‘segments’) of about 2.5–3 weeks. A course can run any stretch of them: 1–6 is the whole term, 1–2 is just the first two blocks. Length is the credit — two blocks is roughly 1 credit — which is why your department electives are 1 credit each instead of one big course.", link:{text:"See it explained →",to:"fractal"}, chips:["What is a credit?","When's the deadline?"]}; }},
    {kw:["mistake","mistakes","go wrong","common error","pitfall","things to avoid","what could go wrong"], build:function(){
      return {text:"The eight things that trip people up: registering into the wrong term, picking the wrong elective type, a timetable clash, choosing a course that isn't allowed, assuming a course exists when AIMS doesn't list it, missing the real deadline, thinking you're done before your FA approves, and forgetting the non-credit Clean India course. This tool guards against each one.", link:{text:"Read all eight →",to:"mistakes"}, chips:["Am I ready?","How do I register in AIMS?"]}; }},
    {kw:["easy","hard","difficult","difficulty","scoring","which is easy","workload","how tough","grade distribution","easiest"], build:function(){
      return {text:"There's no ‘easy’ or ‘hard’ rating here, on purpose — IITH doesn't publish grade distributions, course feedback or workload data, so any rating would be made up. The honest way to judge a course is its syllabus (open it with the ⓘ button), its credit weight, and asking a senior who took it or the instructor.", chips:["What is a credit?","What's an engineering elective?"]}; }},
    {kw:["what is a slot","slot grid","slots","timetable","when does it meet","what time","meeting time","class timing","schedule"], build:function(){
      return {text:GLOSS.slot[1]+"\nOpen the slot grid to see exactly which letters meet when.", link:{text:"See the slot grid →",to:"slots"}, chips:["What is a clash?","Am I ready?"]}; }},
    {kw:["who do i contact","who to email","contact","email","advisor","dpgc","stuck","missing from aims","not showing in aims","can't find course","course missing"], build:function(){
      return {text:"Who to reach:\n• Faculty Advisor — Dr. Ranapratap Maradana — approves your registration and every add or drop.\n• DPGC — Dr. Nakul Parameswar — email this person the same day if a course is missing from AIMS or a rule is unclear.\n• Department office — for anything general.\nTheir email addresses are in the footer of this page.", chips:["Why is a course missing from AIMS?","How do I register in AIMS?"]}; }},
    {kw:["calendar","reminder","reminders","google calendar","ics","add to calendar","notify"], build:function(){
      return {text:"Yes — once your plan is set you can put it in your calendar. The ‘Add to calendar (.ics)’ button downloads every class for the whole semester plus the add/drop deadlines, each with a reminder; it opens in Google, Apple or Outlook Calendar. When your plan is complete there's also a one-click ‘Add deadline to Google Calendar’ button.", link:{text:"Go to the calendar buttons →",to:"wkcard"}, chips:["When's the deadline?","Am I ready?"]}; }},
    {kw:["semester 2","sem 2","second semester","semester two","next semester","difference between semester"], build:function(){
      var c=CUR[2], L=["Semester 2 is also "+c.total+" credits, but the mix is different:"];
      c.groups.forEach(function(g){ if(g.advisory) return; L.push("• "+g.name+": "+g.need+" credit"+(g.need===1?"":"s")); });
      L.push("Switch to the Semester 2 tab at the top to plan it.");
      return {text:L.join("\n"), chips:["What's an engineering elective?","When's the deadline?"]}; }},
    {kw:["is this official","who made this","who built","accurate","can i trust","reliable","is this correct","unofficial","who runs"], build:function(){
      return {text:"This is an unofficial, student-made planner for the M.Tech Techno-Entrepreneurship programme, built from IITH's published timetables, the department orientation deck and live AIMS data for Jul–Nov 2026. It's here to help you plan and catch mistakes — but always confirm in AIMS before you register, and talk to your Faculty Advisor about the engineering elective.", chips:DEFAULT_CHIPS}; }},
    {kw:["hi","hello","hey","help","what can you do","get started","how does this work","thanks","thank you"], build:function(){
      return {text:"Happy to help. I can explain slots, credits, the engineering elective, clashes, deadlines, how to register in AIMS, or any course code like EM5090 — in plain words. What's your question?", chips:DEFAULT_CHIPS}; }}
  ];

  function respond(raw){
    var q=norm(raw);
    var m=raw.match(/\b([a-zA-Z]{2}\d{4})\b/);
    if(m) return courseAnswer(m[1]);
    if(/\b(am i ready|ready to register|whats left|what s left|what next|what do i do next|have i finished|is my plan)\b/.test(q)) return readyAnswer();
    if(/\bwhy (can t|cant|can not|cannot) i (pick|take|choose|select)\b/.test(q)) return {text:"A course is greyed out or hidden if it can't be your engineering elective — usually because it isn't Level 5–6, it's worth other than 3 credits, or it's from an excluded department (Design, Physics, Chemistry, Maths). Untick ‘Only ones I can pick’ in the picker to see them all with the reason on each.", link:{text:"Go to the picker →",to:"esearch"}, chips:["What's an engineering elective?","Am I ready?"]};
    var best=null, bestScore=0;
    for(var i=0;i<INTENTS.length;i++){ var sc=0, kws=INTENTS[i].kw;
      for(var k=0;k<kws.length;k++){ if(q.indexOf(kws[k])>=0) sc+=kws[k].split(" ").length; }
      if(sc>bestScore){ bestScore=sc; best=INTENTS[i]; } }
    var gl=glossaryMatch(q);
    if(gl && gl.score>=bestScore && gl.score>0) return gl.ans;
    if(best && bestScore>0) return best.build();
    if(gl && gl.score>0) return gl.ans;
    return {text:"I'm not sure about that one — I only answer from what this planner knows for sure. Try the engineering elective, credits, slots, clashes, deadlines, how to register, or a course code like EM5090.", chips:DEFAULT_CHIPS};
  }

  fab.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  form.addEventListener("submit", function(e){ e.preventDefault(); var v=input.value; input.value=""; send(v); });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape" && !panel.hidden) close(); });
})();

/* ---------- boot (last, so every module above is defined) ---------- */
readHash();
if(state.sem===2){
  [].forEach.call($("semtoggle").querySelectorAll("button"), function(x){ x.classList.toggle("on", x.dataset.s==="2"); });
}
sync();
})();
