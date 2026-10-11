// ====== CONFIG : à modifier ici uniquement ======
const CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbz04u1OxLQqRTe4VPd3e9WBJQdBGZ98DdfB-85Geb1w4c0mfc9w1czjh8NYeavkfdnafw/exec', // URL de l'Apps Script (vide = notes gardées sur l'appareil seulement)
  patisseries: [
    { id: 'p1', nom: 'Books and coffee' },
    { id: 'p2', nom: 'Môme' },
    { id: 'p3', nom: 'Miam' },
    { id: 'p4', nom: 'Beligius' },
    { id: 'p5', nom: 'Vanille Lina' },
    { id: 'p6', nom: 'Qu4tre-qu4rts' }
  ],
  criteres: [
    { id: 'accueil', label: 'Accueil du lieu' },
    { id: 'visuel', label: 'Aspect visuel' },
    { id: 'odorat', label: 'Odorat' },
    { id: 'texture', label: 'Texture' },
    { id: 'gout', label: 'Goût' },
    { id: 'prix', label: 'Rapport qualité/prix' }
  ]
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

// ====== Page d'accueil ======
function initIndex() {
  const data = load();
  data.notes = data.notes || {};
  const nom = document.getElementById('nom');
  const liste = document.getElementById('liste');
  nom.value = data.nom || '';
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
      if (!nom.value.trim()) { e.preventDefault(); nom.focus(); }
    });
    liste.append(a);
  });
  const maj = () => {
    const ok = nom.value.trim().length > 0;
    liste.querySelectorAll('a').forEach(a => a.classList.toggle('locked', !ok));
    data.nom = nom.value.trim(); save(data);
  };
  nom.addEventListener('input', maj); maj();
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
          body: JSON.stringify({ participant: data.nom, id, patisserie: p.nom, moyenne: note.moyenne, scores })
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

// ====== Page résultats ======
function initResults() {
  const zone = document.getElementById('classement');
  const etat = document.getElementById('etat');
  const btn = document.getElementById('maj');
  const filtre = document.getElementById('filtre');
  const vue = document.getElementById('vue');
  let d = null;

  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const nomDe = (id, repli) => { const p = CONFIG.patisseries.find(x => x.id === id); return p ? p.nom : repli; };
  const barre = m => { const i = document.createElement('i'); if (m != null) i.style.setProperty('--w', m * 10 + '%'); return i; };

  // Classement général, avec le contrôle des votants
  const general = () => {
    const total = d.participants.length;
    const vus = new Set(d.classement.map(r => r.id));
    const lignes = d.classement.slice();
    CONFIG.patisseries.forEach(p => {
      if (!vus.has(p.id)) lignes.push({ id: p.id, patisserie: p.nom, moyenne: null, votes: 0, votants: [] });
    });
    lignes.forEach((r, i) => {
      const li = el('li', 'rang' + (r.moyenne == null ? ' vide' : (i < 3 ? ' podium' : '')));
      const info = el('small', r.votes < total ? 'incomplet' : 'complet',
        r.votes + '/' + total + ' votant' + (total > 1 ? 's' : ''));
      const det = el('div', 'detail'); det.hidden = true;
      const ont = r.votants.map(x => x.toLowerCase());
      const manque = d.participants.filter(n => !ont.includes(n.toLowerCase()));
      det.append(el('p', null, 'Ont voté : ' + (r.votants.length ? r.votants.join(', ') : 'personne')));
      if (manque.length) det.append(el('p', 'manque', 'Pas encore voté : ' + manque.join(', ')));
      const plus = el('button', 'plus', '+');
      plus.type = 'button';
      plus.setAttribute('aria-expanded', 'false');
      plus.setAttribute('aria-label', 'Voir les votants : ' + nomDe(r.id, r.patisserie));
      plus.addEventListener('click', () => {
        det.hidden = !det.hidden;
        plus.textContent = det.hidden ? '+' : '−';
        plus.setAttribute('aria-expanded', String(!det.hidden));
      });
      li.append(el('span', 'nom-flan', nomDe(r.id, r.patisserie)),
        el('span', 'note-flan', r.moyenne == null ? '–' : fmt(r.moyenne) + '/10'),
        info, plus, det, barre(r.moyenne));
      zone.append(li);
    });
  };

  // Classement personnel d'un participant
  const perso = nom => {
    const p = d.personnel.find(x => x.participant.toLowerCase() === nom.toLowerCase());
    const notes = p ? p.notes : [];
    const vus = new Set(notes.map(n => n.id));
    const lignes = notes.map(n => ({ nom: nomDe(n.id, n.patisserie), moyenne: n.moyenne }));
    CONFIG.patisseries.forEach(pt => { if (!vus.has(pt.id)) lignes.push({ nom: pt.nom, moyenne: null }); });
    lignes.forEach((r, i) => {
      const li = el('li', 'rang' + (r.moyenne == null ? ' vide' : (i < 3 ? ' podium' : '')));
      li.append(el('span', 'nom-flan', r.nom),
        el('span', 'note-flan', r.moyenne == null ? '–' : fmt(r.moyenne) + '/10'));
      if (r.moyenne == null) li.append(el('small', null, 'pas noté'));
      li.append(barre(r.moyenne));
      zone.append(li);
    });
  };

  const rendre = () => {
    zone.replaceChildren();
    const n = vue.value;
    if (n) { etat.textContent = 'Classement de ' + n; perso(n); }
    else {
      const t = d.participants.length;
      etat.textContent = t + ' participant' + (t > 1 ? 's' : '') + ' au total';
      general();
    }
  };

  const remplir = () => {
    const cur = vue.value;
    vue.replaceChildren(new Option('Tous les participants', ''));
    d.participants.forEach(n => vue.append(new Option(n, n)));
    vue.value = d.participants.includes(cur) ? cur : '';
  };

  const charger = async () => {
    etat.textContent = 'Chargement…'; btn.disabled = true;
    try {
      const res = await fetch(CONFIG.endpoint);
      const r = await res.json();
      if (!r.ok) throw new Error('script');
      if (!Array.isArray(r.participants)) throw new Error('ancien');
      d = r; remplir(); rendre();
    } catch (err) {
      console.error(err);
      etat.textContent = err.message === 'ancien'
        ? "Le script n'est pas à jour : colle la nouvelle version de apps-script.gs et crée une nouvelle version du déploiement."
        : 'Impossible de charger le classement. Réessaie dans un instant.';
    }
    btn.disabled = false;
  };

  vue.addEventListener('change', () => d && rendre());
  if (!CONFIG.endpoint) {
    etat.textContent = "Le classement s'affichera une fois l'endpoint renseigné dans app.js.";
    btn.hidden = true; filtre.hidden = true; return;
  }
  btn.addEventListener('click', charger); charger();
}

const page = document.body.dataset.page;
if (page === 'index') initIndex();
if (page === 'form') initForm();
if (page === 'results') initResults();
