// ====== CONFIG : à modifier ici uniquement ======
const CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbxAWOz7Uj1Dt3Hd7i4KoY-0EF0IQpPv_BUe1pcOcU66PcpRZuFI0J-xhzrqUuUFxJvymw/exec', // URL de l'Apps Script (vide = notes gardées sur l'appareil seulement)
  patisseries: [
    { id: 'p1', nom: 'Fraga' },
    { id: 'p2', nom: 'Pâti&co' },
    { id: 'p3', nom: 'Fournil à Créon' },
    { id: 'p4', nom: 'Maison Catarino' },
    { id: 'p5', nom: 'Saveurs et Croquants' },
    { id: 'p6', nom: 'Lapierre' }
  ],
  criteres: [
    { id: 'accueil', label: 'Accueil du lieu', court: 'Accueil' },
    { id: 'visuel', label: 'Aspect visuel', court: 'Visuel' },
    { id: 'odorat', label: 'Odorat', court: 'Odorat' },
    { id: 'texture', label: 'Texture', court: 'Texture' },
    { id: 'gout', label: 'Goût', court: 'Goût' },
    { id: 'prix', label: 'Rapport qualité/prix', court: 'Prix' }
  ],
  // 2 lignes de 10 (l'affichage est en grille de 10 colonnes)
  couleurs: ['#D7263D', '#F46036', '#F6A800', '#EBCB00', '#9BB916', '#2E933C', '#1B998B', '#2D7DD2', '#7B2CBF', '#E75A97',
             '#8E1B2E', '#B4541A', '#8D5524', '#6B7A1F', '#14694E', '#0E7C86', '#3E4C9F', '#5B2A86', '#B5179E', '#5C6770']
};

// ====== Stockage local ======
const KEY = 'flantour';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };
const moyenne = s => {
  const v = Object.values(s).filter(x => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null;
};
const fmt = n => String(n).replace('.', ',');
const nomPat = (id, repli) => { const p = CONFIG.patisseries.find(x => x.id === id); return p ? p.nom : repli; };
const luminance = h => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
function pastille(nom, couleur) {
  const s = document.createElement('span');
  const c = couleur || '#8A7F73';
  s.className = 'pastille';
  s.textContent = (nom || '?').trim().charAt(0).toUpperCase();
  s.style.background = c;
  s.style.color = luminance(c) > 0.6 ? '#2B0A0A' : '#fff';
  s.title = nom; s.setAttribute('aria-label', nom);
  return s;
}
// Pour chaque flan : les participants dont c'est le top 1 (ex aequo inclus)
function topsPar(d) {
  const m = {};
  d.personnel.forEach(p => {
    if (!p.notes.length) return;
    const max = p.notes[0].moyenne;
    p.notes.filter(n => n.moyenne === max).forEach(n =>
      (m[n.id] = m[n.id] || []).push({ nom: p.participant, couleur: (d.couleurs || {})[p.participant] }));
  });
  return m;
}
const MDP_KEY = 'flantour_mdp';
async function api(action, params) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const u = CONFIG.endpoint + (CONFIG.endpoint.includes('?') ? '&' : '?') + new URLSearchParams(Object.assign({ action }, params || {}));
    return await (await fetch(u, { signal: ctl.signal })).json();
  } finally { clearTimeout(t); }
}
async function apiPost(obj) {
  const res = await fetch(CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(obj) });
  return res.json();
}
const getStatut = async () => { const r = await api('statut'); if (!r.ok || !Array.isArray(r.participants)) throw new Error('script'); return r; };
const getPerso = async nom => { const r = await api('perso', { nom }); if (!r.ok) throw new Error('script'); return r; };
const getGeneral = async () => { const r = await api('general'); if (!r.ok) throw new Error(r.erreur === 'verrouille' ? 'verrou' : 'script'); return r; };
const raison = e => e && e.message === 'verrou' ? 'classement verrouillé'
  : e && e.message === 'script' ? 'réponse du script invalide'
  : e && e.name === 'AbortError' ? 'le script ne répond pas' : 'script injoignable';
const LOCK = '<svg class="ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V8a4 4 0 10-8 0v2z"/></svg>';

