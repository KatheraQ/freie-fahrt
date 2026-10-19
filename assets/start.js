/* Startseite: Lehrplan-Karten und „Weiterlernen“ */
(function () {
  "use strict";
  const { el, Store, allLessons, L } = window.FK;
  const list = document.getElementById("planList");
  if (list && window.KURS) {
    window.KURS.module.forEach((m) => {
      const mins = m.lektionen.reduce((a, l) => a + l.min, 0);
      list.append(el("div", null,
        el("span", { class: "eyebrow" }, L("Modul ", "Module ") + m.nr),
        el("b", null, m.titel), el("span", { class: "muted" }, m.kurz),
        el("span", { class: "src" }, m.lektionen.length + L(" Lektionen · ca. ", " lessons · approx. ") + Math.round(mins / 60 * 10) / 10 + " h")));
    });
  }
  const s = Store.get();
  if (s.last) {
    const l = allLessons().find((x) => x.slug === s.last);
    const b = document.getElementById("heroStart");
    if (l && b) { b.textContent = L("Weiterlernen: Lektion ", "Continue: lesson ") + l.nr; b.href = l.url; }
  }
})();
