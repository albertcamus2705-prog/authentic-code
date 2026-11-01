// Cloudflare Pages Function : reçoit le formulaire de demande et l'envoie par e-mail via Resend.
// Variables à définir dans Cloudflare (Paramètres > Variables et secrets) :
//   RESEND_API_KEY  (secret, obligatoire)  — clé d'API Resend
//   DESTINATAIRE    (facultatif)           — adresse qui reçoit les demandes
//   EXPEDITEUR      (facultatif)           — ex. "Authentic Code <demandes@votre-domaine.fr>" une fois un domaine vérifié
import { SEANCES, CATEGORIES, EMAIL_PAR_DEFAUT } from "../../lib/donnees.js";

const TYPES_EVENEMENT = ["Anniversaire", "Fiançailles ou demande en mariage", "Réunion de famille", "Soirée ou réception privée", "EVJF ou moment entre amis", "Autre célébration"];
const DUREES = ["1 à 2 heures", "Une demi-journée", "Une journée", "Plus d'une journée"];
const PREFERENCES = ["E-mail", "Téléphone", "WhatsApp"];

const nettoyer = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
const uneLigne = (v, max) => nettoyer(v, max).replace(/[\r\n]+/g, " ");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function reference() {
  const d = new Date();
  const jour = d.toISOString().slice(0, 10).replace(/-/g, "");
  const alea = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0, 4).padStart(4, "0");
  return `AC-${jour}-${alea}`;
}

