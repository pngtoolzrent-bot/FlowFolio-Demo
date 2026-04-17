# Anthony Kuiau — Portfolio + Telegram Admin Bot

A portfolio site (GitHub Pages) + Telegram bot backend (Render) with Firebase Firestore as the database. All content is editable live from Telegram.

---
g
## 📁 Project Structure

```
portfolio-project/
├── frontend/               ← GitHub Pages site
│   ├── index.html
│   ├── css/
│   │   ├── styles.css      ← All layout & component styles
│   │   └── theme.css       ← CSS variable defaults
│   ├── js/
│   │   ├── config.js       ← ⚠️ YOUR Firebase config (gitignored)
│   │   ├── firebase.js     ← Firebase SDK init
│   │   ├── main.js         ← Loads hero/about/cv/contact from Firestore
│   │   └── portfolio.js    ← Loads & renders portfolio grid + modal
│   └── images/portfolio/   ← Optional local images
│
├── bot/                    ← Telegram bot (deploy to Render)
│   ├── src/
│   │   ├── index.js        ← Bot entry point & command registration
│   │   ├── firebase.js     ← Firebase Admin SDK init
│   │   └── handlers/
│   │       ├── hero.js     ← /hero commands
│   │       ├── about.js    ← /about commands
│   │       ├── portfolio.js← /portfolio commands
│   │       ├── cv.js       ← /cv commands
│   │       ├── contact.js  ← /contact commands
│   │       └── theme.js    ← /theme commands
│   ├── package.json
│   ├── .env.example        ← Copy to .env for local dev
│   └── .gitignore
│
├── firestore-seed/
│   └── seed.js             ← Run once to populate Firestore
│
├── firestore.rules         ← Deploy to Firebase for security
└── README.md
```

---

## 🚀 Setup Guide

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project
2. Enable **Firestore Database** (start in production mode)
3. Go to **Project Settings → Service Accounts → Generate new private key**
   - Save the downloaded JSON as `bot/service-account-key.json` (for local dev)
4. Go to **Project Settings → Your apps → Add app → Web**
   - Copy the `firebaseConfig` object values

### 2. Frontend Setup (GitHub Pages)

1. Create `frontend/js/config.js` from the template:

```js
window.FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

2. Add the `<script>` tag to `index.html` **before** `firebase.js`:

```html
<script src="js/config.js"></script>
```

3. Push `frontend/` to a GitHub repo
4. Enable GitHub Pages (Settings → Pages → source: main branch / root)
5. **Important:** `js/config.js` is in `.gitignore` — add it to your repo manually or use GitHub Actions secrets

#### GitHub Actions secret injection (recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Write Firebase config
        run: |
          cat > frontend/js/config.js << 'EOF'
          window.FIREBASE_CONFIG = ${{ secrets.FIREBASE_CONFIG_JSON }};
          EOF
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend
```

Add `FIREBASE_CONFIG_JSON` as a repository secret with value:
```json
{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
```

### 3. Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy your token
2. Get your Telegram user ID: message [@userinfobot](https://t.me/userinfobot)
3. Copy `bot/.env.example` to `bot/.env` and fill in values

### 4. Seed Firestore

```bash
cd bot
cp .env.example .env
# fill in .env values
npm install
cd ../firestore-seed
node seed.js
```

> Run seed only once. Re-running will duplicate entries.

### 5. Deploy Bot to Render

1. Push the `bot/` folder to a GitHub repo (can be same or separate repo)
2. Go to [Render](https://render.com) → New → Web Service
3. Connect your repo, set:
   - **Root directory:** `bot`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Runtime:** Node

4. Add Environment Variables in Render dashboard:

| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | Your bot token |
| `TELEGRAM_ADMIN_ID` | Your Telegram user ID |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Entire contents of `service-account-key.json` as one line |

> ⚠️ **Never commit `service-account-key.json`** — it's in `.gitignore`.
> On Render, paste the JSON content into `GOOGLE_APPLICATION_CREDENTIALS_JSON`.

### 6. Deploy Firestore Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project
firebase deploy --only firestore:rules
```

---

## 🤖 Bot Commands Reference

| Command | Description |
|---------|-------------|
| `/start` | Main menu |
| `/hero` | View/edit hero section |
| `/hero_name` | Change name |
| `/hero_tagline` | Change tagline/job title |
| `/hero_location` | Change location |
| `/hero_cvurl` | Update CV download link |
| `/hero_meta` | Update SEO meta description |
| `/about` | View about section |
| `/about_heading` | Edit heading |
| `/about_addpara` | Add paragraph |
| `/about_editpara` | Edit a paragraph |
| `/about_delpara` | Delete a paragraph |
| `/about_addstat` | Add stat (e.g. `4+ \| Years`) |
| `/about_delstat` | Delete a stat |
| `/portfolio` | List all projects |
| `/port_add` | Add new project (wizard) |
| `/port_edit` | Edit existing project |
| `/port_del` | Delete a project |
| `/port_reorder` | Reorder projects |
| `/cv` | View work history & skills |
| `/cv_addjob` | Add job (wizard) |
| `/cv_editjob` | Edit a job |
| `/cv_deljob` | Delete a job |
| `/cv_addgroup` | Add skill group |
| `/cv_editgroup` | Edit skill group |
| `/cv_delgroup` | Delete skill group |
| `/contact` | View contact info |
| `/contact_heading` | Edit heading |
| `/contact_body` | Edit body text |
| `/contact_email` | Change email |
| `/contact_addsocial` | Add social link |
| `/contact_editsocial` | Edit social link |
| `/contact_delsocial` | Remove social link |
| `/theme` | View colour scheme |
| `/theme_original` | Reset to original warm theme |
| `/theme_dark` | Dark mode |
| `/theme_ocean` | Ocean blue theme |
| `/theme_forest` | Forest green theme |
| `/theme_monochrome` | Monochrome theme |
| `/theme_custom` | Set any individual colour |
| `/theme_reset` | Reset to original |
| `/cancel` | Cancel current wizard |

---

## 🖼️ Adding Images to Portfolio

Since there's no Firebase Storage, use any **free image hosting**:

- [Imgur](https://imgur.com) — Upload image → right-click → Copy image address
- [Cloudinary](https://cloudinary.com) — Free tier, CDN, good quality
- [GitHub](https://github.com) — Upload image to repo → use raw URL

Then in the bot: `/port_add` or `/port_edit` → paste the direct image URL.

## 🎬 YouTube Videos in Portfolio

When adding/editing a project, paste any YouTube URL:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`

The frontend will show the YouTube thumbnail in the grid and embed the full player in the modal.

---

## 🔄 Future Migration

Since all data is seeded from `firestore-seed/seed.js`, migrating to a new Firebase project is:
1. Create new project
2. Update `.env` with new `FIREBASE_PROJECT_ID` and new service account
3. Run `node firestore-seed/seed.js`
4. Update `frontend/js/config.js` with new Firebase web config
