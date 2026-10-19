/* Bewegung im Apple-Stil: gläserne Kopfzeile, Lesefortschritt, Einblenden beim Scrollen,
   hochzählende Zahlen und die Taxameter-Bühne auf der Startseite.
   Ohne „Bewegung reduzieren“ und nur, wenn der Kopf die Klasse js-motion gesetzt hat. */
(function () {
  "use strict";
  window.FKMotion = true;
  const root = document.documentElement;
  const motion = root.classList.contains("js-motion");
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------- Scroll: Kopfzeile, Lesefortschritt, Taxameter ---------- */
  const topbar = document.querySelector(".topbar");
  let readbar = null;
  if (document.querySelector(".lesson")) {
    readbar = document.createElement("div");
    readbar.className = "readbar";
    readbar.setAttribute("aria-hidden", "true");
    document.body.append(readbar);
  }
  const meter = motion ? document.querySelector(".meter-stage .meter") : null;
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    if (topbar) topbar.classList.toggle("scrolled", y > 8);
    if (readbar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      readbar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    }
    if (meter) {
      /* Die Karte richtet sich auf, während sie in die Bildmitte kommt */
      const r = meter.getBoundingClientRect(), h = window.innerHeight;
      const p = Math.max(0, Math.min(1, 1 - (r.top - h * 0.2) / (h * 0.55)));
      meter.style.transform = "rotateX(" + ((1 - p) * 16).toFixed(2) + "deg) scale(" + (0.9 + 0.1 * p).toFixed(4) + ")";
    }
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", req, { passive: true });
  onScroll();

  /* ---------- Zahlen zählen hoch (Startseite) ---------- */
  const fmt = (v, d) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  function count(el) {
    const to = parseFloat(el.dataset.count), from = parseFloat(el.dataset.from || "0"), d = parseInt(el.dataset.dec || "0", 10);
    if (!motion) { el.textContent = fmt(to, d); return; }
    const dur = 1600, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(from + (to - from) * e, d);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const counters = $$("[data-count]");

  if (!motion || !("IntersectionObserver" in window)) { counters.forEach(count); return; }

  /* ---------- Einblenden beim Scrollen ---------- */
  const SEL = [
    ".home .sec-head", ".pain-item", ".feature", "#planList > div", ".compare > div", ".faq", ".contact-card", ".cta",
    ".page-head", ".module", ".course-top > aside",
    ".lesson-head", ".goals", ".lesson-body > section > :not(.quiz)", ".lcheck > .sec-head", ".finish", ".pager",
    ".setup > *", ".panel", ".dash > *", ".legal > *", ".gl-tools", ".letters", ".task-card", ".calc > *",
    ".foot-contact"
  ].join(",");
  /* In Dokumentreihenfolge markieren; nie ein Element innerhalb eines schon markierten */
  const items = [];
  $$(SEL).forEach((el) => {
    if (el.closest(".search") || (el.parentElement && el.parentElement.closest("[data-reveal]"))) return;
    el.setAttribute("data-reveal", "");
    items.push(el);
  });

  const io = new IntersectionObserver((entries) => {
    let i = 0;
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      io.unobserve(el);
      el.style.setProperty("--d", Math.min(i++ * 0.08, 0.4) + "s");
      el.classList.add("in");
      /* Danach Attribut entfernen, damit Hover-Effekte wieder ihre eigene Geschwindigkeit haben */
      const done = () => { el.removeAttribute("data-reveal"); el.classList.remove("in"); el.style.removeProperty("--d"); };
      el.addEventListener("transitionend", function te(e) { if (e.target === el) { el.removeEventListener("transitionend", te); done(); } });
      setTimeout(done, 2000);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach((el) => io.observe(el));

  const cio = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { cio.unobserve(en.target); setTimeout(() => count(en.target), 350); } });
  }, { threshold: 0.4 });
  counters.forEach((el) => { el.textContent = fmt(parseFloat(el.dataset.from || "0"), parseInt(el.dataset.dec || "0", 10)); cio.observe(el); });
})();
