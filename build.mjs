// Générateur du site Authentic Code — aucune dépendance, Node 18 ou plus.
// Usage : node build.mjs            -> dossier public/ (mise en ligne)
//         node build.mjs --apercu   -> dossier apercu/ (aperçu sans serveur d'envoi)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = dirname(fileURLToPath(import.meta.url));
const APERCU = process.argv.includes("--apercu");
const SORTIE = join(RACINE, APERCU ? "apercu" : "public");
const lire = (f) => JSON.parse(readFileSync(join(RACINE, "src/data", f), "utf8"));

const site = lire("site.json");
const offres = lire("offres.json");
const faq = lire("faq.json");
const avis = lire("avis.json").avis.filter((a) => a.publie && a.texte);
const photos = Object.fromEntries(lire("photos.json").photos.map((p) => [p.id, p]));
const seance = Object.fromEntries(offres.seances.map((s) => [s.id, s]));
const VERSION = Date.now().toString(36);

// ---------- utilitaires ----------
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const euros = (n) => `${n}\u00a0€`;
const photosTxt = (n) => `${n} photo${n > 1 ? "s" : ""} retouchée${n > 1 ? "s" : ""}`;

let prefixe = ""; // chemin relatif vers la racine pour la page en cours
const lien = (chemin) => {
  // chemin du type "/seances/" ou "/seances/#couple" ou "/demande/?formule=x"
  const [base, suite = ""] = chemin.split(/(?=[?#])/);
  let p = base.replace(/^\//, "");
  if (APERCU && (p === "" || p.endsWith("/"))) p += "index.html";
  return (prefixe || (p === "" ? "./" : "")) + p + suite;
};
const actif = (page, cible) => (page === cible ? ' aria-current="page"' : "");

function img(id, { sizes = "100vw", eager = false, cls = "", alt } = {}) {
  const p = photos[id];
  if (!p) throw new Error(`Photo inconnue : ${id}`);
  const srcset = p.tailles.map((l) => `${prefixe}assets/img/photos/${p.id}-${l}.webp ${l}w`).join(", ");
  const defaut = p.tailles.find((l) => l >= 800) || p.tailles[p.tailles.length - 1];
  return `<img src="${prefixe}assets/img/photos/${p.id}-${defaut}.webp" srcset="${srcset}" sizes="${sizes}" width="${p.largeur}" height="${p.hauteur}" alt="${esc(alt ?? p.alt)}" style="object-position:${p.cadrage}"${cls ? ` class="${cls}"` : ""} ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`;
}

const bouton = (texte, url, style = "principal", attrs = "") =>
  `<a class="btn btn--${style}" href="${url.startsWith("http") || url.startsWith("tel:") || url.startsWith("mailto:") ? url : lien(url)}"${attrs}>${esc(texte)}</a>`;
const wa = (texte) => `${site.contact.whatsapp}?text=${encodeURIComponent(texte)}`;
const waBouton = (texte = "Écrire sur WhatsApp", style = "secondaire") =>
  bouton(texte, wa("Bonjour Authentic Code, j'ai une question à propos d'une séance photo."), style, ' target="_blank" rel="noopener"');

// ---------- gabarit commun ----------
const NAV = [
  ["accueil", "/", "Accueil"],
  ["portfolio", "/portfolio/", "Portfolio"],
  ["seances", "/seances/", "Séances & tarifs"],
  ["mariages", "/mariages-evenements/", "Mariages & événements"],
  ["apropos", "/a-propos/", "À propos"],
  ["contact", "/contact/", "Contact"],
];

function page({ chemin, id, titre, description, corps, scripts = [] }) {
  const profondeur = chemin.split("/").filter(Boolean).length;
  prefixe = profondeur ? "../".repeat(profondeur) : "";
  const url = site.adresseSite.replace(/\/$/, "") + chemin;
  const titreComplet = id === "accueil" ? titre : `${titre} — ${site.nom}`;
  const contenu = corps(); // calculé après le préfixe
  const jsonld = id === "accueil"
    ? `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: site.nom,
        description,
        url: site.adresseSite,
        image: site.adresseSite.replace(/\/$/, "") + "/assets/img/partage.jpg",
        logo: site.adresseSite.replace(/\/$/, "") + "/assets/img/logo-384.png",
        telephone: "+33614469188",
        email: site.contact.email,
        areaServed: ["Paris", "Île-de-France"],
        founder: { "@type": "Person", name: site.photographe.prenomNom },
        sameAs: site.reseaux.map((r) => r.url),
      })}</script>`
    : "";
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.classList.add("js")</script>
<title>${esc(titreComplet)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="${esc(site.nom)}">
<meta property="og:title" content="${esc(titreComplet)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.adresseSite.replace(/\/$/, "")}/assets/img/partage.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Portrait réalisé par ${esc(site.nom)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F7F4EF">
<link rel="icon" type="image/png" sizes="32x32" href="${prefixe}assets/img/favicon-32.png">
<link rel="apple-touch-icon" href="${prefixe}assets/img/apple-touch-icon.png">
<link rel="preload" href="${prefixe}assets/fonts/bodoni-moda.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${prefixe}assets/fonts/instrument-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${prefixe}assets/css/style.css?v=${VERSION}">
${jsonld}
</head>
<body class="page-${id}">
<a class="evitement" href="#contenu">Aller au contenu</a>
<header class="entete">
  <div class="entete__in">
    <a class="marque" href="${lien("/")}"${id === "accueil" ? ' aria-current="page"' : ""}>
      <img src="${prefixe}assets/img/logo-96.png" width="48" height="48" alt="">
      <span>${esc(site.nom)}</span>
    </a>
    <button class="menu-bouton" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
    <nav id="menu" class="nav" aria-label="Navigation principale">
      <ul>
        ${NAV.map(([nid, href, txt]) => `<li><a href="${lien(href)}"${actif(id, nid)}>${txt}</a></li>`).join("\n        ")}
        <li class="nav__demande"><a class="btn btn--principal" href="${lien("/demande/")}">Demander une séance</a></li>
      </ul>
    </nav>
    <a class="btn btn--principal entete__cta" href="${lien("/demande/")}"${actif(id, "demande")}>Demander une séance</a>
  </div>
</header>
<main id="contenu">
${contenu}
</main>
<footer class="pied">
  <div class="pied__in">
    <div class="pied__marque">
      <img src="${prefixe}assets/img/logo-192.png" width="88" height="88" alt="Logo ${esc(site.nom)}" loading="lazy">
      <p><strong>${esc(site.nom)}</strong><br>Photographie à ${esc(site.zone)}</p>
    </div>
    <div>
      <h2 class="pied__titre">Contact</h2>
      <ul class="pied__liste">
        <li><a href="${site.contact.whatsapp}" target="_blank" rel="noopener">WhatsApp</a></li>
        <li><a href="${site.contact.telephoneLien}">${esc(site.contact.telephoneAffiche)}</a></li>
        <li><a href="mailto:${site.contact.email}">${esc(site.contact.email)}</a></li>
        ${site.reseaux.map((r) => `<li><a href="${r.url}" target="_blank" rel="noopener">${esc(r.nom)} ${esc(r.compte)}</a></li>`).join("")}
      </ul>
    </div>
    <div>
      <h2 class="pied__titre">Le site</h2>
      <ul class="pied__liste">
        ${NAV.slice(1).map(([, href, txt]) => `<li><a href="${lien(href)}">${txt}</a></li>`).join("")}
        <li><a href="${lien("/faq/")}">Questions fréquentes</a></li>
      </ul>
    </div>
    <div>
      <h2 class="pied__titre">Informations</h2>
      <ul class="pied__liste">
        <li><a href="${lien("/mentions-legales/")}">Mentions légales</a></li>
        <li><a href="${lien("/confidentialite/")}">Confidentialité</a></li>
      </ul>
    </div>
  </div>
  <p class="pied__bas">© ${new Date().getFullYear()} ${esc(site.nom)} — ${esc(site.photographe.prenomNom)}</p>
</footer>
<script src="${prefixe}assets/js/main.js?v=${VERSION}" defer></script>
${scripts.map((s) => `<script src="${prefixe}assets/js/${s}?v=${VERSION}" defer></script>`).join("\n")}
</body>
</html>
`;
}

// ---------- composants ----------
function ligneOffre(s, { details = true, choisir = true, court = false } = {}) {
  const nom = court ? s.nom : s.nomComplet || s.nom;
  return `<li class="offre" id="${s.id}">
  <div class="offre__tete">
    <h3 class="offre__nom">${esc(nom)}</h3>
    <p class="offre__prix">${euros(s.prix)}</p>
  </div>
  <p class="offre__meta"><span>${esc(s.duree)}</span><span>${photosTxt(s.photos)}</span>${s.pour.length <= 40 ? `<span>${esc(s.pour)}</span>` : ""}</p>
  ${s.pour.length > 40 && !court ? `<p class="offre__pour">Pour : ${esc(s.pour)}.</p>` : ""}
  ${details ? `<p class="offre__desc">${esc(s.description)}</p>` : ""}
  ${choisir ? `<p class="offre__action">${bouton(s.id === "portrait-pro" ? "Préparer mon portrait professionnel" : "Choisir cette séance", `/demande/?formule=${s.id}`, "lien", ` aria-label="${s.id === "portrait-pro" ? "Préparer mon portrait professionnel" : `Choisir la séance ${esc(s.nom)}`}"`)}</p>` : ""}
</li>`;
}

function accordeon(q) {
  return `<details class="faq__item">
  <summary><span>${esc(q.q)}</span></summary>
  <div class="faq__reponse">
    <p>${esc(q.r)}</p>
    ${q.lien ? `<p><a class="lien-discret" href="${lien(q.lien.url)}">${esc(q.lien.texte)}</a></p>` : ""}
  </div>
</details>`;
}
const questionsPubliees = faq.questions.filter((q) => q.publie && q.r);
const faqListe = (filtre) => questionsPubliees.filter(filtre).map(accordeon).join("\n");

const invitationFaq = () => `<div class="invitation-faq">
  <p class="invitation-faq__titre">Votre question n'est pas ici ? Parlons de votre projet.</p>
  <div class="actions">${waBouton("Écrire sur WhatsApp", "secondaire")}${bouton("Envoyer une demande", "/demande/?categorie=question", "principal")}</div>
</div>`;

const invitationFinale = (titre = "Vous avez une idée, ou simplement une envie ? Parlons-en.", texte = "Décrivez votre projet en quelques lignes. Je vous réponds pour en parler, vérifier la date et préparer avec vous une séance qui vous ressemble.") => `<section class="bande-noire invitation" aria-labelledby="invitation-titre">
  <div class="conteneur conteneur--etroit">
    <h2 id="invitation-titre" class="titre-section">${esc(titre)}</h2>
    <p class="chapeau">${esc(texte)}</p>
    <div class="actions">${bouton("Demander une séance", "/demande/", "principal")}${waBouton("Écrire sur WhatsApp", "clair")}</div>
  </div>
</section>`;

const etapes = () => `<ol class="etapes">
  <li><h3>Vous choisissez une séance ou décrivez votre projet.</h3><p>Une formule de la grille, ou simplement une envie : le formulaire et WhatsApp acceptent les deux.</p></li>
  <li><h3>Nous échangeons et confirmons les modalités.</h3><p>Date, lieu, tenues, ambiance : je vérifie la disponibilité et nous préparons la séance ensemble.</p></li>
  <li><h3>Je vous accompagne pendant la prise de vue.</h3><p>Je vous guide pour la posture, le regard et les mouvements, sans vous presser.</p></li>
  <li><h3>Vous recevez les photos selon les conditions convenues.</h3><p>Une sélection retouchée avec soin, livrée en haute définition.</p></li>
</ol>`;

// ---------- pages ----------
const pages = [];

// Accueil
pages.push({
  chemin: "/", id: "accueil",
  titre: `${site.nom} — Photographe portrait à Paris et en Île-de-France`,
  description: "Portraits, couples, familles, grossesse et événements à Paris et en Île-de-France. Des séances préparées avec vous, des tarifs clairs et une demande de réservation en quelques minutes.",
  corps: () => {
    const selection = ["pull-raye-rouge", "femme-tresses", "lunettes-arbres", "deux-amis-rire", "femme-lunettes-pull-beige"];
    const familles = [
      ["Portraits solo", "De 30 minutes à 2 heures, pour vous seul.", `à partir de ${euros(90)}`, "/seances/#solo"],
      ["Portrait professionnel", "LinkedIn, CV, site ou présentation.", euros(seance["portrait-pro"].prix), "/seances/#portrait-professionnel"],
      ["Couple, famille, grossesse", "À deux ou jusqu'à 5 personnes.", `à partir de ${euros(180)}`, "/seances/#ensemble"],
      ["Entre amis et EVJF", "Une séance de groupe jusqu'à 8 personnes.", euros(seance["amis-evjf"].prix), "/seances/#amis-evjf"],
      ["Événements privés", "Anniversaires, fiançailles, réceptions.", "à la carte, sur devis", "/mariages-evenements/#evenements-prives"],
      ["Mariages", "Avec une séance d'engagement possible avant le jour J.", "sur devis", "/mariages-evenements/#mariage"],
    ];
    return `
<section class="hero" aria-labelledby="hero-titre">
  <div class="hero__texte">
    <h1 id="hero-titre" class="hero__titre">${site.accueil.titre.split(/(?<=\.)\s+/).map((l) => `<span>${esc(l)}</span>`).join(" ")}</h1>
    <p class="hero__sous">${esc(site.accueil.sousTitre)}</p>
    <div class="actions">${bouton("Découvrir les séances", "/seances/", "principal")}${bouton("Voir les photos", "/portfolio/", "secondaire")}</div>
  </div>
  <figure class="hero__photo">${img(site.accueil.photo, { eager: true, sizes: "(min-width: 900px) 52vw, 100vw" })}</figure>
</section>

<section class="section" aria-labelledby="selection-titre">
  <div class="conteneur">
    <div class="entete-section">
      <h2 id="selection-titre" class="titre-section">Des expressions vraies, un regard soigné</h2>
      <a class="lien-discret" href="${lien("/portfolio/")}">Voir tout le portfolio</a>
    </div>
    <div class="selection">
      ${selection.map((p, i) => `<a class="selection__item selection__item--${i + 1}" href="${lien("/portfolio/")}#${p}">${img(p, { sizes: i === 0 ? "(min-width: 900px) 40vw, 100vw" : "(min-width: 900px) 25vw, 50vw" })}</a>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="section section--blanc" aria-labelledby="prestations-titre">
  <div class="conteneur">
    <h2 id="prestations-titre" class="titre-section">Quelle séance pour vous ?</h2>
    <ul class="index-prestations">
      ${familles.map(([t, d, p, u]) => `<li><a href="${lien(u)}"><span class="index-prestations__nom">${t}</span><span class="index-prestations__desc">${d}</span><span class="index-prestations__prix">${p}</span></a></li>`).join("\n      ")}
    </ul>
  </div>
</section>

<section class="bande-noire accompagnement" aria-labelledby="accompagnement-titre">
  <div class="conteneur accompagnement__grille">
    <figure class="accompagnement__photo">${img("femme-lunettes-pull-beige", { sizes: "(min-width: 900px) 40vw, 100vw" })}</figure>
    <div>
      <h2 id="accompagnement-titre" class="titre-section">Vous n'avez pas besoin de savoir poser.</h2>
      <p class="chapeau">Nous préparons ensemble une séance qui vous ressemble. Pendant la prise de vue, je vous guide pas à pas, pour que vous puissiez simplement être vous-même.</p>
      <dl class="moments">
        <div><dt>Avant</dt><dd>Nous parlons de votre projet, du lieu, des tenues et de l'ambiance que vous aimez.</dd></div>
        <div><dt>Pendant</dt><dd>Je vous indique la posture, le regard et les mouvements. On prend le temps.</dd></div>
        <div><dt>Après</dt><dd>Je sélectionne et retouche les images avec soin, en restant fidèle à votre apparence.</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="offres-titre">
  <div class="conteneur conteneur--moyen">
    <div class="entete-section">
      <h2 id="offres-titre" class="titre-section">Quelques séances et leurs tarifs</h2>
      <a class="lien-discret" href="${lien("/seances/")}">Toutes les séances et tarifs</a>
    </div>
    <ul class="offres">
      ${offres.seances.filter((s) => s.accueil).map((s) => ligneOffre(s, { details: true })).join("\n")}
    </ul>
    <p class="note">${esc(offres.livraisonRapide)}</p>
  </div>
</section>

<section class="section section--blanc" aria-labelledby="deroulement-titre">
  <div class="conteneur">
    <h2 id="deroulement-titre" class="titre-section">Comment se déroule une séance</h2>
    ${etapes()}
    <div class="actions actions--centre">${bouton("Demander une séance", "/demande/", "principal")}</div>
  </div>
</section>

<section class="section" aria-labelledby="photographe-titre">
  <div class="conteneur photographe">
    <figure class="photographe__photo">${img(site.photographe.photo, { sizes: "(min-width: 900px) 45vw, 100vw" })}</figure>
    <div class="photographe__texte">
      <h2 id="photographe-titre" class="titre-section">${esc(site.photographe.prenomNom)}</h2>
      <p class="sous-titre">${esc(site.photographe.role)}</p>
      <p>${esc(site.photographe.presentation[0])}</p>
      <p><a class="lien-discret" href="${lien("/a-propos/")}">En savoir plus sur ma façon de travailler</a></p>
    </div>
  </div>
</section>

${avis.length ? `<section class="section section--blanc" aria-labelledby="avis-titre">
  <div class="conteneur">
    <h2 id="avis-titre" class="titre-section">Ils en parlent</h2>
    <ul class="avis">${avis.map((a) => `<li><blockquote><p>${esc(a.texte)}</p></blockquote>${a.auteur ? `<p class="avis__auteur">${esc(a.auteur)}${a.seance ? `, ${esc(a.seance)}` : ""}</p>` : ""}</li>`).join("")}</ul>
  </div>
</section>` : ""}

<section class="section${avis.length ? "" : " section--blanc"}" aria-labelledby="faq-titre">
  <div class="conteneur conteneur--etroit">
    <h2 id="faq-titre" class="titre-section">Questions fréquentes</h2>
    <div class="faq">${faqListe((q) => q.accueil)}</div>
    <p class="suite"><a class="lien-discret" href="${lien("/faq/")}">Toutes les questions</a></p>
  </div>
</section>

${invitationFinale()}`;
  },
});

// Portfolio
pages.push({
  chemin: "/portfolio/", id: "portfolio",
  titre: "Portfolio",
  description: `Une sélection de portraits réalisés par ${site.nom} à Paris et en Île-de-France : expressions naturelles, lumière soignée, personnes réelles.`,
  scripts: ["portfolio.js"],
  corps: () => {
    const liste = Object.values(photos).filter((p) => p.portfolio);
    const parCat = {};
    liste.forEach((p) => (parCat[p.categorie] = (parCat[p.categorie] || 0) + 1));
    const cats = Object.entries(parCat).filter(([, n]) => n >= 3).map(([c]) => c);
    const filtres = cats.length >= 2
      ? `<div class="filtres" role="group" aria-label="Filtrer par catégorie"><button type="button" aria-pressed="true" data-filtre="">Toutes</button>${cats.map((c) => `<button type="button" aria-pressed="false" data-filtre="${esc(c)}">${esc(c)}</button>`).join("")}</div>`
      : "";
    return `
<section class="intro conteneur">
  <h1 class="titre-page">Portfolio</h1>
  <p class="chapeau">Des personnes réelles, guidées simplement, photographiées telles qu'elles sont. Touchez une photo pour l'agrandir.</p>
</section>
<section class="conteneur galerie-section" aria-label="Photographies">
  ${filtres}
  <ul class="galerie">
    ${liste.map((p) => `<li class="galerie__item${p.largeur > p.hauteur * 1.3 ? " galerie__item--large" : ""}${p.simpleSurTablette ? " galerie__item--simple-tablette" : ""}"${p.ordreMobile ? ` style="--ordre-mobile:${p.ordreMobile}"` : ""} data-categorie="${esc(p.categorie)}"${p.serie ? ` data-serie="${p.serie}"` : ""} id="${p.id}">
      <a href="${prefixe}assets/img/photos/${p.id}-${p.tailles[p.tailles.length - 1]}.webp" data-visionneuse aria-label="Agrandir : ${esc(p.alt)}">${img(p.id, { sizes: "(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw" })}</a>
    </li>`).join("\n    ")}
  </ul>
</section>
<dialog class="visionneuse" aria-label="Photo agrandie">
  <div class="visionneuse__barre">
    <p class="visionneuse__compteur" aria-live="polite"></p>
    <button type="button" class="visionneuse__fermer">Fermer</button>
  </div>
  <figure class="visionneuse__figure"><img alt=""><figcaption class="visuellement-cache"></figcaption></figure>
  <button type="button" class="visionneuse__nav visionneuse__nav--prec">Précédente</button>
  <button type="button" class="visionneuse__nav visionneuse__nav--suiv">Suivante</button>
</dialog>
${invitationFinale("Ces images vous parlent ?", "Dites-moi ce que vous aimeriez : un portrait, une séance à deux, en famille ou entre amis. Nous préparons ensemble une séance qui vous ressemble.")}`;
  },
});

// Séances & tarifs
pages.push({
  chemin: "/seances/", id: "seances",
  titre: "Séances & tarifs",
  description: "Mini-séance 90 €, solo 150 €, couple 180 €, famille 220 €, portrait LinkedIn 90 €… Toutes les séances photo d'Authentic Code avec durée, nombre de photos et prix.",
  corps: () => {
    const groupe = (ids) => ids.map((i) => ligneOffre(seance[i])).join("\n");
    const pro = seance["portrait-pro"];
    return `
<section class="intro conteneur">
  <h1 class="titre-page">Séances &amp; tarifs</h1>
  <p class="chapeau">Chaque séance indique sa durée, le nombre de photos retouchées incluses et son prix. Si vous hésitez, décrivez votre envie : nous trouverons ensemble la formule adaptée.</p>
</section>

<section class="conteneur conteneur--moyen" aria-labelledby="comparer-titre">
  <h2 id="comparer-titre" class="titre-sous-section">Comparer en un coup d'œil</h2>
  <div class="tableau-defile" tabindex="0" role="region" aria-labelledby="comparer-titre">
    <table class="comparatif">
      <thead><tr><th scope="col">Séance</th><th scope="col">Durée</th><th scope="col">Photos</th><th scope="col">Prix</th></tr></thead>
      <tbody>
        ${offres.seances.map((s) => `<tr><th scope="row"><a href="#${s.id}">${esc(s.nom)}</a>${s.personnesMax ? `<span class="comparatif__note">jusqu'à ${s.personnesMax} personnes</span>` : ""}</th><td>${esc(s.duree)}</td><td>${s.photos}</td><td>${euros(s.prix)}</td></tr>`).join("\n        ")}
      </tbody>
    </table>
  </div>
  <p class="note">Photos retouchées incluses. ${esc(offres.livraisonRapide)}</p>
</section>

<section class="section" id="solo" aria-labelledby="solo-titre">
  <div class="conteneur conteneur--moyen">
    <h2 id="solo-titre" class="titre-section">Seul devant l'objectif</h2>
    <ul class="offres">${groupe(["mini-solo", "solo-classique", "solo-complet"])}</ul>
  </div>
</section>

<section class="section section--blanc portrait-pro" id="portrait-professionnel" aria-labelledby="pro-titre">
  <div class="conteneur portrait-pro__grille">
    <div class="portrait-pro__visuel">
      <figure class="portrait-pro__photo">${img(site.portraitPro.photo, { sizes: "(min-width: 900px) 40vw, 100vw" })}</figure>
      <figure class="portrait-pro__rond" aria-hidden="true">${img(site.portraitPro.photo, { sizes: "120px", alt: "" })}</figure>
      <p class="portrait-pro__legende">Un cadrage pensé pour rester lisible en photo de profil, y compris dans un affichage rond.</p>
    </div>
    <div class="portrait-pro__texte">
      <h2 id="pro-titre" class="titre-section">${esc(pro.nomComplet)}</h2>
      <p class="accroche">Une image professionnelle qui vous ressemble.</p>
      <p>Pour votre profil LinkedIn, votre CV, votre site ou votre présentation professionnelle, choisissez un portrait soigné et naturel. Nous préparons une image adaptée à votre activité et à la façon dont vous souhaitez vous présenter. Vous êtes accompagné pendant la séance pour trouver une posture et une expression dans lesquelles vous vous reconnaissez.</p>
      <ul class="offres offres--seule">${ligneOffre(pro, { details: false, court: true })}</ul>
      <h3 class="titre-mineur">Ce que vous y trouvez</h3>
      <ul class="liste">
        <li>Un portrait clair et actuel.</li>
        <li>Une tenue et un environnement cohérents avec votre activité.</li>
        <li>Un accompagnement pour la posture et l'expression.</li>
        <li>Une retouche soignée qui préserve l'identité du visage.</li>
      </ul>
      <h3 class="titre-mineur">Pour qui</h3>
      <p>Étudiants et jeunes diplômés, personnes en recherche d'emploi, salariés et cadres, entrepreneurs, indépendants et consultants.</p>
      <p class="encadre">Pour une équipe ou plusieurs collaborateurs, la prestation est établie sur devis selon le nombre de personnes, le lieu et l'organisation. ${`<a href="${lien("/demande/?categorie=equipe")}">Demander un devis pour une équipe</a>`}</p>
      <div class="faq faq--compacte">${faqListe((q) => (q.pages || []).includes("portrait") && !q.q.startsWith("Proposez"))}</div>
    </div>
  </div>
</section>

<section class="section" id="ensemble" aria-labelledby="ensemble-titre">
  <div class="conteneur conteneur--moyen">
    <h2 id="ensemble-titre" class="titre-section">À deux, en famille, en attendant bébé</h2>
    <ul class="offres">${groupe(["couple", "famille", "grossesse"])}</ul>
  </div>
</section>

<section class="section section--blanc" id="entre-amis" aria-labelledby="amis-titre">
  <div class="conteneur conteneur--moyen">
    <h2 id="amis-titre" class="titre-section">Entre amis</h2>
    <ul class="offres">${groupe(["amis-evjf"])}</ul>
    <p class="note">Pour suivre le déroulement d'un anniversaire, d'une soirée ou d'une réception, voyez plutôt le <a href="${lien("/mariages-evenements/#evenements-prives")}">reportage d'événement privé</a>, sur devis.</p>
  </div>
</section>

<section class="section" aria-labelledby="options-titre">
  <div class="conteneur conteneur--moyen deux-colonnes">
    <div>
      <h2 id="options-titre" class="titre-sous-section">En option</h2>
      <ul class="options">${offres.options.map((o) => `<li><span>${esc(o.nom)}</span><span>${euros(o.prix)}</span></li>`).join("")}</ul>
    </div>
    <div>
      <h2 class="titre-sous-section">Bon à savoir</h2>
      <ul class="liste">${offres.informations.map((t) => `<li>${esc(t)}</li>`).join("")}<li>${esc(site.livraison.albums)}</li></ul>
    </div>
  </div>
</section>

${site.cartesCadeaux.publie ? `<section class="section section--blanc" id="carte-cadeau" aria-labelledby="cadeau-titre">
  <div class="conteneur conteneur--etroit">
    <h2 id="cadeau-titre" class="titre-section">Offrir une séance</h2>
    <p class="chapeau">${esc(site.cartesCadeaux.texte)}</p>
    <div class="actions">${bouton("Offrir une séance", "/demande/?categorie=cadeau", "secondaire")}</div>
  </div>
</section>` : ""}

<section class="section" aria-labelledby="faq-seances-titre">
  <div class="conteneur conteneur--etroit">
    <h2 id="faq-seances-titre" class="titre-section">Avant de choisir</h2>
    <div class="faq">${faqListe((q) => (q.pages || []).includes("seances"))}</div>
    ${invitationFaq()}
  </div>
</section>`;
  },
});

// Mariages & événements
pages.push({
  chemin: "/mariages-evenements/", id: "mariages",
  titre: "Mariages & événements privés",
  description: "Mariages, séance d'engagement, anniversaires, fiançailles et réceptions privées à Paris et en Île-de-France : une couverture préparée avec vous, sur devis.",
  corps: () => `
<section class="intro conteneur">
  <h1 class="titre-page">Mariages &amp; événements</h1>
  <p class="chapeau">Des moments qui ne se rejouent pas. Je les prépare avec vous pour pouvoir, le jour venu, vous laisser les vivre pleinement.</p>
</section>

<section class="section section--blanc" id="mariage" aria-labelledby="mariage-titre">
  <div class="conteneur recit">
    <h2 id="mariage-titre" class="titre-section">Votre mariage</h2>
    <div class="recit__texte">
      <p class="chapeau">Chaque mariage a son rythme : les préparatifs, la cérémonie, les proches qu'on ne voit pas assez, les instants qui passent trop vite.</p>
      <p>Nous commençons par en parler. Vous me racontez votre journée, les personnes qui comptent et les moments que vous tenez à garder. Ensemble, nous préparons le déroulement de la prise de vue, pour que je sois au bon endroit au bon moment, sans que vous ayez à y penser.</p>
      <p>La durée de présence, les moments couverts, le nombre de photos et le délai de livraison sont définis avec vous et précisés dans un devis adapté à votre mariage.</p>
      <div class="actions">${bouton("Parler de notre mariage", "/demande/?categorie=mariage", "principal")}</div>
    </div>
  </div>
</section>

<section class="section" id="avant-le-mariage" aria-labelledby="avant-titre">
  <div class="conteneur recit">
    <h2 id="avant-titre" class="titre-section">Avant le mariage</h2>
    <div class="recit__texte">
      <p class="chapeau">Une séance d'engagement de 1 h 30, à deux, pour vous familiariser avec l'objectif avant le grand jour.</p>
      <ul class="liste">
        <li>Une séance d'engagement de 1 h 30.</li>
        <li>Des échanges préparatoires détaillés sur vos attentes.</li>
        <li>La préparation du déroulement et des moments importants à photographier.</li>
        <li>Une sélection et une retouche soignées des images.</li>
      </ul>
      <p>Vous arrivez au mariage en connaissant déjà ma façon de travailler, et plus à l'aise devant l'appareil. Si elle vous intéresse, indiquez-le dans votre demande : elle sera intégrée à notre échange et à votre devis.</p>
    </div>
  </div>
</section>

<section class="bande-noire" id="evenements-prives" aria-labelledby="evenements-titre">
  <div class="conteneur recit">
    <h2 id="evenements-titre" class="titre-section">Vos événements privés</h2>
    <div class="recit__texte">
      <p class="accroche">Profitez du moment. Gardez-en les images.</p>
      <p>Un anniversaire, des fiançailles, une réunion de famille ou une soirée privée : certains moments méritent d'être vécus pleinement et de rester en images. ${esc(site.nom)} vous propose une couverture adaptée à votre événement, à son rythme et aux personnes qui comptent pour vous.</p>
      <h3 class="titre-mineur">Par exemple</h3>
      <ul class="liste liste--colonnes">
        <li>Anniversaires</li><li>Fiançailles et demandes en mariage</li><li>Réunions de famille</li><li>Soirées et réceptions privées</li><li>EVJF et moments entre amis</li><li>Autres célébrations, à préciser ensemble</li>
      </ul>
      <div class="deux-choix">
        <div>
          <h3 class="titre-mineur">Une séance entre amis</h3>
          <p>Un temps consacré aux portraits et aux photos de groupe : ${esc(seance["amis-evjf"].duree)}, ${photosTxt(seance["amis-evjf"].photos)}, jusqu'à ${seance["amis-evjf"].personnesMax} personnes.</p>
          <p class="prix-ligne">${euros(seance["amis-evjf"].prix)}</p>
          <p>${bouton("Choisir cette séance", "/demande/?formule=amis-evjf", "lien")}</p>
        </div>
        <div>
          <h3 class="titre-mineur">Le reportage de votre événement</h3>
          <p>Je suis le déroulement de l'événement et ses moments importants. Le devis dépend notamment de la date et du lieu, de la durée souhaitée, du nombre approximatif de participants, des moments à couvrir, des livrables et du délai convenus.</p>
          <p class="prix-ligne">À la carte — sur devis</p>
          <p>${bouton("Demander un devis pour mon événement", "/demande/?categorie=evenement", "lien")}</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="marque-titre">
  <div class="conteneur recit">
    <h2 id="marque-titre" class="titre-sous-section">Projets de marque</h2>
    <div class="recit__texte">
      <p>Pour un projet de marque ou une demande qui ne figure pas ici, décrivez votre besoin : la prestation est définie avec vous, sur devis.</p>
      <p>${bouton("Demander un devis", "/demande/?categorie=autre", "lien")}</p>
    </div>
  </div>
</section>

<section class="section section--blanc" aria-labelledby="faq-ev-titre">
  <div class="conteneur conteneur--etroit">
    <h2 id="faq-ev-titre" class="titre-section">Questions fréquentes</h2>
    <div class="faq">${faqListe((q) => (q.pages || []).includes("mariages"))}</div>
    ${invitationFaq()}
  </div>
</section>`,
});

// À propos
pages.push({
  chemin: "/a-propos/", id: "apropos",
  titre: "À propos",
  description: `${site.photographe.prenomNom}, photographe et créateur d'${site.nom} : une photographie authentique, à l'écoute, attentive aux détails, à Paris et en Île-de-France.`,
  corps: () => `
<section class="conteneur apropos">
  <div class="apropos__texte">
    <h1 class="titre-page">${esc(site.photographe.prenomNom)}</h1>
    <p class="sous-titre">${esc(site.photographe.role)}</p>
    ${site.photographe.presentation.map((p) => `<p>${esc(p)}</p>`).join("\n    ")}
  </div>
  <figure class="apropos__photo">${img(site.photographe.photo, { eager: true, sizes: "(min-width: 900px) 50vw, 100vw" })}</figure>
</section>

<section class="section section--blanc" aria-labelledby="approche-titre">
  <div class="conteneur apropos-approche">
    <figure class="apropos-approche__photo">${img(site.photographe.photoSecondaire, { sizes: "(min-width: 900px) 30vw, 100vw" })}</figure>
    <div>
      <h2 id="approche-titre" class="titre-section">Ma façon de travailler</h2>
      <dl class="moments moments--clair">
        <div><dt>Écouter</dt><dd>Avant la séance, nous parlons de votre projet, de l'usage des photos et de l'ambiance que vous aimez. Vous pouvez m'envoyer des inspirations.</dd></div>
        <div><dt>Guider</dt><dd>Vous n'avez pas besoin de savoir poser. Je vous indique la posture, le regard et les mouvements, en prenant le temps de vous mettre à l'aise.</dd></div>
        <div><dt>Soigner</dt><dd>Je sélectionne et retouche les images avec attention aux détails, en gardant un rendu fidèle à qui vous êtes.</dd></div>
      </dl>
      <p>Suivez mon travail sur ${site.reseaux.map((r) => `<a href="${r.url}" target="_blank" rel="noopener">${esc(r.nom)} (${esc(r.compte)})</a>`).join(", ")}.</p>
    </div>
  </div>
</section>

${avis.length ? `<section class="section" aria-labelledby="avis-titre">
  <div class="conteneur">
    <h2 id="avis-titre" class="titre-section">Ils en parlent</h2>
    <ul class="avis">${avis.map((a) => `<li><blockquote><p>${esc(a.texte)}</p></blockquote>${a.auteur ? `<p class="avis__auteur">${esc(a.auteur)}${a.seance ? `, ${esc(a.seance)}` : ""}</p>` : ""}</li>`).join("")}</ul>
  </div>
</section>` : ""}

${invitationFinale()}`,
});

// Contact
pages.push({
  chemin: "/contact/", id: "contact",
  titre: "Contact",
  description: `Contacter ${site.nom} : WhatsApp, téléphone ${site.contact.telephoneAffiche}, e-mail ou formulaire de demande. Photographe à Paris et en Île-de-France.`,
  corps: () => `
<section class="intro conteneur">
  <h1 class="titre-page">Contact</h1>
  <p class="chapeau">Vous avez une idée, ou simplement une envie ? Parlons-en. Choisissez le moyen qui vous convient.</p>
</section>
<section class="conteneur contact">
  <ul class="contact__liste">
    <li>
      <h2 class="titre-mineur">Demander une séance ou un devis</h2>
      <p>Le formulaire en trois étapes transmet votre projet et la date souhaitée. Je vous recontacte pour vérifier la disponibilité.</p>
      ${bouton("Demander une séance", "/demande/", "principal")}
    </li>
    <li>
      <h2 class="titre-mineur">Poser une question</h2>
      <p>Une hésitation sur une formule, un lieu, une tenue ? Écrivez-moi avant de réserver.</p>
      ${bouton("Poser une question", "/demande/?categorie=question", "secondaire")}
    </li>
    <li>
      <h2 class="titre-mineur">WhatsApp</h2>
      <p>Pour échanger rapidement, par message.</p>
      ${waBouton("Écrire sur WhatsApp", "secondaire")}
    </li>
    <li>
      <h2 class="titre-mineur">Téléphone</h2>
      <p><a class="contact__gros" href="${site.contact.telephoneLien}">${esc(site.contact.telephoneAffiche)}</a></p>
    </li>
    <li>
      <h2 class="titre-mineur">E-mail</h2>
      <p><a class="contact__gros" href="mailto:${site.contact.email}">${esc(site.contact.email)}</a></p>
    </li>
    ${site.reseaux.map((r) => `<li><h2 class="titre-mineur">${esc(r.nom)}</h2><p><a class="contact__gros" href="${r.url}" target="_blank" rel="noopener">${esc(r.compte)}</a></p></li>`).join("")}
  </ul>
  <p class="note">Les séances ont lieu à ${esc(site.zone)}, en extérieur ou à domicile. Une demande envoyée n'est pas une réservation : la date est confirmée après notre échange.</p>
</section>`,
});

// FAQ
pages.push({
  chemin: "/faq/", id: "faq",
  titre: "Questions fréquentes",
  description: `Préparer sa séance, portraits professionnels, livraison des photos, événements et réservation : les réponses aux questions fréquentes sur ${site.nom}.`,
  corps: () => `
<section class="intro conteneur conteneur--etroit">
  <h1 class="titre-page">Questions fréquentes</h1>
  <nav class="sommaire" aria-label="Thèmes"><ul>${faq.themes.filter((t) => questionsPubliees.some((q) => q.theme === t.id)).map((t) => `<li><a href="#${t.id}">${esc(t.titre)}</a></li>`).join("")}</ul></nav>
</section>
<section class="conteneur conteneur--etroit faq-page">
  ${faq.themes.filter((t) => questionsPubliees.some((q) => q.theme === t.id)).map((t) => `<section id="${t.id}" aria-labelledby="t-${t.id}"><h2 id="t-${t.id}" class="titre-sous-section">${esc(t.titre)}</h2><div class="faq">${faqListe((q) => q.theme === t.id)}</div></section>`).join("\n  ")}
  ${invitationFaq()}
</section>`,
});

// Demande
const categoriesForm = [
  ["seance", "Une séance photo", "Portrait, couple, famille, grossesse, entre amis…"],
  ["portrait", "Un portrait professionnel", "LinkedIn, CV ou présentation."],
  ["equipe", "Des portraits pour une équipe", "Plusieurs collaborateurs, sur devis."],
  ["mariage", "Un mariage", "Avec ou sans séance d'engagement, sur devis."],
  ["evenement", "Un événement privé", "Anniversaire, fiançailles, réception… sur devis."],
  ...(site.cartesCadeaux.publie ? [["cadeau", "Offrir une séance", "Une carte cadeau pour une séance de la grille."]] : []),
  ["autre", "Un autre projet", "Projet de marque, studio, demande particulière."],
  ["question", "Juste une question", "Avant de choisir quoi que ce soit."],
];
pages.push({
  chemin: "/demande/", id: "demande",
  titre: "Demander une séance",
  description: `Envoyez votre demande de séance photo à ${site.nom} : formule, date souhaitée et lieu. Je vous recontacte pour vérifier la disponibilité.`,
  scripts: ["demande.js"],
  corps: () => `
<section class="intro conteneur conteneur--etroit">
  <h1 class="titre-page">Demander une séance</h1>
  <p class="chapeau">Trois étapes courtes, sans inscription. Votre demande n'est pas encore une réservation : je vous recontacte pour vérifier la disponibilité et préparer la séance avec vous.</p>
</section>
<section class="conteneur conteneur--etroit">
  <form class="demande" id="demande" action="${prefixe}api/demande" method="post" novalidate data-apercu="${APERCU ? "1" : "0"}">
    <p class="demande__progression" aria-live="polite"></p>

    <fieldset class="etape" data-etape="1">
      <legend class="etape__titre" tabindex="-1">1. Votre séance</legend>
      <div class="champ">
        <p class="champ__label" id="cat-label">Que souhaitez-vous ?</p>
        <div class="choix" role="radiogroup" aria-labelledby="cat-label">
          ${categoriesForm.map(([v, t, d], i) => `<label class="choix__item"><input type="radio" name="categorie" value="${v}" required${i === 0 ? " checked" : ""}><span class="choix__texte"><strong>${t}</strong><span>${d}</span></span></label>`).join("\n          ")}
        </div>
      </div>
      <div class="champ" data-si="seance cadeau">
        <label for="formule">Formule</label>
        <select id="formule" name="formule">
          <option value="">Je ne sais pas encore, conseillez-moi</option>
          ${offres.seances.filter((s) => s.id !== "portrait-pro").map((s) => `<option value="${s.id}">${esc(s.nom)} — ${esc(s.duree)}, ${photosTxt(s.photos)}, ${euros(s.prix)}</option>`).join("\n          ")}
        </select>
      </div>
      <p class="champ__aide" data-si="portrait">${esc(seance["portrait-pro"].nomComplet)} : ${esc(seance["portrait-pro"].duree)}, ${photosTxt(seance["portrait-pro"].photos)}, ${euros(seance["portrait-pro"].prix)}.</p>
    </fieldset>

    <fieldset class="etape" data-etape="2">
      <legend class="etape__titre" tabindex="-1">2. Votre projet et la date souhaitée</legend>
      <div class="champ" data-si="evenement">
        <label for="typeEvenement">Type d'événement</label>
        <select id="typeEvenement" name="typeEvenement">
          <option value="">Choisir</option>
          <option>Anniversaire</option><option>Fiançailles ou demande en mariage</option><option>Réunion de famille</option><option>Soirée ou réception privée</option><option>EVJF ou moment entre amis</option><option>Autre célébration</option>
        </select>
      </div>
      <div class="champ" data-si="seance portrait equipe mariage evenement autre cadeau">
        <label for="date"><span data-si="seance portrait equipe mariage evenement autre">Date souhaitée</span><span data-si="cadeau">Date souhaitée pour la remise de la carte</span> <span class="facultatif" data-si="autre cadeau">(facultatif)</span></label>
        <input type="date" id="date" name="date">
        <label class="case" data-si="seance portrait equipe mariage evenement autre"><input type="checkbox" name="dateFlexible" value="oui"> Ma date est flexible</label>
        <p class="champ__aide" data-si="seance portrait equipe mariage evenement autre">C'est une préférence : la disponibilité est vérifiée lors de notre échange.</p>
      </div>
      <div class="champ" data-si="seance portrait equipe mariage evenement autre">
        <label for="lieu">Ville ou lieu envisagé <span class="facultatif" data-si="autre">(facultatif)</span></label>
        <input type="text" id="lieu" name="lieu" autocomplete="address-level2" maxlength="120" placeholder="Par exemple : Paris 11e, Vincennes, à domicile…">
      </div>
      <div class="champ" data-si="seance equipe evenement mariage">
        <label for="personnes"><span data-si="seance">Nombre de personnes</span><span data-si="equipe">Nombre de collaborateurs</span><span data-si="evenement mariage">Nombre approximatif d'invités</span> <span class="facultatif" data-si="mariage">(facultatif)</span></label>
        <input type="number" id="personnes" name="personnes" inputmode="numeric" min="1" max="1000">
        <p class="champ__aide" id="personnes-aide"></p>
      </div>
      <div class="champ" data-si="mariage evenement">
        <label for="dureeCouverture">Durée de présence souhaitée</label>
        <select id="dureeCouverture" name="dureeCouverture">
          <option value="">Je ne sais pas encore</option>
          <option>1 à 2 heures</option><option>Une demi-journée</option><option>Une journée</option><option>Plus d'une journée</option>
        </select>
      </div>
      <label class="case" data-si="mariage"><input type="checkbox" name="engagement" value="oui"> Une séance d'engagement avant le mariage m'intéresse</label>
      <div class="champ" data-si="cadeau">
        <label for="beneficiaire">Prénom de la personne à qui vous offrez la séance <span class="facultatif">(facultatif)</span></label>
        <input type="text" id="beneficiaire" name="beneficiaire" maxlength="80">
      </div>
      <div class="champ" data-si="equipe mariage evenement autre">
        <label for="budget">Budget envisagé <span class="facultatif">(facultatif)</span></label>
        <input type="text" id="budget" name="budget" maxlength="60" placeholder="Une fourchette suffit">
      </div>
    </fieldset>

    <fieldset class="etape" data-etape="3">
      <legend class="etape__titre" tabindex="-1">3. Vos coordonnées</legend>
      <div class="grille-2">
        <div class="champ"><label for="prenom">Prénom</label><input type="text" id="prenom" name="prenom" autocomplete="given-name" required maxlength="60"></div>
        <div class="champ"><label for="nom">Nom</label><input type="text" id="nom" name="nom" autocomplete="family-name" required maxlength="60"></div>
      </div>
      <div class="champ"><label for="email">Adresse e-mail</label><input type="email" id="email" name="email" autocomplete="email" required maxlength="120"></div>
      <div class="champ"><label for="telephone">Téléphone <span class="facultatif" id="tel-facultatif">(facultatif si vous préférez l'e-mail)</span></label><input type="tel" id="telephone" name="telephone" autocomplete="tel" inputmode="tel" maxlength="25"></div>
      <div class="champ">
        <p class="champ__label" id="pref-label">Comment préférez-vous être recontacté ?</p>
        <div class="choix choix--ligne" role="radiogroup" aria-labelledby="pref-label">
          <label class="choix__item"><input type="radio" name="preference" value="E-mail" checked><span class="choix__texte"><strong>E-mail</strong></span></label>
          <label class="choix__item"><input type="radio" name="preference" value="Téléphone"><span class="choix__texte"><strong>Téléphone</strong></span></label>
          <label class="choix__item"><input type="radio" name="preference" value="WhatsApp"><span class="choix__texte"><strong>WhatsApp</strong></span></label>
        </div>
      </div>
      <div class="champ">
        <label for="message"><span data-si="seance portrait equipe mariage evenement cadeau">Votre message <span class="facultatif">(facultatif)</span></span><span data-si="autre question">Votre message</span></label>
        <textarea id="message" name="message" rows="5" maxlength="2000" placeholder="Ce que vous imaginez, une question, une contrainte…"></textarea>
      </div>
      <div class="champ-piege" aria-hidden="true"><label for="site_web">Ne pas remplir ce champ</label><input type="text" id="site_web" name="site_web" tabindex="-1" autocomplete="off"></div>
      <input type="hidden" name="debut" value="">

      <section class="recap" aria-labelledby="recap-titre">
        <h2 id="recap-titre" class="titre-mineur">Récapitulatif de votre demande</h2>
        <dl class="recap__liste"></dl>
        <p class="recap__note">Les éventuelles options, un déplacement hors Île-de-France ou une location de studio restent à préciser ensemble. Cette demande n'est pas une réservation confirmée : la date est une préférence.</p>
      </section>
      ${APERCU ? `<p class="alerte alerte--info">Version d'aperçu : l'envoi par e-mail n'est pas encore actif ici. Pour une vraie demande, utilisez WhatsApp ci-dessous.</p>` : ""}
      <p class="champ__aide">Vos informations servent uniquement à répondre à votre demande. <a href="${lien("/confidentialite/")}">Confidentialité</a></p>
    </fieldset>

    <div class="alerte alerte--erreur" role="alert" hidden></div>

    <div class="demande__actions">
      <button type="button" class="btn btn--secondaire" data-action="precedent">Étape précédente</button>
      <button type="button" class="btn btn--principal" data-action="suivant">Étape suivante</button>
      <button type="submit" class="btn btn--principal" data-action="envoyer">Envoyer ma demande</button>
    </div>

    <div class="demande__whatsapp" data-si-etape="3">
      <p>Vous préférez WhatsApp ? Le message est prérempli à partir de votre récapitulatif. WhatsApp s'ouvre : il vous restera à appuyer sur « Envoyer » dans l'application.</p>
      <a class="btn btn--secondaire" id="lien-whatsapp" href="${site.contact.whatsapp}" target="_blank" rel="noopener">Continuer sur WhatsApp</a>
    </div>
  </form>

  <div class="succes" id="succes" hidden tabindex="-1">
    <h2 class="titre-section">Merci.</h2>
    <p class="chapeau">Votre demande a bien été envoyée. Je vous recontacte pour vérifier la disponibilité et préparer votre séance. Votre réservation sera confirmée après notre échange.</p>
    <p class="succes__ref"></p>
    <div class="actions">${bouton("Revenir à l'accueil", "/", "secondaire")}${bouton("Voir le portfolio", "/portfolio/", "lien")}</div>
  </div>
</section>
<script type="application/json" id="donnees-offres">${JSON.stringify({
    seances: offres.seances.map(({ id, nom, nomComplet, duree, photos: n, prix, personnesMax }) => ({ id, nom, nomComplet, duree, photos: n, prix, personnesMax })),
    categories: Object.fromEntries(categoriesForm.map(([v, t]) => [v, t])),
    whatsapp: site.contact.whatsapp,
  }).replace(/</g, "\\u003c")}</script>`,
});

// Mentions légales
const ml = site.mentionsLegales;
pages.push({
  chemin: "/mentions-legales/", id: "legal",
  titre: "Mentions légales",
  description: `Mentions légales du site ${site.nom}.`,
  corps: () => `
<section class="intro conteneur conteneur--etroit texte-long">
  <h1 class="titre-page">Mentions légales</h1>
  <h2 class="titre-sous-section">Éditeur du site</h2>
  <p>${esc(ml.editeur)}${ml.statut ? `<br>${esc(ml.statut)}` : ""}${ml.siret ? `<br>SIRET : ${esc(ml.siret)}` : ""}${ml.adresse ? `<br>${esc(ml.adresse)}` : ""}<br>Téléphone : <a href="${site.contact.telephoneLien}">${esc(site.contact.telephoneAffiche)}</a><br>E-mail : <a href="mailto:${site.contact.email}">${esc(site.contact.email)}</a></p>
  <p>Responsable de la publication : ${esc(site.photographe.prenomNom)}.</p>
  <h2 class="titre-sous-section">Hébergement</h2>
  <p>${esc(ml.hebergeur)}</p>
  <h2 class="titre-sous-section">Photographies et contenus</h2>
  <p>Les photographies présentées sur ce site sont réalisées par ${esc(site.nom)}. Elles ne peuvent pas être reproduites ou réutilisées sans autorisation. Les personnes photographiées peuvent demander le retrait d'une image en écrivant à <a href="mailto:${site.contact.email}">${esc(site.contact.email)}</a>.</p>
  <p>Polices de caractères : Bodoni Moda et Instrument Sans, sous licence SIL Open Font License.</p>
</section>`,
});

// Confidentialité
pages.push({
  chemin: "/confidentialite/", id: "confidentialite",
  titre: "Confidentialité",
  description: `Comment ${site.nom} utilise les informations envoyées par le formulaire de demande.`,
  corps: () => `
<section class="intro conteneur conteneur--etroit texte-long">
  <h1 class="titre-page">Confidentialité</h1>
  <h2 class="titre-sous-section">Les informations que vous envoyez</h2>
  <p>Le formulaire de demande recueille uniquement ce qui est utile pour vous répondre : la prestation souhaitée, la date et le lieu envisagés, vos nom et prénom, votre e-mail, votre téléphone si vous le donnez, votre moyen de contact préféré et votre message.</p>
  <h2 class="titre-sous-section">À quoi elles servent</h2>
  <p>Elles servent uniquement à traiter votre demande : vous recontacter, vérifier la disponibilité et préparer votre séance ou votre devis. Elles ne sont ni vendues ni utilisées pour de la prospection sans votre accord.</p>
  <h2 class="titre-sous-section">Qui les reçoit</h2>
  <p>Votre demande est transmise par e-mail à ${esc(site.photographe.prenomNom)} (${esc(site.nom)}). Pour cet envoi, le site s'appuie sur son hébergeur (Cloudflare) et sur un service d'envoi d'e-mails (Resend), qui traitent ces données uniquement pour acheminer le message. Si vous choisissez WhatsApp, l'échange se fait dans l'application WhatsApp, selon ses propres conditions.</p>
  <h2 class="titre-sous-section">Combien de temps</h2>
  <p>Les échanges sont conservés le temps nécessaire au traitement de votre demande et, si une séance a lieu, à son suivi.</p>
  <h2 class="titre-sous-section">Cookies et mesure d'audience</h2>
  <p>Ce site n'utilise pas de cookies publicitaires ni d'outil de mesure d'audience. Le formulaire peut conserver temporairement votre saisie dans votre navigateur, le temps de votre visite, pour que vous ne perdiez rien en changeant d'étape.</p>
  <h2 class="titre-sous-section">Vos droits</h2>
  <p>Vous pouvez demander l'accès, la rectification ou la suppression de vos informations en écrivant à <a href="mailto:${site.contact.email}">${esc(site.contact.email)}</a>. Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).</p>
</section>`,
});

// 404
pages.push({
  chemin: "/404/", id: "erreur",
  titre: "Page introuvable",
  description: "Cette page n'existe pas ou a été déplacée.",
  corps: () => `
<section class="intro conteneur conteneur--etroit">
  <h1 class="titre-page">Cette page est introuvable</h1>
  <p class="chapeau">Le lien est peut-être incomplet ou la page a été déplacée.</p>
  <div class="actions">${bouton("Revenir à l'accueil", "/", "principal")}${bouton("Voir les séances", "/seances/", "secondaire")}</div>
</section>`,
});

// ---------- écriture ----------
if (existsSync(SORTIE)) rmSync(SORTIE, { recursive: true });
mkdirSync(SORTIE, { recursive: true });
cpSync(join(RACINE, "src/assets"), join(SORTIE, "assets"), { recursive: true });

// Aperçu : styles, polices et scripts intégrés dans chaque page (hébergement d'aperçu restrictif)
function integrer(html, estRacine) {
  const css = readFileSync(join(RACINE, "src/assets/css/style.css"), "utf8").replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (_, f) =>
    `url("data:font/woff2;base64,${readFileSync(join(RACINE, "src/assets/fonts", f)).toString("base64")}")`);
  html = html.replace(/<link rel="preload"[^>]+>\n/g, "")
    .replace(/<link rel="stylesheet"[^>]+>/, () => `<style>${css}</style>`)
    .replace(/<script src="[^"]*assets\/js\/([^"?]+)\?v=[^"]+" defer><\/script>/g, (_, f) =>
      `<script>document.addEventListener("DOMContentLoaded",function(){${readFileSync(join(RACINE, "src/assets/js", f), "utf8")}});</script>`);
  if (estRacine) html = html.replace(/<!doctype html>\n<html lang="fr">\n<head>\n/, "").replace("</head>\n", "").replace(/<body[^>]*>\n/, "").replace("</body>\n</html>\n", "");
  return html;
}

for (const p of pages) {
  let html = page(p);
  if (APERCU) html = integrer(html, p.chemin === "/");
  const dossier = p.id === "erreur" ? SORTIE : join(SORTIE, p.chemin);
  mkdirSync(dossier, { recursive: true });
  writeFileSync(join(dossier, p.id === "erreur" ? "404.html" : "index.html"), html);
}

const base = site.adresseSite.replace(/\/$/, "");
const indexables = pages.filter((p) => !["erreur", "demande"].includes(p.id));
writeFileSync(join(SORTIE, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexables.map((p) => `  <url><loc>${base}${p.chemin}</loc></url>`).join("\n")}
  <url><loc>${base}/demande/</loc></url>
</urlset>
`);
writeFileSync(join(SORTIE, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
writeFileSync(join(SORTIE, "_headers"), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/assets/img/*
  Cache-Control: public, max-age=2592000
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
`);
mkdirSync(join(RACINE, "lib"), { recursive: true });
writeFileSync(join(RACINE, "lib/donnees.js"), `// Fichier généré par build.mjs à partir de src/data — ne pas modifier à la main.
export const SEANCES = ${JSON.stringify(Object.fromEntries(offres.seances.map(({ id, nom, nomComplet, duree, photos: n, prix, personnesMax }) => [id, { nom, nomComplet, duree, photos: n, prix, personnesMax }])), null, 2)};
export const CATEGORIES = ${JSON.stringify(Object.fromEntries(categoriesForm.map(([v, t]) => [v, t])), null, 2)};
export const EMAIL_PAR_DEFAUT = ${JSON.stringify(site.contact.email)};
`);
console.log(`${pages.length} pages générées dans ${SORTIE.replace(RACINE + "/", "")}/`);
