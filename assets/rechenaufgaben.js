/* Generator für Rechenaufgaben (Rechentrainer + Probeklausur Teil 2), zweisprachig.
   Jede Aufgabe: { typ, titel, text, gegeben:[[label, wert]], schritte:[{label, hint, richtig, einheit, tol, dez, loesung}] }
   Alle Werte sind Beispielwerte, keine Marktpreise. Zahlen immer im deutschen Format (wie in der Prüfung). */
(function () {
  "use strict";
  const { Num, L } = window.FK;
  const f = (x, d = 2) => Num.fmt(x, d);
  const e = (x) => Num.fmt(x, 2) + " €";
  const e0 = (x) => Num.fmt(x, 0) + " €";
  const yr = L(" / Jahr", " / year");

  function rng(seed) {
    let a = seed >>> 0;
    const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.step = (min, max, step) => { const n = Math.round((max - min) / step); return +(min + Math.floor(r() * (n + 1)) * step).toFixed(6); };
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    return r;
  }
  const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

  function vehicle(r) {
    const kauf = r.step(32000, 58000, 500);
    const rest = Math.round(kauf * r.step(0.18, 0.35, 0.01) / 500) * 500;
    const nd = r.step(3, 6, 1);
    const zins = r.step(3, 8, 0.5);
    return { kauf, rest, nd, zins, afa: (kauf - rest) / nd, zinsen: (kauf + rest) / 2 * zins / 100 };
  }
  const T_AFA = L("Abschreibung pro Jahr", "Depreciation per year (Abschreibung)");
  const H_AFA = L("(Anschaffungspreis − Restwert) ÷ Nutzungsdauer", "(purchase price − residual value) ÷ useful life");
  const T_ZINS = L("Kalkulatorische Zinsen pro Jahr", "Imputed interest per year (kalk. Zinsen)");
  const H_ZINS = L("(Anschaffungspreis + Restwert) ÷ 2 × Zinssatz", "(purchase price + residual value) ÷ 2 × interest rate");

  const T = {};

  T["afa-zins"] = function (r) {
    const v = vehicle(r);
    return {
      typ: "afa-zins", titel: L("Abschreibung und kalkulatorische Zinsen", "Depreciation and imputed interest"),
      text: L("Ein Unternehmer kauft ein neues Fahrzeug. Berechne die Abschreibung und die kalkulatorischen Zinsen pro Jahr.", "An operator buys a new vehicle. Calculate the yearly depreciation and the imputed interest."),
      gegeben: [[L("Anschaffungspreis", "Purchase price"), e0(v.kauf)], [L("Restwert am Ende", "Residual value at the end"), e0(v.rest)], [L("Nutzungsdauer", "Useful life"), v.nd + L(" Jahre", " years")], [L("Kalk. Zinssatz", "Imputed interest rate"), f(v.zins, 1) + " %"]],
      schritte: [
        { label: T_AFA, hint: H_AFA, richtig: v.afa, einheit: "€", tol: 1, loesung: `(${e0(v.kauf)} − ${e0(v.rest)}) ÷ ${v.nd} = ${e(v.afa)}` },
        { label: T_ZINS, hint: H_ZINS, richtig: v.zinsen, einheit: "€", tol: 1,
          loesung: `(${e0(v.kauf)} + ${e0(v.rest)}) ÷ 2 × ${f(v.zins, 1)} % = ${e0((v.kauf + v.rest) / 2)} × ${f(v.zins / 100, 3)} = ${e(v.zinsen)}` }
      ]
    };
  };

  function kosten(r, miet) {
    const v = vehicle(r);
    const vers = r.step(3600, 6400, 100), steuer = r.step(120, 380, 10);
    const funk = miet ? 0 : r.step(1200, 3000, 100);
    const sonst = r.step(400, 1500, 20), ulohn = r.step(30000, 44000, 1000);
    const verbr = r.step(5.5, 8.5, 0.1), preis = r.step(1.40, 1.80, 0.01);
    const reifen = r.step(700, 1200, 50), rkm = r.step(40000, 60000, 5000), wart = r.step(0.03, 0.08, 0.01);
    const km = r.step(50000, 90000, 1000), bes = r.step(45, 65, 1);
    const prov = miet ? r.step(15, 30, 1) : 0;
    const fix = v.afa + v.zinsen + vers + steuer + funk + sonst + ulohn;
    const kraft = verbr / 100 * preis, rkmk = reifen / rkm;
    const varKm = kraft + rkmk + wart;
    const ges = fix + varKm * km;
    const bkm = km * bes / 100;
    const gegeben = [[L("Anschaffungspreis", "Purchase price"), e0(v.kauf)], [L("Restwert", "Residual value"), e0(v.rest)], [L("Nutzungsdauer", "Useful life"), v.nd + L(" Jahre", " years")], [L("Kalk. Zinssatz", "Imputed interest rate"), f(v.zins, 1) + " %"],
      [L("Versicherungen", "Insurance"), e0(vers) + yr], [L("Kfz-Steuer", "Vehicle tax"), e0(steuer) + yr]];
    if (!miet) gegeben.push([L("Funk / Zentrale", "Radio / dispatch"), e0(funk) + yr]);
    gegeben.push([L("Sonstige Fixkosten", "Other fixed costs"), e0(sonst) + yr], [L("Kalk. Unternehmerlohn", "Imputed owner's salary"), e0(ulohn) + yr],
      [L("Verbrauch", "Consumption"), f(verbr, 1) + " l / 100 km"], [L("Kraftstoff netto", "Fuel (net)"), f(preis) + " € / l"], [L("Reifensatz", "Set of tyres"), e0(reifen) + L(" für ", " for ") + Num.fmt(rkm, 0) + " km"],
      [L("Wartung und Reparatur", "Maintenance and repair"), f(wart) + " € / km"], [L("Fahrleistung", "Mileage"), Num.fmt(km, 0) + " km" + yr], [L("Besetztanteil", "Share of km with passenger"), bes + " %"]);
    if (miet) gegeben.push([L("Plattform-Provision", "Platform commission"), prov + L(" % vom Umsatz", " % of revenue")]);
    const fixL = `${L("Abschreibung", "Depreciation")} = (${e0(v.kauf)} − ${e0(v.rest)}) ÷ ${v.nd} = ${e(v.afa)}\n${L("Zinsen", "Interest")} = (${e0(v.kauf)} + ${e0(v.rest)}) ÷ 2 × ${f(v.zins, 1)} % = ${e(v.zinsen)}\n` +
      `${L("Fixkosten", "Fixed costs")} = ${e(v.afa)} + ${e(v.zinsen)} + ${e0(vers)} + ${e0(steuer)}${miet ? "" : " + " + e0(funk)} + ${e0(sonst)} + ${e0(ulohn)} = ${e(fix)}`;
    const schritte = [
      { label: T_AFA, hint: H_AFA, richtig: v.afa, einheit: "€", tol: 1, loesung: `(${e0(v.kauf)} − ${e0(v.rest)}) ÷ ${v.nd} = ${e(v.afa)}` },
      { label: T_ZINS, hint: H_ZINS, richtig: v.zinsen, einheit: "€", tol: 1, loesung: `(${e0(v.kauf)} + ${e0(v.rest)}) ÷ 2 × ${f(v.zins, 1)} % = ${e(v.zinsen)}` },
      { label: L("Fixkosten pro Jahr", "Fixed costs per year (Fixkosten)"), hint: L("Abschreibung + Zinsen + alle festen Jahresbeträge + Unternehmerlohn", "Depreciation + interest + all fixed yearly amounts + owner's salary"), richtig: fix, einheit: "€", tol: 2, loesung: fixL },
      { label: L("Variable Kosten je km", "Variable costs per km"), hint: L("Kraftstoff + Reifen + Wartung, alles je km (4 Nachkommastellen)", "Fuel + tyres + maintenance, all per km (4 decimals)"), richtig: varKm, einheit: "€/km", tol: 0.0006, dez: 4,
        loesung: `${L("Kraftstoff", "Fuel")} = ${f(verbr, 1)} ÷ 100 × ${f(preis)} = ${f(kraft, 4)} €/km\n${L("Reifen", "Tyres")} = ${e0(reifen)} ÷ ${Num.fmt(rkm, 0)} km = ${f(rkmk, 4)} €/km\n${L("Wartung", "Maintenance")} = ${f(wart, 4)} €/km\n${L("Summe", "Total")} = ${f(varKm, 4)} €/km` },
      { label: L("Gesamtkosten pro Jahr", "Total costs per year"), hint: L("Fixkosten + variable Kosten je km × km", "Fixed costs + variable costs per km × km"), richtig: ges, einheit: "€", tol: 10, loesung: `${e(fix)} + ${f(varKm, 4)} €/km × ${Num.fmt(km, 0)} km = ${e(ges)}` },
      { label: L("Kosten je gefahrenem km", "Cost per km driven"), hint: L("Gesamtkosten ÷ gefahrene km (2 Stellen)", "Total costs ÷ km driven (2 decimals)"), richtig: ges / km, einheit: "€/km", tol: 0.011, loesung: `${e(ges)} ÷ ${Num.fmt(km, 0)} km = ${f(ges / km, 4)} ≈ ${f(ges / km)} €/km` },
      { label: L("Kosten je Besetzt-km", "Cost per occupied km (Besetzt-km)"), hint: L("Gesamtkosten ÷ (km × Besetztanteil) (2 Stellen)", "Total costs ÷ (km × occupied share) (2 decimals)"), richtig: ges / bkm, einheit: "€/km", tol: 0.011,
        loesung: `${L("Besetzt-km", "Occupied km")} = ${Num.fmt(km, 0)} × ${bes} % = ${Num.fmt(bkm, 0)} km\n${e(ges)} ÷ ${Num.fmt(bkm, 0)} km = ${f(ges / bkm, 4)} ≈ ${f(ges / bkm)} €/km` }
    ];
    if (miet) schritte.push({ label: L("Nötiger Jahresumsatz, damit nach Provision alle Kosten gedeckt sind", "Revenue needed so that all costs are covered after commission"), hint: L("Gesamtkosten ÷ (1 − Provisionssatz)", "Total costs ÷ (1 − commission rate)"), richtig: ges / (1 - prov / 100), einheit: "€", tol: 15,
      loesung: `${e(ges)} ÷ (1 − ${f(prov / 100)}) = ${e(ges)} ÷ ${f(1 - prov / 100)} = ${e(ges / (1 - prov / 100))}\n${L("Probe", "Check")}: ${e(ges / (1 - prov / 100))} − ${prov} % = ${e(ges)} ✓` });
    return {
      typ: miet ? "kosten-miet" : "kosten-taxi",
      titel: miet ? L("Kostenrechnung Mietwagen mit App-Provision", "Cost accounting: private hire with app commission") : L("Kostenrechnung Taxi", "Cost accounting: taxi"),
      text: miet ? L("Ein Unternehmer fährt mit einem Mietwagen über eine Vermittlungs-App. Berechne seine Kosten und den nötigen Umsatz. Er fährt selbst und hat keine Angestellten.", "An operator drives a private hire car (Mietwagen) via a ride-hailing app. Calculate his costs and the revenue he needs. He drives himself and has no employees.") :
        L("Ein Unternehmer fährt sein Taxi selbst und hat keine Angestellten. Berechne seine Kosten.", "An operator drives his own taxi and has no employees. Calculate his costs."),
      gegeben, schritte
    };
  }
  T["kosten-taxi"] = (r) => kosten(r, false);
  T["kosten-miet"] = (r) => kosten(r, true);

  T["db"] = function (r) {
    const fix = r.step(36000, 60000, 500), erl = r.step(0.95, 1.50, 0.01), varKm = r.step(0.12, 0.26, 0.01);
    const km = r.step(40000, 85000, 1000);
    const db = erl - varKm, be = fix / db, gewinn = db * km - fix;
    return {
      typ: "db", titel: L("Deckungsbeitrag und Gewinnschwelle", "Contribution margin and break-even point"),
      text: L("Ein Taxiunternehmer will wissen, ab wie vielen Kilometern sein Betrieb Gewinn macht.", "A taxi operator wants to know from how many kilometres his business makes a profit."),
      gegeben: [[L("Fixkosten", "Fixed costs"), e0(fix) + yr], [L("Durchschnittlicher Erlös", "Average revenue"), f(erl) + L(" € je gefahrenem km (netto)", " € per km driven (net)")], [L("Variable Kosten", "Variable costs"), f(varKm) + " € / km"], [L("Geplante Fahrleistung", "Planned mileage"), Num.fmt(km, 0) + " km" + yr]],
      schritte: [
        { label: L("Deckungsbeitrag je km", "Contribution margin per km (Deckungsbeitrag)"), hint: L("Erlös je km − variable Kosten je km", "Revenue per km − variable costs per km"), richtig: db, einheit: "€/km", tol: 0.005, loesung: `${f(erl)} € − ${f(varKm)} € = ${f(db)} €/km` },
        { label: L("Gewinnschwelle", "Break-even point (Gewinnschwelle)"), hint: L("Fixkosten ÷ Deckungsbeitrag je km (auf ganze km)", "Fixed costs ÷ contribution margin per km (whole km)"), richtig: be, einheit: "km", tol: Math.max(2, be * 0.002), dez: 0, loesung: `${e0(fix)} ÷ ${f(db)} €/km = ${Num.fmt(be, 0)} km` },
        { label: gewinn >= 0 ? L("Gewinn bei der geplanten Fahrleistung", "Profit at the planned mileage") : L("Ergebnis bei der geplanten Fahrleistung (Verlust mit Minus)", "Result at the planned mileage (loss with minus sign)"), hint: L("Deckungsbeitrag je km × km − Fixkosten", "Contribution margin per km × km − fixed costs"), richtig: gewinn, einheit: "€", tol: 5,
          loesung: `${f(db)} €/km × ${Num.fmt(km, 0)} km − ${e0(fix)} = ${e(gewinn)}${gewinn < 0 ? L(" (Verlust)", " (loss)") : ""}` }
      ]
    };
  };

  T["tarif"] = function (r) {
    const gp = r.step(3.5, 5.0, 0.1), p1 = r.step(2.2, 2.8, 0.1), p2 = round(p1 - r.step(0.2, 0.4, 0.1), 2);
    const wh = r.step(30, 45, 1), d = r.step(3, 24, 0.5), w = r.step(0, 10, 1);
    const kmTeil = Math.min(d, 5) * p1 + Math.max(d - 5, 0) * p2;
    const brutto = gp + kmTeil + w / 60 * wh;
    const ust = brutto * 7 / 107;
    return {
      typ: "tarif", titel: L("Fahrpreis nach Taxitarif", "Fare according to the taxi tariff"),
      text: L(`Ein Fahrgast fährt ${f(d, 1)} km innerhalb der Stadt. Unterwegs steht das Taxi ${w} Minuten im Stau. Berechne den Fahrpreis nach diesem Beispieltarif. Taxitarife sind Endpreise einschließlich Umsatzsteuer.`,
        `A passenger travels ${f(d, 1)} km within the city. The taxi is stuck in traffic for ${w} minutes. Calculate the fare using this sample tariff. Taxi tariffs are final prices including VAT.`),
      gegeben: [[L("Grundpreis", "Base fare"), e(gp)], [L("1. bis 5. km", "1st to 5th km"), e(p1) + L(" je km", " per km")], [L("ab dem 6. km", "from the 6th km"), e(p2) + L(" je km", " per km")], [L("Wartezeit", "Waiting time"), e0(wh) + L(" je Stunde", " per hour")], [L("Strecke", "Distance"), f(d, 1) + " km"], [L("Wartezeit", "Waiting time"), w + L(" Minuten", " minutes")]],
      schritte: [
        { label: L("Fahrpreis (brutto)", "Fare (gross)"), hint: L("Grundpreis + km-Preise + Wartezeit", "Base fare + km prices + waiting time"), richtig: brutto, einheit: "€", tol: 0.011,
          loesung: `${L("Grundpreis", "Base fare")} ${e(gp)}\n+ ${f(Math.min(d, 5), 1)} km × ${e(p1)} = ${e(Math.min(d, 5) * p1)}\n+ ${f(Math.max(d - 5, 0), 1)} km × ${e(p2)} = ${e(Math.max(d - 5, 0) * p2)}\n+ ${w} min ÷ 60 × ${e0(wh)} = ${e(w / 60 * wh)}\n= ${e(brutto)}` },
        { label: L("Darin enthaltene Umsatzsteuer", "VAT included"), hint: L("Fahrt in der Gemeinde: 7 %. USt = Brutto × 7 ÷ 107", "Trip within the municipality: 7 %. VAT = gross × 7 ÷ 107"), richtig: ust, einheit: "€", tol: 0.011, loesung: `${e(brutto)} × 7 ÷ 107 = ${e(ust)}` },
        { label: L("Nettoerlös für den Unternehmer", "Net revenue for the operator"), hint: L("Brutto − Umsatzsteuer", "Gross − VAT"), richtig: brutto - ust, einheit: "€", tol: 0.011, loesung: `${e(brutto)} − ${e(ust)} = ${e(brutto - ust)}` }
      ]
    };
  };

  T["ust"] = function (r) {
    const fall = r.pick([
      { t: L("Taxifahrt innerhalb von Aachen, 9 km", "Taxi trip within Aachen, 9 km"), s: 7, w: L("Taxi, innerhalb einer Gemeinde: ermäßigter Satz 7 %.", "Taxi within one municipality: reduced rate 7 %.") },
      { t: L("Taxifahrt von Aachen nach Düren, 34 km", "Taxi trip from Aachen to Düren, 34 km"), s: 7, w: L("Taxi, Strecke nicht mehr als 50 km: ermäßigter Satz 7 %.", "Taxi, distance not more than 50 km: reduced rate 7 %.") },
      { t: L("Taxifahrt von Aachen nach Köln, 72 km", "Taxi trip from Aachen to Cologne, 72 km"), s: 19, w: L("Taxi, über 50 km und über die Gemeindegrenze: Regelsatz 19 %.", "Taxi, over 50 km and across the municipal border: standard rate 19 %.") },
      { t: L("Mietwagenfahrt innerhalb von Aachen, 8 km (keine Krankenfahrt)", "Private hire trip within Aachen, 8 km (not a patient trip)"), s: 19, w: L("Mietwagen: grundsätzlich Regelsatz 19 %, auch bei kurzen Fahrten.", "Private hire: standard rate 19 %, even for short trips.") },
      { t: L("Mietwagenfahrt zum Flughafen Düsseldorf, 85 km", "Private hire trip to Düsseldorf airport, 85 km"), s: 19, w: L("Mietwagen: Regelsatz 19 %.", "Private hire: standard rate 19 %.") }
    ]);
    const brutto = r.step(14, 160, 0.5);
    const ust = brutto * fall.s / (100 + fall.s);
    return {
      typ: "ust", titel: L("Umsatzsteuer aus dem Fahrpreis herausrechnen", "Extracting VAT from the fare"),
      text: L(`Fall: ${fall.t}. Der Fahrgast zahlt ${e(brutto)} (brutto). Welcher Steuersatz gilt, und wie viel Umsatzsteuer steckt im Preis?`, `Case: ${fall.t}. The passenger pays ${e(brutto)} (gross). Which VAT rate applies, and how much VAT is included?`),
      gegeben: [[L("Fahrt", "Trip"), fall.t], [L("Bruttopreis", "Gross price"), e(brutto)]],
      schritte: [
        { label: L("Steuersatz", "VAT rate"), hint: L("7 oder 19", "7 or 19"), richtig: fall.s, einheit: "%", tol: 0, dez: 0, loesung: fall.w + " (§ 12 UStG)" },
        { label: L("Enthaltene Umsatzsteuer", "VAT included"), hint: L("Brutto × Satz ÷ (100 + Satz)", "Gross × rate ÷ (100 + rate)"), richtig: ust, einheit: "€", tol: 0.011, loesung: `${e(brutto)} × ${fall.s} ÷ ${100 + fall.s} = ${e(ust)}` },
        { label: L("Nettobetrag", "Net amount"), hint: L("Brutto − Umsatzsteuer", "Gross − VAT"), richtig: brutto - ust, einheit: "€", tol: 0.011, loesung: `${e(brutto)} − ${e(ust)} = ${e(brutto - ust)}` }
      ]
    };
  };

  T["angebot"] = function (r) {
    const kkm = r.step(0.9, 1.6, 0.05), dist = r.step(60, 260, 10), std = r.step(1, 4, 0.5), satz = r.step(20, 35, 1), zuschlag = r.step(8, 20, 1);
    const leer = r.pick([true, false]);
    const kmGes = leer ? dist * 2 : dist;
    const kosten = kmGes * kkm + std * satz;
    const netto = kosten * (1 + zuschlag / 100);
    const brutto = netto * 1.19;
    const back = leer ? L(" Der Wagen fährt danach leer zurück. Die Leerfahrt musst du mit einrechnen.", " The car then returns empty. You must include the empty return trip.")
      : L(" Der Kunde fährt mit zurück; die Strecke ist Hin- und Rückweg zusammen.", " The customer rides back too; the distance covers both ways.");
    return {
      typ: "angebot", titel: L("Angebot für eine Mietwagenfahrt kalkulieren", "Pricing a quote for a private hire trip"),
      text: L(`Ein Kunde möchte mit dem Mietwagen ${Num.fmt(dist, 0)} km zu einem Termin fahren. Der Fahrer wartet dort ${f(std, 1)} Stunden.`, `A customer wants a private hire car for a ${Num.fmt(dist, 0)} km trip to an appointment. The driver waits there for ${f(std, 1)} hours.`) + back + L(" Kalkuliere den Angebotspreis.", " Calculate the quote."),
      gegeben: [[L("Kosten je km (inkl. Fahrer)", "Cost per km (incl. driver)"), e(kkm)], [L("Strecke laut Kunde", "Distance stated by customer"), Num.fmt(dist, 0) + " km"], [L("Leerfahrt zurück", "Empty return trip"), leer ? L("ja", "yes") : L("nein", "no")], [L("Wartezeit", "Waiting time"), f(std, 1) + " h"], [L("Kostensatz Wartezeit", "Cost rate for waiting"), e0(satz) + L(" je Stunde", " per hour")], [L("Gewinnzuschlag", "Profit mark-up"), zuschlag + " %"], [L("Umsatzsteuer", "VAT"), L("19 % (Mietwagen)", "19 % (private hire)")]],
      schritte: [
        { label: L("Selbstkosten der Fahrt", "Cost price of the trip"), hint: L("km (mit Leerfahrt) × Kosten je km + Wartestunden × Stundensatz", "km (incl. empty trip) × cost per km + waiting hours × hourly rate"), richtig: kosten, einheit: "€", tol: 0.05,
          loesung: `${Num.fmt(kmGes, 0)} km × ${e(kkm)} = ${e(kmGes * kkm)}\n+ ${f(std, 1)} h × ${e0(satz)} = ${e(std * satz)}\n= ${e(kosten)}` },
        { label: L("Nettopreis mit Gewinnzuschlag", "Net price with mark-up"), hint: L("Selbstkosten × (1 + Zuschlag)", "Cost price × (1 + mark-up)"), richtig: netto, einheit: "€", tol: 0.05, loesung: `${e(kosten)} × ${f(1 + zuschlag / 100)} = ${e(netto)}` },
        { label: L("Angebotspreis brutto", "Gross quote"), hint: L("Netto × 1,19", "Net × 1.19"), richtig: brutto, einheit: "€", tol: 0.05, loesung: `${e(netto)} × 1,19 = ${e(brutto)}` }
      ]
    };
  };

  const LABELS = {
    "kosten-taxi": L("Kostenrechnung Taxi", "Cost accounting: taxi"), "kosten-miet": L("Kostenrechnung Mietwagen", "Cost accounting: private hire"),
    "afa-zins": L("Abschreibung und Zinsen", "Depreciation and interest"), "db": L("Deckungsbeitrag", "Contribution margin"),
    "tarif": L("Fahrpreis nach Tarif", "Fare by tariff"), "ust": L("Umsatzsteuer", "VAT"), "angebot": L("Angebot kalkulieren", "Pricing a quote")
  };
  function generate(typ, seed) {
    seed = seed == null ? Math.floor(Math.random() * 2 ** 31) : seed;
    const t = T[typ](rng(seed));
    t.seed = seed;
    return t;
  }
  window.FK.Rechen = { generate, types: Object.keys(T), LABELS };
})();
