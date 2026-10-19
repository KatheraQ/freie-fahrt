/* Fortschritt: Auswertung, Sicherung, Zurücksetzen */
(function () {
  "use strict";
  const { el, Store, Num, Rechen, allLessons, toast, L, LANG } = window.FK;
  const $ = (id) => document.getElementById(id);
  const s = Store.get();
  const FR = window.FRAGEN || [];
  const lessons = allLessons();
  const ready = lessons.filter((l) => l.ready);
  const fmtP = (x) => Num.fmt(x, Math.abs(x % 1) > 0.001 ? 1 : 0);
  const date = (t) => new Date(t).toLocaleDateString(LANG === "en" ? "en-GB" : "de-DE");

  const doneL = lessons.filter((l) => (s.lessons[l.slug] || {}).done);
  const answered = FR.filter((q) => s.q[q.id]);
  const acc = (qs) => { const a = qs.filter((q) => s.q[q.id]); return a.length ? a.reduce((x, q) => x + (s.q[q.id].last || 0), 0) / a.length : null; };
  const best = s.exams.length ? Math.max(...s.exams.map((e) => e.total / (e.oral != null ? 150 : 112.5))) : null;

  const lessonPart = ready.length ? doneL.length / ready.length : 0;
  const qPart = FR.length ? (answered.length / FR.length) * (acc(FR) || 0) : 0;
  const readiness = Math.round((lessonPart * 0.25 + qPart * 0.5 + (best || 0) * 0.25) * 100);
  $("ready").firstChild.nodeValue = readiness;
  $("kLess").textContent = doneL.length + "/" + lessons.length;
  $("kQ").textContent = answered.length + "/" + FR.length;
  $("kEx").textContent = best != null ? Math.round(best * 100) + "%" : "–";

  // Empfehlungen
  const todo = [];
  const nextL = ready.find((l) => !(s.lessons[l.slug] || {}).done);
  if (nextL) todo.push([L("Nächste Lektion lesen", "Read the next lesson"), `${L("Lektion", "Lesson")} ${nextL.nr}: ${nextL.titel}`, nextL.url]);
  const wrongN = FR.filter((q) => s.q[q.id] && s.q[q.id].last < 1).length;
  if (wrongN) todo.push([L("Fehler wiederholen", "Repeat mistakes"), L(`${wrongN} Fragen hattest du zuletzt falsch.`, `You last got ${wrongN} questions wrong.`), "training.html"]);
  if (!(s.rechen && Object.values(s.rechen).some((r) => r.ok >= 5))) todo.push([L("Kostenrechnung üben", "Practise cost accounting"), L("Rechne mindestens 5 komplette Aufgaben fehlerfrei.", "Solve at least 5 complete tasks without mistakes."), "rechentrainer.html"]);
  if (doneL.length >= Math.min(10, ready.length) && !s.exams.length) todo.push([L("Erste Probeklausur schreiben", "Take your first mock exam"), L("So siehst du, wo du stehst.", "See where you stand."), "probeklausur.html"]);
  if (!todo.length) todo.push([L("Weiter so", "Keep going"), L("Schreib regelmäßig Probeklausuren, bis du sicher über 90 Punkte kommst.", "Take mock exams regularly until you reliably score over 90 points."), "probeklausur.html"]);
  $("todo").replaceChildren(...todo.map(([t, d, u]) => el("a", { class: "pg", href: u }, el("small", null, t), el("span", null, d))));

  // Module
  window.KURS.module.forEach((m) => {
    const slugs = m.lektionen.map((l) => l.slug);
    const qs = FR.filter((q) => slugs.includes(q.lek));
    const a = acc(qs);
    const dl = m.lektionen.filter((l) => (s.lessons[l.slug] || {}).done).length;
    $("modRows").append(el("tr", null,
      el("th", null, `${m.nr} · ${m.titel}`),
      el("td", { class: "num" }, `${dl}/${m.lektionen.length}`),
      el("td", { class: "num" }, `${qs.filter((q) => s.q[q.id]).length}/${qs.length}`),
      el("td", { class: "num" }, a == null ? "–" : Math.round(a * 100) + " %"),
      el("td", { style: "min-width:120px" }, el("div", { class: "bar" + (a != null && a >= 0.7 ? " ok" : "") }, el("i", { style: `width:${a == null ? 0 : Math.round(a * 100)}%` })))));
  });

  // Schwachstellen
  const weak = lessons.map((l) => { const qs = FR.filter((q) => q.lek === l.slug && s.q[q.id]); return { l, n: qs.length, a: acc(qs) }; })
    .filter((x) => x.n >= 3 && x.a < 0.7).sort((a, b) => a.a - b.a);
  if (weak.length) {
    $("weakBox").hidden = false;
    $("weak").replaceChildren(...weak.map((x) => el("div", { class: "history-row" }, el("a", { href: x.l.url }, `${L("Lektion", "Lesson")} ${x.l.nr}: ${x.l.titel}`),
      el("span", { class: "mono" }, Math.round(x.a * 100) + " %"), el("a", { class: "btn small", href: "training.html#" + x.l.slug }, L("Üben", "Practise")))));
  }

  // Probeklausuren
  $("exams").replaceChildren(...(s.exams.length ? s.exams.slice().reverse().map((x) => el("div", { class: "history-row" },
    el("span", null, date(x.t) + L(` · Teil 1: ${fmtP(x.p1)}/60 · Teil 2: ${fmtP(x.p2)}/52,5`, ` · Part 1: ${fmtP(x.p1)}/60 · Part 2: ${fmtP(x.p2)}/52.5`) + (x.oral != null ? L(` · mündlich ${fmtP(x.oral)}/37,5`, ` · oral ${fmtP(x.oral)}/37.5`) : "")),
    el("span", { class: "mono" }, fmtP(x.total)), el("span", { class: "pill " + (x.pass ? "ok" : "bad") }, x.pass ? L("bestanden", "passed") : L("nicht bestanden", "failed"))))
    : [el("p", { class: "muted" }, L("Noch keine Probeklausur. ", "No mock exam yet. "), el("a", { href: "probeklausur.html" }, L("Jetzt eine schreiben.", "Take one now.")))]));

  // Rechentrainer
  const r = s.rechen || {};
  const rows = Object.keys(r).map((k) => el("div", { class: "history-row" }, el("span", null, (Rechen && Rechen.LABELS[k]) || k),
    el("span", { class: "mono" }, L(`${r[k].ok} von ${r[k].n} gelöst`, `${r[k].ok} of ${r[k].n} solved`)), el("a", { class: "btn small", href: "rechentrainer.html#" + k }, L("Üben", "Practise"))));
  $("rechen").replaceChildren(...(rows.length ? rows : [el("p", { class: "muted" }, L("Noch keine Rechenaufgaben. ", "No calculation tasks yet. "), el("a", { href: "rechentrainer.html" }, L("Zum Rechentrainer.", "Go to the calculation trainer.")))]));

  // Sicherung
  $("exportTa").value = Store.exportText();
  $("copyBtn").addEventListener("click", () => {
    const ta = $("exportTa");
    const fallback = () => { ta.focus(); ta.select(); toast(L("Markiert. Jetzt mit Strg+C oder „Kopieren“ kopieren.", "Selected. Now copy with Ctrl+C or “Copy”.")); };
    try { navigator.clipboard.writeText(ta.value).then(() => toast(L("Code kopiert.", "Code copied.")), fallback); } catch (e) { fallback(); }
  });
  $("importBtn").addEventListener("click", () => {
    try { Store.importText($("importTa").value); $("importMsg").replaceChildren(el("div", { class: "fb ok" }, L("Fortschritt geladen. Die Seite wird neu geladen.", "Progress loaded. The page will reload."))); setTimeout(() => location.reload(), 900); }
    catch (e) { $("importMsg").replaceChildren(el("div", { class: "fb no" }, L("Der Code ist ungültig. Kopiere ihn bitte vollständig, ohne Leerzeichen am Anfang oder Ende.", "The code is invalid. Please copy all of it, without spaces at the start or end."))); }
  });
  $("resetBtn").addEventListener("click", () => { $("resetConfirm").hidden = false; });
  $("resetNo").addEventListener("click", () => { $("resetConfirm").hidden = true; });
  $("resetYes").addEventListener("click", () => { Store.reset(); location.reload(); });
})();
