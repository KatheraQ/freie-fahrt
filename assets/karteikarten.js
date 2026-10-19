/* Karteikarten mit Leitner-System (5 Fächer) */
(function () {
  "use strict";
  const { el, Store, shuffle, allLessons, L } = window.FK;
  const $ = (id) => document.getElementById(id);
  const DAY = 86400000, WAIT = [0, 0, 1, 3, 7, 14]; // Tage bis zur nächsten Abfrage je Fach
  const lessons = allLessons();
  const lessonBy = {}; lessons.forEach((l) => { lessonBy[l.slug] = l; });
  const KIND = { Wissen: L("Wissen", "Fact"), Begriff: L("Begriff", "Term") };

  const cards = [];
  (window.KARTEN || []).forEach((k) => cards.push({ id: "k:" + k.id, front: k.v, back: k.r, lek: k.lek, kind: "Wissen" }));
  (window.GLOSSAR || []).forEach((g) => cards.push({
    id: "g:" + g.id, front: (g.art ? g.art + " " : "") + g.de + (window.FK.LANG === "en" && g.en ? ` (${g.en})` : ""),
    back: g.erklaerung, lek: g.lek, kind: "Begriff"
  }));

  const decks = [["all", L("Alle Karten", "All cards")], ["Begriff", L("Nur Fachbegriffe", "Terms only")], ["Wissen", L("Nur Wissensfragen", "Facts only")]];
  window.KURS.module.forEach((m) => decks.push(["m" + m.nr, `${L("Modul", "Module")} ${m.nr} · ${m.titel}`]));
  decks.forEach(([v, t]) => $("deck").append(el("option", { value: v }, t)));
  $("deck").addEventListener("change", start);

  const inDeck = (c) => {
    const d = $("deck").value;
    if (d === "all") return true;
    if (d === "Begriff" || d === "Wissen") return c.kind === d;
    return lessonBy[c.lek] && "m" + lessonBy[c.lek].modul === d;
  };
  const stateOf = (c) => Store.card(c.id) || { box: 1, due: 0 };

  function paintBoxes() {
    const n = [0, 0, 0, 0, 0, 0];
    cards.filter(inDeck).forEach((c) => { n[stateOf(c).box]++; });
    $("boxes").replaceChildren(...[1, 2, 3, 4, 5].map((b) => el("div", null, el("b", null, String(n[b])), el("small", null, L("Fach ", "Box ") + b))));
  }

  let queue = [], doneCount = 0;
  function start() {
    const now = Date.now();
    const due = cards.filter(inDeck).filter((c) => stateOf(c).due <= now);
    queue = shuffle(due).slice(0, 25);
    doneCount = 0;
    paintBoxes();
    $("dueInfo").textContent = L(`${due.length} Karten fällig · ${cards.filter(inDeck).length} im Stapel`, `${due.length} cards due · ${cards.filter(inDeck).length} in this deck`);
    next();
  }
  function next() {
    const area = $("cardArea");
    if (!queue.length) {
      area.replaceChildren(el("div", { class: "panel stack" }, el("h2", null, doneCount ? L("Runde geschafft", "Round complete") : L("Gerade nichts fällig", "Nothing due right now")),
        el("p", { class: "muted" }, doneCount ? L(`Du hast ${doneCount} Karten wiederholt. Neue Karten werden fällig, sobald ihre Wartezeit vorbei ist.`, `You reviewed ${doneCount} cards. Cards come back when their waiting time is over.`)
          : L("Alle Karten in diesem Stapel sind gelernt und warten auf die nächste Wiederholung. Wähle einen anderen Stapel oder komm morgen wieder.", "All cards in this deck are learned and waiting for their next review. Choose another deck or come back tomorrow.")),
        el("div", { class: "btns" }, el("button", { type: "button", class: "btn", onclick: () => { cards.filter(inDeck).forEach((c) => { const s = stateOf(c); Store.setCard(c.id, { box: s.box, due: 0 }); }); start(); } }, L("Alle sofort wiederholen", "Review all now")))));
      return;
    }
    const c = queue[0];
    const st = stateOf(c);
    const card = el("button", { type: "button", class: "flash-card", "aria-label": L("Karte umdrehen", "Flip card") },
      el("div", { class: "flash-face" }, el("span", { class: "eyebrow" }, KIND[c.kind] + L(" · Fach ", " · Box ") + st.box), el("div", { class: "ft" }, c.front), el("span", { class: "hint" }, L("Antippen zum Umdrehen", "Tap to flip"))),
      el("div", { class: "flash-face back" }, el("span", { class: "eyebrow" }, L("Antwort", "Answer")), el("div", { class: "fx", html: c.back }),
        lessonBy[c.lek] ? el("span", { class: "hint" }, L("Lektion ", "Lesson ") + lessonBy[c.lek].nr) : null));
    const rate = el("div", { class: "btns", hidden: true },
      el("button", { type: "button", class: "btn", onclick: () => answer(false) }, L("Wusste ich nicht", "Didn't know")),
      el("button", { type: "button", class: "btn primary", onclick: () => answer(true) }, L("Wusste ich", "Knew it")));
    card.addEventListener("click", () => { card.classList.toggle("flipped"); rate.hidden = false; });
    area.replaceChildren(el("div", { class: "flash" }, card), rate, el("p", { class: "muted mono" }, L(`Noch ${queue.length} in dieser Runde`, `${queue.length} left in this round`)));
    card.focus({ preventScroll: true });
    function answer(knew) {
      const box = knew ? Math.min(5, st.box + 1) : 1;
      Store.setCard(c.id, { box, due: knew ? Date.now() + WAIT[box] * DAY : 0 });
      queue.shift();
      if (!knew) queue.splice(Math.min(queue.length, 3), 0, c);
      else doneCount++;
      paintBoxes();
      next();
    }
  }
  document.addEventListener("keydown", (e) => {
    if (/input|textarea|select/i.test(document.activeElement.tagName)) return;
    const card = document.querySelector(".flash-card");
    if (!card) return;
    if (e.key === " ") { e.preventDefault(); card.click(); }
  });
  start();
})();