// ====== Page d'accueil ======
function initIndex() {
  const data = load();
  data.notes = data.notes || {};
  const nom = document.getElementById('nom');
  const liste = document.getElementById('liste');
  const palette = document.getElementById('palette');
  const alerte = document.getElementById('alerte');
  const btnG = document.getElementById('btn-general');
  const noteV = document.getElementById('note-verrou');
  nom.value = data.nom || '';
  const pret = () => nom.value.trim().length > 0 && !!data.couleur;
  const maj = () => {
    data.nom = nom.value.trim(); save(data);
    palette.querySelectorAll('.sw').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === data.couleur)));
    liste.querySelectorAll('a').forEach(a => a.classList.toggle('locked', !pret()));
    if (pret()) alerte.textContent = '';
  };
  CONFIG.couleurs.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sw'; b.dataset.c = c; b.style.background = c;
    b.setAttribute('aria-label', 'Couleur ' + c);
    b.addEventListener('click', () => { data.couleur = c; maj(); });
    palette.append(b);
  });
  CONFIG.patisseries.forEach(p => {
    const a = document.createElement('a');
    a.className = 'flan';
    a.href = 'form.html?p=' + encodeURIComponent(p.id);
    const t = document.createElement('span'); t.textContent = p.nom;
    const s = document.createElement('small');
    const n = data.notes[p.id];
    if (n) { a.classList.add('done'); s.textContent = 'noté ' + fmt(n.moyenne) + '/10'; }
    else s.textContent = 'à noter';
    a.append(t, s);
    a.addEventListener('click', e => {
      if (pret()) return;
      e.preventDefault();
      if (!nom.value.trim()) { alerte.textContent = 'Il te faut un prénom et une couleur avant de noter : commence par ton prénom.'; nom.focus(); }
      else {
        alerte.textContent = 'Choisis ta couleur (obligatoire) pour pouvoir noter.';
        palette.classList.remove('erreur'); void palette.offsetWidth; palette.classList.add('erreur');
        palette.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    liste.append(a);
  });
  nom.addEventListener('input', maj); maj();

  // Classement général : verrouillé tant que le podium n'a pas été révélé (la Sheet décide)
  const etatG = locked => {
    btnG.classList.toggle('verrou', locked);
    if (locked) btnG.setAttribute('aria-disabled', 'true'); else btnG.removeAttribute('aria-disabled');
    btnG.innerHTML = 'Classement général' + (locked ? LOCK : '');
    if (!locked) noteV.hidden = true;
  };
  etatG(!!CONFIG.endpoint);
  if (CONFIG.endpoint) getStatut().then(st => etatG(!st.revele)).catch(() => {});
  btnG.addEventListener('click', e => { if (btnG.classList.contains('verrou')) { e.preventDefault(); noteV.hidden = false; } });
}

// ====== Page formulaire ======
function initForm() {
  const data = load();
  const id = new URLSearchParams(location.search).get('p');
  const p = CONFIG.patisseries.find(x => x.id === id);
  if (!p || !data.nom) { location.replace('index.html'); return; }
  document.getElementById('titre').textContent = p.nom;
  document.title = p.nom + ' – Flan tour';
  const scores = Object.assign({}, data.notes && data.notes[id] ? data.notes[id].scores : {});
  const zone = document.getElementById('champs');
  const out = document.getElementById('moy');
  const btn = document.getElementById('envoi');
  const msg = document.getElementById('msg');

  const maj = () => {
    const m = moyenne(scores);
    out.textContent = m == null ? '–' : fmt(m);
    btn.disabled = m == null;
  };

  CONFIG.criteres.forEach(c => {
    const f = document.createElement('div'); f.className = 'field';
    const top = document.createElement('div'); top.className = 'top';
    const l = document.createElement('label'); l.htmlFor = 'r-' + c.id; l.textContent = c.label;
    const o = document.createElement('output'); o.htmlFor = 'r-' + c.id;
    top.append(l, o);
    const r = document.createElement('input');
    Object.assign(r, { type: 'range', id: 'r-' + c.id, min: 0, max: 10, step: 0.5, value: 5 });
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'clear'; x.textContent = 'Effacer';
    const set = v => {
      if (v == null) { delete scores[c.id]; f.classList.add('vide'); o.textContent = '–'; r.value = 5; }
      else { scores[c.id] = v; f.classList.remove('vide'); o.textContent = fmt(v); r.value = v; }
      maj();
    };
    r.addEventListener('input', () => set(parseFloat(r.value)));
    x.addEventListener('click', () => set(null));
    set(scores[c.id] != null ? scores[c.id] : null);
    f.append(top, r, x); zone.append(f);
  });

  btn.addEventListener('click', async () => {
    msg.textContent = '';
    const note = { scores, moyenne: moyenne(scores), date: new Date().toISOString() };
    if (CONFIG.endpoint) {
      btn.disabled = true;
      try {
        const res = await fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // évite le blocage CORS d'Apps Script
          body: JSON.stringify({ participant: data.nom, id, patisserie: p.nom, moyenne: note.moyenne, scores, couleur: data.couleur || '' })
        });
        const r = await res.json();
        if (!r.ok) throw new Error('le script répond : ' + (r.erreur || 'réponse invalide'));
      } catch (err) {
        console.error(err);
        const cause = err.message && err.message !== 'Failed to fetch' ? err.message : 'script injoignable';
        msg.textContent = 'Envoi impossible (' + cause + ').';
        btn.disabled = false; return;
      }
    }
    data.notes = data.notes || {}; data.notes[id] = note; save(data);
    location.href = 'index.html';
  });
  maj();
}

