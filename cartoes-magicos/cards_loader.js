// cards_loader.js — dynamically loads cards_data.json and builds card elements
async function loadCards(){
  try{
    // try a few likely locations for the JSON (root when served, current dir fallback, frontend subfolder)
    let data = null;
    const tryPaths = ['/cards_data.json', 'cards_data.json', 'frontend/cards_data.json'];
    for(const p of tryPaths){
      try{
        const r = await fetch(p);
        if(!r.ok) throw new Error('not ok');
        data = await r.json();
        console.log('cards_loader: loaded', p);
        break;
      }catch(e){ /* try next */ }
    }
    if(!data) throw new Error('cards_data.json not found in any known location');
    const container = document.getElementById('cards-container');
    if(!container) { console.warn('cards_loader: #cards-container not found'); return; }

    Object.keys(data).forEach(key => {
      const info = data[key];
      // link opens in same tab so navigation keeps same origin and history
      const a = document.createElement('a');
      a.href = `game.html?card=${encodeURIComponent(key)}`;
      a.className = 'card-link';

      const card = document.createElement('div');
      card.className = 'elemento__cartao';
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-label', info.name || key);
      card.dataset.slug = key;

      // fundo (cover)
      const caixa = document.createElement('div'); caixa.className='caixa__foto';
      const imgFundo = document.createElement('img');
      imgFundo.className='elemento__foto__cobertura';
      imgFundo.src = info.fundo; imgFundo.alt = (info.name || key) + ' fundo';
      imgFundo.loading = 'lazy';
      imgFundo.onerror = () => imgFundo.style.opacity = '0.35';
      caixa.appendChild(imgFundo);
      card.appendChild(caixa);

      // personagem (3D) — put above the fundo
      const personagem = document.createElement('img');
      personagem.className='elemento__personagem';
      personagem.src = info['3d']; personagem.alt = (info.name || key) + ' 3d';
      personagem.loading = 'lazy';
      personagem.onerror = () => personagem.style.opacity = '0.5';
      card.appendChild(personagem);

      // titulo — overlayed
      const titulo = document.createElement('img');
      titulo.className='elemento__titulo'; titulo.src = info.titulo; titulo.alt = (info.name || key) + ' titulo';
      titulo.loading = 'lazy';
      titulo.onerror = () => titulo.style.opacity = '0.6';
      card.appendChild(titulo);

      // stats (from data)
      const s = info.stats || { forca: 50, agilidade: 50, magia: 50 };
      const aside = document.createElement('aside');
      aside.className='elemento__stats';
      aside.setAttribute('aria-hidden','true');
      aside.setAttribute('aria-label','Estatísticas');
      aside.innerHTML = `<div class="stats__inner"><h4 class="stats__title">${info.name || key}</h4>
        <div class="stat"><span class="stat__label">Força</span><div class="stat__bar"><div class="stat__fill" style="--val:${s.forca}%"></div></div></div>
        <div class="stat"><span class="stat__label">Agilidade</span><div class="stat__bar"><div class="stat__fill" style="--val:${s.agilidade}%"></div></div></div>
        <div class="stat"><span class="stat__label">Magia</span><div class="stat__bar"><div class="stat__fill" style="--val:${s.magia}%"></div></div></div>
      </div>`;
      card.appendChild(aside);

      a.appendChild(card);
      container.appendChild(a);
    });

    // notify that cards are ready
    document.dispatchEvent(new CustomEvent('cards:loaded'));
  }catch(err){ console.error('Erro carregando cards_data.json', err); }
}

document.addEventListener('DOMContentLoaded', ()=> loadCards());
