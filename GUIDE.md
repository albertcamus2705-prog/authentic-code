# Site Authentic Code — guide

Ce guide explique comment modifier le site, le mettre en ligne et activer l'envoi des demandes par e-mail. Aucune connaissance technique avancée n'est nécessaire : la plupart des changements se font en modifiant un fichier texte, puis en le renvoyant sur GitHub. Vous pouvez aussi simplement demander à Claude de faire la modification.

## Ce qui est prêt et ce qui attend

| Fonction | État |
|---|---|
| Pages, textes, tarifs, portfolio, FAQ | Prêts |
| Liens WhatsApp, téléphone, Instagram | Prêts |
| Formulaire en 3 étapes, récapitulatif, message WhatsApp prérempli | Prêts |
| Envoi des demandes par e-mail | Configuré (clé Resend enregistrée comme secret Cloudflare). En cas de panne, le formulaire affiche une erreur claire et propose WhatsApp : il n'affiche jamais un faux succès. |
| Aperçu de partage (WhatsApp, Instagram, e-mail) | Prêt, à condition de renseigner l'adresse définitive du site (`adresseSite`) |
| Mentions légales | Statut renseigné ; SIRET et adresse à compléter avant la diffusion publique |
| Avis clients | Publiés (avis réels, publication autorisée) |

## Organisation des fichiers

```
src/data/site.json      coordonnées, présentation, textes de l'accueil, mentions légales
src/data/offres.json    séances, durées, nombre de photos, prix, options
src/data/faq.json       questions fréquentes (publiées ou masquées)
src/data/avis.json      avis clients (masqués par défaut)
src/data/photos.json    liste des photos, textes alternatifs, point de cadrage
photos-originales/      vos photos d'origine
src/assets/             styles, scripts, polices, photos optimisées
functions/api/demande.js  envoi des demandes par e-mail (côté serveur)
build.mjs               fabrique le site dans public/
outils/                 préparation des photos, serveur de test
```

Ne modifiez pas le dossier `public/` : il est recréé à chaque fois.

## Changer un tarif, une durée ou un texte d'offre

Ouvrez `src/data/offres.json`. Chaque séance ressemble à ceci :

```json
{ "id": "couple", "nom": "Couple", "pour": "Deux personnes", "duree": "1 h", "photos": 15, "prix": 180, ... }
```

Changez `prix`, `duree`, `photos` ou `description`. Ne changez pas `id` : il sert aux liens directs (par exemple `/seances/#couple`) et au formulaire. Le nouveau prix apparaît partout : tableau, accueil, formulaire, message WhatsApp et e-mail reçu.

## Changer les coordonnées

Ouvrez `src/data/site.json`, partie `contact` (téléphone, WhatsApp, e-mail) et `reseaux` (Instagram). Si vous changez d'adresse e-mail de réception, changez aussi la variable `DESTINATAIRE` dans Cloudflare (étape 4).

## Ajouter ou remplacer une photo

1. Placez la photo dans `photos-originales/`.
2. Dans `src/data/photos.json`, ajoutez une entrée :
   ```json
   { "id": "nom-court-sans-espace", "source": "fichier.jpg", "alt": "Description de la photo pour les personnes malvoyantes.", "cadrage": "50% 30%", "categorie": "Portraits", "portfolio": true }
   ```
   `cadrage` indique le point à garder visible quand la photo est recadrée : la première valeur va de la gauche (0%) à la droite (100%), la seconde du haut (0%) au bas (100%). Pour un visage en haut au centre : `50% 25%`.
3. Lancez `python3 outils/preparer-photos.py` (il faut Python et Pillow : `pip install Pillow`). Il crée les versions optimisées.
4. L'ordre de la galerie suit l'ordre de la liste.

Pour changer la photo d'accueil, mettez son `id` dans `site.json` → `accueil.photo`.

Les filtres du portfolio (Portraits, Couples, Familles…) apparaissent automatiquement dès que deux catégories ont chacune au moins 3 photos.

N'ajoutez que des photos réalisées par Authentic Code, avec l'accord des personnes photographiées (celui des parents pour un mineur).

## Publier une réponse de FAQ ou un avis

Dans `src/data/faq.json`, une question masquée a `"publie": false` et une réponse vide. Écrivez la réponse dans `"r"` et passez `"publie"` à `true`.

Dans `src/data/avis.json`, passez `"publie"` à `true` seulement pour un avis réellement écrit par un client qui accepte sa publication, et indiquez son prénom ou ses initiales dans `"auteur"`.