// ====== Page résultats (classement général, verrouillé jusqu'à la révélation) ======
function initResults() {
  const zone = document.getElementById('classement');
  const etat = document.getElementById('etat');
  const btn = document.getElementById('maj');
  const verrou = document.getElementById('verrou');
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const barre = m => { const i = document.createElement('i'); if (m != null) i.style.setProperty('--w', m * 10 + '%'); return i; };

  const rendre = d => {
    zone.replaceChildren();
    const total = d.participants.length;
    etat.textContent = total + ' participant' + (total > 1 ? 's' : '') + ' au total';
    const vus = new Set(d.classement.map(r => r.id));
    const tp = topsPar(d);
    const lignes = d.classement.slice();
    CONFIG.patisseries.forEach(p => {
      if (!vus.has(p.id)) lignes.push({ id: p.id, patisserie: p.nom, moyenne: null, votes: 0, votants: [] });
    });
    lignes.forEach((r, i) => {
      const li = el('li', 'rang' + (r.moyenne == null ? ' vide' : (i < 3 ? ' podium' : '')));
      const info = el('small', r.votes < total ? 'incomplet' : 'complet', r.votes + '/' + total + ' votant' + (total > 1 ? 's' : ''));
      const det = el('div', 'detail'); det.hidden = true;
      const ont = r.votants.map(x => x.toLowerCase());
      const manque = d.participants.filter(n => !ont.includes(n.toLowerCase()));
      det.append(el('p', null, 'Ont voté : ' + (r.votants.length ? r.votants.join(', ') : 'personne')));
      if (manque.length) det.append(el('p', 'manque', 'Pas encore voté : ' + manque.join(', ')));
      const tops = el('div', 'tops');
      (tp[r.id] || []).forEach(t => tops.append(pastille(t.nom, t.couleur)));
      if (tops.children.length) tops.prepend(el('span', 'cap', 'Top 1 de'));
      const plus = el('button', 'plus', '+');
      plus.type = 'button';
      plus.setAttribute('aria-expanded', 'false');
      plus.setAttribute('aria-label', 'Voir les votants : ' + nomPat(r.id, r.patisserie));
      plus.addEventListener('click', () => {
        det.hidden = !det.hidden;
        plus.textContent = det.hidden ? '+' : '−';
        plus.setAttribute('aria-expanded', String(!det.hidden));
      });
      li.append(el('span', 'nom-flan', nomPat(r.id, r.patisserie)),
        el('span', 'note-flan', r.moyenne == null ? '–' : fmt(r.moyenne) + '/10'),
        info, plus, tops, det, barre(r.moyenne));
      zone.append(li);
    });
  };

  const charger = async () => {
    etat.textContent = 'Chargement…'; btn.disabled = true;
    try {
      const st = await getStatut();
      if (!st.revele) { zone.replaceChildren(); etat.textContent = ''; verrou.hidden = false; btn.hidden = true; return; }
      verrou.hidden = true; btn.hidden = false;
      rendre(await getGeneral());
    } catch (err) {
      console.error(err);
      etat.textContent = 'Impossible de charger le classement (' + raison(err) + ').';
    }
    btn.disabled = false;
  };
  if (!CONFIG.endpoint) { etat.textContent = "Le classement s'affichera une fois l'endpoint renseigné dans app.js."; btn.hidden = true; return; }
  btn.addEventListener('click', charger); charger();
}

const page = document.body.dataset.page;
if (page === 'index') initIndex();
if (page === 'form') initForm();
if (page === 'results') initResults();
