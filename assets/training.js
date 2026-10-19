/* Fragentrainer */
(function () {
  "use strict";
  const { el, Store, shuffle, Quiz, Num, allLessons, L } = window.FK;
  const $ = (id) => document.getElementById(id);
  const FR = window.FRAGEN || [];
  const lessons = allLessons();
  const MODES = [
    ["mix", L("Gemischt", "Mixed"), L("Zufällige Fragen aus deinen Themen.", "Random questions from your topics.")],
    ["new", L("Neue Fragen", "New questions"), L("Nur Fragen, die du noch nie beantwortet hast.", "Only questions you have never answered.")],
    ["wrong", L("Fehler wiederholen", "Repeat mistakes"), L("Fragen, die du zuletzt falsch oder nur teilweise richtig hattest.", "Questions you last got wrong or only partly right.")],
    ["weak", L("Schwächen", "Weak spots"), L("Fragen mit der schlechtesten Trefferquote zuerst.", "Questions with your lowest success rate first.")]
  ];
  let mode = "mix", count = 20;
  const selected = new Set();
  const pre = location.hash.slice(1);

  MODES.forEach(([k, t, d]) => {
    const i = el("input", { type: "radio", name: "mode", value: k, checked: k === mode });
    i.addEventListener("change", () => { mode = k; updatePool(); });
    $("modes").append(el("label", null, i, el("b", null, t), el("small", null, d)));
  });

  const byLesson = {};
  FR.forEach((q) => { (byLesson[q.lek] = byLesson[q.lek] || []).push(q); });
  window.KURS.module.forEach((m) => {
    const ls = m.lektionen.filter((l) => byLesson[l.slug]);
    if (!ls.length) return;
    const grid = el("div", { class: "sg-grid" });
    ls.forEach((l) => {
      const cb = el("input", { type: "checkbox", value: l.slug });
      if (!pre || pre === l.slug) { cb.checked = true; selected.add(l.slug); }
      cb.addEventListener("change", () => { cb.checked ? selected.add(l.slug) : selected.delete(l.slug); updatePool(); });
      grid.append(el("label", null, cb, el("span", null, el("span", { class: "n" }, l.nr + " "), l.titel), el("span", { class: "n" }, String(byLesson[l.slug].length))));
    });
    $("topics").append(el("div", { class: "stack" }, el("b", null, `${L("Modul", "Module")} ${m.nr} · ${m.titel}`), grid));
  });
  $("selAll").addEventListener("click", () => { document.querySelectorAll("#topics input").forEach((c) => { c.checked = true; selected.add(c.value); }); updatePool(); });
  $("selNone").addEventListener("click", () => { document.querySelectorAll("#topics input").forEach((c) => { c.checked = false; }); selected.clear(); updatePool(); });

  [10, 20, 40, 0].forEach((n) => {
    const b = el("button", { type: "button", class: "chip" + (n === count ? " on" : "") }, n ? n + L(" Fragen", " questions") : L("Alle", "All"));
    b.addEventListener("click", () => { count = n; $("counts").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b)); updatePool(); });
    $("counts").append(b);
  });
  $("withOpen").addEventListener("change", updatePool);

  function pool() {
    const s = Store.get().q;
    let p = FR.filter((q) => selected.has(q.lek) && ($("withOpen").checked || q.typ !== "offen"));
    if (mode === "new") p = p.filter((q) => !s[q.id]);
    if (mode === "wrong") p = p.filter((q) => s[q.id] && s[q.id].last < 1);
    if (mode === "weak") {
      p = p.filter((q) => s[q.id]).sort((a, b) => (s[a.id].r / s[a.id].n) - (s[b.id].r / s[b.id].n));
      return p.filter((q) => s[q.id].r / s[q.id].n < 0.85);
    }
    return shuffle(p);
  }
  function updatePool() {
    const p = pool();
    const n = count ? Math.min(count, p.length) : p.length;
    $("poolInfo").textContent = p.length
      ? L(`${p.length} passende Fragen · ${n} im Training`, `${p.length} matching questions · ${n} in this session`)
      : (mode === "wrong" ? L("Keine falschen Fragen gespeichert. Super, oder du hast noch nicht geübt.", "No wrong answers saved. Great, or you have not practised yet.")
        : L("Keine passenden Fragen. Wähle mehr Themen oder einen anderen Modus.", "No matching questions. Choose more topics or another mode."));
    $("startBtn").disabled = !p.length;
  }
  updatePool();

  /* ---------- Sitzung ---------- */
  let list = [], idx = 0, results = [];
  $("startBtn").addEventListener("click", () => {
    const p = pool();
    list = count ? p.slice(0, count) : p;
    idx = 0; results = [];
    $("setupView").hidden = true; $("resultView").hidden = true; $("sessionView").hidden = false;
    $("sessTitle").textContent = MODES.find((m) => m[0] === mode)[1];
    show();
    window.scrollTo({ top: 0 });
  });
  function show() {
    if (idx >= list.length) return finish();
    const q = list[idx];
    $("sessCount").textContent = `${idx + 1} / ${list.length}`;
    $("sessBar").style.width = (idx / list.length * 100) + "%";
    $("nextBtn").hidden = true; $("skipBtn").hidden = false;
    const st = Quiz.render(q, {
      mode: "practice", showLesson: true,
      onAnswer: (s) => {
        if (s.score == null) return;
        results[idx] = { q, score: s.score };
        $("nextBtn").hidden = false; $("skipBtn").hidden = true;
        $("nextBtn").textContent = idx + 1 < list.length ? L("Weiter", "Next") : L("Auswertung", "Results");
        $("nextBtn").focus({ preventScroll: true });
      }
    });
    $("qSlot").replaceChildren(st.el);
  }
  $("nextBtn").addEventListener("click", () => { idx++; show(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("skipBtn").addEventListener("click", () => { results[idx] = { q: list[idx], score: null }; idx++; show(); });
  $("quitBtn").addEventListener("click", finish);

  function finish() {
    $("sessionView").hidden = true;
    const done = results.filter((r) => r && r.score != null);
    const p = done.reduce((a, r) => a + r.score, 0);
    const pct = done.length ? Math.round(p / done.length * 100) : 0;
    const wrong = done.filter((r) => r.score < 1);
    const skipped = results.length - done.length;
    const view = $("resultView");
    view.hidden = false;
    const msg = pct >= 80 ? L("Sehr gut. Dieses Thema sitzt.", "Very good. You know this topic.")
      : pct >= 60 ? L("Gut. Wiederhole die Fehler, dann bist du sicher.", "Good. Repeat your mistakes and you will be safe.")
        : L("Lies die Lektion noch einmal und übe dann die Fehler.", "Read the lesson again, then practise your mistakes.");
    view.replaceChildren(
      el("div", { class: "result-hero" },
        el("div", { class: "meter" }, el("div", { class: "meter-top" }, el("span", { class: "on" }, L("● Ergebnis", "● Result")), el("span", null, done.length + L(" Fragen", " questions"))),
          el("div", null, el("div", { class: "meter-label" }, L("richtig", "correct")), el("div", { class: "meter-main" }, String(pct), el("small", null, "%")))),
        el("div", { class: "stack" }, el("h2", null, msg),
          el("p", { class: "muted" }, L(`${Num.fmt(p, p % 1 ? 1 : 0)} von ${done.length} Punkten.`, `${Num.fmt(p, p % 1 ? 1 : 0)} of ${done.length} points.`) + (skipped ? L(` ${skipped} übersprungen.`, ` ${skipped} skipped.`) : "")),
          el("div", { class: "btns" },
            wrong.length ? el("button", { type: "button", class: "btn primary", onclick: () => { list = shuffle(wrong.map((r) => r.q)); idx = 0; results = []; view.hidden = true; $("sessionView").hidden = false; show(); } }, L(`${wrong.length} Fehler sofort wiederholen`, `Repeat ${wrong.length} mistakes now`)) : null,
            el("button", { type: "button", class: "btn", onclick: () => { view.hidden = true; $("setupView").hidden = false; updatePool(); } }, L("Neues Training", "New session")),
            el("a", { class: "btn ghost", href: "fortschritt.html" }, L("Mein Fortschritt", "My progress"))))),
      wrong.length ? el("section", { class: "stack" }, el("h3", null, L("Diese Fragen solltest du wiederholen", "Questions to repeat")),
        el("div", { class: "history" }, wrong.map((r) => {
          const l = lessons.find((x) => x.slug === r.q.lek);
          return el("div", { class: "history-row" }, el("span", { html: r.q.frage.replace(/<[^>]+>/g, " ").slice(0, 140) }),
            el("span", { class: "pill " + (r.score > 0 ? "warn" : "bad") }, r.score > 0 ? L("teilweise", "partly") : L("falsch", "wrong")),
            l ? el("a", { href: l.url }, L("Lektion ", "Lesson ") + l.nr) : el("span"));
        }))) : null);
    window.scrollTo({ top: 0 });
  }
})();
