/* Glossar-Seite: Suche, Buchstaben, Übersetzungen */
(function () {
  "use strict";
  const { el, allLessons, L, LANG } = window.FK;
  const $ = (id) => document.getElementById(id);
  const lessonBy = {}; allLessons().forEach((l) => { lessonBy[l.slug] = l; });
  const LANGS = { en: ["EN", "ltr"], tr: ["TR", "ltr"], ar: ["AR", "rtl"], uk: ["UK", "ltr"] };
  const G = (window.GLOSSAR || []).slice().sort((a, b) => a.de.localeCompare(b.de, "de"));
  let lang = LANG === "en" ? "en" : "";
  try { const s = localStorage.getItem("tmfk-glang"); if (s != null) lang = s; } catch (e) { }
  $("glLang").value = lang;
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const letterOf = (g) => norm(g.de)[0].toUpperCase();

  function render() {
    const q = norm($("glSearch").value.trim());
    const list = G.filter((g) => !q || norm(g.de + " " + g.erklaerung + " " + (g.en || "") + " " + (g.tr || "") + " " + (g.uk || "") + " " + (g.ar || "")).includes(q));
    const out = [];
    let last = "";
    list.forEach((g) => {
      const Lt = letterOf(g);
      if (Lt !== last) { out.push(el("h2", { class: "gl-letter", id: "b-" + Lt }, Lt)); last = Lt; }
      const tr = el("div", { class: "tr" });
      const show = lang === "all" ? Object.keys(LANGS) : lang ? [lang] : [];
      show.forEach((k) => { if (g[k]) tr.append(el("div", null, el("b", null, LANGS[k][0] + ": "), el("span", { dir: LANGS[k][1], lang: k }, g[k]))); });
      const l = lessonBy[g.lek];
      out.push(el("div", { class: "gl-item", id: g.id },
        el("div", null, el("h3", { lang: "de" }, g.de, g.art ? el("span", { class: "art" }, ", " + g.art) : null), show.length ? tr : null),
        el("div", null, el("p", { html: g.erklaerung }), l ? el("div", { class: "gl-lek" }, el("a", { href: l.url }, L("Lektion ", "Lesson ") + l.nr + ": " + l.titel)) : null)));
    });
    $("glList").replaceChildren(...(out.length ? out : [el("p", { class: "muted" }, L("Kein Begriff gefunden.", "No term found."))]));
    const letters = [...new Set(list.map(letterOf))];
    $("letters").replaceChildren(...letters.map((x) => el("a", { href: "#b-" + x }, x)));
  }
  $("glSearch").addEventListener("input", render);
  $("glLang").addEventListener("change", () => { lang = $("glLang").value; try { localStorage.setItem("tmfk-glang", lang); } catch (e) { } render(); });
  render();
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
})();
