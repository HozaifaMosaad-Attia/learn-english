const $ = id => document.getElementById(id), M = $("main"), R = {};
const LV = ["A1", "A2", "B1", "B2"];
const TABS = [["read", "📖 قراءة واستماع"], ["write", "⌨️ كتابة"], ["quiz", "📝 اختبار"], ["tr", "🌐 ترجمة"]];
const J = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch (e) { return d } };
const S = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
if (typeof TOPICS === "undefined") {
  document.body.innerHTML = '<div style="padding:30px;font-family:sans-serif;direction:rtl;text-align:center;line-height:2">⚠️ ملف <b dir="ltr">data/topics.js</b> مش موجود أو مكانه غلط.<br>لازم يكون جوه فولدر <b dir="ltr">data</b> جنب <b dir="ltr">index.html</b>.</div>';
  throw new Error("data/topics.js is missing");
}
let st = J("st", { topic: null, lv: "A1", tab: "read" });

/* ===== النطق الأمريكي ===== */
let V = null, tok = 0;
function pick() { const v = speechSynthesis.getVoices(); V = v.find(x => x.lang === "en-US" && /Google US|Samantha|Aria|Jenny|Zira/i.test(x.name)) || v.find(x => x.lang === "en-US" || x.lang === "en_US") || null }
pick(); speechSynthesis.onvoiceschanged = pick;
function seq(l, g, r) { speechSynthesis.cancel(); const m = ++tok; let i = 0; (function n() { if (m != tok || i >= l.length) return; const u = new SpeechSynthesisUtterance(l[i++]); u.lang = "en-US"; if (V) u.voice = V; u.rate = r; u.onend = () => setTimeout(n, g); speechSynthesis.speak(u) })() }
const say = t => seq([t], 0, .85), slow = t => seq(t.split(" "), 500, .5);

/* ===== أدوات ===== */
const sh = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };
const nm = s => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();
const na = s => s.replace(/[؟?.!،,]/g, "").replace(/\s+/g, " ").trim();
const I = () => DATA[st.topic + "-" + st.lv] || [], K = () => st.topic + "-" + st.lv;

/* ===== الواجهة العامة ===== */
const loaded = {};
// بيحمّل ملف المحتوى data/<level>/<topic>.js وقت الحاجة
function loadData(t, l) {
  const key = t + "-" + l; if (key in loaded) return loaded[key];
  return loaded[key] = new Promise(res => { const s = document.createElement("script"); s.src = "data/" + l.toLowerCase() + "/" + t + ".js"; s.onload = () => res(true); s.onerror = () => res(false); document.head.append(s) });
}
let view = 0; // رقم العرض الحالي: بيمنع المؤقتات القديمة من تخريب الشاشة
function render() {
  view++;
  S("st", st);
  if (st.topic && !TOPICS.find(x => x.id == st.topic)) st.topic = null;
  $("home").style.display = st.topic ? "none" : "block"; $("view").style.display = st.topic ? "block" : "none";
  st.topic ? drawView() : drawHome();
}
function drawHome() {
  $("home").innerHTML = '<h2 class="p" style="font-size:18px">اختار الموضوع اللي عايز تتعلمه</h2><div class="grid" id="gr"></div>';
  TOPICS.forEach(t => { const b = document.createElement("button"); b.className = "tc"; b.innerHTML = "<span>" + t.icon + "</span>" + t.name; b.onclick = () => { st.topic = t.id; st.tab = "read"; render() }; $("gr").append(b) });
}
async function drawView() {
  const my = view;
  const t = TOPICS.find(x => x.id == st.topic); $("ttl").textContent = t.icon + " " + t.name;
  $("lv").innerHTML = ""; LV.forEach(l => { const b = document.createElement("button"); b.textContent = l; b.className = l == st.lv ? "on" : ""; b.onclick = () => { st.lv = l; render() }; $("lv").append(b) });
  $("tabs").innerHTML = ""; TABS.forEach(([id, n]) => { const b = document.createElement("button"); b.textContent = n; b.className = id == st.tab ? "on" : ""; b.onclick = () => { st.tab = id; render() }; $("tabs").append(b) });
  M.innerHTML = '<div class="p">⏳ جاري التحميل...</div>';
  const ok = await loadData(st.topic, st.lv);
  if (my !== view) return;
  if (!ok && st.tab != "tr") { M.innerHTML = '<div class="c"><div class="d">📭 المحتوى ده لسه مش موجود</div><div class="p" dir="ltr">data/' + st.lv.toLowerCase() + "/" + st.topic + ".js</div></div>"; return }
  R[st.tab]();
}
$("back").onclick = () => { st.topic = null; render() };
$("logo").onclick = $("back").onclick;

