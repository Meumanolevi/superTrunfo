// ui.js — page transitions and small animation helpers
document.addEventListener('DOMContentLoaded', ()=>{
  // page fade in
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 320ms ease';
  requestAnimationFrame(()=> document.body.style.opacity = '1');

  // defensive cleanup: if we have a unified .site-navbar, remove legacy headers/navs that might linger
  if(document.querySelector('.site-navbar')){
    document.querySelectorAll('header.game-header, nav.main-nav').forEach(n=>{
      if(!n.classList.contains('site-navbar')) n.remove();
    });
  }

  // intercept internal nav links to animate out
  document.querySelectorAll('a').forEach(a=>{
    const href = a.getAttribute('href');
    if(!href || href.startsWith('http') || href.startsWith('#')) return;
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const to = href;
      document.body.style.opacity = '0';
      setTimeout(()=> window.location.href = to, 260);
    });
  });

  // gentle hover scale for cards
  document.addEventListener('mouseover', (e)=>{
    const c = e.target.closest('.elemento__cartao');
    if(c) c.style.transform = 'translateY(-6px) scale(1.02)';
  });
  document.addEventListener('mouseout', (e)=>{
    const c = e.target.closest('.elemento__cartao');
    if(c) c.style.transform = '';
  });

  // small feedback when slot receives a card
  document.querySelectorAll('.battle-slot').forEach(s=>{
    s.addEventListener('DOMNodeInserted', ()=>{
      s.animate([{ transform: 'scale(1)' },{ transform: 'scale(1.04)' },{ transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
    });
  });
});