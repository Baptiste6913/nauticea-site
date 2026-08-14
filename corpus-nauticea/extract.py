#!/usr/bin/env python3
"""Script d'inventaire du corpus Nauticea.

Reconstitué dans l'environnement distant : le script d'origine et le miroir
local (C:\\Users\\bapti) sont inaccessibles depuis cette session cloud.
Source de substitution : pages HTML téléchargées depuis le site live
www.nauticeayachting.fr le 2026-08-14, stockées dans raw/.

Sorties :
  bateaux.json    inventaire des annonces (champ absent = "a_confirmer")
  pages.json      texte des pages statiques
  actualites.json actualités (liste + contenu)
  redirects.csv   anciennes URLs .html vers nouvelles routes
  RAPPORT.txt     rapport d'inventaire
"""
import html
import json
import os
import re
import unicodedata

RAW = os.path.join(os.path.dirname(__file__), "raw")
OUT = os.path.dirname(__file__)
A_CONFIRMER = "a_confirmer"

SOUS_CATEGORIES = {
    "11": "moteur", "12": "flybridge", "13": "cruisers", "21": "semi-rigide",
    "22": "motor-yacht", "24": "coupe", "26": "trawler", "29": "vedette",
    "30": "catamaran",
}
# Catégories racines du site actuel : 1 bateaux-moteur, 2 voiliers, 30 catamaran.
CATEGORIE_RACINE = {"30": "catamaran", "2": "voiliers"}


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text


def clean(text):
    text = html.unescape(text)
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n\n", text).strip()


def field(src, name):
    m = re.search(r"<span class='fad_%s'>(.*?)</span>" % name, src, re.S)
    return m.group(1) if m else None


def scalar(src, name, label):
    raw = field(src, name)
    if raw is None:
        return None
    txt = clean(raw)
    txt = re.sub(r"^%s\s*:?\s*" % re.escape(label), "", txt, flags=re.I).strip()
    return txt or None


def parse_boat(path):
    src = open(path, encoding="utf-8", errors="replace").read()
    rel = re.search(
        r"<base href=\"https://www\.nauticeayachting\.fr/\" />", src)
    url = re.search(
        r"<link href=\"(https://www\.nauticeayachting\.fr)?(/annonces-bateaux-occasion/[^\"]+\.html)\" rel=\"canonical\"", src)
    old_path = url.group(2) if url else None
    if old_path is None:
        m = re.search(r"(/annonces-bateaux-occasion/\d+-[^/\"]+/\d+-[^\"]+)\.html\?tmpl=component", src)
        old_path = m.group(1) + ".html" if m else A_CONFIRMER

    m = re.search(r"<div class=\" adsmanager-details", src)
    if not m:
        return None  # page morte (redirigée vers l'accueil)
    body = src[m.start():]

    h1 = re.search(
        r"<h1 class=\"no-margin-top\">\s*<span class='fad_manufacturer'>(.*?)</span>(.*?)<span class='fad_year'><b>Ann&eacute;e</b>:?\s*(\d{4})?", body, re.S) \
        or re.search(r"<h1 class=\"no-margin-top\">\s*<span class='fad_manufacturer'>(.*?)</span>(.*?)<span class='fad_year'><b>Année</b>:?\s*(\d{4})?", body, re.S)
    marque = clean(h1.group(1)) if h1 else A_CONFIRMER
    modele = clean(h1.group(2)) if h1 else A_CONFIRMER
    annee = h1.group(3) if h1 and h1.group(3) else None

    etat_raw = scalar(body, "state", "Etat du bateau") or ""
    etat = {"new": "neuf", "used": "occasion"}.get(etat_raw.strip().lower(), A_CONFIRMER)

    prix_raw = scalar(body, "price", "Prix")
    prix = None
    if prix_raw:
        digits = re.sub(r"[^\d]", "", prix_raw)
        prix = int(digits) if digits else None

    desc_raw = field(body, "text")
    description = clean(desc_raw) if desc_raw else ""

    specs = {}
    for key, label in [
        ("engine", "Marque moteur"), ("horsepower", "Puissance CV"),
        ("hours", "Heures Moteur(s)"), ("fuel", "Carburant"),
        ("loa", "Longueur (m)"), ("beam", "Largeur (m)"),
        ("draft", "Tirant d'eau (m)"),
    ]:
        raw = field(body, key)
        if raw is None:
            continue
        txt = clean(raw)
        txt = re.sub(r"^[^:]*:\s*", "", txt).strip()
        if txt and txt != "0":
            specs[label] = txt
    if annee:
        specs["Année"] = annee

    equipements = []
    for key in ["navigation", "equipement", "equipinterne",
                "equipelectronic", "equipexterne"]:
        raw = field(body, key)
        if not raw:
            continue
        for item in re.findall(r"<div class='multicheckboxfield'>(.*?)</div>", raw):
            it = clean(item)
            if it and it not in equipements:
                equipements.append(it)

    photos = []
    for full in re.findall(
            r"<a href='(https://www\.nauticeayachting\.fr/images/com_adsmanager/contents/aam\d+_\d+\.jpg)[^']*' rel='lytebox", body):
        if full not in photos:
            photos.append(full)

    contact = re.search(r"<h2 class='section-header'>Contact (.*?)</h2>", body, re.S)
    contact_txt = clean(contact.group(1)) if contact else A_CONFIRMER

    ids = re.match(r"/annonces-bateaux-occasion/(\d+)-([^/]+)/(\d+)-(.+)\.html", old_path or "")
    sous_cat_id = ids.group(1) if ids else None
    boat_id = ids.group(3) if ids else A_CONFIRMER
    sous_categorie = SOUS_CATEGORIES.get(sous_cat_id, A_CONFIRMER)
    categorie = CATEGORIE_RACINE.get(sous_cat_id, "bateaux-moteur")

    titre = ("%s %s" % (marque, modele)).strip()
    titre = re.sub(r"\s+", " ", titre)
    slug = slugify("%s-%s" % (titre, boat_id))

    return {
        "id": boat_id,
        "slug": slug,
        "titre": titre,
        "marque": marque,
        "modele": modele,
        "categorie": categorie,
        "sous_categorie": sous_categorie,
        "etat": etat,
        "prix": prix,
        "devise": "EUR",
        "specs": specs,
        "equipements": equipements,
        "photos": photos,
        "description": description,
        "contact": contact_txt,
        "ancienne_url": old_path,
        "source": "corpus",
    }