/* ===== 1) قراءة واستماع ===== */
R.read = () => {
  M.innerHTML = "";
  I().forEach((x, i) => {
    const r = document.createElement("div"); r.className = "r";
    r.innerHTML = '<span class="n">' + (i + 1) + '</span><div class="t"><div class="en"></div><div class="ar"></div></div><button class="ic g">🐢</button><button class="ic">🎤</button>';
    r.querySelector(".en").textContent = x[0]; r.querySelector(".ar").textContent = x[1];
    const b = r.querySelectorAll("button"); b[0].onclick = () => slow(x[0]); b[1].onclick = () => say(x[0]);
    M.append(r);
  });
};

/* ===== 2) كتابة ===== */
R.write = () => {
  const my = view, A = I(), kk = "w" + K(); let k = Math.min(J(kk, 0), A.length - 1), sk = J(kk + "s", []), lock = false;
  M.innerHTML = '<div class="p" id="pg"></div><div class="bar"><i id="bi"></i></div><div class="c"><div class="ar" id="ar"></div><div class="en" id="en"></div><div class="b"><button class="ic" id="m">🎤</button><button class="ic g" id="sl">🐢</button></div><input id="in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="اكتب الجملة..."><div id="hint"></div><div id="msg"></div><div class="b"><button class="k" id="pv">⏮ السابق</button><button class="k" id="hn">💡 تلميح</button><button class="k" id="sk">تخطي ⏭</button><button class="k" id="bk"></button></div><div class="b"><input id="go" type="number" min="1" placeholder="رقم" style="width:80px"><button class="k" id="gb">اذهب</button><button class="k" id="rs">من البداية ↺</button><label><input type="checkbox" id="hd" style="width:auto"> إخفاء الجملة</label></div></div>';
  const show = () => {
    $("pg").textContent = "الجملة " + (k + 1) + " من " + A.length; $("bi").style.width = (k / A.length * 100) + "%";
    $("ar").textContent = A[k][1]; $("en").textContent = A[k][0]; $("en").style.filter = $("hd").checked ? "blur(8px)" : "";
    $("bk").textContent = "↩ المتخطاة (" + sk.length + ")"; const i = $("in"); i.value = ""; i.className = "";
    $("hint").textContent = ""; $("msg").textContent = ""; lock = false; i.focus(); S(kk, k); S(kk + "s", sk);
  };
  const go = n => { k = Math.max(0, Math.min(A.length - 1, n)); show() };
  $("in").oninput = e => {
    if (lock) return; const t = nm(A[k][0]), v = nm(e.target.value);
    if (v === t) { lock = true; e.target.className = "ok"; say(A[k][0]); sk = sk.filter(n => n != k); S(kk + "s", sk);
      if (k == A.length - 1) { $("msg").textContent = "🎉 خلصت الملف ده! جرّب الاختبار"; return } setTimeout(() => { if (my === view) go(k + 1) }, 900) }
    else e.target.className = t.startsWith(v) ? "" : "bad";
  };
  $("m").onclick = () => say(A[k][0]); $("sl").onclick = () => slow(A[k][0]); $("pv").onclick = () => go(k - 1);
  $("sk").onclick = () => { if (!sk.includes(k)) sk.push(k); go(k + 1) };
  $("bk").onclick = () => { if (sk.length) go(sk[0]); else $("msg").textContent = "مفيش جمل متخطاة 👍" };
  $("gb").onclick = () => { const n = +$("go").value; if (n) go(n - 1) }; $("rs").onclick = () => go(0);
  $("hn").onclick = () => { $("hint").textContent = A[k][0].split(" ").map(w => w[0] + "_".repeat(Math.max(0, w.length - 1))).join("  ") };
  $("hd").onchange = () => { $("en").style.filter = $("hd").checked ? "blur(8px)" : "" };
  show();
};

