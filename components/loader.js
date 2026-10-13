
(function () {
  "use strict";

  async function initEbouLoader() {
    const container = document.getElementById("ebou-loader-container");

    if (!container) {
      console.warn("EBOU : conteneur du loader introuvable.");
      return;
    }

    try {
      const response = await fetch("/components/loader.html", {
        cache: "no-cache"
      });

      if (!response.ok) {
        throw new Error("Impossible de charger loader.html : HTTP " + response.status);
      }

      const html = await response.text();
      container.innerHTML = html;

      const loader = container.querySelector("#ebou-loader");

      if (!loader) {
        throw new Error("L'élément #ebou-loader est absent de loader.html.");
      }

      let hidden = false;

      function hideLoader() {
        if (hidden) return;
        hidden = true;

        const elapsed = performance.now() - startTime;
        const remaining = Math.max(0, 700 - elapsed);

        window.setTimeout(function () {
          loader.classList.add("is-hidden");

          window.setTimeout(function () {
            container.remove();
          }, 500);
        }, remaining);
      }

      const startTime = performance.now();

      if (document.readyState === "complete") {
        hideLoader();
      } else {
        window.addEventListener("load", hideLoader, { once: true });
      }

      
      window.setTimeout(hideLoader, 5000);

    } catch (error) {
      console.error("EBOU — Erreur du loader :", error);
      container.remove();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEbouLoader, {
      once: true
    });
  } else {
    initEbouLoader();
  }
})();
