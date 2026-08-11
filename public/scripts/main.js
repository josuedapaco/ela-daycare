var lang = 'es';
function setLang(l){
  lang = l;
  document.documentElement.lang = l;
  document.body.setAttribute('data-lang', l);
  ['b-es','b2-es','b3-es'].forEach(function(id){var el=document.getElementById(id);if(el)el.setAttribute('aria-pressed', l==='es');});
  ['b-en','b2-en','b3-en'].forEach(function(id){var el=document.getElementById(id);if(el)el.setAttribute('aria-pressed', l==='en');});
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

// ==== Envío del formulario de inscripción vía Resend (backend en /api/enroll) ====
(function(){
  var form = document.getElementById('enroll-form');
  if (!form) return;
  var btn = form.querySelector('button[type="submit"]');
  var done = form.querySelector('.done');
  var err = form.querySelector('.err');
  var origLabel = btn ? btn.textContent : '';

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    done.hidden = true; err.hidden = true;
    if (!form.checkValidity()){ form.reportValidity(); return; }

    var data = Object.fromEntries(new FormData(form).entries());
    data.lang = lang;
    data.page = location.href;
    data.userAgent = navigator.userAgent;

    if (btn){ btn.disabled = true; btn.textContent = lang==='en' ? 'Sending…' : 'Enviando…'; }
    try{
      var r = await fetch('/api/enroll', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      if (!r.ok) throw new Error('bad status '+r.status);
      done.hidden = false;
      form.reset();
    } catch(ex){
      err.hidden = false;
    } finally {
      if (btn){ btn.disabled = false; btn.textContent = origLabel; }
    }
  });
})();
