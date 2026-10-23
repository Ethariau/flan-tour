// À coller dans Extensions > Apps Script (depuis la Google Sheet), puis :
// Déployer > Gérer les déploiements > modifier > Nouvelle version (l'URL /exec reste la même).
//
// >>> CHANGE LE MOT DE PASSE ci-dessous avant de déployer. Il reste dans ce script, jamais dans les fichiers du site. <<<
const MOT_DE_PASSE = 'flan2026';

const FEUILLE = 'Notes';
const ENTETE = ['date', 'participant', 'id', 'patisserie', 'moyenne', 'details', 'couleur'];

function feuille_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(FEUILLE);
  if (!s) { s = ss.insertSheet(FEUILLE); s.appendRow(ENTETE); }
  if (s.getRange(1, ENTETE.length).getValue() !== 'couleur') s.getRange(1, 1, 1, ENTETE.length).setValues([ENTETE]);
  return s;
}

// Feuille « Config » : B1 = non / oui. Seul « oui » ouvre le classement général à tout le monde.
// Le site ne sait QUE passer de non à oui. Pour reverrouiller : modifier B1 à la main dans la Sheet.
function config_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName('Config');
  if (!s) {
    s = ss.insertSheet('Config');
    s.getRange(1, 1, 1, 3).setValues([['revele', 'non', 'Mettre "oui" pour afficher le classement général à tous']]);
  }
  return s;
}
function revele_() { return String(config_().getRange(1, 2).getValue()).trim().toLowerCase() === 'oui'; }

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Calcule tout (usage interne : ne jamais renvoyer tel quel tant que revele_() est faux, sauf avec le mot de passe).
function lire_() {
  const lignes = feuille_().getDataRange().getValues().slice(1);
  const parFlan = {}, gens = {}, perso = {}, cols = {};
  lignes.forEach(l => {
    const nom = String(l[1]);
    const cle = nom.toLowerCase();
    const id = String(l[2]);
    const m = Number(l[4]);
    let sc = {};
    try { sc = JSON.parse(l[5] || '{}'); } catch (x) {}
    if (!parFlan[id]) parFlan[id] = { id: id, patisserie: l[3], somme: 0, votants: [] };
    parFlan[id].somme += m;
    parFlan[id].votants.push(nom);
    if (!gens[cle]) gens[cle] = nom;
    if (l[6]) cols[cle] = String(l[6]);
    if (!perso[cle]) perso[cle] = { participant: gens[cle], notes: [] };
    perso[cle].notes.push({ id: id, patisserie: l[3], moyenne: m, scores: sc });
  });
  const classement = Object.keys(parFlan).map(k => {
    const f = parFlan[k];
    return { id: f.id, patisserie: f.patisserie, moyenne: Math.round(f.somme / f.votants.length * 100) / 100,
             votes: f.votants.length, votants: f.votants.sort((a, b) => a.localeCompare(b)) };
  }).sort((a, b) => b.moyenne - a.moyenne);
  const participants = Object.keys(gens).map(k => gens[k]).sort((a, b) => a.localeCompare(b));
  const couleurs = {};
  Object.keys(gens).forEach(k => { if (cols[k]) couleurs[gens[k]] = cols[k]; });
  const personnel = Object.keys(perso).map(k => {
    perso[k].notes.sort((a, b) => b.moyenne - a.moyenne);
    return perso[k];
  });
  return { participants: participants, couleurs: couleurs, classement: classement, personnel: personnel };
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || 'statut';
  try {
    // Statut : état du verrou + noms et couleurs (rien de secret)
    if (action === 'statut') {
      const d = lire_();
      return json_({ ok: true, revele: revele_(), participants: d.participants, couleurs: d.couleurs });
    }
    // Notes d'une seule personne (pour son classement perso et son flan idéal)
    if (action === 'perso') {
      const d = lire_();
      const nom = String(p.nom || '').trim().toLowerCase();
      const x = d.personnel.filter(y => y.participant.toLowerCase() === nom)[0];
      return json_({ ok: true, participant: x ? x.participant : String(p.nom || ''),
                     couleur: x ? (d.couleurs[x.participant] || '') : '', notes: x ? x.notes : [] });
    }
    // Classement général : refusé tant que la Sheet n'est pas passée à « oui »
    if (action === 'general') {
      if (!revele_()) return json_({ ok: false, erreur: 'verrouille' });
      const d = lire_(); d.ok = true;
      return json_(d);
    }
    return json_({ ok: false, erreur: 'action inconnue' });
  } catch (err) {
    return json_({ ok: false, erreur: String(err) });
  }
}

function doPost(e) {
  const verrou = LockService.getScriptLock();
  verrou.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);

    // Actions organisateur (mot de passe vérifié ici, côté serveur)
    if (d.action) {
      if (String(d.mdp || '') !== MOT_DE_PASSE) return json_({ ok: false, erreur: 'mot de passe' });
      if (d.action === 'verifier') return json_({ ok: true, revele: revele_() });
      if (d.action === 'tout') { const t = lire_(); t.ok = true; t.revele = revele_(); return json_(t); }
      if (d.action === 'reveler') { config_().getRange(1, 2).setValue('oui'); return json_({ ok: true, revele: true }); }
      return json_({ ok: false, erreur: 'action inconnue' });
    }

    // Vote d'un participant (remplace sa note précédente sur ce flan)
    const nom = String(d.participant || '').trim();
    const id = String(d.id || '');
    const m = Number(d.moyenne);
    if (!nom || !id || isNaN(m) || m < 0 || m > 10) return json_({ ok: false, erreur: 'données invalides' });
    const s = feuille_();
    const lignes = s.getDataRange().getValues();
    const nouvelle = [new Date(), nom, id, String(d.patisserie || ''), m, JSON.stringify(d.scores || {}), String(d.couleur || '')];
    let index = -1;
    for (let i = 1; i < lignes.length; i++) {
      if (String(lignes[i][1]).toLowerCase() === nom.toLowerCase() && String(lignes[i][2]) === id) { index = i + 1; break; }
    }
    if (index > 0) s.getRange(index, 1, 1, nouvelle.length).setValues([nouvelle]);
    else s.appendRow(nouvelle);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erreur: String(err) });
  } finally {
    verrou.releaseLock();
  }
}
