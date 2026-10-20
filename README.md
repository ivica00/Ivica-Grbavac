# Ivica Grbavac

Osobna stranica: glazba, fotografija, inženjerstvo i razvoj. Statički HTML, CSS i JavaScript, bez instalacije paketa ili baze podataka.

## Gdje se dodaju radovi

Svi radovi nalaze se u **`content/works.json`**, u popisu `works`. Redoslijed zapisa određuje redoslijed na stranici. Trenutačno je popis prazan jer stvarni radovi još nisu dodani.

Na GitHubu otvori datoteku, klikni olovku (Edit), dodaj zapis i spremi s **Commit changes**. GitHub Pages nakon objave promjene automatski ažurira stranicu. Osvježavanje može potrajati nekoliko minuta.

### Glazba s vanjske platforme

Ovo je primjer sadržaja cijele datoteke s jednim glazbenim radom. Zamijeni sve primjere stvarnim podacima:

```json
{
  "works": [
    {
      "title": "Naziv skladbe",
      "category": "glazba",
      "year": "2026",
      "role": "Autor i izvođač",
      "description": "Kratak opis skladbe i tvoje uloge.",
      "cover": "assets/music/naslovnica.jpg",
      "coverAlt": "Opis naslovnice",
      "url": "https://www.youtube.com/watch?v=ZAMIJENI_ID",
      "linkLabel": "Poslušaj na YouTubeu ↗"
    }
  ]
}
```

Naslovnicu prvo dodaj preko **Add file → Upload files** u mapu `assets/music`. Za početak se vanjska glazba otvara klikom na poveznicu, bez automatskog učitavanja playera drugih platformi.

Za vlastiti audio player dodaj polje `"audio": "assets/music/skladba.mp3"` i u tu mapu prenesi MP3. Koristi komprimirane snimke, ne velike WAV datoteke. Veliku glazbenu zbirku kasnije ćemo preseliti u vanjsko spremište.

### Fotografije

U `assets/photos` izradi mapu serije, primjerice `koncert`, i prenesi fotografije preko GitHuba. Pripremi slike za web: preporučeno WebP ili JPEG, veće slike oko 1600–2000 piksela po duljoj stranici i posebna manja naslovnica. Ne učitavaj RAW datoteke.

Dodaj zapis u popis `works`:

```json
{
  "title": "Naziv fotografske serije",
  "category": "fotografija",
  "year": "2026",
  "description": "Kratka priča o seriji.",
  "cover": "assets/photos/koncert/naslovnica.jpg",
  "coverAlt": "Opis naslovne fotografije",
  "photos": [
    {
      "src": "assets/photos/koncert/01.jpg",
      "alt": "Opis onoga što se nalazi na fotografiji",
      "caption": "Neobavezni potpis fotografije"
    },
    {
      "src": "assets/photos/koncert/02.jpg",
      "alt": "Opis druge fotografije"
    }
  ]
}
```

### Inženjerstvo i razvoj

Koristi `"category": "razvoj"`, naslov, opis, godinu, neobaveznu naslovnicu i `url` projekta ili GitHub repozitorija.

### Važna pravila pri uređivanju

- Više zapisa odvoji zarezom: `"works": [{...}, {...}]`. Iza posljednjeg zapisa ne ide zarez.
- `cover`, `photos`, `audio`, `url`, `role` i `year` su neobavezni. Naziv i kategorija su obavezni.
- Za privremeno skrivanje rada dodaj `"published": false`.
- Putanje piši bez početnog `/`, s istim velikim i malim slovima kao naziv datoteke.
- Preporučeni nazivi datoteka: mala slova, bez razmaka i kvačica.
- Sve objavljene fotografije i snimke javno su dostupne.

## Lokalni pregled

Pokreni `python -m http.server 4173` u mapi projekta i otvori `http://localhost:4173`. Otvaranje HTML-a dvostrukim klikom ne učitava JSON pouzdano.

## Objava i domena

GitHub Pages: Settings → Pages → Deploy from a branch → `main` i `/ (root)`.

Custom domena još nije postavljena. Kad odabereš domenu, postavi je u Settings → Pages → Custom domain i dodaj DNS zapise u Cloudflareu prema GitHub Pages uputama. Ne dodavati izmišljenu domenu u CNAME.

## Kontakt i izgled

Kontakt se mijenja u `index.html`, izgled u `styles.css`, a ponašanje portfolija u `app.js`. Fontovi se dohvaćaju s Google Fonts; ako nisu dostupni, koriste se zamjenski fontovi.
