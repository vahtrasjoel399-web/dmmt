(function () {
  'use strict';

  var STORAGE_KEY = 'dmmt_cookie_consent';
  var EXPIRY_MS   = 180 * 24 * 60 * 60 * 1000; // 6 months

  /* ── helpers ─────────────────────────────────── */

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (Date.now() > data.expires) { localStorage.removeItem(STORAGE_KEY); return null; }
      return data;
    } catch (e) { return null; }
  }

  function saveConsent(analytics, marketing) {
    var data = {
      essential: true,
      analytics: !!analytics,
      marketing: !!marketing,
      expires: Date.now() + EXPIRY_MS
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  function t(key) {
    try {
      var lang = localStorage.getItem('lang') || 'est';
      return translations[lang][key] || key;
    } catch (e) { return key; }
  }

  /* ── banner ──────────────────────────────────── */

  function hideBanner() {
    var banner = document.getElementById('cookieBanner');
    if (!banner) return;
    banner.classList.remove('cb--visible');
    setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 420);
  }

  function showBanner() {
    var banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<div class="cb__inner">' +
        '<div class="cb__text">' +
          '<p class="cb__desc">' + t('cookie_desc') + '</p>' +
          '<a href="privacy.html" class="cb__privacy">' + t('cookie_privacy_link') + '</a>' +
        '</div>' +
        '<div class="cb__actions">' +
          '<button class="cb-btn cb-btn--ghost"   id="cbCustomize">' + t('cookie_customize') + '</button>' +
          '<button class="cb-btn cb-btn--outline" id="cbDecline">'   + t('cookie_decline')   + '</button>' +
          '<button class="cb-btn cb-btn--primary" id="cbAccept">'    + t('cookie_accept')    + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(banner);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { banner.classList.add('cb--visible'); });
    });

    banner.querySelector('#cbAccept').addEventListener('click', function () {
      saveConsent(true, true);
      hideBanner();
    });

    banner.querySelector('#cbDecline').addEventListener('click', function () {
      saveConsent(false, false);
      hideBanner();
    });

    banner.querySelector('#cbCustomize').addEventListener('click', showModal);
  }

  /* ── modal ───────────────────────────────────── */

  function hideModal() {
    var modal = document.getElementById('cookieModal');
    if (!modal) return;
    modal.classList.remove('cm--visible');
    document.body.style.overflow = '';
    setTimeout(function () { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 320);
  }

  function showModal() {
    var consent = getConsent();
    var analyticsOn = consent ? consent.analytics : true;
    var marketingOn = consent ? consent.marketing : true;

    var modal = document.createElement('div');
    modal.id = 'cookieModal';
    modal.className = 'cookie-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="cm__backdrop"></div>' +
      '<div class="cm__box">' +
        '<h2 class="cm__title">' + t('cookie_modal_title') + '</h2>' +

        '<div class="cm__category">' +
          '<div class="cm__cat-info">' +
            '<span class="cm__cat-name">' + t('cookie_essential_title') + '</span>' +
            '<span class="cm__cat-desc">' + t('cookie_essential_desc') + '</span>' +
          '</div>' +
          '<div class="cm__toggle cm__toggle--locked" aria-label="Always on"><span class="cm__dot"></span></div>' +
        '</div>' +

        '<div class="cm__category">' +
          '<div class="cm__cat-info">' +
            '<span class="cm__cat-name">' + t('cookie_analytics_title') + '</span>' +
            '<span class="cm__cat-desc">' + t('cookie_analytics_desc') + '</span>' +
          '</div>' +
          '<label class="cm__toggle">' +
            '<input type="checkbox" id="cmAnalytics"' + (analyticsOn ? ' checked' : '') + '>' +
            '<span class="cm__dot"></span>' +
          '</label>' +
        '</div>' +

        '<div class="cm__category">' +
          '<div class="cm__cat-info">' +
            '<span class="cm__cat-name">' + t('cookie_marketing_title') + '</span>' +
            '<span class="cm__cat-desc">' + t('cookie_marketing_desc') + '</span>' +
          '</div>' +
          '<label class="cm__toggle">' +
            '<input type="checkbox" id="cmMarketing"' + (marketingOn ? ' checked' : '') + '>' +
            '<span class="cm__dot"></span>' +
          '</label>' +
        '</div>' +

        '<div class="cm__actions">' +
          '<button class="cb-btn cb-btn--outline" id="cmSave">'    + t('cookie_save')   + '</button>' +
          '<button class="cb-btn cb-btn--primary" id="cmAcceptAll">' + t('cookie_accept') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { modal.classList.add('cm--visible'); });

    modal.querySelector('.cm__backdrop').addEventListener('click', hideModal);

    modal.querySelector('#cmAcceptAll').addEventListener('click', function () {
      saveConsent(true, true);
      hideModal();
      hideBanner();
    });

    modal.querySelector('#cmSave').addEventListener('click', function () {
      var analytics = modal.querySelector('#cmAnalytics').checked;
      var marketing = modal.querySelector('#cmMarketing').checked;
      saveConsent(analytics, marketing);
      hideModal();
      hideBanner();
    });

    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideModal();
    });
  }

  /* ── init ────────────────────────────────────── */

  function init() {
    if (!getConsent()) showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── public API ──────────────────────────────── */
  window.cookieConsent = {
    getConsent: getConsent,
    openSettings: showModal
  };

}());
