// Classement personnel. Avant la révélation : uniquement celui du participant lui-même.
async function initPerso() {
  const q = id => document.getElementById(id);
  const zone = q('classement'), etat = q('etat'), bloc = q('filtre'), vue = q('vue'), titre = q('titre-perso');
  if (!CONFIG.endpoint) { etat.textContent = "Renseigne l'endpoint dans app.js."; return; }
  const moi = (load().nom || '').trim();
  if (!moi) { etat.textContent = "Entre ton prénom sur l'accueil pour voir ton classement."; return; }
  let st;
  try { st = await getStatut(); } catch (e) { etat.textContent = 'Impossible de charger (' + raison(e) + ').'; return; }
  const noms = st.revele ? st.participants : [moi];
  noms.forEach(n => vue.append(new Option(n, n)));
  vue.value = noms.find(n => n.toLowerCase() === moi.toLowerCase()) || noms[0];
  bloc.hidden = !st.revele;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const rendre = async () => {
    const nom = vue.value;
    etat.textContent = 'Chargement…'; zone.replaceChildren();
    let p;
    try { p = await getPerso(nom); } catch (e) { etat.textContent = 'Impossible de charger (' + raison(e) + ').'; return; }
    titre.replaceChildren(pastille(nom, p.couleur || (st.couleurs || {})[nom]), document.createTextNode(' Classement de ' + nom));
    const vus = new Set(p.notes.map(n => n.id));
    const lignes = p.notes.map(n => ({ nom: nomPat(n.id, n.patisserie), moyenne: n.moyenne }));
    CONFIG.patisseries.forEach(pt => { if (!vus.has(pt.id)) lignes.push({ nom: pt.nom, moyenne: null }); });
    etat.textContent = p.notes.length ? '' : nom + " n'a pas encore noté de flan.";
    lignes.forEach((r, i) => {
      const li = el('li', 'rang' + (r.moyenne == null ? ' vide' : (i < 3 ? ' podium' : '')));
      li.append(el('span', 'nom-flan', r.nom), el('span', 'note-flan', r.moyenne == null ? '–' : fmt(r.moyenne) + '/10'));
      if (r.moyenne == null) li.append(el('small', null, 'pas noté'));
      const b = document.createElement('i'); if (r.moyenne != null) b.style.setProperty('--w', r.moyenne * 10 + '%');
      li.append(b); zone.append(li);
    });
  };
  vue.addEventListener('change', rendre); rendre();
}
initPerso();
