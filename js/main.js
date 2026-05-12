/* ════════════════════════════════════
   NAVBAR — scroll effect
════════════════════════════════════ */
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ════════════════════════════════════
   NAVBAR — mobile burger + drawer
════════════════════════════════════ */
const burger = document.querySelector('.navbar__burger');
const menu   = document.querySelector('.navbar__menu');

// Inject backdrop element once
const backdrop = document.createElement('div');
backdrop.className = 'navbar__backdrop';
document.body.appendChild(backdrop);

function closeMenu() {
  burger?.classList.remove('open');
  menu?.classList.remove('open');
  backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

burger?.addEventListener('click', () => {
  const open = burger.classList.toggle('open');
  menu.classList.toggle('open', open);
  backdrop.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

// Close on any nav link / cta click
document.querySelectorAll('.navbar__link, .navbar__cta').forEach(el => {
  el.addEventListener('click', closeMenu);
});

// Close on backdrop tap
backdrop.addEventListener('click', closeMenu);

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu?.classList.contains('open')) closeMenu();
});

/* ════════════════════════════════════
   NAVBAR — active link highlight
════════════════════════════════════ */
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.navbar__link').forEach(link => {
  const href = link.getAttribute('href')?.split('#')[0];
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    link.classList.add('active');
  }
});

/* ════════════════════════════════════
   SCROLL-TRIGGERED FADE-UP
════════════════════════════════════ */
const fadeEls = document.querySelectorAll('.fade-up');

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  fadeEls.forEach(el => io.observe(el));
} else {
  fadeEls.forEach(el => el.classList.add('visible'));
}

/* ════════════════════════════════════
   STAT COUNTER ANIMATION
════════════════════════════════════ */
function animateCounter(el, target, suffix, duration = 1200) {
  const start = performance.now();
  const isDecimal = String(target).includes('.');

  const tick = now => {
    const elapsed = Math.min((now - start) / duration, 1);
    // ease-out-expo
    const ease = elapsed === 1 ? 1 : 1 - Math.pow(2, -10 * elapsed);
    const value = isDecimal
      ? (ease * target).toFixed(1)
      : Math.round(ease * target);
    el.textContent = value + suffix;
    if (elapsed < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initCounters() {
  document.querySelectorAll('.stat-card__value').forEach(el => {
    const raw    = el.textContent.trim();
    const suffix = raw.replace(/[\d.]/g, '');   // e.g. "+", "%"
    const num    = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return;

    // Only animate once
    el.dataset.counted = 'false';

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && el.dataset.counted === 'false') {
          el.dataset.counted = 'true';
          // Slight delay so it starts after the card fades in
          setTimeout(() => animateCounter(el, num, suffix), 150);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}
initCounters();

/* ════════════════════════════════════
   LANGUAGE SWITCHER
════════════════════════════════════ */
let currentLang = localStorage.getItem('dmmt-lang') || 'est';

function applyLanguage(lang) {
  if (!translations[lang]) return;
  const t = translations[lang];

  document.documentElement.lang = t.lang_code;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t[el.dataset.i18n];
    if (v !== undefined) el.textContent = v;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const v = t[el.dataset.i18nHtml];
    if (v !== undefined) el.innerHTML = v;
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const v = t[el.dataset.i18nPh];
    if (v !== undefined) el.placeholder = v;
  });

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  localStorage.setItem('dmmt-lang', lang);
  currentLang = lang;
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

applyLanguage(currentLang);

/* ════════════════════════════════════
   CONTACT FORM
════════════════════════════════════ */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const t = translations[currentLang];
    let valid = true;

    function validate(name, errId, check) {
      const input = form.querySelector(`[name="${name}"]`);
      const errEl = document.getElementById(errId);
      const msg = check(input);
      if (msg) {
        errEl.textContent = msg;
        input.classList.add('error');
        if (valid) { input.focus(); valid = false; }
      } else {
        errEl.textContent = '';
        input.classList.remove('error');
      }
    }

    validate('name', 'err-name', el =>
      !el.value.trim() ? t.err_name : '');

    validate('email', 'err-email', el => {
      if (!el.value.trim()) return t.err_email_req;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) return t.err_email_inv;
      return '';
    });

    validate('message', 'err-message', el =>
      !el.value.trim() ? t.err_message : '');

    if (valid) {
      form.style.display = 'none';
      document.getElementById('formSuccess').style.display = 'flex';
    }
  });

  form.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const err = document.getElementById(`err-${input.name}`);
      if (err) err.textContent = '';
    });
  });

  document.getElementById('resetForm')?.addEventListener('click', () => {
    form.reset();
    form.style.display = '';
    document.getElementById('formSuccess').style.display = 'none';
  });
}
