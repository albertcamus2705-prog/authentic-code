// Menu mobile
(function () {
  var bouton = document.querySelector(".menu-bouton");
  var nav = document.getElementById("menu");
  if (!bouton || !nav) return;
  function fermer(rendreFocus) {
    nav.classList.remove("ouvert");
    bouton.setAttribute("aria-expanded", "false");
    if (rendreFocus) bouton.focus();
  }
  bouton.addEventListener("click", function () {
    var ouvert = bouton.getAttribute("aria-expanded") === "true";
    if (ouvert) { fermer(false); return; }
    nav.classList.add("ouvert");
    bouton.setAttribute("aria-expanded", "true");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("ouvert")) fermer(true);
  });
  document.addEventListener("click", function (e) {
    if (nav.classList.contains("ouvert") && !nav.contains(e.target) && e.target !== bouton) fermer(false);
  });
})();
