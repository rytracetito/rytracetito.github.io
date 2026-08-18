function setLang(lang){
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-fr]').forEach(function(el){
    var text = el.getAttribute('data-' + lang);
    if (text !== null) el.textContent = text;
  });

  document.querySelectorAll('[data-fr-html]').forEach(function(el){
    var html = el.getAttribute('data-' + lang + '-html');
    if (html !== null) el.innerHTML = html;
  });

  document.querySelectorAll('.lang-toggle button').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  localStorage.setItem('site-lang', lang);
}

document.addEventListener('DOMContentLoaded', function(){
  var saved = localStorage.getItem('site-lang') || 'fr';
  setLang(saved);
  document.getElementById('year').textContent = new Date().getFullYear();
});
