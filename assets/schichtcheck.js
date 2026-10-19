/* Schicht-Checker in Lektion 1.7: prüft Arbeitszeit, Pausen, Ruhezeit nach ArbZG */
(function () {
  "use strict";
  const box = document.getElementById("shiftChecker");
  if (!box) return;
  const $ = (id) => document.getElementById(id);
  const { L } = window.FK;
  const toMin = (v) => { const [h, m] = (v || "0:0").split(":").map(Number); return h * 60 + m; };
  const fmt = (min) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")} min`;
  function run() {
    const s = toMin($("scStart").value), e0 = toMin($("scEnd").value), nx = toMin($("scNext").value);
    const e = e0 <= s ? e0 + 1440 : e0;
    const pause = Math.max(0, parseInt($("scPause").value, 10) || 0);
    const span = e - s, work = span - pause;
    let next = nx + 1440; while (next - e < 0) next += 1440; while (next - e >= 1440) next -= 1440;
    const rest = next - e;
    const needPause = work > 540 ? 45 : work > 360 ? 30 : 0;
    const night = (() => { let n = 0; for (let t = s; t < e; t++) { const m = t % 1440; if (m >= 1380 || m < 360) n++; } return n; })();
    const out = [];
    out.push(["ok", "i", L(`Anwesenheit ${fmt(span)}, davon Pausen ${pause} min → Arbeitszeit ${fmt(work)}.`, `Time on duty ${fmt(span)}, breaks ${pause} min → working time ${fmt(work)}.`)]);
    if (work > 600) out.push(["warn", "!", L("Mehr als 10 Stunden Arbeitszeit. Das ist nach § 3 ArbZG nicht erlaubt.", "More than 10 hours of work. Not allowed under § 3 ArbZG.")]);
    else if (work > 480) out.push(["warn", "!", L("Mehr als 8 Stunden: erlaubt nur, wenn im Durchschnitt (6 Monate / 24 Wochen) 8 Stunden pro Werktag eingehalten werden. Aufzeichnen!", "More than 8 hours: only allowed if the average over 6 months / 24 weeks stays at 8 hours per working day. Record it!")]);
    else out.push(["ok", "✓", L("Höchstarbeitszeit eingehalten.", "Maximum working time respected.")]);
    if (pause < needPause) out.push(["warn", "!", L(`Zu wenig Pause: nötig sind mindestens ${needPause} Minuten (§ 4 ArbZG).`, `Break too short: at least ${needPause} minutes are required (§ 4 ArbZG).`)]);
    else out.push(["ok", "✓", needPause ? L(`Pause ausreichend (mindestens ${needPause} min nötig).`, `Break is enough (at least ${needPause} min required).`) : L("Bis 6 Stunden ist keine Pause vorgeschrieben.", "Up to 6 hours no break is required.")]);
    if (rest < 600) out.push(["warn", "!", L(`Ruhezeit bis zur nächsten Schicht nur ${fmt(rest)}. Mindestens 11 Stunden, im Verkehrsbetrieb 10 Stunden mit Ausgleich (§ 5 ArbZG).`, `Rest before the next shift is only ${fmt(rest)}. At least 11 hours; in transport companies 10 hours with compensation (§ 5 ArbZG).`)]);
    else if (rest < 660) out.push(["warn", "!", L(`Ruhezeit ${fmt(rest)}: nur im Verkehrsbetrieb erlaubt, und nur mit Ausgleich durch eine Ruhezeit von mindestens 12 Stunden innerhalb eines Monats oder 4 Wochen.`, `Rest ${fmt(rest)}: only allowed in transport companies, and only if another rest period of at least 12 hours follows within one month or 4 weeks.`)]);
    else out.push(["ok", "✓", L(`Ruhezeit ${fmt(rest)}: in Ordnung.`, `Rest ${fmt(rest)}: OK.`)]);
    if (night > 120) out.push(["ok", "i", L(`${fmt(night)} in der Nachtzeit (23–6 Uhr): Das ist Nachtarbeit. Zuschlag oder bezahlte freie Tage (§ 6 ArbZG).`, `${fmt(night)} during night time (11 pm–6 am): this is night work. Extra pay or paid days off (§ 6 ArbZG).`)]);
    $("scOut").innerHTML = out.map(([k, ic, t]) => `<div class="check ${k}"><span class="ic">${ic}</span><span>${t}</span></div>`).join("");
  }
  box.addEventListener("input", run);
  run();
})();
