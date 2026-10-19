/* Kostenrechner in Lektion 2.2 */
(function () {
  "use strict";
  const form = document.getElementById("calcForm");
  if (!form) return;
  const { Num, L } = window.FK;
  const eur = Num.eur, n0 = Num.f0, n2 = Num.f2, n4 = Num.f4;
  const $ = (id) => document.getElementById(id);
  const val = (id) => { const v = Num.parse($(id).value); return isNaN(v) ? 0 : v; };
  const ids = ["kauf", "rest", "jahre", "zins", "vers", "steuer", "funk", "sonst", "fahrer", "ulohn", "verbrauch", "preis", "reifen", "reifenkm", "wartung", "prov", "km", "besetzt", "fahrten", "erloes"];
  let mode = "taxi";

  function calc(v) {
    const afa = v.jahre > 0 ? (v.kauf - v.rest) / v.jahre : 0;
    const zinsen = (v.kauf + v.rest) / 2 * v.zins / 100;
    const funk = mode === "taxi" ? v.funk : 0;
    const fix = afa + zinsen + v.vers + v.steuer + funk + v.sonst + v.fahrer + v.ulohn;
    const kraft = v.verbrauch / 100 * v.preis;
    const reifen = v.reifenkm > 0 ? v.reifen / v.reifenkm : 0;
    const varKm = kraft + reifen + v.wartung;
    const ges = fix + varKm * v.km;
    const besetztKm = v.km * v.besetzt / 100;
    const prov = mode === "miet" ? v.prov / 100 : 0;
    const erloesKm = v.erloes * v.besetzt / 100 * (1 - prov);
    const dbKm = erloesKm - varKm;
    return {
      afa, zinsen, fix, kraft, reifen, varKm, ges, besetztKm, prov,
      proKm: v.km > 0 ? ges / v.km : 0,
      proBesetzt: besetztKm > 0 ? ges / besetztKm : 0,
      proFahrt: v.fahrten > 0 ? ges / v.fahrten : 0,
      umsatz: prov < 1 ? ges / (1 - prov) : Infinity,
      dbKm, be: dbKm > 0 ? fix / dbKm : Infinity
    };
  }
  const line = (l, v, total) => `<div class="line${total ? " total" : ""}"><span>${l}</span><span>${v}</span></div>`;

  function render() {
    const v = {}; ids.forEach((id) => { v[id] = val(id); });
    const r = calc(v);
    $("fAfa").textContent = `${L("Abschreibung", "Depreciation")} = (${n0.format(v.kauf)} − ${n0.format(v.rest)}) ÷ ${n0.format(v.jahre)} = ${eur.format(r.afa)}`;
    $("fZins").textContent = `${L("Zinsen", "Interest")} = (${n0.format(v.kauf)} + ${n0.format(v.rest)}) ÷ 2 × ${n2.format(v.zins)} % = ${eur.format(r.zinsen)}`;
    let fx = line(L("Abschreibung", "Depreciation"), eur.format(r.afa)) + line(L("Kalk. Zinsen", "Imputed interest"), eur.format(r.zinsen)) + line(L("Versicherungen", "Insurance"), eur.format(v.vers)) + line(L("Kfz-Steuer", "Vehicle tax"), eur.format(v.steuer));
    if (mode === "taxi") fx += line(L("Funk / Zentrale", "Radio / dispatch"), eur.format(v.funk));
    fx += line(L("Sonstiges", "Other"), eur.format(v.sonst));
    if (v.fahrer) fx += line(L("Fahrerlöhne", "Driver wages"), eur.format(v.fahrer));
    fx += line(L("Unternehmerlohn", "Owner's salary"), eur.format(v.ulohn)) + line(L("Fixkosten gesamt", "Total fixed costs"), eur.format(r.fix), true);
    $("fixList").innerHTML = fx;
    $("varList").innerHTML =
      line(`${L("Kraftstoff", "Fuel")} (${n2.format(v.verbrauch)} l ÷ 100 × ${n2.format(v.preis)} €)`, n4.format(r.kraft) + " €") +
      line(`${L("Reifen", "Tyres")} (${n0.format(v.reifen)} € ÷ ${n0.format(v.reifenkm)} km)`, n4.format(r.reifen) + " €") +
      line(L("Wartung", "Maintenance"), n4.format(v.wartung) + " €") +
      line(L("Variable Kosten pro km", "Variable costs per km"), n4.format(r.varKm) + " €", true);
    $("fGes").textContent = `${L("Gesamtkosten", "Total costs")} = ${n0.format(r.fix)} € + ${n4.format(r.varKm)} €/km × ${n0.format(v.km)} km = ${eur.format(r.ges)}`;
    let res = `<div class="res"><small>${L("Gesamtkosten pro Jahr", "Total costs per year")}</small><b>${eur.format(r.ges)}</b></div>
      <div class="res"><small>${L("Kosten je gefahrenem km", "Cost per km driven")}</small><b>${n2.format(r.proKm)} €</b></div>
      <div class="res key"><small>${L("Kosten je Besetzt-km", "Cost per occupied km")}</small><b>${n2.format(r.proBesetzt)} €</b></div>
      <div class="res"><small>${L("Kosten je Fahrt", "Cost per trip")}</small><b>${n2.format(r.proFahrt)} €</b></div>
      <div class="res"><small>${L("Deckungsbeitrag je km", "Contribution margin per km")}${mode === "miet" ? L(" (nach Provision)", " (after commission)") : ""}</small><b>${n2.format(r.dbKm)} €</b></div>
      <div class="res"><small>${L("Gewinnschwelle", "Break-even point")}</small><b>${isFinite(r.be) ? n0.format(r.be) + " km" : "–"}</b></div>`;
    if (mode === "miet") res += `<div class="res key"><small>${L("Nötiger Umsatz bei", "Revenue needed with")} ${n0.format(v.prov)} % ${L("Provision", "commission")}</small><b>${isFinite(r.umsatz) ? eur.format(r.umsatz) : "–"}</b></div>`;
    $("results").innerHTML = res;

    const warns = [];
    if (v.ulohn <= 0) warns.push(["warn", L("Kein Unternehmerlohn eingetragen. Dann arbeitest du rechnerisch umsonst. In der Prüfung ein typischer Punktverlust.", "No owner's salary entered. Then you work for free on paper. A typical way to lose points in the exam.")]);
    if (v.rest > v.kauf) warns.push(["warn", L("Der Restwert ist höher als der Kaufpreis. Bitte prüfen.", "The residual value is higher than the purchase price. Please check.")]);
    if (v.besetzt >= 100) warns.push(["warn", L("100 % Besetztanteil ist unrealistisch. Leerfahrten gibt es immer.", "100 % occupied is unrealistic. There are always empty trips.")]);
    if (v.besetzt <= 0) warns.push(["warn", L("Besetztanteil fehlt. Ohne ihn kannst du keinen Preis je Fahrgast-km berechnen.", "Occupied share is missing. Without it you cannot calculate a price per passenger km.")]);
    if (r.dbKm <= 0) warns.push(["warn", L("Der Deckungsbeitrag ist nicht positiv. Jeder km vergrößert den Verlust. Der Erlös deckt nicht einmal die variablen Kosten.", "The contribution margin is not positive. Every km increases the loss. Revenue does not even cover the variable costs.")]);
    else if (r.be > v.km) warns.push(["warn", L(`Die Gewinnschwelle liegt bei ${n0.format(r.be)} km, du fährst aber nur ${n0.format(v.km)} km. Mit diesen Zahlen machst du Verlust.`, `Break-even is at ${n0.format(r.be)} km, but you only drive ${n0.format(v.km)} km. With these figures you make a loss.`)]);
    if (mode === "miet" && v.prov <= 0) warns.push(["warn", L("Keine Provision eingetragen. Wenn du über eine App fährst, fehlt hier ein großer Kostenblock.", "No commission entered. If you drive via an app, a big cost block is missing.")]);
    if (mode === "miet" && v.prov > 0) warns.push(["ok", L(`Provision geht vom Umsatz ab: Umsatz = Kosten ÷ (1 − ${n2.format(v.prov / 100)}), nicht Kosten × (1 + ${n2.format(v.prov / 100)}).`, `Commission is deducted from revenue: revenue = costs ÷ (1 − ${n2.format(v.prov / 100)}), not costs × (1 + ${n2.format(v.prov / 100)}).`)]);
    if (!warns.some((w) => w[0] === "warn")) warns.unshift(["ok", L("Keine typischen Fehler gefunden. Kraftstoff, Reifen und Wartung stehen bei den variablen Kosten, der Unternehmerlohn ist drin.", "No typical mistakes found. Fuel, tyres and maintenance are variable costs, and the owner's salary is included.")]);
    $("checks").innerHTML = warns.map(([k, t]) => `<div class="check ${k}"><span class="ic">${k === "ok" ? "✓" : "!"}</span><span>${t}</span></div>`).join("");
  }
  function setMode(m) {
    mode = m;
    $("modeTaxi").setAttribute("aria-pressed", m === "taxi");
    $("modeMiet").setAttribute("aria-pressed", m === "miet");
    $("rowProv").hidden = m !== "miet";
    $("rowFunk").hidden = m !== "taxi";
    render();
  }
  $("modeTaxi").addEventListener("click", () => setMode("taxi"));
  $("modeMiet").addEventListener("click", () => setMode("miet"));
  form.addEventListener("input", render);
  form.addEventListener("submit", (e) => e.preventDefault());
  render();
})();
