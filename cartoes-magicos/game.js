// Consolidated game.js (frontend) — client logic for Cartões Mágicos
document.addEventListener('DOMContentLoaded', ()=>{
  // --- util / UI helpers ---
  function updateDeckNames() {
    const playerDeckName = window.selectedDeckName || 'Deck Principal';
    const opponentDeckName = window.opponentDeckName || 'Deck Secundário';
    document.querySelector('.player-bottom .deck-count').textContent = playerDeckName;
    document.querySelector('.player-top .deck-count').textContent = opponentDeckName;
  }
  // Define deck do oponente diferente do jogador
  if(!window.opponentDeckName || window.opponentDeckName === window.selectedDeckName) {
    // Sugestão: pega um nome diferente do cards_data.json
    (async function setOpponentDeck(){
      const data = await loadLocalCardsData();
      if(data) {
        const keys = Object.keys(data);
        let oppKey = keys.find(k => (data[k].name || k) !== window.selectedDeckName);
        window.opponentDeckName = oppKey ? (data[oppKey].name || oppKey) : 'Deck Secundário';
        updateDeckNames();
      }
    })();
  } else {
    updateDeckNames();
  }
  const opponentHand = document.querySelector('.player-top .player-hand');
  // Botão Alternar Decks: alterna visibilidade dos painéis de deck dos jogadores
  const btnToggleDecks = document.getElementById('btn-toggle-decks');
  btnToggleDecks && btnToggleDecks.addEventListener('click', () => {
    window.location.href = 'cards.html';
  });
  const drawBtns = document.querySelectorAll('.draw-btn');
  const playerHand = document.querySelector('.player-bottom .player-hand');
  const turnIndicator = document.getElementById('turn-indicator');
  const battleZone = document.getElementById('battle-zone');
  const btnStart = document.getElementById('btn-start');
  const btnEndTurn = document.getElementById('btn-end-turn');

  function createCard(title, img, stats, owner = 'player'){
    const card = document.createElement('div');
    card.className = 'elemento__cartao floating';
    card.dataset.owner = owner;
    if(owner === 'player') card.tabIndex = 0;
    card.dataset.title = title || 'Carta';
    // normalize stats to new schema: fe, coragem, influencia
    function normalizeStats(s){
      if(!s) return {fe:40,coragem:40,influencia:40};
      // if already in new keys
      if('fe' in s || 'coragem' in s || 'influencia' in s) return { fe: s.fe||40, coragem: s.coragem||40, influencia: s.influencia||40 };
      // map legacy keys (assumption): magia -> fe, forca -> coragem, agilidade -> influencia
      return {
        fe: s.magia || s.fe || 40,
        coragem: s.forca || s.coragem || 40,
        influencia: s.agilidade || s.influencia || 40
      };
    }
    const norm = normalizeStats(stats);
    card.dataset.stats = JSON.stringify(norm);
    card.style.width = '120px';
    card.style.height = '180px';
    card.style.margin = '0 4px';
    card.style.padding = '0';
    card.style.position = 'relative';
    // Imagem de fundo
    if(img){
      const im = document.createElement('img');
      im.src = img; im.alt = title; im.className = 'elemento__foto__cobertura';
      im.style.width = '100%';
      im.style.height = '100%';
      im.style.objectFit = 'cover';
      im.style.position = 'absolute';
      im.style.top = '0';
      im.style.left = '0';
      card.appendChild(im);
    }
    // Nome
    const nameEl = document.createElement('div');
    nameEl.className = 'elemento__titulo';
    nameEl.textContent = title || 'Carta';
    nameEl.style.position = 'absolute';
    nameEl.style.bottom = '8px';
    nameEl.style.left = '0';
    nameEl.style.width = '100%';
    nameEl.style.textAlign = 'center';
    nameEl.style.fontWeight = 'bold';
    nameEl.style.fontSize = '1em';
    nameEl.style.color = '#fff';
    nameEl.style.textShadow = '0 1px 4px #000';
    card.appendChild(nameEl);
    // Atributos: stored in dataset (hidden visually). We'll show on hover as a floating tooltip.
    // create a lightweight data object for tooltip rendering when needed
    card._statsData = norm;
    setTimeout(()=>card.classList.remove('floating'),300);
    // enable drag only for player's cards
    if(owner === 'player') {
      card.tabIndex = 0;
      makeDraggable(card);
    } else {
      card.draggable = false;
      card.tabIndex = -1;
    }

    // Tooltip for attributes (floating card) - create on demand
    function showAttrTooltip(e){
      let tip = document.getElementById('card-attr-tooltip');
      if(!tip){
        tip = document.createElement('div'); tip.id = 'card-attr-tooltip';
        Object.assign(tip.style,{position:'fixed',zIndex:1400,minWidth:'180px',padding:'10px 12px',borderRadius:'10px',background:'linear-gradient(180deg,#071018,#08121a)',color:'#e6eef6',boxShadow:'0 20px 40px rgba(0,0,0,0.6)',fontSize:'13px'});
        document.body.appendChild(tip);
      }
      const s = card._statsData || JSON.parse(card.dataset.stats||'{}');
      tip.innerHTML = `<div style="font-weight:700;margin-bottom:8px">${card.dataset.title}</div>
        <div style="font-size:12px;color:#9fcbe8">Fé: <strong>${s.fe}</strong></div>
        <div style="font-size:12px;color:#9fcbe8">Coragem: <strong>${s.coragem}</strong></div>
        <div style="font-size:12px;color:#9fcbe8">Influência: <strong>${s.influencia}</strong></div>`;
      // position near the card
      const rect = card.getBoundingClientRect();
      const left = Math.min(window.innerWidth - 220, rect.right + 8);
      const top = Math.max(8, rect.top + (rect.height/2) - 40);
      tip.style.left = left + 'px'; tip.style.top = top + 'px'; tip.style.opacity = '1';
    }
    function hideAttrTooltip(){ const t = document.getElementById('card-attr-tooltip'); if(t) t.style.opacity = '0'; }
    card.addEventListener('mouseenter', showAttrTooltip);
    card.addEventListener('mouseleave', hideAttrTooltip);
    card.addEventListener('focus', showAttrTooltip);
    card.addEventListener('blur', hideAttrTooltip);
    return card;
  }

  // single-player state (no socket required)
  let socket = null;
  let state = {
    turn: 'player',
    life: { player: 25, opponent: 20 },
    lastPlayed: { player: null, opponent: null }
  };
  // simple deck management: each player gets a shuffled deck of N cards
  const MAX_DECK_CARDS = 10;
  // default library (now limited to 10 characters)
  const DEFAULT_LIBRARY = ['pedro','mateus','joao','judas_escariotes','judas_tadeu','thiago_maior','paulo','davi','moises','jesus_bonus'];
  // explicit ordering used by the cards library page (cards.html) — matches the user's requested order
  const CARDS_PAGE_ORDER = ['pedro','mateus','joao','judas_escariotes','judas_tadeu','thiago_maior','paulo','davi','moises','jesus_bonus'];
  let decks = { player: [], opponent: [] };
  // attribute chooser state
  state.selectedAttribute = null; // 'fe'|'coragem'|'influencia' or null

  function updateTurnUI(){
    if(turnIndicator) turnIndicator.textContent = 'Turno: ' + state.turn;
    document.querySelectorAll('.player').forEach(p => p.classList.toggle('active', p.dataset.player === state.turn));
  }

  // attribute modal helper - returns Promise that resolves with chosen attr or rejects on cancel
  function showAttrModal(){
    return new Promise((resolve, reject)=>{
      const modal = document.getElementById('attr-modal'); if(!modal) return reject();
      modal.setAttribute('aria-hidden','false'); modal.style.display = 'flex';
      const cleanup = ()=>{
        modal.setAttribute('aria-hidden','true'); modal.style.display = 'none';
        modal.querySelectorAll('button').forEach(b=>b.removeEventListener('click', onClick));
      };
      const onClick = (e)=>{
        const a = e.currentTarget.dataset.attr;
        cleanup(); resolve(a);
      };
      modal.querySelectorAll('button').forEach(b=> b.addEventListener('click', onClick));
      // cancel if user clicks outside
      modal.addEventListener('click', function out(e){ if(e.target === modal){ modal.removeEventListener('click', out); cleanup(); reject(); } });
    });
  }

  // interactions
  // Carregar dados das cartas para uso local
  let localCardsData = null;
  async function loadLocalCardsData() {
    if(localCardsData) return localCardsData;
    try {
      const res = await fetch('cards_data.json');
      localCardsData = await res.json();
    } catch(e) {
      localCardsData = null;
    }
    return localCardsData;
  }

  async function drawCard(player){
    // returns created card or null
    const data = await loadLocalCardsData();
    if(!data) return null;
    // ensure deck exists for player
    if(!decks[player] || decks[player].length === 0){
      // no card available
      return null;
    }
    const randKey = decks[player].pop();
    const cardInfo = (data && data[randKey]) ? data[randKey] : null;
    const title = (cardInfo && (cardInfo.name || cardInfo.title)) ? (cardInfo.name || cardInfo.title) : (randKey);
    // try several common image keys and fallbacks used by cards.html
    const img = (cardInfo && (cardInfo['3d'] || cardInfo['3d-model'] || cardInfo.img)) || `imagens/${randKey}/3d.svg`;
    const stats = (cardInfo && cardInfo.stats) ? cardInfo.stats : { forca:40, agilidade:40, magia:40 };
    const newCard = createCard(title, img, stats, player);
    if(player === 'player'){
      playerHand.appendChild(newCard);
    } else if(player === 'opponent'){
      opponentHand.appendChild(newCard);
    }
    try{ console.debug('[cart-game.js] drawCard()', player, '->', newCard.dataset.owner, 'draggable=', newCard.draggable, newCard); }catch(e){}
    return newCard;
  }

  drawBtns.forEach(btn => btn.addEventListener('click', async ()=>{
    const player = btn.dataset.player;
    if(socket) { socket.emit('draw:request', player); return; }
    // local draw rules
    if(player === 'player'){
      if(playerHand.children.length >= 5) { showToast('Limite de 5 cartas atingido!'); return; }
    }
    await drawCard(player);
  }));

  document.querySelectorAll('.deck-toggle').forEach(t => t.addEventListener('click', ()=>{
    const expanded = t.getAttribute('aria-expanded') === 'true'; t.setAttribute('aria-expanded', String(!expanded));
    const panel = t.nextElementSibling; if(panel) panel.setAttribute('aria-hidden', String(expanded));
  }));

  // --- Drag & drop / play mechanics ---
  function makeDraggable(card){
    card.draggable = true;
    card.addEventListener('dragstart', (e)=>{
      // defensive: block dragging of non-player cards
      if(card.dataset.owner && card.dataset.owner !== 'player'){ console.debug('[cart-game.js] dragstart prevented for owner=', card.dataset.owner, card); e.preventDefault(); return; }
      console.debug('[cart-game.js] dragstart allowed for', card.dataset.owner, card);
      e.dataTransfer.setData('text/plain', card.dataset.title || 'card');
      e.dataTransfer.setData('application/x-card-owner', card.dataset.owner || 'player');
      card.classList.add('dragging');
      // store reference so we can move the element on drop
      e.dataTransfer.setData('application/x-card-index', '');
      window._draggedCard = card;
    });
    card.addEventListener('dragend', ()=>{ card.classList.remove('dragging'); window._draggedCard = null; });
  }

  function allowSlotBehavior(){
    const slots = document.querySelectorAll('.battle-slot');
    slots.forEach(slot => {
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('slot-over'); });
      slot.addEventListener('dragleave', e => { slot.classList.remove('slot-over'); });
      slot.addEventListener('drop', e => {
        e.preventDefault(); slot.classList.remove('slot-over');
        const card = window._draggedCard;
        if(!card) return;
        // block using opponent-owned cards
        if(card.dataset.owner && card.dataset.owner !== 'player'){ showToast('Você não pode usar cartas do adversário'); return; }
        const owner = slot.dataset.player || 'neutral';
        // only allow player to drop on player slot when it's player's turn
        if(state.turn !== 'player' && owner === 'player') { showToast('Não é seu turno'); return; }
        if(owner === 'opponent' && state.turn === 'player'){ showToast('Você não pode jogar no slot do oponente'); return; }
        // if player plays, show attribute picker before resolve
        if(owner === 'player'){
          // move card visually but keep it available
          slot.innerHTML = '';
          slot.appendChild(card);
          card.classList.add('played');
          // show modal
          showAttrModal().then(attr => {
            state.selectedAttribute = attr;
            state.lastPlayed.player = { title: card.dataset.title, stats: JSON.parse(card.dataset.stats), el: card, owner: 'player' };
            // after attribute chosen, let opponent play
            state.turn = 'opponent'; updateTurnUI();
            setTimeout(()=> opponentPlay(), 700);
          }).catch(()=>{
            // cancelled or closed: return card to hand
            const hand = document.querySelector('.player-bottom .player-hand'); if(hand) hand.appendChild(card);
          });
          return;
        }
        playCardToSlot(card, slot, owner);
      });
    });
  }

  function playCardToSlot(card, slot, owner){
    // move card DOM into slot
    slot.innerHTML = '';
    slot.appendChild(card);
    card.style.position = 'relative';
    card.classList.add('played');
    // store lastPlayed
    state.lastPlayed[owner] = { title: card.dataset.title, stats: JSON.parse(card.dataset.stats), el: card, owner };
    updateTurnUI();
    // if both sides have a played card, resolve
    const both = state.lastPlayed.player && state.lastPlayed.opponent;
    if(both) resolveBattle();
    else if(owner === 'player'){
      // end player's immediate action
      // switch to opponent
      state.turn = 'opponent'; updateTurnUI();
      setTimeout(()=> opponentPlay(), 800);
    }
  }

  function resolveBattle(){
    const p = state.lastPlayed.player;
    const o = state.lastPlayed.opponent;
    if(!p || !o) return;
    // compare based on selectedAttribute if present
    const selectedAttr = state.selectedAttribute;
    let winner = null;
    if(selectedAttr){
      const pv = (p.stats && (p.stats[selectedAttr]||0));
      const ov = (o.stats && (o.stats[selectedAttr]||0));
      if(pv > ov) winner = 'player';
      else if(ov > pv) winner = 'opponent';
      else winner = 'tie';
    } else {
      // fallback to total power
      const sum = s => (s.fe||0) + (s.coragem||0) + (s.influencia||0);
      const ps = sum(p.stats);
      const os = sum(o.stats);
      if(ps > os) winner = 'player';
      else if(os > ps) winner = 'opponent';
      else winner = 'tie';
    }

    if(winner === 'player'){
      showToast('Você venceu a batalha!');
      state.life.opponent -= 3; // damage
      animateLifeChange('opponent', state.life.opponent);
      // show damage effect on opponent slot
      const oslot = document.querySelector('.battle-slot.opponent-slot'); showDamageEffect(oslot);
    } else if(winner === 'opponent'){
      showToast('O oponente venceu!');
      state.life.player -= 3;
      animateLifeChange('player', state.life.player);
      const pslot = document.querySelector('.battle-slot.player-slot'); showDamageEffect(pslot);
    } else {
      showToast('Empate! Ninguém leva dano');
    }

    // highlight chosen attribute rows if present
    const attrChosen = state.selectedAttribute;
    if(attrChosen){
      const idx = attrChosen === 'fe' ? 0 : attrChosen === 'coragem' ? 1 : 2;
      try{
        const pstat = p.el && p.el.querySelector('.elemento__stats');
        const ostat = o.el && o.el.querySelector('.elemento__stats');
        if(pstat && pstat.children[idx]) pstat.children[idx].classList.add('stat--highlight');
        if(ostat && ostat.children[idx]) ostat.children[idx].classList.add('stat--highlight');
      }catch(e){}
    }
    // cleanup played cards
    setTimeout(()=>{
      ['player','opponent'].forEach(k => {
        const lp = state.lastPlayed[k];
        // remove highlight if present
        try{ if(lp && lp.el){ const s = lp.el.querySelector('.elemento__stats'); if(s) Array.from(s.children).forEach(c=>c.classList.remove('stat--highlight')); } }catch(e){}
        if(lp && lp.el && lp.el.parentElement) lp.el.parentElement.removeChild(lp.el);
        state.lastPlayed[k] = null;
      });
      // update life in UI
      document.querySelectorAll('.player').forEach(pEl => {
        const who = pEl.dataset.player;
        const lv = pEl.querySelector('.life-value'); if(lv) lv.textContent = state.life[who];
      });
      // check victory
      if(state.life.player <= 0 || state.life.opponent <= 0){
        const winner = state.life.player <= 0 ? 'Oponente' : 'Você';
        showToast('Fim de jogo: ' + winner + ' venceu');
        state.turn = 'ended'; updateTurnUI();
        return;
      }
      // next turn goes to player; clear selectedAttribute
      state.selectedAttribute = null;
      state.turn = 'player'; updateTurnUI();
    }, 900);
  }

  function opponentPlay(){
    // naive: pick first card in opponentHand and play to opponent slot
    const oppHand = document.querySelector('.player-top .player-hand');
    const oppSlot = document.querySelector('.battle-slot.opponent-slot');
    if(oppHand && oppHand.children.length > 0){
      let chosenIdx = 0;
      // if player already selected an attribute, try to counter it by picking highest on that attr
      if(state.selectedAttribute){
        let best = -1; Array.from(oppHand.children).forEach((c,i)=>{ try{ const s = JSON.parse(c.dataset.stats); const v = s[state.selectedAttribute]||0; if(v>best){ best=v; chosenIdx=i; } }catch(e){} });
      } else {
        // else pick card with highest total power
        let bestVal = -1; Array.from(oppHand.children).forEach((c,i)=>{ try{ const s = JSON.parse(c.dataset.stats); const tot = (s.fe||0)+(s.coragem||0)+(s.influencia||0); if(tot>bestVal){ bestVal=tot; chosenIdx=i; } }catch(e){} });
      }
      const card = oppHand.children[chosenIdx];
      // choose attribute automatically: highest stat on chosen card
      try{ const s = JSON.parse(card.dataset.stats); const arr = [{k:'fe',v:s.fe},{k:'coragem',v:s.coragem},{k:'influencia',v:s.influencia}]; arr.sort((a,b)=>b.v-a.v); state.selectedAttribute = arr[0].k; }catch(e){ state.selectedAttribute = null; }
      playCardToSlot(card, oppSlot, 'opponent');
    } else {
      // if no card, draw then play
      drawBtns[0] && drawBtns[0].click();
      setTimeout(()=>{
        if(oppHand && oppHand.children.length>0){ const card = oppHand.children[0]; playCardToSlot(card, oppSlot, 'opponent'); }
      }, 400);
    }
  }

  // --- buttons and nav ---
  document.getElementById('btn-toggle-decks') && document.getElementById('btn-toggle-decks').addEventListener('click', ()=> window.location.href='cards.html');
  document.getElementById('btn-home') && document.getElementById('btn-home').addEventListener('click', ()=> window.location.href='home.html');
  document.getElementById('btn-howto') && document.getElementById('btn-howto').addEventListener('click', ()=> window.location.href='howtoplay.html');
  document.getElementById('btn-reset') && document.getElementById('btn-reset').addEventListener('click', ()=> resetGame());
  btnEndTurn && btnEndTurn.addEventListener('click', ()=>{ state.turn = state.turn === 'player' ? 'opponent' : 'player'; updateTurnUI(); if(state.turn === 'opponent') setTimeout(opponentPlay, 600); });
  btnStart && btnStart.addEventListener('click', ()=> resetGame());

  function resetGame(){
    // clear hands and battlefield
    document.querySelectorAll('.player-hand').forEach(h => h.innerHTML = '');
    document.querySelectorAll('.battle-slot').forEach(s => s.innerHTML = s.classList.contains('player-slot') ? 'Você' : s.classList.contains('opponent-slot') ? 'Oponente' : 'Campo');
    state = { turn: 'player', life: { player:25, opponent:20 }, lastPlayed: { player:null, opponent:null } };
    document.querySelectorAll('.life-value').forEach(lv => { const p = lv.closest('.player'); if(p) lv.textContent = state.life[p.dataset.player]; });
    updateTurnUI();
    showToast('Jogo reiniciado');
    // build new shuffled decks limited to MAX_DECK_CARDS
    (async function prepareDecks(){
      const data = await loadLocalCardsData();
      const keys = data ? Object.keys(data) : DEFAULT_LIBRARY.slice();
      // if cards_data.json present, ensure we only use keys that actually exist in data
      let usable = keys;
      if(data){ usable = keys.filter(k => k in data); }
      if(!usable || usable.length === 0) usable = DEFAULT_LIBRARY.slice();
      // helper to create a shuffled copy
        // build a stable ordered list matching the cards page (no shuffle)
        // prefer CARDS_PAGE_ORDER filtered by available keys in `usable`.
        const ordered = CARDS_PAGE_ORDER.filter(k => usable.indexOf(k) !== -1);
        // fallback: if ordered is empty, use the usable list as-is
        const finalList = (ordered && ordered.length > 0) ? ordered : usable;
    // reverse so pop() returns the items in cards page order (pop takes from the end)
    decks.player = finalList.slice(0, MAX_DECK_CARDS).reverse();
    decks.opponent = finalList.slice(0, MAX_DECK_CARDS).reverse();
      // update deck-count UI
      document.querySelectorAll('.deck-count').forEach(dc => dc.textContent = String(MAX_DECK_CARDS));
      // draw starter hands (2 each)
      setTimeout(async ()=>{
        await drawCard('player'); await drawCard('player');
        await drawCard('opponent'); await drawCard('opponent');
      }, 120);
    })();
  }

  // animate life change with small counter and shake
  function animateLifeChange(playerKey, newVal){
    const pEl = document.querySelector(`.player[data-player="${playerKey}"]`);
    if(!pEl) return;
    const lv = pEl.querySelector('.life-value');
    if(!lv) return;
    const start = parseInt(lv.textContent,10) || 0;
    const delta = newVal - start;
    const steps = 12; let i = 0;
    const timer = setInterval(()=>{
      i++; const val = Math.round(start + (delta * (i/steps))); lv.textContent = val;
      if(i>=steps){ clearInterval(timer); lv.textContent = newVal; }
    }, 30);
    // shake the player box
    pEl.animate([{ transform: 'translateX(0)' },{ transform: 'translateX(-6px)' },{ transform: 'translateX(6px)' },{ transform: 'translateX(0)' }], { duration: 380, easing: 'ease-out' });
  }

  function showDamageEffect(slotEl){
    if(!slotEl) return;
    const burst = document.createElement('div'); burst.className='damage-burst'; Object.assign(burst.style,{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:1200});
    for(let i=0;i<8;i++){
      const p = document.createElement('div'); p.className='particle'; Object.assign(p.style,{width:'8px',height:'8px',background:'rgba(255,140,80,0.95)',borderRadius:'50%',position:'absolute',left:'0',top:'0',transform:`translate(0,0) scale(0.9)`,opacity:1});
      burst.appendChild(p);
      // animate each particle
      const ang = (Math.PI*2/8)*i; const vx = Math.cos(ang)*40; const vy = Math.sin(ang)*40;
      p.animate([{ transform:'translate(0,0) scale(1)', opacity:1 },{ transform:`translate(${vx}px,${vy}px) scale(0.6)`, opacity:0 }], { duration: 640, delay: i*20, easing:'cubic-bezier(.2,.9,.2,1)' });
    }
    slotEl.appendChild(burst);
    setTimeout(()=> burst.remove(), 900);
  }

  // initialize UI and slots
  allowSlotBehavior();
  updateTurnUI();
  // preload life values
  document.querySelectorAll('.life-value').forEach(lv => { const p = lv.closest('.player'); if(p) lv.textContent = state.life[p.dataset.player]; });
  // start with a small hand for both
  resetGame();

  function showToast(text, timeout = 2600){
    let toast = document.querySelector('.game-toast');
    if(!toast){ toast = document.createElement('div'); toast.className = 'game-toast'; Object.assign(toast.style,{position:'fixed',right:'18px',bottom:'18px',padding:'10px 14px',background:'#071018',color:'#cfeefb',borderRadius:'8px',zIndex:9999,transition:'opacity 220ms'}); document.body.appendChild(toast); }
    toast.textContent = text; toast.style.opacity = '1'; clearTimeout(toast._tm); toast._tm = setTimeout(()=> toast.style.opacity = '0', timeout);
  }

  // handle ?card= parameter — load artwork info from frontend/cards_data.json when available
  (async function handleCardParam(){
    try{
      const params = new URLSearchParams(window.location.search);
      const cardParam = params.get('card');
      if(!cardParam) return;
      let data = null;
      try{ const res = await fetch('cards_data.json'); data = await res.json(); }catch(e){ data = null; }
      const info = data && data[cardParam] ? data[cardParam] : null;
      const title = (info && info.name) ? info.name : cardParam;
  // Atualiza nome do deck
  window.selectedDeckName = title;
  if(typeof updateDeckNames === 'function') updateDeckNames();
  showToast('Carta importada: ' + title);
    }catch(e){ /* ignore */ }
  })();

  // keyboard shortcut T to end-turn
  document.addEventListener('keydown', e => {
    if(e.key.toLowerCase() === 't'){
      if(socket) socket.emit('turn:end');
      else if(turnIndicator){ const cur = turnIndicator.textContent.replace('Turno: ','') || 'player'; const next = cur === 'player' ? 'opponent' : 'player'; turnIndicator.textContent = 'Turno: ' + next; }
    }
  });
});
