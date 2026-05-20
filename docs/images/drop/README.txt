DROP IMAGES HERE
================

Single piece — image in this folder:
  my-work.jpg
  my-work.info.json   (optional title, year, captions)

Collection (carousel) — folder with 2–5 images:
  winter-series/01.jpg
  winter-series/info.json

CAPTIONS & TITLES (optional)
----------------------------
Use info.json — not a separate text file, and not read from the image file automatically.

  my-work.info.json
  {
    "title": "Winter Series",
    "year": 2025,
    "captions": {
      "01.jpg": "First frame description."
    }
  }

Or simple text files inside a folder:
  _title.txt   — piece title
  _year.txt    — year (e.g. 2025)
  _sort.txt    — display order (number)

EXIF / embedded metadata
------------------------
Not used today. If you want captions pulled from IPTC/EXIF in the files,
say so and we can add that to the sync script (requires reading metadata at publish time).

Then say "sync the gallery" in Cursor, or run: npm run publish
