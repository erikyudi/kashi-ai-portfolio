/* ============================================================
   KASHI AI v2 — Interactions
   Loader · i18n · rotating words · GSAP entrance · marquee
   ============================================================ */
(function () {
  const I18N = window.KASHI_I18N || { pt: {}, en: {} };
  const LANG_KEY = 'kashi.lang';
  let lang = localStorage.getItem(LANG_KEY) || 'pt';
  if (!I18N[lang]) lang = 'pt';

  const dict = () => I18N[lang] || I18N.pt;

  // ---- Apply translations ----
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

    // lang button state
    document.querySelectorAll('.lang-toggle button').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });

    // refresh rotating words to new language
    refreshRotators();
    // year (re-inserted by footer.copy innerHTML)
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  // ============================================================
  // Rotating words (loader + hero)
  // ============================================================
  const rotators = [];
  function makeRotator(el, key, interval, animClass) {
    const r = { el, key, interval, animClass, i: 0, timer: null };
    rotators.push(r);
    return r;
  }
  function startRotator(r) {
    const words = (dict()[r.key]) || [];
    if (!words.length) return;
    clearInterval(r.timer);
    r.el.textContent = words[r.i % words.length];
    r.timer = setInterval(() => {
      r.i = (r.i + 1) % words.length;
      const w = ((dict()[r.key]) || [])[r.i] || '';
      // re-trigger CSS animation
      r.el.classList.remove(r.animClass);
      void r.el.offsetWidth;
      r.el.textContent = w;
      r.el.classList.add(r.animClass);
    }, r.interval);
  }
  function refreshRotators() {
    rotators.forEach((r) => {
      const words = (dict()[r.key]) || [];
      if (words.length) r.el.textContent = words[r.i % words.length];
    });
  }

  // ============================================================
  // Loading screen
  // ============================================================
  function runLoader(onDone) {
    const loader = document.getElementById('loader');
    const numEl = document.getElementById('loader-num');
    const fillEl = document.getElementById('loader-fill');
    const wordEl = document.querySelector('.loader-word');

    // rotate loader word
    const lr = makeRotator(wordEl, 'loader.words', 900, 'role-fade-in');
    startRotator(lr);

    if (!loader) { onDone && onDone(); return; }

    const DURATION = 2700;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / DURATION, 1);
      const eased = p < 1 ? 1 - Math.pow(1 - p, 2) : 1;
      const count = Math.round(eased * 100);
      if (numEl) numEl.textContent = String(count).padStart(3, '0');
      if (fillEl) fillEl.style.transform = 'scaleX(' + (count / 100) + ')';
      if (p < 1) requestAnimationFrame(tick);
      else {
        clearInterval(lr.timer);
        setTimeout(() => {
          loader.classList.add('done');
          document.body.classList.remove('is-loading');
          onDone && onDone();
          setTimeout(() => { loader.style.display = 'none'; }, 700);
        }, 380);
      }
    }
    requestAnimationFrame(tick);
  }

  // ============================================================
  // Hero entrance (GSAP, with fallback)
  // ============================================================
  function heroEntrance() {
    const title = document.querySelector('.name-reveal');
    const blurs = document.querySelectorAll('.blur-in');
    if (window.gsap) {
      const tl = window.gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (title) tl.fromTo(title, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.2 }, 0.05);
      tl.fromTo(blurs, { opacity: 0, y: 20, filter: 'blur(10px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.0, stagger: 0.1 }, 0.25);
    } else {
      if (title) { title.style.opacity = 1; title.style.transform = 'none'; }
      blurs.forEach((b) => { b.style.opacity = 1; b.style.filter = 'none'; b.style.transform = 'none'; });
    }
    // start hero word rotator
    const hw = document.querySelector('.rotate-word');
    if (hw) { const r = makeRotator(hw, 'hero.words', 2200, 'role-fade-in'); startRotator(r); }
  }

  // ============================================================
  // Reveal on scroll
  // ============================================================
  function initReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    const flowIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.flow-step').forEach((s, i) => setTimeout(() => s.classList.add('in'), i * 220));
          flowIo.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('.flow').forEach((el) => flowIo.observe(el));
  }

  // ============================================================
  // Marquee (GSAP infinite)
  // ============================================================
  function initMarquee() {
    const track = document.getElementById('marquee-track');
    if (!track) return;
    if (window.gsap) {
      window.gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    } else {
      track.style.animation = 'marquee-fallback 38s linear infinite';
    }
  }

  // ============================================================
  // Navbar: scrolled state + active link
  // ============================================================
  function initNav() {
    const nav = document.querySelector('.nav');
    const links = [...document.querySelectorAll('.nav-links a')];
    const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
      // active link
      let idx = 0;
      const mid = window.scrollY + window.innerHeight * 0.35;
      sections.forEach((s, i) => { if (s.offsetTop <= mid) idx = i; });
      links.forEach((a, i) => a.classList.toggle('active', i === idx));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ============================================================
  // Bento pointer glow + smooth anchors
  // ============================================================
  function initMisc() {
    document.querySelectorAll('.bento-item').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });

    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const y = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });

    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  // ============================================================
  // Tweaks panel (glow / shader intensity)
  // ============================================================
  function initTweaks() {
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
    if (slider) slider.addEventListener('input', () => {
      const v = parseFloat(slider.value); applyGlow(v); localStorage.setItem(KEY, v);
    });
    function setTweaks(on) { panel && panel.classList.toggle('on', !!on); }
    window.addEventListener('message', (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'tweaks:enabled' || d.type === 'tweak-mode' || d.type === 'tweaks:toggle')
        setTweaks(d.enabled ?? d.value ?? d.on);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 't' && !/input|textarea/i.test(document.activeElement.tagName)) panel.classList.toggle('on');
    });
  }

  // ============================================================
  // Boot
  // ============================================================
  function boot() {
    document.body.classList.add('is-loading');
    // language toggle wiring
    document.querySelectorAll('.lang-toggle button').forEach((b) => {
      b.addEventListener('click', () => applyLang(b.getAttribute('data-lang')));
    });
    if (lang !== 'pt') applyLang(lang);

    initReveal();
    initMarquee();
    initNav();
    initMisc();
    initTweaks();

    runLoader(heroEntrance);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
