/* Rechentrainer: Aufgaben erzeugen, Schritte prüfen, Statistik speichern. */
(function () {
  "use strict";
  const { el, Num, Store, Rechen, L } = window.FK;
  const typesEl = document.getElementById("types"), taskEl = document.getElementById("task");
  const DESC = {
    "kosten-taxi": L("Die große Prüfungsaufgabe: von der Abschreibung bis zu den Kosten je Besetzt-km.", "The big exam task: from depreciation to the cost per occupied km."),
    "kosten-miet": L("Wie oben, plus nötiger Umsatz bei App-Provision.", "As above, plus the revenue needed with app commission."),
    "afa-zins": L("Kurz und schnell: die zwei Formeln, die immer vorkommen.", "Short and quick: the two formulas that always come up."),
    "db": L("Deckungsbeitrag, Gewinnschwelle und Gewinn.", "Contribution margin, break-even and profit."),
    "tarif": L("Fahrpreis aus Grundpreis, km-Preis und Wartezeit, mit USt.", "Fare from base fare, km price and waiting time, with VAT."),
    "ust": L("7 % oder 19 %? Und wie viel Steuer steckt im Preis?", "7 % or 19 %? And how much tax is in the price?"),
    "angebot": L("Preis für eine Mietwagen-Fernfahrt mit Gewinnzuschlag.", "Price for a long private hire trip with profit mark-up.")
  };
  const order = ["kosten-taxi", "kosten-miet", "afa-zins", "db", "tarif", "ust", "angebot"];
  let current = order[0];
  try { const h = location.hash.slice(1); if (order.includes(h)) current = h; } catch (e) { }

  function stats() { const s = Store.get(); s.rechen = s.rechen || {}; return s.rechen; }
  const statText = (st) => st ? L(`${st.ok} von ${st.n} gelöst`, `${st.ok} of ${st.n} solved`) : L("noch nicht geübt", "not practised yet");

  order.forEach((t) => {
    const input = el("input", { type: "radio", name: "rtyp", value: t, checked: t === current });
    input.addEventListener("change", () => { current = t; newTask(); });
    typesEl.append(el("label", null, input, el("b", null, Rechen.LABELS[t]), el("small", null, DESC[t]),
      el("small", { class: "mono", id: "st-" + t }, statText(stats()[t]))));
  });

  function newTask() {
    const t = Rechen.generate(current);
    const steps = [];
    const head = el("div", { class: "stack" },
      el("div", { class: "eyebrow" }, Rechen.LABELS[current]),
      el("h2", null, t.titel), el("p", null, t.text));
    const given = el("div", { class: "task-given" }, el("b", null, L("Gegeben (Beispielwerte)", "Given (sample values)")),
      el("dl", { class: "kv" }, t.gegeben.flatMap(([k, v]) => [el("dt", null, k), el("dd", null, v)])));
    const list = el("div");
    t.schritte.forEach((s, i) => {
      const id = `rt-${t.seed}-${i}`;
      const input = el("input", { id, inputmode: "decimal", autocomplete: "off", placeholder: "0,00" });
      const fb = el("div", { class: "fb", hidden: true });
      const btn = el("button", { type: "button", class: "btn small" }, L("Prüfen", "Check"));
      const st = { s, input, fb, ok: false };
      const check = () => {
        const v = Num.parse(input.value);
        if (isNaN(v)) { input.focus(); return; }
        st.ok = Math.abs(v - s.richtig) <= s.tol + 1e-9;
        fb.hidden = false;
        fb.className = "fb " + (st.ok ? "ok" : "no");
        fb.replaceChildren(el("div", { class: "fb-t" }, st.ok ? L("Richtig", "Correct") : L("Noch nicht richtig", "Not right yet")),
          st.ok ? el("div", { class: "sol" }, s.loesung) : el("div", null, L("Tipp: ", "Hint: ") + s.hint + L(". Versuch es noch einmal oder zeig die Lösung.", ". Try again or show the solution.")));
        if (st.ok) { input.disabled = true; btn.remove(); }
        maybeFinish();
      };
      btn.addEventListener("click", check);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); check(); } });
      list.append(el("div", { class: "tstep" },
        el("label", { for: id }, el("b", null, `${i + 1}. ${s.label}`), el("small", null, s.hint)),
        el("div", { class: "inp" }, input, el("span", null, s.einheit)), btn, fb));
      steps.push(st);
    });
    const showAll = el("button", { type: "button", class: "btn ghost" }, L("Komplette Lösung zeigen", "Show full solution"));
    const next = el("button", { type: "button", class: "btn primary" }, L("Neue Aufgabe", "New task"));
    const result = el("div", { "aria-live": "polite" });
    let recorded = false;
    function record(solved) {
      if (recorded) return; recorded = true;
      const s = stats(); const r = s[current] || { n: 0, ok: 0 };
      r.n++; if (solved) r.ok++; s[current] = r; Store.save();
      const lab = document.getElementById("st-" + current); if (lab) lab.textContent = statText(r);
    }
    function maybeFinish() {
      if (steps.every((x) => x.ok)) {
        record(true);
        result.replaceChildren(el("div", { class: "fb ok" }, el("div", { class: "fb-t" }, L("Alle Schritte richtig. Stark!", "All steps correct. Great!")),
          el("span", null, L("Mach gleich noch eine Aufgabe, bis der Ablauf sitzt.", "Do another one right away until the steps are automatic."))));
      }
    }
    showAll.addEventListener("click", () => {
      record(false);
      steps.forEach((st) => {
        if (st.ok) return;
        st.fb.hidden = false; st.fb.className = "fb part";
        const dec = st.s.dez != null ? st.s.dez : 2;
        st.fb.replaceChildren(el("div", { class: "fb-t" }, L("Lösung: ", "Solution: ") + Num.fmt(st.s.richtig, dec) + " " + st.s.einheit), el("div", { class: "sol" }, st.s.loesung));
      });
      showAll.disabled = true;
    });
    next.addEventListener("click", () => { newTask(); taskEl.scrollIntoView({ behavior: "smooth", block: "start" }); });
    taskEl.replaceChildren(head, given, list, el("div", { class: "btns" }, next, showAll), result);
  }
  newTask();
})();
