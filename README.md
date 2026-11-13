# Where to Eat Wheel

Spin a wheel to pick a restaurant from your Google Maps saved lists. Everything runs in your browser; your lists never leave your device.

## Get your lists out of Google Maps

1. Go to [takeout.google.com](https://takeout.google.com) and sign in.
2. Click **Deselect all**, then check **Saved**.
3. **Next step** → Export once → .zip → **Create export**.
4. Download and unzip it. Each list is a CSV in `Takeout/Saved/`.
5. In the app, tap **＋ Upload** and pick one or more CSVs. On a phone you can pick them straight from Google Drive.

Uploading a list with the same name again replaces it.

## Using it

- Tap a list chip to put it on (or take it off) the wheel.
- ✏️ opens the editor: untick places to keep them off the wheel (remembered until you tick them again). Search, All and None apply to the rows shown.
- **SPIN** (or flick the wheel). **Nope, spin again** skips that place until you reload or tap **Reset skipped**.
- Add to home screen (browser menu → *Add to Home screen* / *Install app*) to use it like an app, including offline.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # unit tests (Node 18+)
```

## Deploy (GitHub Pages)

1. Push this folder to a GitHub repository.
2. Settings → Pages → Deploy from a branch → `main` / root.
3. Open `https://<user>.github.io/<repo>/`.

After changing files, bump `CACHE` in `sw.js` so installed copies refresh cleanly.
