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

// ==== Cupos en vivo (los edita la dueña en /panel) ====
// Pinta la sección de vacantes con lo que diga /api/vacancies. Si la API no
// contesta se queda lo que vino en el HTML, así que la página nunca se ve rota.
(function(){
  var section = document.getElementById('vacantes');
  if (!section) return;

  function setText(el, es, en){
    if (!el) return;
    el.dataset.es = es;
    el.dataset.en = en;
    el.textContent = lang === 'en' ? en : es;
  }

  function paintCard(card, g){
    var free = Math.max(0, g.capacity - g.filled);
    var state = free === 0 ? 'full' : (free === 1 ? 'few' : 'open');
    var pct = g.capacity > 0 ? Math.round((g.filled / g.capacity) * 100) : 0;

    var pill = card.querySelector('[data-vac-pill]');
    if (pill) pill.className = 'pill ' + (state === 'full' ? 'wait' : state);

    var bar = card.querySelector('[data-vac-bar]');
    if (bar){
      bar.className = 'cap-fill f-' + state;
      bar.style.width = pct + '%';
    }

    if (free === 0){
      setText(card.querySelector('[data-vac-pill-text]'),
        g.waitlist > 0 ? 'Lleno · ' + g.waitlist + ' en espera' : 'Lleno',
        g.waitlist > 0 ? 'Full · ' + g.waitlist + ' waiting' : 'Full');
      setText(card.querySelector('[data-vac-right]'),
        g.waitlist > 0 ? 'lista +' + g.waitlist : 'sin cupo',
        g.waitlist > 0 ? 'waitlist +' + g.waitlist : 'no spots');
    } else {
      setText(card.querySelector('[data-vac-pill-text]'),
        free === 1 ? '1 cupo' : free + ' cupos',
        free === 1 ? '1 spot left' : free + ' spots open');
      setText(card.querySelector('[data-vac-right]'),
        free === 1 ? '1 disponible' : free + ' disponibles',
        free === 1 ? '1 available' : free + ' available');
    }

    setText(card.querySelector('[data-vac-left]'),
      g.filled + ' / ' + g.capacity + (g.filled === 1 ? ' lleno' : ' llenos'),
      g.filled + ' / ' + g.capacity + ' filled');
  }

  function paintDate(iso){
    var el = section.querySelector('[data-vac-date]');
    if (!el) return;
    var d = new Date(iso);
    if (isNaN(d)) return;
    var opts = { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'America/New_York' };
    var es = new Intl.DateTimeFormat('es-ES', opts).format(d).replace(',', '');
    var en = new Intl.DateTimeFormat('en-US', opts).format(d);
    setText(el, es, en);
  }

  fetch('/api/vacancies', { cache: 'no-store' })
    .then(function(r){ if (!r.ok) throw new Error('bad status ' + r.status); return r.json(); })
    .then(function(data){
      if (!data || !data.groups) return;
      section.querySelectorAll('[data-vac]').forEach(function(card){
        var g = data.groups[card.dataset.vac];
        if (g) paintCard(card, g);
      });
      paintDate(data.updatedAt);
    })
    .catch(function(){ /* se queda el respaldo del HTML */ });
})();

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

    // Diálogo de confirmación antes de enviar
    if (typeof window.__openConfirm === 'function'){
      var ok = await window.__openConfirm(data);
      if (!ok) return;
    }

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
      done.scrollIntoView({behavior:'smooth', block:'center'});
    } catch(ex){
      err.hidden = false;
    } finally {
      if (btn){ btn.disabled = false; btn.textContent = origLabel; }
    }
  });
})();
