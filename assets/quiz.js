/* Fragen-Motor: single, multi, tf (richtig/falsch), zahl, offen, zuordnung.
   Modus "practice": sofort Rückmeldung.  Modus "exam": erst sammeln, später reveal().
   Auf der englischen Seite kann jede Frage zusätzlich im deutschen Original angezeigt werden. */
(function () {
  "use strict";
  const { el, Num, Store, shuffle, L } = window.FK;
  const TYPE_LABEL = {
    single: L("Eine Antwort", "One answer"), multi: L("Mehrere Antworten", "Several answers"),
    tf: L("Richtig oder falsch", "True or false"), zahl: L("Rechnen", "Calculation"),
    offen: L("Offene Frage", "Open question"), zuordnung: L("Zuordnen", "Matching")
  };
  const LETTERS = "ABCDEFGH";
  const byId = {};
  let renderCount = 0;
  (window.FRAGEN || []).forEach((q) => { byId[q.id] = q; });
  const lessonUrl = {};
  window.FK.allLessons().forEach((l) => { lessonUrl[l.slug] = l; });
  const pts = (x) => Num.fmt(x, x % 1 ? 1 : 0) + L(" P.", " pts");

  function feedback(kind, title, q, extra) {
    const fb = el("div", { class: "fb " + kind, role: "status" }, el("div", { class: "fb-t" }, title));
    if (extra) fb.append(extra);
    if (q.erklaerung) fb.append(el("div", { html: q.erklaerung }));
    if (q.loesung) fb.append(el("div", { class: "sol" }, q.loesung));
    if (q.quelle) fb.append(el("span", { class: "src" }, q.quelle));
    return fb;
  }

  /* Deutsches Original (nur auf der englischen Seite) */
  function germanOriginal(q) {
    const d = q.de;
    if (!d) return null;
    const box = el("div", { class: "q-de", lang: "de", hidden: true });
    box.append(el("div", { class: "q-de-h" }, "Deutsches Original (so steht es in der Prüfung)"), el("div", { class: "q-text", html: d.frage }));
    if (d.optionen) box.append(el("ul", null, d.optionen.map((o) => el("li", { html: o }))));
    if (d.paare) box.append(el("ul", null, d.paare.map((o) => el("li", { html: o }))), el("div", { class: "q-hint" }, (d.kategorien || []).join(" · ")));
    const btn = el("button", { type: "button", class: "linkbtn", "aria-expanded": "false" }, "🇩🇪 Show German original");
    btn.addEventListener("click", () => {
      box.hidden = !box.hidden;
      btn.setAttribute("aria-expanded", String(!box.hidden));
      btn.textContent = box.hidden ? "🇩🇪 Show German original" : "Hide German original";
    });
    return { btn, box };
  }

  function render(q, opts = {}) {
    const mode = opts.mode || "practice";
    const exam = mode === "exam";
    const uid = q.id + "-" + (++renderCount);
    const box = el("div", { class: "q", id: "q-" + uid, "data-qid": q.id });
    const state = { q, answered: false, score: null, value: null, revealed: false };
    const meta = el("div", { class: "q-meta" });
    if (opts.number) meta.append(el("span", { class: "pill" }, L("Frage ", "Question ") + opts.number));
    meta.append(el("span", null, TYPE_LABEL[q.typ] || ""));
    if (opts.showLesson && lessonUrl[q.lek]) meta.append(el("a", { href: lessonUrl[q.lek].url }, L("Lektion ", "Lesson ") + lessonUrl[q.lek].nr));
    if (opts.points != null) meta.append(el("span", { class: "pts" }, pts(opts.points)));
    box.append(meta, el("div", { class: "q-text", html: q.frage }));
    const orig = germanOriginal(q);
    if (orig) box.append(orig.btn, orig.box);
    if (q.hinweis) box.append(el("div", { class: "q-hint", html: q.hinweis }));
    const fbSlot = el("div");
    const actions = el("div", { class: "q-actions" });

    function done(score, value) {
      state.answered = true; state.score = score; state.value = value;
      if (!exam) { Store.answer(q.id, score); state.revealed = true; }
      opts.onAnswer && opts.onAnswer(state);
    }
    function setVerdict(score) {
      box.classList.remove("is-right", "is-wrong", "is-part");
      box.classList.add(score >= 1 ? "is-right" : score > 0 ? "is-part" : "is-wrong");
    }
    const verdictTitle = (s) => s >= 1 ? L("Richtig", "Correct") : s > 0 ? L("Teilweise richtig", "Partly correct") : L("Leider falsch", "Not correct");
    const verdictKind = (s) => s >= 1 ? "ok" : s > 0 ? "part" : "no";

    /* ----- single / multi ----- */
    if (q.typ === "single" || q.typ === "multi") {
      const multi = q.typ === "multi";
      const order = q.fest ? q.optionen.map((_, i) => i) : shuffle(q.optionen.map((_, i) => i));
      const right = multi ? q.richtig : [q.richtig];
      const list = el("div", { class: "opts", role: multi ? "group" : "radiogroup" });
      const btns = [];
      const chosen = new Set();
      order.forEach((oi, pos) => {
        const b = el("button", { type: "button", class: "opt" + (multi ? " multi" : ""), "aria-pressed": "false", "data-i": oi },
          el("span", { class: "key" }, LETTERS[pos]), el("span", { html: q.optionen[oi] }));
        b.addEventListener("click", () => {
          if (state.revealed) return;
          if (multi) { chosen.has(oi) ? chosen.delete(oi) : chosen.add(oi); b.setAttribute("aria-pressed", chosen.has(oi)); if (exam) commitMulti(); }
          else {
            chosen.clear(); chosen.add(oi);
            btns.forEach((x) => x.setAttribute("aria-pressed", x === b));
            if (exam) done(oi === q.richtig ? 1 : 0, oi); else reveal();
          }
        });
        btns.push(b); list.append(b);
      });
      box.append(list);
      if (multi) {
        box.append(el("div", { class: "q-hint" }, L("Wähle alle richtigen Antworten.", "Select all correct answers.")));
        if (!exam) { const c = el("button", { type: "button", class: "btn small primary" }, L("Antwort prüfen", "Check answer")); c.addEventListener("click", () => { if (chosen.size) reveal(); }); actions.append(c); }
      }
      function multiScore() {
        let good = 0, bad = 0;
        chosen.forEach((i) => right.includes(i) ? good++ : bad++);
        if (bad === 0 && good === right.length) return 1;
        return Math.max(0, (good - bad) / right.length) * 0.5;
      }
      function commitMulti() { if (chosen.size) done(multiScore(), [...chosen]); else { state.answered = false; state.score = null; opts.onAnswer && opts.onAnswer(state); } }
      function reveal() {
        if (!exam) done(multi ? multiScore() : (chosen.has(q.richtig) ? 1 : 0), multi ? [...chosen] : [...chosen][0]);
        state.revealed = true;
        btns.forEach((b) => {
          const i = +b.dataset.i; b.disabled = true;
          if (right.includes(i)) b.classList.add(chosen.has(i) ? "right" : "missed");
          else if (chosen.has(i)) b.classList.add("wrong");
        });
        actions.hidden = true;
        const s = state.score ?? 0;
        setVerdict(s);
        let extra = null;
        if (s < 1) extra = el("div", null, L("Richtig ist: ", "Correct: ") + right.map((i) => LETTERS[order.indexOf(i)]).join(", ") + (state.answered ? "" : L(" (nicht beantwortet)", " (not answered)")));
        fbSlot.replaceChildren(feedback(verdictKind(s), verdictTitle(s), q, extra));
      }
      state.reveal = reveal;
    }

    /* ----- richtig / falsch ----- */
    else if (q.typ === "tf") {
      const wrap = el("div", { class: "tf" });
      const mk = (val, label) => {
        const b = el("button", { type: "button", class: "opt", "aria-pressed": "false" }, label);
        b.addEventListener("click", () => {
          if (state.revealed) return;
          wrap.querySelectorAll(".opt").forEach((x) => x.setAttribute("aria-pressed", x === b));
          state.choice = val;
          if (exam) done(val === q.richtig ? 1 : 0, val); else reveal();
        });
        b.dataset.v = val; return b;
      };
      wrap.append(mk(true, L("Richtig", "True")), mk(false, L("Falsch", "False")));
      box.append(wrap);
      function reveal() {
        if (!exam) done(state.choice === q.richtig ? 1 : 0, state.choice);
        state.revealed = true;
        wrap.querySelectorAll(".opt").forEach((b) => {
          b.disabled = true; const v = b.dataset.v === "true";
          if (v === q.richtig) b.classList.add(state.choice === v ? "right" : "missed");
          else if (state.choice === v) b.classList.add("wrong");
        });
        const s = state.score ?? 0; setVerdict(s);
        const wrongMsg = q.richtig ? L("Leider falsch. Die Aussage ist richtig.", "Not correct. The statement is true.") : L("Leider falsch. Die Aussage ist falsch.", "Not correct. The statement is false.");
        fbSlot.replaceChildren(feedback(verdictKind(s), s ? L("Richtig", "Correct") : wrongMsg, q));
      }
      state.reveal = reveal;
    }

    /* ----- Zahl ----- */
    else if (q.typ === "zahl") {
      const id = "in-" + uid;
      const input = el("input", { id, inputmode: "decimal", autocomplete: "off", placeholder: "0,00", "aria-label": L("Deine Antwort", "Your answer") });
      const row = el("div", { class: "num-row" }, el("div", { class: "inp" }, input, q.einheit ? el("span", null, q.einheit) : null));
      const tol = q.tol != null ? q.tol : (Math.abs(q.richtig) >= 1000 ? 1 : Math.abs(q.richtig) >= 10 ? 0.05 : 0.01);
      const check = () => { const v = Num.parse(input.value); return isNaN(v) ? null : (Math.abs(v - q.richtig) <= tol + 1e-9 ? 1 : 0); };
      if (!exam) {
        const b = el("button", { type: "button", class: "btn small primary" }, L("Prüfen", "Check"));
        b.addEventListener("click", () => { if (input.value.trim()) reveal(); else input.focus(); });
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); b.click(); } });
        row.append(b);
      } else {
        input.addEventListener("input", () => { const s = check(); if (s == null) { state.answered = false; state.score = null; opts.onAnswer && opts.onAnswer(state); } else done(s, input.value); });
      }
      box.append(row);
      if (window.FK.LANG === "en") box.append(el("div", { class: "q-hint" }, "German number format: 1.234,56 (comma for decimals). A point also works: 1234.56"));
      function reveal() {
        const s = check() ?? 0;
        if (!exam) done(s, input.value);
        state.revealed = true; input.disabled = true; setVerdict(s);
        const dec = Math.abs(q.richtig) >= 1000 ? 2 : (q.dez != null ? q.dez : 2);
        fbSlot.replaceChildren(feedback(verdictKind(s), s ? L("Richtig", "Correct") : L("Leider falsch", "Not correct"), q,
          el("div", null, L("Ergebnis: ", "Result: "), el("b", { class: "mono" }, Num.fmt(q.richtig, dec) + (q.einheit ? " " + q.einheit : "")))));
        row.querySelector("button") && row.querySelector("button").remove();
      }
      state.reveal = reveal;
    }

    /* ----- offene Frage: selbst bewerten ----- */
    else if (q.typ === "offen") {
      const ta = el("textarea", { class: "ta", placeholder: L("Schreibe deine Antwort in Stichpunkten. Das hilft beim Merken, auch wenn du dich danach selbst bewertest.", "Write your answer in bullet points. In the real exam you answer in German, so try using the German terms."), "aria-label": L("Deine Antwort", "Your answer") });
      box.append(ta);
      const total = q.punkte_liste.reduce((a, p) => a + (p.p || 1), 0);
      if (exam) ta.addEventListener("input", () => { state.text = ta.value; state.answered = ta.value.trim().length > 0; opts.onAnswer && opts.onAnswer(state); });
      const showBtn = el("button", { type: "button", class: "btn small primary" }, exam ? L("Selbst bewerten", "Rate yourself") : L("Musterlösung zeigen", "Show model answer"));
      if (!opts.hideSelfRate) actions.append(showBtn);
      function reveal() {
        state.revealed = true; ta.readOnly = true; actions.hidden = true;
        const checks = q.punkte_liste.map((p, i) => {
          const cb = el("input", { type: "checkbox", id: `sc-${uid}-${i}` });
          return { cb, p: p.p || 1, label: el("label", { for: `sc-${uid}-${i}` }, cb, el("span", { html: p.t }), el("span", { class: "p" }, pts(p.p || 1))) };
        });
        const ml = el("div", { class: "musterl" },
          el("div", { class: "ml-h" }, L("Musterlösung", "Model answer")),
          q.muster ? el("div", { html: q.muster }) : null,
          el("div", { class: "ml-h" }, L("Bewertung: Was davon steht in deiner Antwort?", "Marking: which of these points are in your answer?")),
          el("div", { class: "selfcheck" }, checks.map((c) => c.label)));
        const rate = el("button", { type: "button", class: "btn small primary" }, L("Bewertung speichern", "Save rating"));
        const out = el("div");
        rate.addEventListener("click", () => {
          const got = checks.reduce((a, c) => a + (c.cb.checked ? c.p : 0), 0);
          const s = total ? got / total : 0;
          state.selfPoints = got; state.selfTotal = total;
          done(s, ta.value);
          if (exam) Store.answer(q.id, s);
          setVerdict(s);
          checks.forEach((c) => { c.cb.disabled = true; });
          rate.remove();
          out.replaceChildren(el("div", { class: "fb " + verdictKind(s) }, el("div", { class: "fb-t" }, L(`${Num.fmt(got, got % 1 ? 1 : 0)} von ${total} Punkten`, `${Num.fmt(got, got % 1 ? 1 : 0)} of ${total} points`)),
            q.quelle ? el("span", { class: "src" }, q.quelle) : null));
          opts.onSelfRated && opts.onSelfRated(state);
        });
        fbSlot.replaceChildren(ml, el("div", { class: "q-actions" }, rate), out);
      }
      showBtn.addEventListener("click", reveal);
      state.reveal = reveal;
      state.needsSelfRating = true;
    }

    /* ----- Zuordnung ----- */
    else if (q.typ === "zuordnung") {
      const rows = (q.fest ? q.paare : shuffle(q.paare)).map((p) => ({ p, pick: null }));
      const wrap = el("div", { class: "zo" });
      rows.forEach((r) => {
        const why = el("div", { class: "zo-why", hidden: true });
        const btns = el("div", { class: "zo-btns" });
        r.row = el("div", { class: "zo-row" }, el("span", { html: r.p.t }), btns, why);
        r.why = why;
        q.kategorien.forEach((k, ki) => {
          const b = el("button", { type: "button", "aria-pressed": "false" }, k);
          b.addEventListener("click", () => {
            if (r.locked) return;
            r.pick = ki;
            btns.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
            if (!exam) { revealRow(r); maybeDone(); } else maybeDone();
          });
          btns.append(b);
        });
        wrap.append(r.row);
      });
      box.append(wrap);
      function revealRow(r) {
        r.locked = true;
        r.row.querySelectorAll("button").forEach((b) => { b.disabled = true; });
        const ok = r.pick === r.p.k;
        r.row.classList.add(ok ? "right" : "wrong");
        r.why.hidden = false;
        r.why.textContent = (ok ? L("Richtig. ", "Correct. ") : L(`Richtig wäre „${q.kategorien[r.p.k]}“. `, `Correct would be “${q.kategorien[r.p.k]}”. `)) + (r.p.w || "");
      }
      const scoreNow = () => rows.filter((r) => r.pick === r.p.k).length / rows.length;
      function maybeDone() {
        if (rows.every((r) => r.pick != null)) {
          if (exam) done(scoreNow(), rows.map((r) => r.pick));
          else { done(scoreNow(), null); revealAll(); }
        }
      }
      function revealAll() {
        state.revealed = true;
        rows.forEach((r) => { if (!r.locked) revealRow(r); });
        const s = scoreNow(); setVerdict(s);
        const n = rows.filter((r) => r.pick === r.p.k).length;
        fbSlot.replaceChildren(feedback(verdictKind(s), L(`${n} von ${rows.length} richtig zugeordnet`, `${n} of ${rows.length} matched correctly`), q));
      }
      state.reveal = revealAll;
    }

    box.append(actions, fbSlot);
    state.el = box;
    return state;
  }

  /* Fragenblöcke in Lektionen automatisch aufbauen */
  function mountBlocks() {
    document.querySelectorAll(".quiz[data-ids]").forEach((wrap) => {
      const ids = wrap.dataset.ids.split(/\s+/).filter(Boolean);
      const qs = ids.map((i) => byId[i]).filter(Boolean);
      const score = el("div", { class: "score", "aria-live": "polite" });
      const states = [];
      const update = () => {
        const answered = states.filter((s) => s.answered && s.score != null);
        const p = answered.reduce((a, s) => a + s.score, 0);
        const open = qs.length - answered.length;
        score.textContent = L(`${Num.fmt(p, p % 1 ? 1 : 0)} von ${qs.length} richtig`, `${Num.fmt(p, p % 1 ? 1 : 0)} of ${qs.length} correct`) + (open ? L(` · ${open} offen`, ` · ${open} open`) : "");
      };
      qs.forEach((q, i) => { const st = render(q, { mode: "practice", number: qs.length > 1 ? i + 1 : null, onAnswer: update }); states.push(st); wrap.append(st.el); });
      if (qs.length > 1) { wrap.append(score); update(); }
    });
  }

  window.FK.Quiz = { render, byId, mountBlocks, TYPE_LABEL };
  mountBlocks();
})();
