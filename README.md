# Ivica Grbavac

Osobna stranica: glazba, fotografija, inženjerstvo i razvoj. Statički HTML, CSS i JavaScript, bez instalacije paketa ili baze podataka.

## Gdje se dodaju radovi

Svi radovi nalaze se u **`content/works.json`**, u popisu `works`. Redoslijed zapisa određuje redoslijed na stranici. Tri fotografske kolekcije trenutačno priprema skripta opisana ispod; ostale radove možeš dodavati ručno.

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

## Automatski odabir fotografija

`scripts/select_photos.py` lokalno analizira JPG/JPEG datoteke modelom **OpenAI CLIP ViT-B/32 + LAION Aesthetic Predictor**. Priprema tri kolekcije s najviše četiri fotografije: glavni izbor, posljednji mjesec i posljednji tjedan. CLIP uspoređuje opise profesionalne fotografije s opisima osobnih uspomena i usputnih snimaka. To su relativne sličnosti, a ne vjerojatnost ili potvrda profesionalne kvalitete.

Kriteriji i opisi su u `scripts/portfolio_policy.json`. Provjeravaju se izvorna rezolucija, približna oštrina i ekstremna ekspozicija. Model predlaže kandidate; završni vizualni pregled sprema se u `scripts/portfolio_review.json`, po SHA-256 otisku fotografije. Odobrenje nije korisnikova osobna recenzija: trenutačni pregled napravio je AI asistent. Vizualni pregled može ispraviti pogrešnu tematsku procjenu modela, ali ne zaobilazi tehničke minimume, datume ni pravila raznolikosti. Novi i promijenjeni radovi moraju proći novi pregled prije ulaska u javni izbor.

Zbog zabrane ponavljanja prvo se rezervira do četiri fotografije za najuže, tjedno razdoblje, zatim glavni izbor, pa dodatni mjesečni radovi. Na stranici se prikazuju redom glavni, mjesečni i tjedni izbor. Provjera koristi CLIP značajke, perceptualni hash i vrijeme snimanja; iste fotografije i vrlo slični kadrovi ne ponavljaju se između kolekcija. Ako nema dovoljno prikladnih i raznolikih kandidata, prikazuje se manji broj uz objašnjenje. Prije objave treba pregledati `.photo-selection/contact-sheet.jpg`.

Za datum 20.10.2026. mjesečni prozor je 20.09.–20.10., a tjedni prozor 14.10.–20.10. (sedam datuma uključujući odabrani dan). Koristi se datum snimanja, ne datum kopiranja datoteke.

Datum uzima iz EXIF DateTimeOriginal, a ako nije dostupan iz EXIF DateTime. Fotografije bez datuma ne ulaze u mjesečni ni tjedni izbor. Izvorni JPG i DNG ostaju na računalu. Web dobiva samo WebP slike do 600 px po duljoj stranici, bez EXIF/GPS metapodataka. Klik za original trenutačno nije omogućen.

Pokretanje iz mape projekta:

```powershell
python scripts/select_photos.py --as-of 2026-10-20
```

Za drugu mapu dodaj `--source "C:\putanja\do\fotografija"`. Datum određuje mjesečni prozor; postupak nije automatski zakazan. Za novu objavu treba ponovno pokrenuti skriptu i prenijeti promjene na GitHub.

Potrebni su Python, PyTorch, Pillow i NumPy, te biblioteka transformers (u ovoj radnoj kopiji instalirana u `.local-packages`). Modeli se spremaju u `.model-cache`, a lokalni izvještaj, predmemorija CLIP značajki i kontaktni list u `.photo-selection`. Te mape su isključene iz GitHuba. Ponovno pokretanje analizira samo nove ili promijenjene datoteke. Modeli se preuzimaju pri prvom pokretanju; fotografije se ne šalju AI servisu.

Provjera pravila odabira: `python -m unittest discover -s scripts -p "test_*.py"`.

Izvor modela: https://github.com/LAION-AI/aesthetic-predictor

## Lokalni pregled stranice

Pokreni `python -m http.server 4173` u mapi projekta i otvori `http://localhost:4173`. Otvaranje HTML-a dvostrukim klikom ne učitava JSON pouzdano.

## Objava i domena

GitHub Pages: Settings → Pages → Deploy from a branch → `main` i `/ (root)`.

Custom domena je `ivicagrbavac.com`, spremljena u `CNAME` i povezana kroz GitHub Pages.

## Kontakt i izgled

Kontakt se mijenja u `index.html`, izgled u `styles.css`, a ponašanje portfolija u `app.js`. Fontovi se dohvaćaju s Google Fonts; ako nisu dostupni, koriste se zamjenski fontovi.
