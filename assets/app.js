/* Gemeinsame Funktionen: Fortschritt speichern, Navigation, Suche, Glossar-Popups. */
(function () {
  "use strict";
  const KEY = "tmfk-v1";
  const LANG = document.documentElement.lang === "en" ? "en" : "de";
  const BASE = document.documentElement.dataset.base || "";
  /* L("deutsch", "english") liefert den Text in der Seitensprache */
  const L = (de, en) => (LANG === "en" && en != null ? en : de);
  try { localStorage.setItem("tmfk-lang", LANG); } catch (e) { }

  /* ---------- Fortschritt (nur in diesem Browser) ---------- */
  const empty = () => ({ v: 1, lessons: {}, q: {}, exams: [], cards: {}, last: null, created: Date.now() });
  let mem = null;
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY)) || empty(); } catch (e) { mem = empty(); }
    for (const k of ["lessons", "q", "cards"]) if (!mem[k] || typeof mem[k] !== "object") mem[k] = {};
    if (!Array.isArray(mem.exams)) mem.exams = [];
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* privat/gesperrt: nur Sitzung */ } }
  const Store = {
    get: load,
    save,
    lesson(slug) { return load().lessons[slug] || {}; },
    markSeen(slug) { const s = load(); s.lessons[slug] = Object.assign({}, s.lessons[slug], { seen: Date.now() }); s.last = slug; save(); },
    setDone(slug, done) { const s = load(); const l = Object.assign({}, s.lessons[slug]); if (done) l.done = Date.now(); else delete l.done; s.lessons[slug] = l; save(); },
    /* score: 1 richtig, 0 falsch, dazwischen teilweise */
    answer(qid, score) {
      const s = load(); const r = s.q[qid] || { n: 0, r: 0 };
      r.n += 1; r.r += score; r.last = score; r.t = Date.now();
      r.streak = score >= 1 ? (r.streak || 0) + 1 : 0;
      s.q[qid] = r; save();
    },
    addExam(e) { const s = load(); s.exams.push(e); if (s.exams.length > 50) s.exams.shift(); save(); },
    card(id) { return load().cards[id]; },
    setCard(id, v) { load().cards[id] = v; save(); },
    exportText() { return btoa(unescape(encodeURIComponent(JSON.stringify(load())))); },
    importText(txt) {
      const data = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
      if (!data || data.v !== 1) throw new Error("Unbekanntes Format");
      mem = data; save();
    },
    reset() { mem = empty(); save(); }
  };

  /* ---------- Zahlen im deutschen Format ---------- */
  const fmt = (d) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const Num = {
    f0: fmt(0), f2: fmt(2), f4: fmt(4),
    eur: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }),
    /* akzeptiert 1.234,56 / 1234,56 / 1234.56 / 0,9 */
    parse(v) {
      let s = String(v == null ? "" : v).trim().replace(/\s|€|%/g, "");
      if (!s) return NaN;
      if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
      else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
      const x = parseFloat(s);
      return isFinite(x) ? x : NaN;
    },
    fmt(x, d) { return fmt(d).format(x); }
  };

  /* ---------- Helfer ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : String(k));
    return e;
  }
  function toast(msg) {
    const t = el("div", { class: "toast", role: "status" }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const allLessons = () => (window.KURS ? window.KURS.module.flatMap((m) => m.lektionen.map((l) => Object.assign({ modul: m.nr, modulTitel: m.titel }, l))) : []);

  window.FK = { Store, Num, $, $$, el, toast, shuffle, allLessons, L, LANG, BASE };

  /* ---------- Hell / Dunkel ---------- */
  const themeBtn = $("#themeBtn");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const root = document.documentElement;
    const cur = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("tmfk-theme", next); } catch (e) { }
  });

  /* ---------- Menü (Handy) ---------- */
  const menuBtn = $("#menuBtn"), nav = $("#mainnav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", open);
    });
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("open") && !nav.contains(e.target) && !menuBtn.contains(e.target)) {
        nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Lektionen: gesehen / erledigt ---------- */
  function paintOutline() {
    const s = Store.get();
    $$("[data-lesson]").forEach((a) => { if (a.tagName === "A") a.classList.toggle("done", !!(s.lessons[a.dataset.lesson] || {}).done); });
  }
  const lessonEl = $("article.lesson[data-slug]");
  if (lessonEl) Store.markSeen(lessonEl.dataset.slug);
  const doneBtn = $("#doneBtn");
  if (doneBtn) {
    const slug = doneBtn.dataset.lesson;
    const paint = () => {
      const done = !!Store.lesson(slug).done;
      doneBtn.textContent = done ? L("Erledigt ✓ (zurücksetzen)", "Done ✓ (undo)") : L("Lektion abschließen", "Mark lesson as done");
      doneBtn.classList.toggle("primary", !done);
      doneBtn.closest(".finish").classList.toggle("is-done", done);
      paintOutline();
    };
    doneBtn.addEventListener("click", () => {
      const done = !Store.lesson(slug).done;
      Store.setDone(slug, done);
      paint();
      if (done) toast(L("Lektion als erledigt gespeichert.", "Lesson saved as done."));
    });
    paint();
  }
  paintOutline();

  /* ---------- Glossar-Popups ---------- */
  let pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function openPop(target) {
    closePop();
    const g = (window.GLOSSAR || []).find((x) => x.id === target.dataset.g);
    if (!g) return;
    pop = el("div", { class: "gpop", role: "tooltip" },
      el("b", { lang: "de" }, (g.art ? g.art + " " : "") + g.de),
      LANG === "en" && g.en ? el("i", null, g.en) : null,
      el("span", { html: g.erklaerung }),
      el("a", { href: "glossar.html#" + g.id }, L("Im Glossar öffnen →", "Open in glossary →")));
    document.body.append(pop);
    const r = target.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = r.left + window.scrollX;
    left = Math.max(16, Math.min(left, window.scrollX + document.documentElement.clientWidth - pw - 16));
    let top = r.bottom + window.scrollY + 8;
    if (r.bottom + ph + 16 > window.innerHeight && r.top > ph + 80) top = r.top + window.scrollY - ph - 8;
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  document.addEventListener("click", (e) => {
    const d = e.target.closest("dfn[data-g]");
    if (d) { e.preventDefault(); if (pop && pop.dataset.for === d.dataset.g) closePop(); else { openPop(d); if (pop) pop.dataset.for = d.dataset.g; } return; }
    if (pop && !pop.contains(e.target)) closePop();
  });
  $$("dfn[data-g]").forEach((d) => { d.tabIndex = 0; d.setAttribute("role", "button"); d.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); d.click(); } }); });
  window.addEventListener("resize", closePop);

  /* ---------- Suche ---------- */
  const search = $("#search"), sInput = $("#searchInput"), sRes = $("#searchResults");
  let indexLoaded = false;
  function ensureIndex(cb) {
    if (window.SUCHE) return cb();
    if (indexLoaded) return;
    indexLoaded = true;
    const s = document.createElement("script");
    s.src = BASE + "assets/data-" + LANG + "/suche.js"; s.onload = cb; document.head.append(s);
  }
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
  function escHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function runSearch() {
    const q = sInput.value.trim();
    if (q.length < 2) { sRes.innerHTML = '<div class="search-empty">' + L("Mindestens 2 Buchstaben eingeben.", "Type at least 2 letters.") + '</div>'; return; }
    const terms = norm(q).split(/\s+/).filter(Boolean);
    const hits = [];
    for (const it of window.SUCHE || []) {
      const t = norm(it.t), h = norm(it.h.join(" ")), x = norm(it.x);
      let score = 0, ok = true;
      for (const term of terms) {
        const s = (t.includes(term) ? 10 : 0) + (h.includes(term) ? 4 : 0) + (x.includes(term) ? 1 : 0);
        if (!s) { ok = false; break; }
        score += s;
      }
      if (ok) {
        const pos = x.indexOf(terms[0]);
        let snip = pos >= 0 ? it.x.slice(Math.max(0, pos - 60), pos + 120) : it.x.slice(0, 160);
        snip = escHtml(snip);
        hits.push({ it, score, snip });
      }
    }
    hits.sort((a, b) => b.score - a.score);
    sRes.innerHTML = hits.length
      ? hits.slice(0, 20).map((h) => `<a href="${h.it.u}"><b>${escHtml(h.it.t)}</b><small>… ${h.snip} …</small></a>`).join("")
      : '<div class="search-empty">' + L("Nichts gefunden. Versuche einen anderen Begriff.", "Nothing found. Try another word, or the German term.") + '</div>';
  }
  function openSearch() { search.hidden = false; sInput.focus(); ensureIndex(runSearch); }
  function closeSearch() { search.hidden = true; }
  if (search) {
    $("#searchBtn").addEventListener("click", openSearch);
    $("#searchClose").addEventListener("click", closeSearch);
    search.addEventListener("click", (e) => { if (e.target === search) closeSearch(); });
    sInput.addEventListener("input", () => ensureIndex(runSearch));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); closePop(); }
      if (e.key === "/" && search.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
    });
  }
})();
