(function () {
  const q = id => document.getElementById(id);
  const err = q('err'), statut = q('statut');
  if (!CONFIG.endpoint) { err.textContent = "Renseigne l'endpoint dans app.js."; return; }
  const afficher = revele => {
    q('connexion').hidden = true; q('actions').hidden = false;
    statut.textContent = revele ? 'Classement général : débloqué pour tous.' : 'Classement général : verrouillé.';
    q('debloquer').hidden = !!revele;
  };
  const entrer = async mdp => {
    const r = await apiPost({ action: 'verifier', mdp });
    if (!r.ok) { sessionStorage.removeItem(MDP_KEY); throw new Error(r.erreur === 'mot de passe' ? 'mdp' : 'script'); }
    sessionStorage.setItem(MDP_KEY, mdp);
    afficher(r.revele);
  };
  q('entrer').addEventListener('click', async () => {
    err.textContent = '';
    try { await entrer(q('mdp').value); }
    catch (e) { err.textContent = e.message === 'mdp' ? 'Mot de passe incorrect.' : 'Impossible de contacter le script.'; }
  });
  q('mdp').addEventListener('keydown', e => { if (e.key === 'Enter') q('entrer').click(); });
  q('debloquer').addEventListener('click', async () => {
    if (!confirm('Dévoiler le classement général à tous les participants ?')) return;
    try {
      const r = await apiPost({ action: 'reveler', mdp: sessionStorage.getItem(MDP_KEY) || '' });
      if (!r.ok) throw new Error();
      afficher(true);
    } catch (e) { statut.textContent = 'Échec du déblocage : reconnecte-toi et réessaie.'; }
  });
  const mem = sessionStorage.getItem(MDP_KEY);
  if (mem) entrer(mem).catch(() => {});
})();
