// Écran de révélation 16:9 : Espace / Entrée / → ou clic pour dévoiler la place suivante.
const ord = k => (k === 1 ? '1re' : k + 'e');

function confettis(cv) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = cv.getContext('2d');
  cv.width = cv.clientWidth; cv.height = cv.clientHeight;
  const ps = Array.from({ length: 170 }, () => ({
    x: Math.random() * cv.width, y: -Math.random() * cv.height * 0.6,
    vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, a: Math.random() * 6,
    r: cv.width / 200 + Math.random() * cv.width / 160,
    c: Math.random() < 0.3 ? '#E3B04B' : CONFIG.couleurs[Math.floor(Math.random() * CONFIG.couleurs.length)]
  }));
  let t = 0;
  const f = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ps.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.a += 0.1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
    });
    if (++t < 420) requestAnimationFrame(f); else ctx.clearRect(0, 0, cv.width, cv.height);
  };
  f();
}

async function chargerTout() {
  const st = await getStatut();
  if (st.revele) return getGeneral();
  const mdp = sessionStorage.getItem(MDP_KEY);
  const r = mdp ? await apiPost({ action: 'tout', mdp }) : null;
  if (!r || !r.ok) { sessionStorage.removeItem(MDP_KEY); location.replace('admin.html'); throw new Error('mdp'); }
  return r;
}

async function initReveal() {
  const q = id => document.getElementById(id);
  const scene = q('scene'), liste = q('liste4'), podium = q('podium');
  const aide = q('aide'), verdict = q('verdict'), cv = q('confetti');
  if (getComputedStyle(scene).position !== 'relative') { aide.textContent = 'scene.css est introuvable : vérifie qu\'il est bien en ligne.'; return; }
  if (!CONFIG.endpoint) { aide.textContent = "Renseigne l'endpoint dans app.js."; return; }
  let d;
  try { d = await chargerTout(); } catch (e) { aide.textContent = 'Impossible de charger les résultats (' + raison(e) + ').'; return; }
  const rangs = d.classement, n = rangs.length;
  if (!n) { aide.textContent = "Aucune note pour l'instant."; return; }
  const tp = topsPar(d);
  let slots, prochain;
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const message = () => {
    aide.textContent = prochain < 1 ? 'Espace : recommencer' : 'Espace ou clic : dévoiler la ' + ord(prochain) + ' place';
  };
  const construire = () => {
    liste.replaceChildren(); podium.replaceChildren(); slots = {};
    scene.classList.remove('fini'); verdict.textContent = 'Le verdict'; prochain = n;
    for (let k = 4; k <= n; k++) {
      const li = el('li', 'ligne');
      li.append(el('span', 'r', k), el('span', 'nom', '???'), el('span', 'score', '–'), el('span', 'tops'));
      liste.append(li); slots[k] = li;
    }
    [2, 1, 3].forEach(k => {
      if (k > n) return;
      const c = el('div', 'col c' + k);
      c.append(el('div', 'num', k), el('div', 'nom', '???'), el('div', 'score', '–'), el('div', 'tops'));
      podium.append(c); slots[k] = c;
    });
    message();
  };
  const reveler = k => {
    const r = rangs[k - 1], s = slots[k];
    s.querySelector('.nom').textContent = nomPat(r.id, r.patisserie);
    s.querySelector('.score').textContent = fmt(r.moyenne) + '/10';
    const t = s.querySelector('.tops');
    (tp[r.id] || []).forEach(x => t.append(pastille(x.nom, x.couleur)));
    s.classList.add('on');
    if (k === 1) {
      scene.classList.add('fini');
      verdict.textContent = 'Le meilleur flan de Bordeaux !';
      confettis(cv);
    }
  };
  const avance = () => {
    if (prochain < 1) { construire(); return; }
    reveler(prochain--);
    message();
  };
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'BUTTON') return;
    if ([' ', 'Enter', 'ArrowRight'].includes(e.key)) { e.preventDefault(); avance(); }
  });
  scene.addEventListener('click', avance);
  q('suivant').addEventListener('click', e => { e.stopPropagation(); e.currentTarget.blur(); avance(); });
  q('plein').addEventListener('click', e => {
    e.currentTarget.blur();
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  });
  construire();
}
initReveal().catch(e => { document.getElementById('aide').textContent = 'Erreur : ' + e.message; });