function valider(b) {
  const e = [];
  const d = {
    categorie: uneLigne(b.categorie, 20),
    formule: uneLigne(b.formule, 40),
    date: uneLigne(b.date, 10),
    dateFlexible: b.dateFlexible ? "oui" : "",
    lieu: uneLigne(b.lieu, 120),
    personnes: uneLigne(b.personnes, 5),
    typeEvenement: uneLigne(b.typeEvenement, 60),
    dureeCouverture: uneLigne(b.dureeCouverture, 40),
    engagement: b.engagement ? "oui" : "",
    beneficiaire: uneLigne(b.beneficiaire, 80),
    budget: uneLigne(b.budget, 60),
    prenom: uneLigne(b.prenom, 60),
    nom: uneLigne(b.nom, 60),
    email: uneLigne(b.email, 120),
    telephone: uneLigne(b.telephone, 25),
    preference: uneLigne(b.preference, 20),
    message: nettoyer(b.message, 2000),
  };
  if (!CATEGORIES[d.categorie]) e.push("Type de demande inconnu.");
  if (d.categorie === "portrait") d.formule = "portrait-pro";
  if (!["seance", "cadeau", "portrait"].includes(d.categorie)) d.formule = "";
  if (d.formule && !SEANCES[d.formule]) e.push("Formule inconnue.");
  if (d.date && !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) e.push("Date invalide.");
  if (d.date) {
    const hier = new Date(Date.now() - 36 * 3600 * 1000).toISOString().slice(0, 10);
    if (d.date < hier) e.push("La date souhaitée est déjà passée.");
  }
  if (["seance", "portrait", "equipe", "mariage", "evenement"].includes(d.categorie) && !d.date && !d.dateFlexible)
    e.push("Indiquez une date souhaitée ou une date flexible.");
  if (["mariage", "evenement"].includes(d.categorie) && !d.lieu) e.push("Indiquez le lieu envisagé.");
  if (d.personnes && !/^\d{1,4}$/.test(d.personnes)) e.push("Nombre de personnes invalide.");
  if (d.categorie === "equipe" && !d.personnes) e.push("Indiquez le nombre de collaborateurs.");
  const f = SEANCES[d.formule];
  if (f && f.personnesMax && d.personnes && Number(d.personnes) > f.personnesMax) e.push(`La formule ${f.nom} accueille jusqu'à ${f.personnesMax} personnes.`);
  if (d.categorie === "evenement" && !TYPES_EVENEMENT.includes(d.typeEvenement)) e.push("Choisissez le type d'événement.");
  if (d.dureeCouverture && !DUREES.includes(d.dureeCouverture)) d.dureeCouverture = "";
  if (!d.prenom) e.push("Indiquez votre prénom.");
  if (!d.nom) e.push("Indiquez votre nom.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) e.push("Adresse e-mail invalide.");
  if (!PREFERENCES.includes(d.preference)) d.preference = "E-mail";
  const chiffres = d.telephone.replace(/\D/g, "");
  if (d.telephone && (chiffres.length < 9 || chiffres.length > 15 || /[^\d\s+().-]/.test(d.telephone))) e.push("Numéro de téléphone invalide.");
  if (!d.telephone && d.preference !== "E-mail") e.push("Indiquez un numéro de téléphone.");
  if (["autre", "question"].includes(d.categorie) && d.message.length < 5) e.push("Écrivez votre message.");
  return { d, e };
}

function contenuEmail(d, ref) {
  const f = SEANCES[d.formule];
  const dateLisible = d.date
    ? new Date(d.date + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })
    : "";
  const lignes = [
    ["Référence", ref],
    ["Demande", CATEGORIES[d.categorie]],
    ["Prestation / formule", f ? `${f.nomComplet || f.nom} — ${f.duree}, ${f.photos} photos retouchées` : (["seance", "cadeau"].includes(d.categorie) ? "À choisir ensemble" : "")],
    ["Prix de la formule", f ? `${f.prix} €` : (["equipe", "mariage", "evenement", "autre"].includes(d.categorie) ? "Sur devis" : "")],
    ["Type d'événement", d.typeEvenement],
    ["Date souhaitée", [dateLisible, d.dateFlexible ? "date flexible" : ""].filter(Boolean).join(" — ")],
    ["Lieu", d.lieu],
    ["Nombre de personnes", d.personnes],
    ["Durée de présence souhaitée", d.dureeCouverture],
    ["Séance d'engagement", d.engagement ? "Intéressés" : ""],
    ["Carte cadeau pour", d.beneficiaire],
    ["Budget envisagé", d.budget],
    ["Client", `${d.prenom} ${d.nom}`],
    ["E-mail", d.email],
    ["Téléphone", d.telephone],
    ["Contact préféré", d.preference],
  ].filter(([, v]) => v);
  const texte = lignes.map(([k, v]) => `${k} : ${v}`).join("\n") + (d.message ? `\n\nMessage :\n${d.message}` : "") +
    "\n\nRépondre à cet e-mail écrit directement au client. La demande n'est pas une réservation : la date reste à confirmer.";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#101010">
<h2 style="font-family:Georgia,serif;font-weight:normal">Nouvelle demande — ${esc(CATEGORIES[d.categorie])}</h2>
<table cellpadding="6" style="border-collapse:collapse">${lignes.map(([k, v]) => `<tr><td style="color:#525252;vertical-align:top">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join("")}</table>
${d.message ? `<p style="margin-top:16px;color:#525252">Message :</p><p style="white-space:pre-wrap">${esc(d.message)}</p>` : ""}
<p style="margin-top:24px;color:#525252;font-size:13px">Répondre à cet e-mail écrit directement au client. La demande n'est pas une réservation : la date reste à confirmer.</p></div>`;
  const sujet = `Demande ${ref} — ${CATEGORIES[d.categorie]}${d.typeEvenement ? ` (${d.typeEvenement})` : ""}${f ? ` : ${f.nom} (${f.prix} €)` : ""} — ${d.prenom} ${d.nom}`;
  return { texte, html, sujet };
}

function reponse(request, statut, corps) {
  const veutJson = (request.headers.get("accept") || "").includes("application/json");
  if (veutJson) return new Response(JSON.stringify(corps), { status: statut, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  const titre = corps.ok ? "Votre demande a bien été envoyée." : "Votre demande n'a pas pu être envoyée.";
  const texte = corps.ok
    ? "Je vous recontacte pour vérifier la disponibilité et préparer votre séance. Votre réservation sera confirmée après notre échange."
    : `${corps.message || ""} Revenez à la page précédente pour corriger, ou écrivez sur WhatsApp au 06 14 46 91 88.`;
  return new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titre)}</title><body style="font-family:system-ui,sans-serif;max-width:640px;margin:10vh auto;padding:0 20px;color:#101010;background:#F7F4EF"><h1 style="font-family:Georgia,serif;font-weight:normal">${esc(titre)}</h1><p>${esc(texte)}</p>${corps.reference ? `<p><strong>Référence : ${esc(corps.reference)}</strong></p>` : ""}<p><a href="/">Revenir au site</a></p></body></html>`,
    { status: statut, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  const taille = Number(request.headers.get("content-length") || 0);
  if (taille > 20000) return reponse(request, 413, { ok: false, message: "Votre message est trop long." });

  let b;
  try {
    const type = request.headers.get("content-type") || "";
    b = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return reponse(request, 400, { ok: false, message: "Le formulaire reçu est illisible." });
  }

  // Protection antispam simple : champ invisible et délai minimal de saisie.
  if (b.site_web) return reponse(request, 400, { ok: false, message: "Votre demande n'a pas pu être traitée." });
  const debut = Number(b.debut);
  if (debut && Date.now() - debut < 3000) return reponse(request, 429, { ok: false, message: "Envoi trop rapide : patientez quelques secondes puis réessayez." });

  const { d, e } = valider(b);
  if (e.length) return reponse(request, 422, { ok: false, message: e.join(" ") });

  if (!env.RESEND_API_KEY) return reponse(request, 503, { ok: false, message: "L'envoi par e-mail n'est pas encore configuré sur ce site." });

  const ref = reference();
  const { texte, html, sujet } = contenuEmail(d, ref);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EXPEDITEUR || "Authentic Code <onboarding@resend.dev>",
        to: [env.DESTINATAIRE || EMAIL_PAR_DEFAUT],
        reply_to: d.email,
        subject: sujet,
        text: texte,
        html,
      }),
    });
    if (!r.ok) {
      console.log("Resend a refusé l'envoi", r.status, await r.text());
      return reponse(request, 502, { ok: false, message: "Le service d'envoi n'a pas accepté la demande." });
    }
  } catch (err) {
    console.log("Erreur d'envoi", err);
    return reponse(request, 502, { ok: false, message: "Le service d'envoi est injoignable pour le moment." });
  }
  return reponse(request, 200, { ok: true, reference: ref });
}
