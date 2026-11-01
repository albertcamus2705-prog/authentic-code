#!/usr/bin/env python3
"""Prépare les photos du site Authentic Code.

Lit src/data/photos.json, prend chaque photo dans photos-originales/,
et crée des versions WebP de plusieurs largeurs dans src/assets/img/photos/.
Les dimensions sont enregistrées dans photos.json (largeur, hauteur, tailles).
Crée aussi le logo rond (logo.png) et l'image d'aperçu de partage (partage.jpg).

Utilisation : python3 outils/preparer-photos.py
Nécessite Python 3 et Pillow (pip install Pillow).
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

RACINE = Path(__file__).resolve().parent.parent
ORIGINALES = RACINE / "photos-originales"
SORTIE = RACINE / "src" / "assets" / "img" / "photos"
DONNEES = RACINE / "src" / "data" / "photos.json"
SITE = RACINE / "src" / "data" / "site.json"
LARGEURS = [480, 800, 1200, 1600]
QUALITE = 78


def ouvrir(nom, recadrage=None):
    im = Image.open(ORIGINALES / nom)
    im = ImageOps.exif_transpose(im).convert("RGB")
    if recadrage:
        im = im.crop(tuple(recadrage))
    return im


def preparer():
    SORTIE.mkdir(parents=True, exist_ok=True)
    data = json.loads(DONNEES.read_text(encoding="utf-8"))
    for p in data["photos"]:
        im = ouvrir(p["source"], p.get("recadrage"))
        w, h = im.size
        tailles = [l for l in LARGEURS if l < w * 0.9] + [min(w, LARGEURS[-1])]
        tailles = sorted(set(tailles))
        for l in tailles:
            copie = im.resize((l, round(h * l / w)), Image.LANCZOS) if l != w else im
            copie.save(SORTIE / f"{p['id']}-{l}.webp", "WEBP", quality=QUALITE, method=6)
        p["largeur"], p["hauteur"] = w, h
        p["tailles"] = tailles
        print(f"{p['id']}: {w}x{h} -> {tailles}")
    DONNEES.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def logo():
    """Découpe le cercle du logo original (sans le redessiner) sur fond transparent."""
    site = json.loads(SITE.read_text(encoding="utf-8"))
    cfg = site["logo"]
    im = Image.open(ORIGINALES / cfg["source"]).convert("RGB")
    cx, cy, r = cfg["cercle"]
    im = im.crop((cx - r, cy - r, cx + r, cy + r))
    taille = 2 * r
    echelle = 4
    masque = Image.new("L", (taille * echelle, taille * echelle), 0)
    ImageDraw.Draw(masque).ellipse((0, 0, taille * echelle - 1, taille * echelle - 1), fill=255)
    masque = masque.resize((taille, taille), Image.LANCZOS)
    im.putalpha(masque)
    sortie = RACINE / "src" / "assets" / "img"
    for l in (96, 192, 384):
        im.resize((l, l), Image.LANCZOS).save(sortie / f"logo-{l}.png", optimize=True)
    fav = im.resize((180, 180), Image.LANCZOS)
    fav.save(sortie / "apple-touch-icon.png", optimize=True)
    im.resize((32, 32), Image.LANCZOS).save(sortie / "favicon-32.png", optimize=True)
    print("logo ok")


def partage():
    """Image d'aperçu pour WhatsApp, Instagram, e-mail (1200 x 630)."""
    site = json.loads(SITE.read_text(encoding="utf-8"))
    cfg = site["imagePartage"]
    data = json.loads(DONNEES.read_text(encoding="utf-8"))
    p = next(x for x in data["photos"] if x["id"] == cfg["photo"])
    im = ouvrir(p["source"], p.get("recadrage"))
    w, h = im.size
    cible = 1200 / 630
    if w / h > cible:
        nw = round(h * cible)
        x = int(min(max(0, w * cfg["centreX"] - nw / 2), w - nw))
        im = im.crop((x, 0, x + nw, h))
    else:
        nh = round(w / cible)
        y = int(min(max(0, h * cfg["centreY"] - nh / 2), h - nh))
        im = im.crop((0, y, w, y + nh))
    im = im.resize((1200, 630), Image.LANCZOS)
    im.save(RACINE / "src" / "assets" / "img" / "partage.jpg", "JPEG", quality=85, optimize=True, progressive=True)
    print("partage ok")


if __name__ == "__main__":
    preparer()
    logo()
    partage()