/* ===== 3) اختبار ===== */
R.quiz = () => {
  const my = view, A = I(), Q = sh(A).slice(0, 40); let i = 0, sc = 0;
  const next = () => {
    if (i >= Q.length) { M.innerHTML = '<div class="c"><div class="d">النتيجة: ' + sc + ' / ' + Q.length + '</div><div class="b"><button class="k m" id="rt">إعادة الاختبار</button></div></div>'; $("rt").onclick = R.quiz; return }
    const q = Q[i], opts = sh([q, ...sh(A.filter(x => x !== q)).slice(0, 3)]);
    M.innerHTML = '<div class="p">سؤال ' + (i + 1) + ' من ' + Q.length + '</div><div class="c"><div class="ar">' + q[1] + '</div><div id="o"></div></div>';
    opts.forEach(o => {
      const b = document.createElement("button"); b.className = "opt"; b.textContent = o[0];
      b.onclick = () => {
        document.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (x.textContent == q[0]) x.classList.add("ok") });
        if (o === q) sc++; else b.classList.add("no");
        say(q[0]); i++; setTimeout(() => { if (my === view) next() }, 1500);
      };
      $("o").append(b);
    });
  };
  next();
};

/* ===== 4) ترجمة ===== */
async function bad(t) {
  const ws = [...new Set(t.toLowerCase().match(/[a-z']+/g) || [])], out = [];
  const ok = async x => { if (!x) return true; const r = await (await fetch("https://api.datamuse.com/words?sp=" + x + "&max=1")).json(); return r[0] && r[0].word == x };
  try {
    await Promise.all(ws.map(async w => {
      let g; if (w.includes("'")) { const b = w.split("'")[0]; g = /^[a-z]+'(s|m|re|ve|ll|d|t)$/.test(w) && (await ok(b) || await ok(b.slice(0, -1)) || ["ca", "wo", "sha"].includes(b.slice(0, -1))) } else g = await ok(w);
      if (!g) { let s = ""; try { const r = await (await fetch("https://api.datamuse.com/words?sp=" + w.replace(/'/g, "") + "&max=1")).json(); s = r[0] ? r[0].word : "" } catch (e) {} out.push([w, s]) }
    }));
  } catch (e) { return null }
  return out;
}
R.tr = () => {
  M.innerHTML = '<textarea id="ta" rows="4" placeholder="اكتب جملة بالعربي أو بالإنجليزي..."></textarea><div class="b"><button class="k m" id="tb">ترجم</button><button class="ic" id="ts" style="display:none">🎤</button></div><div id="res">النتيجة هتظهر هنا</div>';
  $("tb").onclick = async () => {
    const t = $("ta").value.trim(), Rs = $("res"); Rs.className = ""; $("ts").style.display = "none"; if (!t) return; Rs.textContent = "⏳ جاري الترجمة...";
    const ar = /[\u0600-\u06FF]/.test(t); let en = "";
    if (!ar) { const b = await bad(t); if (b && b.length) { Rs.className = "err"; Rs.innerHTML = "⚠️ عندك خطأ في الكتابة:<br>" + b.map(x => '<b dir="ltr">' + x[0] + "</b>" + (x[1] ? ' ← يمكن تقصد <b dir="ltr">' + x[1] + "</b>" : "")).join("<br>"); return } }
    const ALL = Object.values(DATA).flat(), m = ALL.find(x => ar ? na(x[1]) == na(t) : nm(x[0]) == nm(t));
    if (m) { Rs.textContent = ar ? m[0] : m[1]; en = m[0] }
    else { try { const r = await (await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(t) + "&langpair=" + (ar ? "ar|en" : "en|ar"))).json(); const o = r.responseData.translatedText; if (!o || /MYMEMORY|QUERY LENGTH/i.test(o)) throw 0; Rs.textContent = o; en = ar ? o : t }
      catch (e) { Rs.className = "err"; Rs.textContent = "⚠️ مقدرتش أترجم. تأكد إن النت شغال وإن الجملة أقل من 500 حرف."; return } }
    Rs.dir = ar ? "ltr" : "rtl"; if (en) { $("ts").style.display = ""; $("ts").onclick = () => say(en) }
  };
};

render();