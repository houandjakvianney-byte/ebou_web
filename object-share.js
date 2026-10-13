
(() => {
  "use strict";

  const objectId = (
    new URLSearchParams(window.location.search).get("object") || ""
  ).trim();

  if (!objectId) return;

  const modal = document.createElement("section");

  modal.className = "ebou-object-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "ebou-object-title");

  modal.innerHTML = `
    <button class="ebou-object-backdrop" type="button"
      aria-label="Fermer la fenêtre"></button>

    <div class="ebou-object-dialog">
      <button class="ebou-object-close" type="button"
        aria-label="Fermer">×</button>

      <div class="ebou-object-brand">
        <img src="/assets/app-icon.jpeg" alt="" width="36" height="36">
        <span>EBOU</span>
      </div>

      <div class="ebou-object-content" aria-live="polite">
        <div class="ebou-object-loading">
          <span class="ebou-object-spinner"></span>
          <p>Chargement des informations…</p>
        </div>
      </div>

      <p class="ebou-object-foot">
        EBOU — Ensemble, retrouvons ce qui compte.
      </p>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add("ebou-object-modal-open");

  const content = modal.querySelector(".ebou-object-content");
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;

    modal.classList.add("is-closing");
    document.body.classList.remove("ebou-object-modal-open");

    const url = new URL(window.location.href);
    url.searchParams.delete("object");

    window.history.replaceState(
      {},
      "",
      url.pathname + url.search + url.hash
    );

    window.setTimeout(() => modal.remove(), 180);
  }

  modal.querySelector(".ebou-object-close")
    .addEventListener("click", close);

  modal.querySelector(".ebou-object-backdrop")
    .addEventListener("click", close);

  function handleEscape(event) {
    if (event.key === "Escape" && !closed) {
      close();
      document.removeEventListener("keydown", handleEscape);
    }
  }

  document.addEventListener("keydown", handleEscape);

  function showError(message) {
    content.replaceChildren();

    const box = document.createElement("div");
    const heading = document.createElement("h1");
    const paragraph = document.createElement("p");
    const link = document.createElement("a");

    heading.id = "ebou-object-title";
    heading.textContent = "Objet indisponible";

    paragraph.textContent =
      message || "Cet objet ne peut pas être affiché pour le moment.";

    link.className = "ebou-object-action";
    link.href = "/telecharger/";
    link.textContent = "Découvrir EBOU";

    box.append(heading, paragraph, link);
    content.appendChild(box);
  }

  function render(object) {
    content.replaceChildren();

    const card = document.createElement("article");
    card.className = "ebou-object-card";

    const chip = document.createElement("span");
    chip.className =
      "ebou-object-chip " +
      (object.isLost ? "is-lost" : "is-found");
    chip.textContent = object.isLost ? "Objet perdu" : "Objet trouvé";

    const heading = document.createElement("h1");
    heading.id = "ebou-object-title";
    heading.textContent = object.title || "Objet partagé sur EBOU";

    card.append(chip, heading);

    // Affichage de l'image : URL HTTP(S) ou Base64 autorisé.
    if (object.imageUrl) {
      const image = document.createElement("img");

      image.className = "ebou-object-image";
      image.alt = object.title || "Photo de l’objet";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";

      image.addEventListener("error", () => {
        image.remove();
      }, { once: true });

      image.src = object.imageUrl;
      card.appendChild(image);
    }

    if (object.description) {
      const paragraph = document.createElement("p");
      paragraph.className = "ebou-object-description";
      paragraph.textContent = object.description;
      card.appendChild(paragraph);
    }

    const details = document.createElement("dl");
    details.className = "ebou-object-details";

    const rows = [
      ["Catégorie", object.category],
      [
        object.isLost ? "Lieu de perte" : "Lieu de découverte",
        object.location,
      ],
      ["Date", object.date],
    ];

    rows.forEach(([label, value]) => {
      if (!value) return;

      const row = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");

      term.textContent = label;
      description.textContent = value;

      row.append(term, description);
      details.appendChild(row);
    });

    if (details.childElementCount) {
      card.appendChild(details);
    }

    const note = document.createElement("p");
    note.className = "ebou-object-note";
    note.textContent =
      "Vous reconnaissez cet objet ? Découvrez EBOU pour consulter " +
      "les démarches de signalement et de restitution.";

    card.appendChild(note);

    const actions = document.createElement("div");
    actions.className = "ebou-object-actions";

    const discover = document.createElement("a");
    discover.className = "ebou-object-action";
    discover.href = "/telecharger/";
    discover.textContent = "Découvrir / télécharger EBOU";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "ebou-object-secondary";
    copy.textContent = "Copier le lien";

    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        copy.textContent = "Lien copié ✓";
      } catch {
        copy.textContent =
          "Copiez le lien depuis la barre d’adresse";
      }
    });

    actions.append(discover, copy);
    card.appendChild(actions);
    content.appendChild(card);
  }

  fetch(
    `/.netlify/functions/object?id=${encodeURIComponent(objectId)}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  )
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Objet introuvable ou indisponible."
        );
      }

      return data.object;
    })
    .then((object) => {
      if (!object) {
        throw new Error("Informations de l’objet incomplètes.");
      }

      render(object);
    })
    .catch((error) => {
      showError(error.message);
    });
})();
