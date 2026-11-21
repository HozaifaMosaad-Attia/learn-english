#!/usr/bin/env node
// فحص ملفات المحتوى قبل النشر.
// التشغيل: node tools/validate.js [مسار الموقع]   (بيرجّع exit code 1 لو فيه أخطاء)
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const LV = ["A1", "A2", "B1", "B2"];
const errors = [];
const warns = [];
const err = (f, m) => errors.push(`✖ ${f}: ${m}`);
const warn = (f, m) => warns.push(`⚠ ${f}: ${m}`);

function run(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return err(rel, "الملف مش موجود");
  const ctx = vm.createContext({});
  ctx.window = ctx;
  try {
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: rel });
  } catch (e) {
    return err(rel, "خطأ في الكود: " + e.message);
  }
  return ctx;
}

const hasAr = (s) => /[\u0600-\u06FF]/.test(s);
const hasEn = (s) => /[A-Za-z]/.test(s);

/* ---- المواضيع ---- */
const topicsCtx = run("data/topics.js");
let TOPICS = [];
if (topicsCtx) {
  try {
    TOPICS = vm.runInContext("TOPICS", topicsCtx);
  } catch (e) {
    err("data/topics.js", "مفيش متغير TOPICS");
  }
}
const ids = new Set();
TOPICS.forEach((t) => {
  if (!t.id || !t.icon || !t.name) err("data/topics.js", "موضوع ناقصه حقل: " + JSON.stringify(t));
  if (ids.has(t.id)) err("data/topics.js", "id مكرر: " + t.id);
  ids.add(t.id);
});

/* ---- جمل كل موضوع ومستوى ---- */
let sentences = 0;
TOPICS.forEach((t) => {
  LV.forEach((l) => {
    const rel = `data/${l.toLowerCase()}/${t.id}.js`;
    const ctx = run(rel);
    if (!ctx) return;
    const key = `${t.id}-${l}`;
    const arr = ctx.DATA && ctx.DATA[key];
    if (!Array.isArray(arr) || !arr.length) return err(rel, `مفيش DATA["${key}"] أو فاضي`);
    const seen = new Map();
    arr.forEach((row, i) => {
      const at = `${rel} #${i + 1}`;
      if (!Array.isArray(row) || row.length !== 2 || row.some((x) => typeof x !== "string"))
        return err(at, "لازم يكون [إنجليزي, عربي]");
      const [en, ar] = row;
      sentences++;
      if (!hasEn(en)) err(at, "الجملة الإنجليزي مفيهاش حروف إنجليزي: " + en);
      if (!hasAr(ar)) err(at, "الترجمة مفيهاش حروف عربي: " + en);
      if (en !== en.trim() || /\s{2,}/.test(en)) err(at, "مسافات زيادة: " + JSON.stringify(en));
      if (/[\u0600-\u06FF]/.test(en)) err(at, "حروف عربي جوه الجملة الإنجليزي: " + en);
      const k = en.toLowerCase();
      if (seen.has(k)) warn(at, `مكررة مع #${seen.get(k)}: ${en}`);
      else seen.set(k, i + 1);
    });
  });
});

/* ---- القواعد والأصوات ---- */
["grammar", "sounds"].forEach((kind) => {
  const name = kind.toUpperCase();
  LV.forEach((l) => {
    const rel = `data/${kind}/${l.toLowerCase()}.js`;
    const ctx = run(rel);
    if (!ctx) return;
    const list = ctx[name] && ctx[name][l];
    if (!Array.isArray(list) || !list.length) return err(rel, `مفيش ${name}.${l}`);
    const lessonIds = new Set();
    list.forEach((x, i) => {
      const at = `${rel} درس ${i + 1} (${x.id || "?"})`;
      ["id", "title", "explain"].forEach((f) => !x[f] && err(at, "ناقص: " + f));
      if (lessonIds.has(x.id)) err(at, "id مكرر");
      lessonIds.add(x.id);
      (x.table || []).forEach((row) => {
        if (!Array.isArray(row) || row.some((c) => typeof c !== "string")) err(at, "صف جدول غلط");
      });
      (x.examples || []).forEach((e) => {
        if (!Array.isArray(e) || e.length !== 2) err(at, "مثال لازم يكون [إنجليزي, عربي]");
      });
      if (x.words && x.words.some((w) => typeof w !== "string")) err(at, "words لازم تكون نصوص");
      if (!x.quiz || x.quiz.length < 3) warn(at, "أسئلة قليلة");
      (x.quiz || []).forEach((q, qi) => {
        const qa = `${at} سؤال ${qi + 1}`;
        if (!q.q || !Array.isArray(q.options) || q.options.length < 2) return err(qa, "سؤال أو اختيارات ناقصة");
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)
          err(qa, "رقم الإجابة برا الاختيارات");
        if (new Set(q.options).size !== q.options.length) err(qa, "اختيارات مكررة");
      });
    });
  });
});

/* ---- النتيجة ---- */
warns.forEach((w) => console.log(w));
errors.forEach((e) => console.log(e));
console.log(
  `\n${TOPICS.length} مواضيع • ${sentences} جملة • ${errors.length} أخطاء • ${warns.length} تحذيرات`,
);
process.exit(errors.length ? 1 : 0);