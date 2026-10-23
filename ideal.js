// Flan pâtissier illustré : chaque critère a sa partie du dessin, qui varie avec la note.
const mix = (a, b, t) => {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

function dessinerFlan(val, src) {
  const v = id => val[id] || 0;
  const court = id => { const c = CONFIG.criteres.find(x => x.id === id); return c ? c.court : id; };
  const cnt = (id, div, max) => Math.min(max, Math.round(v(id) / div));
  const esc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const E = '#3B2A1A';
  let t = 0;
  const piece = inner => '<g class="piece" style="animation-delay:' + (t += 0.1).toFixed(2) + 's">' + inner + '</g>';
  const s0 = v('visuel') / 10;
  // La photo du flan : position et taille dans le dessin (fractions de l'image -> coordonnées)
  const IX = 45, IY = 112, IW = 300, IH = 216;
  const F = (fx, fy) => [(IX + fx * IW).toFixed(1), (IY + fy * IH).toFixed(1)];

  let s = '<defs><radialGradient id="gpl" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#DCE6EC"/></radialGradient>' +
    '<path id="rim" d="M75 345 Q195 374 315 345" fill="none"/></defs>';
  s += '<rect class="fond" x="4" y="4" width="432" height="412" rx="26"/>';

  // assiette avec liseré bordeaux (clin d'œil au visuel du tour)
  s += '<ellipse cx="195" cy="318" rx="190" ry="50" fill="url(#gpl)" stroke="' + E + '" stroke-width="3"/>' +
       '<ellipse cx="195" cy="318" rx="172" ry="42" fill="none" stroke="#6A1325" stroke-width="2"/>' +
       '<ellipse cx="195" cy="318" rx="167" ry="39" fill="none" stroke="#6A1325" stroke-width="1" opacity=".6"/>' +
       '<text font-size="8" letter-spacing="1.8" fill="#6A1325"><textPath href="#rim" startOffset="50%" text-anchor="middle">BORDEAUX TOUJOURS PLUS BON</textPath></text>' +
       '<ellipse cx="205" cy="330" rx="150" ry="12" fill="' + E + '" opacity=".15"/>';
  // miettes sur l'assiette (texture)
  [[60, 338], [95, 345], [132, 341], [48, 326], [160, 347], [300, 340], [326, 328]].slice(0, cnt('texture', 1.5, 7)).forEach(p => {
    s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="#C98A33" stroke="' + E + '" stroke-width="1"/>';
  });

  // la part de flan (PNG) : plus l'aspect visuel est haut, plus les couleurs sont éclatantes
  let part = '<image href="flan.webp" x="' + IX + '" y="' + IY + '" width="' + IW + '" height="' + IH + '" style="filter:saturate(' + (0.45 + 0.75 * s0).toFixed(2) + ')"/>';
  [[0.30, 0.52], [0.45, 0.40], [0.60, 0.32], [0.76, 0.30]].slice(0, cnt('visuel', 2.5, 4)).forEach((p, i) => {
    const [x, y] = F(p[0], p[1]);
    part += '<path class="etincelle" style="animation-delay:' + (i * 0.35) + 's" transform="translate(' + x + ' ' + y + ')" d="M0-9L2.7-2.7L9 0L2.7 2.7L0 9L-2.7 2.7L-9 0L-2.7-2.7Z" fill="#fff" stroke="' + E + '" stroke-width="1"/>';
  });
  [[0.38, 0.31], [0.50, 0.15], [0.62, 0.02], [0.74, 0.10]].slice(0, cnt('odorat', 2.5, 4)).forEach((p, i) => {
    const [x, y] = F(p[0], p[1]);
    part += '<path class="fumee" style="animation-delay:' + (i * 0.4) + 's" d="M' + x + ' ' + (y - 4) + ' c7 -9 -7 -17 0 -26 s-7 -17 0 -26" fill="none" stroke="#7D93A3" stroke-width="4.5" stroke-linecap="round"/>';
  });
  s += piece(part);

  // enseigne d'accueil : le sourire suit la note
  const kk = (v('accueil') - 5) * 3.2;
  s += piece('<line x1="50" y1="46" x2="50" y2="68" stroke="' + E + '" stroke-width="2"/>' +
    '<circle cx="50" cy="92" r="24" fill="#FFD166" stroke="' + E + '" stroke-width="3"/>' +
    '<circle cx="42" cy="86" r="2.8" fill="' + E + '"/><circle cx="58" cy="86" r="2.8" fill="' + E + '"/>' +
    '<path d="M38 99 Q50 ' + (99 + kk).toFixed(1) + ' 62 99" fill="none" stroke="' + E + '" stroke-width="3" stroke-linecap="round"/>' +
    (v('accueil') >= 8 ? '<circle cx="35" cy="95" r="4" fill="#FF8FA3" opacity=".75"/><circle cx="65" cy="95" r="4" fill="#FF8FA3" opacity=".75"/>' : ''));

  // cœurs (goût)
  [[340, 130], [372, 100], [402, 132], [392, 70], [352, 82]].slice(0, cnt('gout', 2, 5)).forEach((p, i) => {
    s += '<g transform="translate(' + p[0] + ' ' + p[1] + ')"><path class="coeur" style="animation-delay:' + (i * 0.3) + 's" d="M0 7 C-14 -4 -8 -15 0 -7 C8 -15 14 -4 0 7Z" fill="#E63946" stroke="' + E + '" stroke-width="2"/></g>';
  });

  // pile de pièces (rapport qualité/prix)
  const nP = cnt('prix', 1, 10);
  let pile = '';
  for (let i = 0; i < nP; i++) pile += '<ellipse cx="408" cy="' + (350 - i * 6.5) + '" rx="19" ry="6.5" fill="#F4B400" stroke="' + E + '" stroke-width="2"/>';
  if (nP) pile += '<ellipse cx="403" cy="' + (348.5 - (nP - 1) * 6.5) + '" rx="8" ry="2" fill="#fff" opacity=".45"/><text x="410" y="' + (353 - (nP - 1) * 6.5) + '" text-anchor="middle" font-size="9" font-weight="700" fill="#8A5A00">€</text>';
  s += piece(pile);

  // bulles : « Critère : nom de la pâtisserie d'où vient la meilleure note »
  const nom = id => src[id] || 'pas noté';
  const larg = id => Math.round(Math.max((court(id).length + 2) * 7, nom(id).length * 5.9) + 18);
  const bulle = (id, x, y) => {
    const w = larg(id);
    return piece('<g class="tag' + (src[id] ? '' : ' vide') + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="38" rx="12"/>' +
      '<text class="t1" x="' + (x + w / 2) + '" y="' + (y + 16) + '" text-anchor="middle">' + esc(court(id)) + ' :</text>' +
      '<text class="t2" x="' + (x + w / 2) + '" y="' + (y + 31) + '" text-anchor="middle">' + esc(nom(id)) + '</text></g>');
  };
  const guide = (x1, y1, x2, y2) => '<line class="guide" x1="' + (+x1).toFixed(1) + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
  const wa = larg('accueil'), wo = larg('odorat'), wg = larg('gout'), wv = larg('visuel'), wt = larg('texture'), wp = larg('prix');
  const xg = 434 - wg;
  const xo = Math.min(Math.max(232 - wo / 2, 6 + wa + 8), xg - wo - 8);
  const xp = 434 - wp;
  const surf = F(0.30, 0.52), vap = F(0.50, 0.13);
  s += guide(xo + wo / 2, 46, vap[0], vap[1]) + guide(xg + wg / 2, 46, 372, 66) +
       guide(6 + wv / 2, 168, surf[0], surf[1]) + guide(6 + wt / 2, 374, 95, 326) + guide(xp + wp / 2, 374, 408, 358);
  s += bulle('accueil', 6, 8) + bulle('odorat', xo, 8) + bulle('gout', xg, 8) +
       bulle('visuel', 6, 130) + bulle('texture', 6, 374) + bulle('prix', xp, 374);
  return s;
}

// Flan idéal : la meilleure note de chaque critère parmi les flans notés par le participant.
// Avant la révélation du podium, chacun ne voit que le sien.
async function initIdeal() {
  const q = id => document.getElementById(id);
  const qui = q('qui'), etat = q('etat'), bloc = q('ideal'), filtre = q('filtre');
  if (!CONFIG.endpoint) { etat.textContent = "Renseigne l'endpoint dans app.js."; return; }
  const moi = (load().nom || '').trim();
  if (!moi) { etat.textContent = "Entre ton prénom sur l'accueil pour voir ton flan idéal."; return; }
  let st;
  try { st = await getStatut(); } catch (e) { etat.textContent = 'Impossible de charger les données (' + raison(e) + ').'; return; }
  const noms = st.revele ? st.participants : [moi];
  noms.forEach(n => qui.append(new Option(n, n)));
  qui.value = noms.find(n => n.toLowerCase() === moi.toLowerCase()) || noms[0];
  filtre.hidden = !st.revele;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  const rendre = async () => {
    const nom = qui.value;
    let p;
    try { p = await getPerso(nom); } catch (e) { etat.textContent = 'Impossible de charger les données (' + raison(e) + ').'; return; }
    const best = CONFIG.criteres.map(c => {
      let b = null;
      p.notes.forEach(n => {
        const x = n.scores ? n.scores[c.id] : null;
        if (x != null && (b === null || x > b.v)) b = { v: x, id: n.id, pat: n.patisserie };
      });
      return { c, b };
    });
    const vals = best.filter(x => x.b).map(x => x.b.v);
    if (!vals.length) { bloc.hidden = true; etat.textContent = nom + " n'a pas encore noté de flan."; return; }
    etat.textContent = ''; bloc.hidden = false;
    const col = p.couleur || (st.couleurs || {})[nom] || '#6A1325';
    bloc.style.setProperty('--c', col);
    bloc.style.setProperty('--ct', luminance(col) > 0.6 ? '#2B0A0A' : '#fff');
    q('titre-ideal').replaceChildren(pastille(nom, col), document.createTextNode(' Le flan idéal de ' + nom));
    q('note-ideal').textContent = fmt(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10) + '/10';
    const val = {}, src = {};
    best.forEach(x => { val[x.c.id] = x.b ? x.b.v : null; src[x.c.id] = x.b ? nomPat(x.b.id, x.b.pat) : null; });
    q('flan').innerHTML = dessinerFlan(val, src);
    const ul = q('recette'); ul.replaceChildren();
    best.forEach((x, i) => {
      const li = el('li'); li.style.animationDelay = (0.9 + i * 0.12) + 's';
      li.append(el('span', 'cr', x.c.label), el('span', 'nt', x.b ? fmt(x.b.v) : '–'),
        el('span', 'fl', x.b ? 'de ' + nomPat(x.b.id, x.b.pat) : 'pas noté'));
      ul.append(li);
    });
  };
  qui.addEventListener('change', rendre); rendre();
}
initIdeal();
