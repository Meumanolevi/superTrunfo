function initCardHandlers(){
  const cards = document.querySelectorAll('.card-library-item');
  cards.forEach(wrapper => {
    const card = wrapper.querySelector('.elemento__cartao');
    const stats = wrapper.querySelector('.elemento__stats');
    if(!card) return;
    // show/hide for mouse events on wrapper
    wrapper.addEventListener('mouseenter', () => { if(!stats) return; stats.setAttribute('aria-hidden','false'); wrapper.classList.add('stats-open'); });
    wrapper.addEventListener('mouseleave', () => { if(!stats) return; stats.setAttribute('aria-hidden','true'); wrapper.classList.remove('stats-open'); });
    // keyboard focus handling (focus on inner card will bubble)
    wrapper.addEventListener('focusin', () => { if(!stats) return; stats.setAttribute('aria-hidden','false'); wrapper.classList.add('stats-open'); });
    wrapper.addEventListener('focusout', () => { if(!stats) return; if(!wrapper.contains(document.activeElement)){ stats.setAttribute('aria-hidden','true'); wrapper.classList.remove('stats-open'); } });
    // allow Enter/Space to toggle stats panel when card receives keypress
    wrapper.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if(!stats) return;
        const hidden = stats.getAttribute('aria-hidden') === 'true';
        stats.setAttribute('aria-hidden', String(!hidden));
        // also toggle a CSS class to keep visual in sync on wrapper
        wrapper.classList.toggle('stats-open', !hidden);
      }
    });
  });
}

// initialize after loader builds DOM
document.addEventListener('cards:loaded', initCardHandlers);
// fallback if the page had static cards or loader already executed
document.addEventListener('DOMContentLoaded', ()=> setTimeout(initCardHandlers, 50));
