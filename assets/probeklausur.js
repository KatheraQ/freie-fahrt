/* Probeklausur nach § 4 PBZugV: Teil 1 (40 % = 60 P), Teil 2 (35 % = 52,5 P), mündlich (25 % = 37,5 P). */
(function () {
  "use strict";
  const { el, Store, shuffle, Quiz, Num, Rechen, allLessons, toast, L } = window.FK;
  const $ = (id) => document.getElementById(id);
  const FR = window.FRAGEN || [];
  const lessons = allLessons();
  const modOf = {};
  lessons.forEach((l) => { modOf[l.slug] = l.modul; });
  const P1 = 60, P2 = 52.5, PO = 37.5, PASS = 90;
  const fmtP = (x) => Num.fmt(x, Math.abs(x % 1) > 0.001 ? 1 : 0);

  let exam = null, part = 0, cur = 0, timerId = null, endAt = 0, useTimer = true;

  /* ---------- Startseite ---------- */
  $("poolNote").textContent = L(`Fragenpool: ${FR.length} Fragen aus ${new Set(FR.map((q) => q.lek)).size} Lektionen. Jede Klausur mischt neu.`, `Question pool: ${FR.length} questions from ${new Set(FR.map((q) => q.lek)).size} lessons. Every mock exam is shuffled.`);
  function paintHistory() {
    const h = Store.get().exams;
    $("historyBox").hidden = !h.length;
    $("history").replaceChildren(...h.slice().reverse().map((x) => el("div", { class: "history-row" },
      el("span", null, new Date(x.t).toLocaleDateString(window.FK.LANG === "en" ? "en-GB" : "de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) + L(" · Teil 1: ", " · Part 1: ") + fmtP(x.p1) + L(" · Teil 2: ", " · Part 2: ") + fmtP(x.p2) + (x.oral != null ? L(" · mündlich: ", " · oral: ") + fmtP(x.oral) : "")),
      el("span", { class: "mono" }, fmtP(x.total) + " / " + (x.oral != null ? 150 : 112.5)),
      el("span", { class: "pill " + (x.pass ? "ok" : "bad") }, x.pass ? L("bestanden", "passed") : L("nicht bestanden", "failed")))));
  }
  paintHistory();

  /* ---------- Zusammenstellen ---------- */
  function buildExam() {
    const used = new Set();
    const take = (arr, n) => { const out = []; for (const q of arr) { if (out.length >= n) break; if (!used.has(q.id)) { used.add(q.id); out.push(q); } } return out; };
    // Teil 1: Quoten nach Modul, höchstens 4 offene Fragen
    const quota = { 1: 13, 2: 8, 3: 4, 4: 3, 5: 2 };
    const closed = shuffle(FR.filter((q) => q.typ !== "offen"));
    const open = shuffle(FR.filter((q) => q.typ === "offen"));
    let t1 = [];
    const openT1 = take(open, 4);
    for (const [m, n] of Object.entries(quota)) {
      const already = openT1.filter((q) => modOf[q.lek] === +m).length;
      t1 = t1.concat(take(closed.filter((q) => modOf[q.lek] === +m), n - already));
    }
    t1 = t1.concat(openT1);
    if (t1.length < 30) t1 = t1.concat(take(closed, 30 - t1.length));
    t1 = shuffle(t1).slice(0, 30);
    const pts1 = P1 / t1.length;
    // Teil 2: Kostenrechnung + offene Praxisfragen
    const task = Rechen.generate(Math.random() < 0.5 ? "kosten-taxi" : "kosten-miet");
    let t2q = take(open, 6);
    if (t2q.length < 6) t2q = t2q.concat(take(shuffle(FR), 6 - t2q.length));
    const calcPts = 22.5, qPts = (P2 - calcPts) / t2q.length;
    return {
      parts: [
        { title: L("Teil 1 · Fragen", "Part 1 · Questions"), minutes: 60, max: P1, items: t1.map((q) => ({ kind: "q", q, points: pts1 })) },
        { title: L("Teil 2 · Fallstudie", "Part 2 · Case study"), minutes: 60, max: P2, items: [{ kind: "calc", task, points: calcPts }].concat(t2q.map((q) => ({ kind: "q", q, points: qPts }))) }
      ],
      oral: null
    };
  }

  /* ---------- Elemente erzeugen ---------- */
  function mountItem(it, n) {
    if (it.kind === "q") {
      it.state = Quiz.render(it.q, { mode: "exam", number: n, points: it.points, hideSelfRate: true, onAnswer: () => paintNav(), onSelfRated: () => paintRate() });
      it.el = it.state.el;
      it.answered = () => it.state.answered;
      it.score = () => (it.state.score || 0) * it.points;
      it.isOpen = it.q.typ === "offen";
      it.reveal = () => { if (!it.state.revealed) it.state.reveal(); };
    } else {
      const t = it.task, sp = it.points / t.schritte.length;
      const rows = t.schritte.map((s, i) => {
        const id = `ex-${t.seed}-${i}`;
        const input = el("input", { id, inputmode: "decimal", autocomplete: "off", placeholder: "0,00" });
        input.addEventListener("input", paintNav);
        const fb = el("div", { class: "fb", hidden: true });
        return { s, input, fb, row: el("div", { class: "tstep" }, el("label", { for: id }, el("b", null, `${i + 1}. ${s.label}`), el("small", null, fmtP(sp) + L(" Punkte", " points"))), el("div", { class: "inp" }, input, el("span", null, s.einheit)), el("span"), fb) };
      });
      it.el = el("div", { class: "task-card" },
        el("div", { class: "q-meta" }, el("span", { class: "pill" }, L("Aufgabe ", "Task ") + n), el("span", null, L("Kostenrechnung", "Cost accounting")), el("span", { class: "pts" }, fmtP(it.points) + L(" P.", " pts"))),
        el("h2", null, t.titel), el("p", null, t.text),
        el("div", { class: "task-given" }, el("b", null, L("Gegeben (Beispielwerte)", "Given (sample values)")), el("dl", { class: "kv" }, t.gegeben.flatMap(([k, v]) => [el("dt", null, k), el("dd", null, v)]))),
        el("p", { class: "q-hint" }, L("Runde Zwischenergebnisse mit 4 Nachkommastellen, Endergebnisse je km auf 2 Stellen.", "Round intermediate results to 4 decimals and per-km results to 2 decimals. German number format: 1.234,56.")),
        el("div", null, rows.map((r) => r.row)));
      const ok = (r) => { const v = Num.parse(r.input.value); return !isNaN(v) && Math.abs(v - r.s.richtig) <= r.s.tol + 1e-9; };
      it.answered = () => rows.some((r) => r.input.value.trim());
      it.score = () => rows.filter(ok).length * sp;
      it.isOpen = false;
      it.reveal = () => rows.forEach((r) => {
        r.input.disabled = true;
        const good = ok(r);
        r.fb.hidden = false; r.fb.className = "fb " + (good ? "ok" : "no");
        r.fb.replaceChildren(el("div", { class: "fb-t" }, good ? L("Richtig", "Correct") : L("Falsch. Richtig: ", "Wrong. Correct: ") + Num.fmt(r.s.richtig, r.s.dez != null ? r.s.dez : 2) + " " + r.s.einheit), el("div", { class: "sol" }, r.s.loesung));
      });
    }
  }

  /* ---------- Ablauf ---------- */
  $("startExam").addEventListener("click", () => {
    useTimer = $("useTimer").checked;
    exam = buildExam();
    let n = 0;
    exam.parts.forEach((p) => p.items.forEach((it) => mountItem(it, ++n)));
    window.addEventListener("beforeunload", guard);
    startPart(0);
  });
  function guard(e) { e.preventDefault(); e.returnValue = ""; }

  function startPart(i) {
    part = i; cur = 0;
    ["startView", "pauseView", "rateView", "resultView"].forEach((v) => { $(v).hidden = true; });
    $("examView").hidden = false; $("confirmBox").hidden = true;
    $("partTitle").textContent = exam.parts[i].title;
    if (useTimer) { endAt = Date.now() + exam.parts[i].minutes * 60000; tick(); clearInterval(timerId); timerId = setInterval(tick, 1000); $("timer").hidden = false; }
    else $("timer").hidden = true;
    showItem(0);
    window.scrollTo({ top: 0 });
  }
  function tick() {
    const left = Math.max(0, endAt - Date.now());
    const m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
    $("timer").textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    $("timer").classList.toggle("low", left < 5 * 60000);
    if (left <= 0) { clearInterval(timerId); toast(L("Die Zeit ist abgelaufen. Der Teil wurde abgegeben.", "Time is up. This part has been submitted.")); submitPart(); }
  }
  function paintNav() {
    if (!exam) return;
    const items = exam.parts[part].items;
    const offset = exam.parts.slice(0, part).reduce((a, p) => a + p.items.length, 0);
    $("qnav").replaceChildren(...items.map((it, i) => {
      const b = el("button", { type: "button", class: (it.answered() ? "answered " : "") + (it.flag ? "flag" : ""), "aria-current": i === cur ? "true" : "false", "aria-label": L("Frage ", "Question ") + (offset + i + 1) + (it.answered() ? L(", beantwortet", ", answered") : "") + (it.flag ? L(", markiert", ", flagged") : "") }, String(offset + i + 1));
      b.addEventListener("click", () => showItem(i));
      return b;
    }));
  }
  function showItem(i) {
    const items = exam.parts[part].items;
    cur = Math.max(0, Math.min(items.length - 1, i));
    $("examQ").replaceChildren(items[cur].el);
    $("prevQ").disabled = cur === 0;
    $("nextQ").textContent = cur === items.length - 1 ? L("Abgeben", "Submit") : L("Weiter →", "Next →");
    $("flagQ").textContent = items[cur].flag ? L("Markierung entfernen", "Remove flag") : L("Markieren", "Flag");
    paintNav();
  }
  $("prevQ").addEventListener("click", () => { showItem(cur - 1); window.scrollTo({ top: 0 }); });
  $("nextQ").addEventListener("click", () => { if (cur === exam.parts[part].items.length - 1) askSubmit(); else { showItem(cur + 1); window.scrollTo({ top: 0 }); } });
  $("flagQ").addEventListener("click", () => { const it = exam.parts[part].items[cur]; it.flag = !it.flag; showItem(cur); });
  $("submitPart").addEventListener("click", askSubmit);
  function askSubmit() {
    const items = exam.parts[part].items;
    const open = items.filter((it) => !it.answered()).length, flagged = items.filter((it) => it.flag).length;
    $("confirmText").textContent = (open ? L(`${open} Fragen sind noch nicht beantwortet. `, `${open} questions are not answered yet. `) : L("Alle Fragen sind beantwortet. ", "All questions are answered. ")) + (flagged ? L(`${flagged} Fragen sind markiert. `, `${flagged} questions are flagged. `) : "") + L("Nach der Abgabe kannst du diesen Teil nicht mehr ändern.", "After submitting you cannot change this part.");
    $("confirmBox").hidden = false;
    $("confirmBox").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  $("confirmNo").addEventListener("click", () => { $("confirmBox").hidden = true; });
  $("confirmYes").addEventListener("click", submitPart);
  function submitPart() {
    clearInterval(timerId);
    $("examView").hidden = true;
    if (part === 0) { $("pauseView").hidden = false; window.scrollTo({ top: 0 }); }
    else toRating();
  }
  $("startPart2").addEventListener("click", () => startPart(1));

  /* ---------- Selbstbewertung ---------- */
  let openItems = [];
  function toRating() {
    openItems = exam.parts.flatMap((p) => p.items.filter((it) => it.isOpen));
    if (!openItems.length) return showResult();
    $("rateView").hidden = false;
    $("rateList").replaceChildren(...openItems.map((it) => { it.reveal(); return it.el; }));
    paintRate();
    window.scrollTo({ top: 0 });
  }
  function paintRate() {
    if (!openItems.length) return;
    const done = openItems.filter((it) => it.state.selfPoints != null).length;
    $("rateInfo").textContent = L(`${done} von ${openItems.length} bewertet`, `${done} of ${openItems.length} rated`);
    $("toResult").disabled = done < openItems.length;
  }
  $("toResult").addEventListener("click", showResult);

  /* ---------- Ergebnis ---------- */
  function partScore(p) { return p.items.reduce((a, it) => a + it.score(), 0); }
  function showResult() {
    $("rateView").hidden = true;
    window.removeEventListener("beforeunload", guard);
    const p1 = partScore(exam.parts[0]), p2 = partScore(exam.parts[1]);
    exam.p1 = p1; exam.p2 = p2;
    const written = p1 + p2;
    const ok1 = p1 >= P1 / 2, ok2 = p2 >= P2 / 2;
    let verdict, cls, needOral = false;
    if (!ok1 || !ok2) { verdict = L("Nicht bestanden", "Failed"); cls = "bad"; }
    else if (written >= PASS) { verdict = L("Bestanden, ohne mündliche Prüfung", "Passed, no oral exam needed"); cls = "ok"; }
    else { verdict = L("Mündliche Prüfung nötig", "Oral exam needed"); cls = "warn"; needOral = true; }
    if (!needOral) Store.addExam({ t: Date.now(), p1, p2, oral: null, total: written, pass: cls === "ok" });

    // Auswertung nach Modul
    const byMod = {};
    exam.parts.forEach((p) => p.items.forEach((it) => {
      const m = it.kind === "calc" ? 2 : modOf[it.q.lek];
      byMod[m] = byMod[m] || [0, 0]; byMod[m][0] += it.score(); byMod[m][1] += it.points;
    }));
    const modName = {}; window.KURS.module.forEach((m) => { modName[m.nr] = m.titel; });
    const v = $("resultView");
    v.hidden = false;
    v.replaceChildren(
      el("header", { class: "page-head" }, el("div", { class: "eyebrow" }, L("Ergebnis der Probeklausur", "Mock exam result")), el("h1", { class: "verdict " + (cls === "ok" ? "ok" : cls === "bad" ? "bad" : "") }, verdict)),
      el("div", { class: "result-hero" },
        el("div", { class: "meter" },
          el("div", { class: "meter-top" }, el("span", { class: "on" }, L("● Schriftlich", "● Written")), el("span", null, L("von 112,5", "of 112.5"))),
          el("div", null, el("div", { class: "meter-label" }, L("Punkte", "Points")), el("div", { class: "meter-main" }, fmtP(written), el("small", null, "P"))),
          el("div", { class: "meter-row" },
            el("div", { class: "meter-cell" }, el("b", null, fmtP(p1)), el("small", null, L("Teil 1 von 60", "Part 1 of 60"))),
            el("div", { class: "meter-cell" }, el("b", null, fmtP(p2)), el("small", null, L("Teil 2 von 52,5", "Part 2 of 52.5"))),
            el("div", { class: "meter-cell" }, el("b", null, Math.round(written / 1.5) + "%"), el("small", null, L("von 150 Punkten", "of 150 points"))))),
        el("div", { class: "stack" },
          el("p", null, explain(p1, p2, written, ok1, ok2)),
          el("div", { class: "sg-bars" }, Object.keys(byMod).sort().map((m) => {
            const [g, t] = byMod[m]; const pct = t ? g / t : 0;
            return el("div", { class: "sg-bar" }, el("span", null, `${L("Modul", "Module")} ${m} · ${modName[m] || ""}`), el("span", { class: "v" }, Math.round(pct * 100) + " %"),
              el("div", { class: "bar" + (pct >= 0.6 ? " ok" : "") }, el("i", { style: `width:${Math.round(pct * 100)}%` })));
          })),
          el("div", { class: "btns" },
            needOral ? el("button", { type: "button", class: "btn primary", onclick: startOral }, L("Mündliche Prüfung simulieren", "Simulate the oral exam")) : null,
            el("button", { type: "button", class: needOral ? "btn" : "btn primary", onclick: review }, L("Alle Lösungen ansehen", "Review all answers")),
            el("button", { type: "button", class: "btn ghost", onclick: () => location.reload() }, L("Neue Probeklausur", "New mock exam"))))),
      el("div", { id: "oralBox" }), el("div", { id: "reviewBox" }));
    window.scrollTo({ top: 0 });
  }
  function explain(p1, p2, w, ok1, ok2) {
    if (!ok1 || !ok2) return L(`Ein schriftlicher Teil hat weniger als 50 % (Teil 1: mindestens 30 Punkte, Teil 2: mindestens 26,25 Punkte). Dann ist die Prüfung nicht bestanden, auch ohne mündliche Prüfung. Schau dir die Module mit den schwächsten Werten an.`, `One written part is below 50 % (Part 1 needs at least 30 points, Part 2 at least 26.25). Then the exam is failed, with no oral exam. Look at the modules with the weakest scores.`);
    if (w >= PASS) return L(`Du hast schriftlich mindestens 90 Punkte. Damit hättest du ohne mündliche Prüfung bestanden.`, `You have at least 90 written points. You would have passed without an oral exam.`);
    return L(`Beide Teile haben mindestens 50 %, aber zusammen fehlen dir ${fmtP(PASS - w)} Punkte bis 90. In der echten Prüfung müsstest du jetzt in die mündliche Prüfung. Dort gibt es bis zu 37,5 Punkte.`, `Both parts are at least 50 %, but you are ${fmtP(PASS - w)} points short of 90. In the real exam you would now take the oral exam (up to 37.5 points). It is held in German.`);
  }

  /* ---------- Mündliche Prüfung (Simulation) ---------- */
  function startOral() {
    const used = new Set(exam.parts.flatMap((p) => p.items.filter((it) => it.q).map((it) => it.q.id)));
    const qs = shuffle(FR.filter((q) => q.typ === "offen" && !used.has(q.id))).slice(0, 5);
    const pts = PO / Math.max(qs.length, 1);
    const box = $("oralBox");
    const info = el("div", { class: "score" });
    const states = qs.map((q, i) => Quiz.render(q, { mode: "exam", number: i + 1, points: pts, onSelfRated: paint }));
    box.replaceChildren(el("section", { class: "stack" },
      el("h2", null, L("Mündliche Prüfung (Simulation)", "Oral exam (simulation)")),
      el("p", { class: "muted" }, L("Stell dir vor, ein Prüfer fragt dich. Antworte laut oder schreib Stichpunkte. Dann klick auf „Selbst bewerten“.", "Imagine an examiner asks you. Answer out loud (ideally in German) or write bullet points. Then click “Rate yourself”.")),
      el("div", { class: "quiz" }, states.map((s) => s.el)), info));
    function paint() {
      const done = states.filter((s) => s.selfPoints != null);
      info.textContent = L(`${done.length} von ${states.length} bewertet`, `${done.length} of ${states.length} rated`);
      if (done.length === states.length) {
        const oral = states.reduce((a, s) => a + (s.score || 0) * pts, 0);
        const total = exam.p1 + exam.p2 + oral;
        const pass = total >= PASS;
        Store.addExam({ t: Date.now(), p1: exam.p1, p2: exam.p2, oral, total, pass });
        info.replaceWith(el("div", { class: "fb " + (pass ? "ok" : "no") }, el("div", { class: "fb-t" }, pass ? L("Bestanden", "Passed") : L("Nicht bestanden", "Failed")),
          el("span", null, L(`Mündlich ${fmtP(oral)} von 37,5 Punkten. Gesamt ${fmtP(total)} von 150 Punkten (${Math.round(total / 1.5)} %). Nötig sind 90.`, `Oral ${fmtP(oral)} of 37.5 points. Total ${fmtP(total)} of 150 points (${Math.round(total / 1.5)} %). 90 are needed.`))));
      }
    }
    paint();
    box.scrollIntoView({ behavior: "smooth" });
  }

  function review() {
    const box = $("reviewBox");
    const parts = exam.parts.map((p) => el("section", { class: "stack" }, el("h2", null, p.title),
      el("div", { class: "quiz" }, p.items.map((it) => { it.reveal(); return it.el; }))));
    box.replaceChildren(el("div", { class: "stack-lg" }, ...parts));
    box.scrollIntoView({ behavior: "smooth" });
  }
})();