## Mise en ligne (gratuite)

Déjà fait : site en ligne sur https://authentic-code.pages.dev, relié au dépôt GitHub albertcamus2705-prog/authentic-code. Toute modification envoyée sur GitHub met le site à jour en une à deux minutes. Les étapes ci-dessous servent de référence.

Solution retenue : **GitHub** (stockage des fichiers) + **Cloudflare Pages** (hébergement) + **Resend** (envoi des e-mails). Ces conditions ont été vérifiées le 1er novembre 2026 sur les sites officiels ; elles peuvent changer.

- Cloudflare Pages, offre gratuite : pages et photos servies sans limite de visites ; la fonction d'envoi compte dans un quota de 100 000 requêtes par jour ; 500 mises à jour du site par mois.
- Resend, offre gratuite : 3 000 e-mails par mois, 100 par jour. Sans domaine personnel, Resend n'envoie qu'à l'adresse de votre compte Resend : créez donc le compte avec **authenticcodephoto@gmail.com**.
- Adresse du site : gratuite en `….pages.dev`. Un nom de domaine personnel (par exemple `authenticcode.fr`) est payant : son prix annuel dépend de l'extension (.fr, .com…) et du registraire.

### 1. Mettre les fichiers sur GitHub

1. Créez un compte sur github.com.
2. Créez un dépôt (« New repository »), par exemple `authentic-code`, en privé.
3. « Add file » → « Upload files » : déposez **le contenu** du dossier `authentic-code` (pas le dossier `public/`).

### 2. Créer le site sur Cloudflare Pages

1. Créez un compte sur cloudflare.com.
2. « Workers & Pages » → « Create » → « Pages » → « Connect to Git » → choisissez le dépôt.
3. Réglages de construction :
   - Framework preset : **None**
   - Build command : `node build.mjs`
   - Build output directory : `public`
4. Lancez le déploiement. Le site est en ligne à une adresse du type `https://authentic-code.pages.dev` (le nom exact dépend de la disponibilité).
5. Si l'adresse est différente, remplacez `adresseSite` dans `src/data/site.json` et renvoyez le fichier sur GitHub : le site se met à jour tout seul.

### 3. Créer la clé d'envoi Resend

1. Créez un compte sur resend.com **avec authenticcodephoto@gmail.com**.
2. « API Keys » → « Create API Key », permission « Sending access ». Copiez la clé (elle commence par `re_`). Ne la partagez pas et ne la mettez dans aucun fichier.

### 4. Donner la clé au site

Dans Cloudflare : votre projet → « Settings » → « Variables and Secrets » → « Add » :
- Nom `RESEND_API_KEY`, type **Secret**, valeur : la clé Resend.
- (Facultatif) `DESTINATAIRE` : l'adresse qui reçoit les demandes (par défaut authenticcodephoto@gmail.com).

Redéployez (« Deployments » → « Retry deployment ») pour que la clé soit prise en compte.

### 5. Tester pour de vrai

1. Ouvrez le site sur votre téléphone, choisissez une séance, remplissez le formulaire avec votre propre e-mail et envoyez.
2. Vérifiez la réception dans Gmail (regardez aussi « Spam » la première fois et marquez « Non spam »).
3. Répondez à l'e-mail : la réponse doit partir vers l'adresse saisie dans le formulaire.

Les e-mails arrivent de `onboarding@resend.dev`. Avec un domaine personnel vérifié dans Resend, vous pourrez envoyer depuis une adresse à votre nom en ajoutant la variable `EXPEDITEUR` (ex. `Authentic Code <demandes@authenticcode.fr>`).

## Tester sur votre ordinateur (facultatif)

Avec Node.js installé :

```
node build.mjs
node outils/serveur-local.mjs
```

Puis ouvrez http://localhost:8788. L'envoi est simulé : aucun e-mail n'est réellement envoyé. `SIMULER_ENVOI=echec node outils/serveur-local.mjs` montre le comportement en cas de panne.

## Protection et confidentialité

- La clé Resend reste côté serveur (secret Cloudflare), jamais dans les pages.
- Le formulaire est vérifié côté serveur (formule existante, e-mail valide, nombre de personnes…).
- Antispam simple : un champ invisible et un délai minimal de saisie.
- Aucun cookie publicitaire, aucun outil de mesure d'audience, aucune vidéo intégrée.
- Polices hébergées sur le site lui-même (aucun appel à Google Fonts).
