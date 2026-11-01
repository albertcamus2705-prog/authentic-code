// Formulaire de demande : étapes, validation, récapitulatif, WhatsApp, envoi
(function () {
  var form = document.getElementById("demande");
  if (!form) return;
  var donnees = JSON.parse(document.getElementById("donnees-offres").textContent);
  var seances = {};
  donnees.seances.forEach(function (s) { seances[s.id] = s; });
  var CLE = "ac-demande";
  var APERCU = form.getAttribute("data-apercu") === "1";
  var TITRES = { 1: "Votre séance", 2: "Votre projet et la date souhaitée", 3: "Vos coordonnées et le récapitulatif" };
  var etapeCourante = 1;

  var $ = function (sel) { return form.querySelector(sel); };
  var champ = function (nom) { return form.elements[nom]; };
  var valeur = function (nom) {
    var c = champ(nom);
    if (!c) return "";
    if (c instanceof RadioNodeList) return c.value || "";
    if (c.type === "checkbox") return c.checked ? c.value : "";
    return (c.value || "").trim();
  };

  // ---------- état initial ----------
  try {
    var sauve = JSON.parse(sessionStorage.getItem(CLE) || "null");
    if (sauve) Object.keys(sauve).forEach(function (nom) {
      var c = champ(nom);
      if (!c || nom === "site_web" || nom === "debut") return;
      if (c instanceof RadioNodeList) {
        Array.prototype.forEach.call(c, function (r) { r.checked = r.value === sauve[nom]; });
      } else if (c.type === "checkbox") c.checked = !!sauve[nom];
      else c.value = sauve[nom];
    });
  } catch (e) { /* stockage indisponible : on continue sans */ }

  var params = new URLSearchParams(location.search);
  var formuleUrl = params.get("formule");
  var categorieUrl = params.get("categorie");
  if (formuleUrl && seances[formuleUrl]) {
    if (formuleUrl === "portrait-pro") cocher("categorie", "portrait");
    else { cocher("categorie", "seance"); champ("formule").value = formuleUrl; }
  } else if (categorieUrl && donnees.categories[categorieUrl]) {
    cocher("categorie", categorieUrl);
  }
  function cocher(nom, v) {
    Array.prototype.forEach.call(champ(nom), function (r) { r.checked = r.value === v; });
  }

  champ("debut").value = String(Date.now());
  var aujourdhui = new Date();
  champ("date").min = new Date(aujourdhui.getTime() - aujourdhui.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  // ---------- affichage conditionnel ----------
  function categorie() { return valeur("categorie") || "seance"; }
  function formule() {
    var cat = categorie();
    if (cat === "portrait") return seances["portrait-pro"];
    if (cat === "seance" || cat === "cadeau") return seances[valeur("formule")] || null;
    return null;
  }
  function etapes() { return categorie() === "question" ? [1, 3] : [1, 2, 3]; }

  function majConditions() {
    var cat = categorie();
    form.querySelectorAll("[data-si]").forEach(function (el) {
      el.hidden = el.getAttribute("data-si").split(" ").indexOf(cat) === -1;
    });
    var f = formule();
    var blocPersonnes = champ("personnes").closest(".champ");
    var aide = document.getElementById("personnes-aide");
    if (cat === "seance") {
      blocPersonnes.hidden = !(f && f.personnesMax);
      aide.textContent = f && f.personnesMax ? "Cette formule accueille jusqu'à " + f.personnesMax + " personnes." : "";
    } else aide.textContent = "";
    // libellés facultatifs du lieu
    var lieuFacultatif = form.querySelector('label[for="lieu"] .facultatif');
    lieuFacultatif.hidden = ["mariage", "evenement"].indexOf(cat) !== -1;
    lieuFacultatif.textContent = "(facultatif)";
    lieuFacultatif.removeAttribute("data-si");
    var pref = valeur("preference");
    document.getElementById("tel-facultatif").hidden = pref !== "E-mail";
    majRecap();
  }

  // ---------- étapes ----------
  function allerA(n, focus) {
    etapeCourante = n;
    var liste = etapes();
    form.querySelectorAll(".etape").forEach(function (fs) {
      fs.classList.toggle("active", Number(fs.getAttribute("data-etape")) === n);
    });
    var pos = liste.indexOf(n) + 1;
    $(".demande__progression").textContent = "Étape " + pos + " sur " + liste.length;
    form.querySelector('.etape[data-etape="' + n + '"] .etape__titre').firstChild.textContent = pos + ". " + TITRES[n].replace(" et le récapitulatif", "");
    $('[data-action="precedent"]').hidden = pos === 1;
    $('[data-action="suivant"]').hidden = pos === liste.length;
    $('[data-action="envoyer"]').hidden = pos !== liste.length;
    form.querySelector("[data-si-etape]").hidden = n !== 3;
    masquerAlerte();
    majRecap();
    if (focus) {
      var titre = form.querySelector('.etape[data-etape="' + n + '"] .etape__titre');
      titre.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }

  $('[data-action="suivant"]').addEventListener("click", function () {
    if (!valider(etapeCourante)) return;
    var liste = etapes();
    allerA(liste[liste.indexOf(etapeCourante) + 1], true);
  });
  $('[data-action="precedent"]').addEventListener("click", function () {
    var liste = etapes();
    allerA(liste[Math.max(0, liste.indexOf(etapeCourante) - 1)], true);
  });

  // ---------- validation ----------
  function erreur(nom, message) {
    var c = champ(nom);
    var el = c instanceof RadioNodeList ? c[0] : c;
    el.setAttribute("aria-invalid", "true");
    var id = "err-" + nom;
    var p = document.getElementById(id);
    if (!p) {
      p = document.createElement("p");
      p.className = "champ__erreur";
      p.id = id;
      (el.closest(".champ") || el.parentNode).appendChild(p);
    }
    p.textContent = message;
    el.setAttribute("aria-describedby", id);
    return el;
  }
  function effacerErreurs(fs) {
    fs.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); });
    fs.querySelectorAll(".champ__erreur").forEach(function (p) { p.remove(); });
  }
  function visible(nom) {
    var c = champ(nom);
    var el = c instanceof RadioNodeList ? c[0] : c;
    return !el.closest("[hidden]");
  }

  function valider(n) {
    var fs = form.querySelector('.etape[data-etape="' + n + '"]');
    effacerErreurs(fs);
    var premiers = [];
    var cat = categorie();
    if (n === 2) {
      if (visible("typeEvenement") && !valeur("typeEvenement")) premiers.push(erreur("typeEvenement", "Choisissez le type d'événement."));
      var d = valeur("date");
      if (["seance", "portrait", "equipe", "mariage", "evenement"].indexOf(cat) !== -1 && !d && !valeur("dateFlexible"))
        premiers.push(erreur("date", "Indiquez une date souhaitée, ou cochez « Ma date est flexible »."));
      if (d && d < champ("date").min) premiers.push(erreur("date", "Cette date est déjà passée."));
      if (["mariage", "evenement"].indexOf(cat) !== -1 && !valeur("lieu")) premiers.push(erreur("lieu", "Indiquez la ville ou le lieu envisagé."));
      if (visible("personnes")) {
        var nb = valeur("personnes");
        var f = formule();
        if (cat === "equipe" && !nb) premiers.push(erreur("personnes", "Indiquez le nombre de collaborateurs."));
        else if (nb && (!/^\d+$/.test(nb) || Number(nb) < 1)) premiers.push(erreur("personnes", "Indiquez un nombre entier."));
        else if (nb && f && f.personnesMax && Number(nb) > f.personnesMax)
          premiers.push(erreur("personnes", "Cette formule accueille jusqu'à " + f.personnesMax + " personnes. Pour un groupe plus grand, revenez à l'étape 1 et choisissez « Un événement privé » ou « Un autre projet »."));
      }
    }
    if (n === 3) {
      if (!valeur("prenom")) premiers.push(erreur("prenom", "Indiquez votre prénom."));
      if (!valeur("nom")) premiers.push(erreur("nom", "Indiquez votre nom."));
      var email = valeur("email");
      if (!email) premiers.push(erreur("email", "Indiquez votre adresse e-mail."));
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) premiers.push(erreur("email", "Cette adresse e-mail semble incomplète, par exemple : prenom@exemple.fr"));
      var tel = valeur("telephone");
      var chiffres = tel.replace(/\D/g, "");
      if (!tel && valeur("preference") !== "E-mail") premiers.push(erreur("telephone", "Indiquez votre numéro pour être recontacté par " + valeur("preference").toLowerCase() + "."));
      else if (tel && (chiffres.length < 9 || chiffres.length > 15 || /[^\d\s+().-]/.test(tel))) premiers.push(erreur("telephone", "Ce numéro semble incomplet, par exemple : 06 12 34 56 78"));
      if (["autre", "question"].indexOf(cat) !== -1 && valeur("message").length < 5) premiers.push(erreur("message", cat === "question" ? "Écrivez votre question." : "Décrivez votre projet en quelques mots."));
    }
    if (premiers.length) { premiers[0].focus(); return false; }
    return true;
  }

  // ---------- récapitulatif et WhatsApp ----------
  function dateLisible(v) {
    if (!v) return "";
    var d = new Date(v + "T12:00:00");
    return isNaN(d) ? v : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
  function euros(n) { return n + " €"; }

  function lignesRecap() {
    var cat = categorie();
    var f = formule();
    var l = [["Demande", donnees.categories[cat]]];
    if (["seance", "portrait", "cadeau"].indexOf(cat) !== -1) {
      if (f) {
        l.push(["Formule", (f.nomComplet || f.nom) + " — " + f.duree + ", " + f.photos + " photos retouchées"]);
        l.push(["Prix de la formule", euros(f.prix)]);
      } else l.push(["Formule", "À choisir ensemble"]);
    } else if (cat !== "question") l.push(["Prix", "Sur devis, après notre échange"]);
    if (cat === "evenement" && valeur("typeEvenement")) l.push(["Événement", valeur("typeEvenement")]);
    if (cat !== "question") {
      var d = valeur("date");
      var dateTxt = d ? dateLisible(d) + (valeur("dateFlexible") ? " (flexible)" : "") : (valeur("dateFlexible") ? "Flexible" : "");
      if (dateTxt) l.push([cat === "cadeau" ? "Remise souhaitée" : "Date souhaitée", dateTxt]);
      if (valeur("lieu") && cat !== "cadeau") l.push(["Lieu", valeur("lieu")]);
      if (valeur("personnes") && visible("personnes")) l.push([cat === "equipe" ? "Collaborateurs" : (cat === "seance" ? "Personnes" : "Invités (environ)"), valeur("personnes")]);
      if (["mariage", "evenement"].indexOf(cat) !== -1 && valeur("dureeCouverture")) l.push(["Présence souhaitée", valeur("dureeCouverture")]);
      if (cat === "mariage" && valeur("engagement")) l.push(["Séance d'engagement", "Intéressés"]);
      if (cat === "cadeau" && valeur("beneficiaire")) l.push(["Pour", valeur("beneficiaire")]);
      if (valeur("budget") && visible("budget")) l.push(["Budget envisagé", valeur("budget")]);
    }
    var nomComplet = (valeur("prenom") + " " + valeur("nom")).trim();
    if (nomComplet) l.push(["Vos coordonnées", nomComplet]);
    if (valeur("email")) l.push(["E-mail", valeur("email")]);
    if (valeur("telephone")) l.push(["Téléphone", valeur("telephone")]);
    l.push(["Contact préféré", valeur("preference")]);
    return l;
  }

  function messageWhatsApp() {
    var cat = categorie();
    var f = formule();
    var d = valeur("date");
    var lieu = valeur("lieu");
    var quand = d ? ", idéalement le " + dateLisible(d) + (valeur("dateFlexible") ? " (date flexible)" : "") : (valeur("dateFlexible") ? ", à une date flexible" : "");
    var ou = lieu ? " à " + lieu : "";
    var debut = "Bonjour Authentic Code, ";
    var corps;
    if (cat === "seance" || cat === "portrait") {
      corps = f
        ? "je souhaite organiser une séance " + (cat === "portrait" ? "Portrait professionnel" : f.nom) + ", formule " + f.duree + " à " + euros(f.prix) + quand + ou + ". Est-ce possible ?"
        : "je souhaite organiser une séance photo" + quand + ou + " et j'aimerais être conseillé sur la formule. Est-ce possible ?";
    } else if (cat === "equipe") {
      corps = "je souhaite un devis pour des portraits professionnels" + (valeur("personnes") ? " pour " + valeur("personnes") + " collaborateurs" : " pour une équipe") + quand + ou + ".";
    } else if (cat === "mariage") {
      corps = "nous aimerions parler de notre mariage" + (d ? ", prévu le " + dateLisible(d) : "") + ou + ".";
    } else if (cat === "evenement") {
      corps = "je souhaite un devis pour un événement privé" + (valeur("typeEvenement") ? " (" + valeur("typeEvenement").toLowerCase() + ")" : "") + (d ? " le " + dateLisible(d) : "") + ou + ".";
    } else if (cat === "cadeau") {
      corps = "je souhaite offrir une séance" + (f ? " " + f.nom + " (" + euros(f.prix) + ")" : "") + " en carte cadeau.";
    } else if (cat === "question") {
      corps = "j'ai une question" + (valeur("message") ? " : " + valeur("message").slice(0, 400) : ".");
    } else {
      corps = "j'ai un projet à vous présenter" + (valeur("message") ? " : " + valeur("message").slice(0, 400) : ".");
    }
    var signature = valeur("prenom") ? "\n" + valeur("prenom") : "";
    return debut + corps + signature;
  }

  function majRecap() {
    var dl = form.querySelector(".recap__liste");
    dl.textContent = "";
    lignesRecap().forEach(function (paire) {
      var dt = document.createElement("dt"); dt.textContent = paire[0];
      var dd = document.createElement("dd"); dd.textContent = paire[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    document.getElementById("lien-whatsapp").href = donnees.whatsapp + "?text=" + encodeURIComponent(messageWhatsApp());
  }

  // ---------- sauvegarde de la saisie ----------
  function sauver() {
    try {
      var o = {};
      Array.prototype.forEach.call(form.elements, function (c) {
        if (!c.name || c.name === "site_web" || c.name === "debut") return;
        if (c.type === "radio") { if (c.checked) o[c.name] = c.value; }
        else if (c.type === "checkbox") o[c.name] = c.checked;
        else o[c.name] = c.value;
      });
      sessionStorage.setItem(CLE, JSON.stringify(o));
    } catch (e) { /* rien */ }
  }
  form.addEventListener("input", function (e) {
    if (e.target.getAttribute("aria-invalid")) {
      e.target.removeAttribute("aria-invalid");
      var p = document.getElementById("err-" + e.target.name);
      if (p) p.remove();
    }
    sauver();
    majConditions();
  });
  form.addEventListener("change", function () { sauver(); majConditions(); });

  // ---------- envoi ----------
  var alerte = form.querySelector(".alerte--erreur");
  function masquerAlerte() { alerte.hidden = true; alerte.textContent = ""; }
  function montrerAlerte(texte) {
    alerte.innerHTML = "";
    var p1 = document.createElement("p"); p1.textContent = texte;
    var p2 = document.createElement("p");
    p2.innerHTML = 'Vos informations sont conservées. Vous pouvez réessayer, <a href="' + document.getElementById("lien-whatsapp").href + '" target="_blank" rel="noopener">continuer sur WhatsApp</a> ou appeler le <a href="tel:+33614469188">06 14 46 91 88</a>.';
    alerte.appendChild(p1); alerte.appendChild(p2);
    alerte.hidden = false;
    alerte.focus && alerte.setAttribute("tabindex", "-1");
    alerte.focus();
  }

  var envoiEnCours = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (envoiEnCours) return;
    if (etapeCourante !== 3) return;
    for (var i = 0; i < etapes().length; i++) {
      var n = etapes()[i];
      if (!valider(n)) { allerA(n, false); valider(n); return; }
    }
    if (APERCU) {
      montrerAlerte("Cette version est un aperçu : l'envoi par e-mail n'y est pas actif, votre demande n'a donc pas été envoyée.");
      return;
    }
    var bouton = $('[data-action="envoyer"]');
    var libelle = bouton.textContent;
    envoiEnCours = true;
    bouton.disabled = true;
    bouton.setAttribute("aria-busy", "true");
    bouton.textContent = "Envoi en cours…";
    masquerAlerte();

    var corps = {};
    Array.prototype.forEach.call(form.elements, function (c) {
      if (!c.name) return;
      if (c.type === "radio") { if (c.checked) corps[c.name] = c.value; }
      else if (c.type === "checkbox") { if (c.checked) corps[c.name] = c.value; }
      else corps[c.name] = c.value;
    });
    corps.categorie = categorie();
    if (corps.categorie === "portrait") corps.formule = "portrait-pro";
    if (["seance", "cadeau", "portrait"].indexOf(corps.categorie) === -1) corps.formule = "";

    var controle = "AbortController" in window ? new AbortController() : null;
    var minuterie = setTimeout(function () { controle && controle.abort(); }, 20000);

    fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(corps),
      signal: controle ? controle.signal : undefined,
    })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false }; }).then(function (j) { return { statut: r.status, j: j }; });
      })
      .then(function (res) {
        if (res.statut === 200 && res.j && res.j.ok === true) {
          try { sessionStorage.removeItem(CLE); } catch (err) { /* rien */ }
          form.hidden = true;
          var succes = document.getElementById("succes");
          succes.hidden = false;
          if (res.j.reference) succes.querySelector(".succes__ref").textContent = "Référence de votre demande : " + res.j.reference;
          succes.focus();
          succes.scrollIntoView({ block: "start" });
        } else {
          montrerAlerte((res.j && res.j.message) || "Votre demande n'a pas pu être envoyée.");
        }
      })
      .catch(function () {
        montrerAlerte("Votre demande n'a pas pu être envoyée : la connexion a échoué ou a pris trop de temps.");
      })
      .then(function () {
        clearTimeout(minuterie);
        envoiEnCours = false;
        bouton.disabled = false;
        bouton.removeAttribute("aria-busy");
        bouton.textContent = libelle;
      });
  });

  majConditions();
  allerA(1, false);
})();
