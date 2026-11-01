// Portfolio : filtres (si présents) et visionneuse agrandie
(function () {
  var liens = Array.prototype.slice.call(document.querySelectorAll("[data-visionneuse]"));
  var dialog = document.querySelector(".visionneuse");

  // Filtres
  var filtres = document.querySelectorAll(".filtres button");
  filtres.forEach(function (b) {
    b.addEventListener("click", function () {
      var cat = b.getAttribute("data-filtre");
      filtres.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      document.querySelectorAll(".galerie__item").forEach(function (li) {
        li.hidden = !!cat && li.getAttribute("data-categorie") !== cat;
      });
    });
  });

  if (!dialog || typeof dialog.showModal !== "function") return; // sans visionneuse : le lien ouvre l'image

  var image = dialog.querySelector("img");
  var legende = dialog.querySelector("figcaption");
  var compteur = dialog.querySelector(".visionneuse__compteur");
  var index = 0;
  var declencheur = null;

  function visibles() {
    // ordre d'affichage réel (il change entre téléphone et ordinateur)
    return liens.filter(function (a) { return !a.closest(".galerie__item").hidden; }).sort(function (x, y) {
      var a = x.getBoundingClientRect(), b = y.getBoundingClientRect();
      return Math.abs(a.top - b.top) > 4 ? a.top - b.top : a.left - b.left;
    });
  }
  function afficher(i) {
    var liste = visibles();
    index = (i + liste.length) % liste.length;
    var a = liste[index];
    var vignette = a.querySelector("img");
    image.src = a.getAttribute("href");
    image.alt = vignette.alt;
    legende.textContent = vignette.alt;
    compteur.textContent = "Photo " + (index + 1) + " sur " + liste.length;
  }

  liens.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      declencheur = a;
      afficher(visibles().indexOf(a));
      dialog.showModal();
      dialog.querySelector(".visionneuse__fermer").focus();
    });
  });

  dialog.querySelector(".visionneuse__fermer").addEventListener("click", function () { dialog.close(); });
  dialog.querySelector(".visionneuse__nav--prec").addEventListener("click", function () { afficher(index - 1); });
  dialog.querySelector(".visionneuse__nav--suiv").addEventListener("click", function () { afficher(index + 1); });
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); afficher(index - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); afficher(index + 1); }
  });
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog || e.target.classList.contains("visionneuse__figure")) dialog.close();
  });
  dialog.addEventListener("close", function () {
    image.removeAttribute("src");
    if (declencheur) declencheur.focus();
  });

  // Balayage sur mobile
  var debutX = null;
  dialog.addEventListener("touchstart", function (e) { debutX = e.touches[0].clientX; }, { passive: true });
  dialog.addEventListener("touchend", function (e) {
    if (debutX === null) return;
    var dx = e.changedTouches[0].clientX - debutX;
    if (Math.abs(dx) > 50) afficher(index + (dx < 0 ? 1 : -1));
    debutX = null;
  });
})();
