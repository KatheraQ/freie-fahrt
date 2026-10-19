/* Kursübersicht: Module als Linie mit Haltestellen, Fortschritt, Weiterlernen */
(function () {
  "use strict";
  const { el, Store, allLessons, L } = window.FK;
  const K = window.KURS, s = Store.get();
  const all = allLessons();
  const qBy = {};
  (window.FRAGEN || []).forEach((q) => { qBy[q.lek] = (qBy[q.lek] || 0) + 1; });
  const wrap = document.getElementById("modules");
  let next = null;
  K.module.forEach((m) => {
    const done = m.lektionen.filter((l) => (s.lessons[l.slug] || {}).done).length;
    const mins = m.lektionen.reduce((a, l) => a + l.min, 0);
    const sec = el("section", { class: "module", id: "modul-" + m.nr, "aria-labelledby": "mh-" + m.nr });
    sec.append(el("div", { class: "module-head" },
      el("span", { class: "module-nr" }, String(m.nr)),
      el("div", null, el("h2", { id: "mh-" + m.nr }, m.titel), el("p", null, m.kurz)),
      el("div", { class: "module-prog" }, done + "/" + m.lektionen.length, el("br"), L("ca. ", "approx. ") + Math.round(mins / 6) / 10 + " h")));
    const ol = el("ol", { class: "stops" });
    m.lektionen.forEach((l) => {
      const st = s.lessons[l.slug] || {};
      if (!st.done && !next && l.ready) next = l;
      const cls = "stop" + (st.done ? " done" : "") + (s.last === l.slug ? " current" : "");
      ol.append(el("li", { class: cls },
        el("a", { href: l.url },
          el("span", { class: "rail" }, el("span", { class: "dot" })),
          el("span", { class: "stop-t" }, el("span", null, el("span", { class: "stop-nr" }, l.nr), l.titel),
            el("small", null, L("Prüfungsgebiet ", "Exam area ") + l.sg + (qBy[l.slug] ? " · " + qBy[l.slug] + L(" Fragen", " questions") : ""))),
          el("span", { class: "stop-meta" }, st.done ? el("span", { class: "pill ok" }, L("Erledigt", "Done")) : l.min + L(" Min.", " min")))));
    });
    sec.append(ol);
    wrap.append(sec);
  });
  const doneN = all.filter((l) => (s.lessons[l.slug] || {}).done).length;
  document.getElementById("mPct").firstChild.nodeValue = Math.round(doneN / all.length * 100);
  document.getElementById("mDone").textContent = doneN;
  const qs = Object.values(s.q);
  document.getElementById("mQ").textContent = qs.length;
  if (qs.length) document.getElementById("mAcc").textContent = Math.round(qs.reduce((a, x) => a + (x.last || 0), 0) / qs.length * 100) + "%";
  const last = s.last && all.find((l) => l.slug === s.last);
  const target = last && !(s.lessons[last.slug] || {}).done ? last : next;
  const b = document.getElementById("resumeBtn");
  if (target) {
    document.getElementById("resumeT").textContent = (last ? L("Weiter mit Lektion ", "Continue with lesson ") : L("Starte mit Lektion ", "Start with lesson ")) + target.nr;
    document.getElementById("resumeS").textContent = target.titel;
    b.href = target.url; b.textContent = last ? L("Weiterlernen", "Continue") : L("Los geht's", "Let's go");
  } else if (doneN === all.length) {
    document.getElementById("resumeT").textContent = L("Alle Lektionen erledigt", "All lessons done");
    document.getElementById("resumeS").textContent = L("Jetzt unter Prüfungsbedingungen üben.", "Now practise under exam conditions.");
    b.href = "probeklausur.html"; b.textContent = L("Zur Probeklausur", "Go to the mock exam");
  }
  if (last) document.getElementById("mLast").textContent = L("Zuletzt ", "Last ") + last.nr;
})();
