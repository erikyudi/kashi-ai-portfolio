/* ============================================================
   KASHI AI — Interactions
   ============================================================ */
(function () {
  // ============================================================
  // i18n — PT / EN switching
  // ============================================================
  const I18N = window.KASHI_I18N || { pt: {}, en: {} };
  const LANG_KEY = 'kashi.lang';
  let lang = localStorage.getItem(LANG_KEY) || 'pt';
  if (!I18N[lang]) lang = 'pt';
  const dict = () => I18N[lang] || I18N.pt;

  function applyLang(next) {
    lang = I18N[next] ? next : 'pt';
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    const d = dict();
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const v = d[el.getAttribute('data-i18n')];
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const v = d[el.getAttribute('data-i18n-html')];
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll('.lang-toggle button').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  document.querySelectorAll('.lang-toggle button').forEach((b) => {
    b.addEventListener('click', () => applyLang(b.getAttribute('data-lang')));
  });
  applyLang(lang);

  // ---- Navbar blur on scroll ----
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    if (window.scrollY > 24) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Reveal on scroll ----
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // ---- Flow steps staggered activation ----
  const flowIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const steps = e.target.querySelectorAll('.flow-step');
        steps.forEach((s, i) => setTimeout(() => s.classList.add('in'), i * 220));
        flowIo.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.flow').forEach((el) => flowIo.observe(el));

  // ---- Bento pointer glow ----
  document.querySelectorAll('.bento-item').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });

  // ---- Smooth anchor scroll with offset ----
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // ---- Year ----
  const yEl = document.getElementById('year');
  if (yEl) yEl.textContent = new Date().getFullYear();

  // ============================================================
  // Tweaks panel — glow / shader intensity
  // ============================================================
  const panel = document.getElementById('tweaks');
  const slider = document.getElementById('glow-slider');
  const valEl = document.getElementById('glow-val');
  const KEY = 'kashi.glow';

  function applyGlow(v) {
    document.body.style.setProperty('--glow', v);
    if (valEl) valEl.textContent = Math.round(v * 100) + '%';
    if (slider) slider.value = v;
  }
  const saved = parseFloat(localStorage.getItem(KEY));
  applyGlow(isNaN(saved) ? 1 : saved);

  if (slider) {
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      applyGlow(v);
      localStorage.setItem(KEY, v);
    });
  }

  // Host tweak-mode protocol: show panel when tweaks enabled
  function setTweaks(on) { panel && panel.classList.toggle('on', !!on); }
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'tweaks:enabled' || d.type === 'tweak-mode' || d.type === 'tweaks:toggle') {
      setTweaks(d.enabled ?? d.value ?? d.on);
    }
  });
  // Fallback: keyboard toggle (T) for local testing
  window.addEventListener('keydown', (e) => {
    if (e.key === 't' && !/input|textarea/i.test(document.activeElement.tagName)) {
      panel.classList.toggle('on');
    }
  });
})();
