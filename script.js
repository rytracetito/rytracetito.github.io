function setLang(lang) {

  document.documentElement.lang = lang;

  document.querySelectorAll('[data-fr]').forEach(function(el) {

    var text = el.getAttribute('data-' + lang);

    if (text !== null) {
      el.textContent = text;
    }

  });

  document.querySelectorAll('[data-fr-html]').forEach(function(el) {

    var html = el.getAttribute('data-' + lang + '-html');

    if (html !== null) {
      el.innerHTML = html;
    }

  });

  document.querySelectorAll('.lang-toggle button').forEach(function(btn) {

    btn.classList.toggle(
      'active',
      btn.dataset.lang === lang
    );

  });

  localStorage.setItem('site-lang', lang);
}


/* =========================================
   THÈME CLAIR / SOMBRE
========================================= */

function setTheme(theme) {

  document.documentElement.setAttribute(
    'data-theme',
    theme
  );

  localStorage.setItem(
    'site-theme',
    theme
  );

}


/* =========================================
   INITIALISATION
========================================= */

document.addEventListener('DOMContentLoaded', function() {

  /* ---------- Langue ---------- */

  var savedLang =
    localStorage.getItem('site-lang') || 'fr';

  setLang(savedLang);


  /* ---------- Thème ---------- */

  var savedTheme =
    localStorage.getItem('site-theme') || 'dark';

  setTheme(savedTheme);


  /* ---------- Bouton thème ---------- */

  var themeButton =
    document.querySelector('.theme-toggle');

  if (themeButton) {

    themeButton.addEventListener('click', function() {

      var currentTheme =
        document.documentElement.getAttribute(
          'data-theme'
        );

      var newTheme =
        currentTheme === 'dark'
          ? 'light'
          : 'dark';

      setTheme(newTheme);

    });

  }


  /* ---------- Année ---------- */

  var year =
    document.getElementById('year');

  if (year) {
    year.textContent =
      new Date().getFullYear();
  }

});