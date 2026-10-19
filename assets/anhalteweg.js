/* Anhalteweg-Rechner in Lektion 4.1 */
(function () {
  "use strict";
  const box = document.getElementById("anhalteRechner");
  if (!box) return;
  const { Num, L } = window.FK;
  let gefahr = false;
  const $ = (id) => document.getElementById(id);
  function run() {
    const v = Math.max(0, Num.parse($("ahV").value) || 0);
    const r = v / 10 * 3, b = (v / 10) ** 2 / (gefahr ? 2 : 1);
    $("ahOut").innerHTML =
      `<div class="res"><small>${L("Reaktionsweg", "Reaction distance")} (${Num.fmt(v / 10, 1)} × 3)</small><b>${Num.fmt(r, 1)} m</b></div>` +
      `<div class="res"><small>${L("Bremsweg", "Braking distance")} (${Num.fmt(v / 10, 1)}²${gefahr ? " ÷ 2" : ""})</small><b>${Num.fmt(b, 1)} m</b></div>` +
      `<div class="res key"><small>${L("Anhalteweg", "Stopping distance")}</small><b>${Num.fmt(r + b, 1)} m</b></div>`;
  }
  $("ahV").addEventListener("input", run);
  $("ahNorm").addEventListener("click", () => { gefahr = false; $("ahNorm").setAttribute("aria-pressed", "true"); $("ahGef").setAttribute("aria-pressed", "false"); run(); });
  $("ahGef").addEventListener("click", () => { gefahr = true; $("ahGef").setAttribute("aria-pressed", "true"); $("ahNorm").setAttribute("aria-pressed", "false"); run(); });
  run();
})();
