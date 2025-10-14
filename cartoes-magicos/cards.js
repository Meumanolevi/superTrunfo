function initCardHandlers(){
  const cards = document.querySelectorAll('.elemento__cartao');
  cards.forEach(card => {
    const stats = card.querySelector('.elemento__stats');
    // show/hide for mouse events
  card.addEventListener('mouseenter', () => { if(!stats) return; stats.setAttribute('aria-hidden','false'); card.classList.add('stats-open'); });
  card.addEventListener('mouseleave', () => { if(!stats) return; stats.setAttribute('aria-hidden','true'); card.classList.remove('stats-open'); });
    // keyboard focus handling
  card.addEventListener('focusin', () => { if(!stats) return; stats.setAttribute('aria-hidden','false'); card.classList.add('stats-open'); });
  card.addEventListener('focusout', () => { if(!stats) return; if(!card.contains(document.activeElement)){ stats.setAttribute('aria-hidden','true'); card.classList.remove('stats-open'); } });
    // allow Enter/Space to toggle stats panel when card receives keypress
    card.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if(!stats) return;
        const hidden = stats.getAttribute('aria-hidden') === 'true';
        stats.setAttribute('aria-hidden', String(!hidden));
        // also toggle a CSS class to keep visual in sync
        card.classList.toggle('stats-open', !hidden);
      }
    });
  });
}

// initialize after loader builds DOM
document.addEventListener('cards:loaded', initCardHandlers);
// fallback if the page had static cards or loader already executed
document.addEventListener('DOMContentLoaded', ()=> setTimeout(initCardHandlers, 50));
