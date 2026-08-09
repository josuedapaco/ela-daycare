var lang = 'es';
function setLang(l){
  lang = l;
  document.documentElement.lang = l;
  document.getElementById('b-es').setAttribute('aria-pressed', l==='es');
  document.getElementById('b-en').setAttribute('aria-pressed', l==='en');
  document.querySelectorAll('[data-es]').forEach(function(n){
    var v = n.dataset[l];
    if (v === undefined) return;
    if (/<br\s*\/?>/i.test(v)) n.innerHTML = v; else n.textContent = v;
  });
}
function review(){
  var on = document.body.classList.toggle('review');
  document.getElementById('revb').setAttribute('aria-pressed', on);
}
function tab(i){
  document.querySelectorAll('.tabs [role="tab"]').forEach(function(b,k){ b.setAttribute('aria-selected', k===i); });
  document.querySelectorAll('.panel').forEach(function(p,k){ if(k===i) p.setAttribute('data-on','1'); else p.removeAttribute('data-on'); });
}
document.querySelectorAll('.navlinks a').forEach(function(a){
  a.addEventListener('click', function(){ document.querySelector('.navlinks').classList.remove('open'); });
});