def page_text(fname, title_hint=""):
    path = os.path.join(RAW, fname)
    if not os.path.exists(path):
        return None
    src = open(path, encoding="utf-8", errors="replace").read()
    src = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", src, flags=re.S)
    m = re.search(r"<div[^>]*class=\"[^\"]*item-page[^\"]*\"[^>]*>(.*?)<!-- ?end", src, re.S)
    if not m:
        m = re.search(r"<div id=\"main\"[^>]*>(.*?)<div id=\"footer", src, re.S)
    if not m:
        m = re.search(r"<body[^>]*>(.*)</body>", src, re.S)
    return clean(m.group(1)) if m else None


def main():
    boats, dead = [], []
    for f in sorted(os.listdir(os.path.join(RAW, "boats"))):
        b = parse_boat(os.path.join(RAW, "boats", f))
        if b is None:
            dead.append(f)
        else:
            boats.append(b)
    boats.sort(key=lambda b: int(b["id"]) if b["id"].isdigit() else 0, reverse=True)

    with open(os.path.join(OUT, "bateaux.json"), "w", encoding="utf-8") as fh:
        json.dump(boats, fh, ensure_ascii=False, indent=2)

    pages = {}
    for fname, key in [
        ("accueil.html", "accueil"), ("accueil_a-propos.html", "a-propos"),
        ("contact.html", "contact"), ("mentions-legales.html", "mentions-legales"),
        ("places-de-port.html", "places-de-port"),
        ("stock-neuf.html", "stock-neuf"),
        ("stock-neuf_occasions.html", "occasions"),
    ]:
        txt = page_text(fname)
        if txt:
            pages[key] = txt
    with open(os.path.join(OUT, "pages.json"), "w", encoding="utf-8") as fh:
        json.dump(pages, fh, ensure_ascii=False, indent=2)

    actus = []
    adir = os.path.join(RAW, "actus")
    for f in sorted(os.listdir(adir)):
        src = open(os.path.join(adir, f), encoding="utf-8", errors="replace").read()
        src2 = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", src, flags=re.S)
        t = re.search(r"<h2 class=\"postheader\"><a[^>]*>(.*?)</a>", src2, re.S)
        titre = clean(t.group(1)) if t else A_CONFIRMER
        d = re.search(r"<time datetime=\"([^\"]+)\"", src2)
        m = re.search(r"<div class=\"article\">(.*?)</div></div></article>", src2, re.S)
        corps = clean(m.group(1)) if m else A_CONFIRMER
        art = m.group(1) if m else ""
        imgs = re.findall(r"<a href=\"(/images/site/news/[^\"]+)\"", art)
        if not imgs:
            imgs = re.findall(r"<img[^>]*src=\"(/images/[^\"]+)\"", art)
        videos = ["https://www.nauticeayachting.fr" + v
                  for v in re.findall(r"<video src=\"(/[^\"]+)\"", art)]
        actus.append({
            "slug": re.sub(r"^\d+-", "", f[:-5]),
            "ancienne_url": "/toutes-les-actualites-nauticea-yachting-frejus/" + f,
            "titre": titre,
            "date": d.group(1) if d else A_CONFIRMER,
            "corps": corps,
            "images": ["https://www.nauticeayachting.fr" + i for i in imgs],
            "videos": videos,
        })
    with open(os.path.join(OUT, "actualites.json"), "w", encoding="utf-8") as fh:
        json.dump(actus, fh, ensure_ascii=False, indent=2)

    redirects = [
        ("/accueil/a-propos.html", "/a-propos"),
        ("/annonces-bateaux-occasion.html", "/annonces"),
        ("/annonces-bateaux-occasion/1-bateaux-moteur.html", "/annonces/bateaux-moteur"),
        ("/annonces-bateaux-occasion/2-voiliers.html", "/annonces/voiliers"),
        ("/annonces-bateaux-occasion/30-catamaran.html", "/annonces/catamaran"),
        ("/bateaux-neufs.html", "/stock-neuf"),
        ("/stock-neuf.html", "/stock-neuf"),
        ("/stock-neuf/occasions.html", "/occasions"),
        ("/contact.html", "/contact"),
        ("/mentions-legales.html", "/mentions-legales"),
        ("/places-de-port.html", "/places-de-port"),
        ("/toutes-les-actualites-nauticea-yachting-frejus.html", "/actualites"),
        ("/sitemap.html", "/sitemap.xml"),
    ]
    for b in boats:
        if b["ancienne_url"] != A_CONFIRMER:
            redirects.append((b["ancienne_url"], "/annonces/" + b["slug"]))
    for a in actus:
        redirects.append((a["ancienne_url"], "/actualites/" + a["slug"]))
    with open(os.path.join(OUT, "redirects.csv"), "w", encoding="utf-8") as fh:
        fh.write("source,destination\n")
        for s, dst in redirects:
            fh.write("%s,%s\n" % (s, dst))

    manquants = []
    for b in boats:
        for champ in ["prix", "annee"]:
            pass
        if b["prix"] is None:
            manquants.append("%s : prix absent (affichage « Prix sur demande »)" % b["slug"])
        if not b["photos"]:
            manquants.append("%s : aucune photo" % b["slug"])
        if b["etat"] == A_CONFIRMER:
            manquants.append("%s : état non déterminé" % b["slug"])
        if not b["description"]:
            manquants.append("%s : description vide" % b["slug"])

    par_etat = {}
    for b in boats:
        par_etat[b["etat"]] = par_etat.get(b["etat"], 0) + 1

    with open(os.path.join(OUT, "RAPPORT.txt"), "w", encoding="utf-8") as fh:
        fh.write("RAPPORT D'INVENTAIRE CORPUS NAUTICEA\n")
        fh.write("Source : site live www.nauticeayachting.fr (2026-08-14)\n")
        fh.write("(miroir local inaccessible depuis l'environnement distant)\n\n")
        fh.write("Annonces extraites : %d (attendu ~28)\n" % len(boats))
        fh.write("Pages mortes ignorées : %d (%s)\n" % (len(dead), ", ".join(dead)))
        fh.write("Répartition par état : %s\n" % json.dumps(par_etat, ensure_ascii=False))
        fh.write("Photos totales référencées : %d\n" % sum(len(b["photos"]) for b in boats))
        fh.write("Redirections générées : %d\n" % len(redirects))
        fh.write("Pages statiques extraites : %s\n" % ", ".join(sorted(pages)))
        fh.write("Actualités extraites : %d\n\n" % len(actus))
        fh.write("CHAMPS MANQUANTS FLAGUÉS (%d) :\n" % len(manquants))
        for mq in manquants:
            fh.write("  - %s\n" % mq)

    print(open(os.path.join(OUT, "RAPPORT.txt"), encoding="utf-8").read())


if __name__ == "__main__":
    main()
