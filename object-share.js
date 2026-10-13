(() => {
  "use strict";
  const objectId = (new URLSearchParams(location.search).get("object") || "").trim();
  if (!objectId) return;

  const modal = document.createElement("section");
  modal.className = "ebou-object-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "ebou-object-title");
  modal.innerHTML = `
    <button class="ebou-object-backdrop" type="button" aria-label="Fermer la fenêtre"></button>
    <div class="ebou-object-dialog">
      <button class="ebou-object-close" type="button" aria-label="Fermer">×</button>
      <div class="ebou-object-brand"><img src="/assets/app-icon.jpeg" alt="" width="36" height="36"><span>EBOU</span></div>
      <div class="ebou-object-content" aria-live="polite"><div class="ebou-object-loading"><span class="ebou-object-spinner"></span><p>Chargement des informations…</p></div></div>
      <p class="ebou-object-foot">EBOU — Ensemble, retrouvons ce qui compte.</p>
    </div>`;
  document.body.appendChild(modal);
  document.body.classList.add("ebou-object-modal-open");
  const content = modal.querySelector(".ebou-object-content");

  function close() {
    modal.classList.add("is-closing");
    document.body.classList.remove("ebou-object-modal-open");
    const url = new URL(location.href);
    url.searchParams.delete("object");
    history.replaceState({}, "", url.pathname + url.search + url.hash);
    setTimeout(() => modal.remove(), 180);
  }
  modal.querySelector(".ebou-object-close").addEventListener("click", close);
  modal.querySelector(".ebou-object-backdrop").addEventListener("click", close);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.isConnected) close(); });

  function error(message) {
    content.replaceChildren();
    const box = document.createElement("div");
    const h = document.createElement("h1"); h.id = "ebou-object-title"; h.textContent = "Objet indisponible";
    const p = document.createElement("p"); p.textContent = message || "Cet objet ne peut pas être affiché pour le moment.";
    const a = document.createElement("a"); a.className = "ebou-object-action"; a.href = "/telecharger/"; a.textContent = "Découvrir EBOU";
    box.append(h, p, a); content.append(box);
  }

  function render(o) {
    content.replaceChildren();
    const card = document.createElement("article"); card.className = "ebou-object-card";
    const chip = document.createElement("span"); chip.className = "ebou-object-chip " + (o.isLost ? "is-lost" : "is-found"); chip.textContent = o.isLost ? "Objet perdu" : "Objet trouvé";
    const h = document.createElement("h1"); h.id = "ebou-object-title"; h.textContent = o.title || "Objet partagé sur EBOU";
    card.append(chip, h);
    if (o.imageUrl) {
      const img = document.createElement("img"); img.className = "ebou-object-image"; img.src = o.imageUrl; img.alt = o.title || "Photo de l’objet"; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => img.remove(), { once: true }); card.append(img);
    }
    if (o.description) { const p = document.createElement("p"); p.className = "ebou-object-description"; p.textContent = o.description; card.append(p); }
    const dl = document.createElement("dl"); dl.className = "ebou-object-details";
    [[ "Catégorie", o.category ], [ o.isLost ? "Lieu de perte" : "Lieu de découverte", o.location ], [ "Date", o.date ]].forEach(([label, value]) => {
      if (!value) return; const row = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = label; dd.textContent = value; row.append(dt, dd); dl.append(row);
    });
    if (dl.childElementCount) card.append(dl);
    const note = document.createElement("p"); note.className = "ebou-object-note"; note.textContent = "Vous reconnaissez cet objet ? Découvrez EBOU pour consulter les démarches de signalement et de restitution."; card.append(note);
    const actions = document.createElement("div"); actions.className = "ebou-object-actions";
    const a = document.createElement("a"); a.className = "ebou-object-action"; a.href = "/telecharger/"; a.textContent = "Découvrir / télécharger EBOU"; actions.append(a);
    const copy = document.createElement("button"); copy.type = "button"; copy.className = "ebou-object-secondary"; copy.textContent = "Copier le lien";
    copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(location.href); copy.textContent = "Lien copié ✓"; } catch { copy.textContent = "Copiez le lien depuis la barre d’adresse"; } });
    actions.append(copy); card.append(actions); content.append(card);
  }

  fetch(`/.netlify/functions/object?id=${encodeURIComponent(objectId)}`, { headers: { Accept: "application/json" } })
    .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Objet introuvable ou indisponible."); return d.object; })
    .then(o => { if (!o) throw new Error("Informations de l’objet incomplètes."); render(o); })
    .catch(e => error(e.message));
})();
