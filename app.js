/* ==========================================================
   CONFIGURATION
   endpoint : URL de l'application Web Google Apps Script (…/exec) qui
   écrit chaque inscription dans le Google Sheets (voir google-sheets/README.md).
   Laisser vide = mode démo : le formulaire affiche la confirmation sans rien envoyer.
   ========================================================== */
const CONFIG = {
  endpoint: '',
  event: {
    title: 'Webinaire AuraSkin : bien choisir sa machine laser',
    start: '2026-11-01T20:00:00+01:00', // heure de Bruxelles
    durationMinutes: 90,
    description: 'Comprendre les caractéristiques des machines laser et faire le bon choix avant d\'investir. Le lien de connexion vous est envoyé par email.',
    url: 'https://www.auraskin.be',
  },
};

(function () {
  'use strict';

  const start = new Date(CONFIG.event.start);
  const end = new Date(start.getTime() + CONFIG.event.durationMinutes * 60000);
  const mobileCta = document.getElementById('mobile-cta');
  let registered = false;

  /* ---------- Compte à rebours ---------- */
  const UNITS = [
    { key: 'days', one: 'jour', many: 'jours' },
    { key: 'hours', one: 'heure', many: 'heures' },
    { key: 'minutes', one: 'minute', many: 'minutes' },
    { key: 'seconds', one: 'seconde', many: 'secondes' },
  ];

  // Chaque [data-timer] reçoit ses quatre cases (jours, heures, minutes, secondes).
  const timers = Array.prototype.map.call(document.querySelectorAll('[data-timer]'), function (el) {
    const cells = {};
    UNITS.forEach(function (unit) {
      const box = document.createElement('div');
      const num = document.createElement('span');
      const label = document.createElement('span');
      box.className = 'timer__unit';
      num.className = 'timer__num';
      label.className = 'timer__label';
      box.append(num, label);
      el.appendChild(box);
      cells[unit.key] = { num: num, label: label, value: null };
    });
    return { el: el, cells: cells };
  });
  const timerStatuses = document.querySelectorAll('[data-timer-status]');

  function renderCountdown() {
    const now = Date.now();
    if (now >= start.getTime()) {
      const message = now >= end.getTime() ? 'Ce webinaire est terminé.' : 'Le webinaire est en cours.';
      timers.forEach(function (t) { t.el.hidden = true; });
      timerStatuses.forEach(function (s) { s.hidden = false; s.textContent = message; });
      return;
    }
    const rest = Math.floor((start.getTime() - now) / 1000);
    const values = {
      days: Math.floor(rest / 86400),
      hours: Math.floor((rest % 86400) / 3600),
      minutes: Math.floor((rest % 3600) / 60),
      seconds: rest % 60,
    };
    timers.forEach(function (t) {
      UNITS.forEach(function (unit) {
        const cell = t.cells[unit.key];
        const v = values[unit.key];
        if (cell.value === v) return;
        cell.num.textContent = String(v).padStart(2, '0');
        cell.label.textContent = v > 1 ? unit.many : unit.one;
        if (cell.value !== null) {
          cell.num.classList.remove('is-tick');
          void cell.num.offsetWidth; // relance l'animation
          cell.num.classList.add('is-tick');
        }
        cell.value = v;
      });
    });
  }

  renderCountdown();
  setInterval(renderCountdown, 1000);

  /* ---------- Société -> TVA ---------- */
  const form = document.getElementById('signup');
  const societe = document.getElementById('societe');
  const tva = document.getElementById('tva');
  const tvaReveal = document.getElementById('tva-reveal');

  function syncTva() {
    const open = societe.value.trim().length > 0;
    tvaReveal.classList.toggle('is-open', open);
    tvaReveal.setAttribute('aria-hidden', String(!open));
    tvaReveal.inert = !open;
    tva.tabIndex = open ? 0 : -1;
  }
  societe.addEventListener('input', syncTva);
  syncTva();

  tva.addEventListener('blur', function () {
    tva.value = tva.value.toUpperCase().replace(/[\s.\-]/g, '');
  });

  /* ---------- Validation ---------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const rules = {
    prenom: function (v) { return v ? '' : 'Indiquez votre prénom.'; },
    nom: function (v) { return v ? '' : 'Indiquez votre nom.'; },
    email: function (v) {
      if (!v) return 'Indiquez votre adresse email.';
      return EMAIL_RE.test(v) ? '' : 'Cette adresse email semble incomplète. Vérifiez-la.';
    },
    telephone: function (v) {
      if (!v) return 'Indiquez votre numéro de téléphone.';
      const digits = v.replace(/\D/g, '');
      return digits.length >= 8 && digits.length <= 15 && /^[+\d\s().\/-]+$/.test(v)
        ? ''
        : 'Ce numéro semble incomplet. Exemple : +32 470 12 34 56.';
    },
    delai: function (v) { return v ? '' : 'Choisissez l\'option qui vous correspond.'; },
    consentement: function (v) { return v ? '' : 'Cochez cette case pour recevoir l\'accès au webinaire.'; },
  };

  function valueOf(name) {
    const el = form.elements[name];
    if (name === 'consentement') return el.checked;
    if (name === 'delai') {
      const checked = form.querySelector('input[name="delai"]:checked');
      return checked ? checked.value : '';
    }
    return el.value.trim();
  }

  function targetOf(name) {
    return name === 'delai' ? form.querySelector('.choices') : document.getElementById(name);
  }

  function showError(name, message) {
    const target = targetOf(name);
    const errorEl = document.getElementById(name + '-error');
    errorEl.textContent = message;
    if (message) {
      target.setAttribute('aria-invalid', 'true');
      target.setAttribute('aria-describedby', name + '-error');
    } else {
      target.removeAttribute('aria-invalid');
    }
  }

  function validate(name) {
    const message = rules[name](valueOf(name));
    showError(name, message);
    return !message;
  }

  let attempted = false;
  Object.keys(rules).forEach(function (name) {
    const evt = name === 'delai' || name === 'consentement' ? 'change' : 'input';
    form.addEventListener(evt, function (e) {
      if (attempted && e.target.name === name) validate(name);
    });
  });
  ['prenom', 'nom', 'email', 'telephone'].forEach(function (name) {
    document.getElementById(name).addEventListener('blur', function () {
      if (attempted || this.value.trim()) validate(name);
    });
  });

  /* ---------- Suivi des sources (UTM, publicité) ---------- */
  const params = new URLSearchParams(window.location.search);
  const tracking = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].forEach(function (key) {
    if (params.get(key)) tracking[key] = params.get(key);
  });

  /* ---------- Envoi ---------- */
  const submitBtn = document.getElementById('submit-btn');
  const statusEl = document.getElementById('form-status');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    statusEl.textContent = '';

    const invalid = Object.keys(rules).filter(function (name) { return !validate(name); });
    if (invalid.length) {
      const first = invalid[0] === 'delai'
        ? form.querySelector('input[name="delai"]')
        : document.getElementById(invalid[0]);
      first.focus();
      return;
    }

    // Robot : on fait comme si tout allait bien, sans rien envoyer.
    if (form.elements.website.value) {
      showSuccess();
      return;
    }

    const hasCompany = valueOf('societe') !== '';
    const data = Object.assign({
      prenom: valueOf('prenom'),
      nom: valueOf('nom'),
      email: valueOf('email').toLowerCase(),
      telephone: valueOf('telephone').replace(/\s+/g, ' '),
      societe: valueOf('societe'),
      tva: hasCompany ? tva.value.toUpperCase().replace(/[\s.\-]/g, '') : '',
      delai_lancement: valueOf('delai'),
      question: valueOf('question'),
      consentement: 'oui',
      webinaire: '2026-11-01 20:00 (Bruxelles)',
      date_inscription: new Date().toISOString(),
      page: window.location.origin + window.location.pathname,
    }, tracking);

    submitBtn.classList.add('is-loading');
    submitBtn.setAttribute('aria-busy', 'true');

    send(data)
      .then(function () {
        showSuccess(data);
      })
      .catch(function () {
        statusEl.textContent = 'L\'inscription n\'a pas pu être envoyée. Vérifiez votre connexion puis réessayez.';
      })
      .finally(function () {
        submitBtn.classList.remove('is-loading');
        submitBtn.removeAttribute('aria-busy');
      });
  });

  function send(data) {
    if (!CONFIG.endpoint) {
      console.info('[Mode démo] Inscription non envoyée (CONFIG.endpoint vide) :', data);
      return new Promise(function (resolve) { setTimeout(resolve, 700); });
    }
    // Format formulaire classique (sans pré-requête CORS) : lu par e.parameter dans Apps Script.
    return fetch(CONFIG.endpoint, {
      method: 'POST',
      body: new URLSearchParams(data),
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function () { return { ok: true }; });
    }).then(function (reponse) {
      if (reponse && reponse.ok === false) throw new Error(reponse.erreur || 'refusé');
    });
  }

  /* ---------- Confirmation + agenda ---------- */
  function icsDate(d) {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function icsEscape(s) {
    return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function buildCalendarLinks() {
    const ev = CONFIG.event;
    const google = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
      action: 'TEMPLATE',
      text: ev.title,
      dates: icsDate(start) + '/' + icsDate(end),
      details: ev.description + '\n\n' + ev.url,
      ctz: 'Europe/Brussels',
    }).toString();

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AuraSkin//Webinaire//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:webinaire-' + icsDate(start) + '@auraskin.be',
      'DTSTAMP:' + icsDate(new Date()),
      'DTSTART:' + icsDate(start),
      'DTEND:' + icsDate(end),
      'SUMMARY:' + icsEscape(ev.title),
      'DESCRIPTION:' + icsEscape(ev.description),
      'URL:' + ev.url,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + icsEscape(ev.title),
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    document.getElementById('cal-google').href = google;
    document.getElementById('cal-ics').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  }

  function showSuccess(data) {
    const formView = document.getElementById('form-view');
    const successView = document.getElementById('success-view');

    if (data) {
      document.getElementById('success-title').textContent = 'C\'est noté, ' + data.prenom + '. Votre place est réservée.';
      document.getElementById('success-email').textContent = data.email;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'webinar_registration', delai_lancement: data.delai_lancement });
    }

    buildCalendarLinks();
    formView.hidden = true;
    successView.hidden = false;
    registered = true;
    mobileCta.classList.remove('is-visible');
    successView.focus({ preventScroll: true });
    document.getElementById('inscription').scrollIntoView({ block: 'start' });
  }

  /* ---------- Boutons « Réserver ma place » ---------- */
  const formAnchor = document.getElementById('inscription');
  document.querySelectorAll('.js-scroll-to-form').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      formAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!registered) {
        setTimeout(function () { document.getElementById('prenom').focus({ preventScroll: true }); }, 450);
      }
    });
  });

  /* ---------- Barre mobile ---------- */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      const entry = entries[0];
      const pastForm = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      const show = pastForm && !registered;
      mobileCta.classList.toggle('is-visible', show);
      mobileCta.setAttribute('aria-hidden', String(!show));
      mobileCta.querySelector('a').tabIndex = show ? 0 : -1;
    }, { threshold: 0 }).observe(formAnchor.querySelector('.card'));
  }
})();
