# IEEE i-COSTE 2026 Co-Author Registration System

A modern, high-performance Co-Author Registration System for the **12th IEEE International Conference on Sustainable Technology and Engineering (IEEE i-COSTE 2026)**.

- **Theme**: "Sustainable Technology for Humanity & Global Impact"
- **Dates**: 1–3 November 2026
- **Venue**: Best Western Heritage, Cox's Bazar, Bangladesh
- **Host**: Bangladesh University of Business and Technology (BUBT)
- **Target Google Sheet ID**: `1SL8JUzc88AAaOzQABn49JfF9d6omrmAQ_qgIthiokZo`

---

## 1. System Architecture

The project is structured with a clean separation of concerns:

```
├── index.html            <- Public Co-Author Registration Form (GitHub Pages / Netlify entrypoint)
├── admin.html            <- Organizer Admin Portal & Dashboard
├── css/
│   └── style.css         <- Conference visual design system (matched to i-coste.org)
├── js/
│   ├── config.js         <- Configuration (Apps Script Web App API URL)
│   ├── api.js            <- CORS-safe API client wrapper
│   ├── form.js           <- Public registration form validation, cascading dropdowns, uploads
│   └── admin.js          <- Admin portal authentication, tables, CSV export, delete actions
├── assets/               <- Conference & IEEE logos and banners
├── Code.gs               <- Standalone Google Apps Script Backend (API only)
└── appsscript.json       <- Apps Script project manifest
```

### How It Works:
1. **Backend**: Google Apps Script contains **ONLY** `Code.gs`. It exposes a RESTful JSON API via `doPost(e)` and `doGet(e)` to interact directly with your Google Sheet and proxy image uploads to ImgBB and PostImage.
2. **Frontend**: Pure HTML5, CSS3, and modern JavaScript. Can be published directly to **GitHub Pages**, **Netlify**, **Vercel**, or any static host.
3. **Connection**: The frontend connects to the backend via the URL in `js/config.js`:
   ```javascript
   window.CONFIG = {
     API_URL: 'https://script.google.com/macros/s/AKfycbwpKmI2cDl5Ptv7P4A9fHa3hc4FoQaOTo0vlDtPaGbE1zlwvrQyT5NT5aA7RHgFHRT9xw/exec'
   };
   ```

---

## 2. Updated Spreadsheet Schema (39 Columns)

The backend code dynamically binds by header name to row 1 of the `Responses` tab in:
`https://docs.google.com/spreadsheets/d/1SL8JUzc88AAaOzQABn49JfF9d6omrmAQ_qgIthiokZo/edit`

### 39 Aligned Target Headers:
1. `Timestamp`
2. `SL`
3. `First Name`
4. `Last Name`
5. `Full Name`
6. `Date of Birth`
7. `Gender`
8. `Nationality`
9. `Blood Group`
10. `University Name`
11. `Department Name`
12. `Program / Degree`
13. `Batch`
14. `Student ID`
15. `Level-Term`
16. `Primary Phone Number`
17. `Alternative Phone Number`
18. `Email Address`
19. `Facebook Profile Link`
20. `LinkedIn Profile Link`
21. `Present Address`
22. `Present_Division`
23. `Present_District`
24. `Permanent Address`
25. `Permanent_Division`
26. `Permanent_District`
27. `PP Size Photo`
28. `NID Number`
29. `Declaration`
30. `Paper ID`
31. `Paper Title`
32. `PP Size Photo (ImgBB)`
33. `PP Size Photo (PostImage)`
34. `Student ID Card Picture (ImgBB)`
35. `Student ID Card Picture (PostImage)`
36. `(SSC/HSC) Registration Card Picture (ImgBB)`
37. `(SSC/HSC) Registration Card Picture (PostImage)`
38. `Applicant's Signature (ImgBB)`
39. `Applicant's Signature (PostImage)`

---

## 3. How to Update / Deploy `Code.gs` in Apps Script

1. Open your Google Sheet:
   [https://docs.google.com/spreadsheets/d/1SL8JUzc88AAaOzQABn49JfF9d6omrmAQ_qgIthiokZo/edit](https://docs.google.com/spreadsheets/d/1SL8JUzc88AAaOzQABn49JfF9d6omrmAQ_qgIthiokZo/edit)
2. Go to **Extensions** > **Apps Script**.
3. In the Apps Script editor, open `Code.gs` and paste the contents of `Code.gs` from this project.
   *(You do not need any HTML files inside Apps Script since the frontend is hosted on GitHub/Netlify!)*
4. Click **Deploy** > **Manage deployments** (or **New deployment**):
   - Choose your existing Web App deployment or create a new one.
   - Click the pencil edit icon (or **New version**).
   - Version: **New version**.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Click **Deploy**.
5. Copy your Web App URL (e.g. `https://script.google.com/macros/s/.../exec`).
6. If the URL changed, open [js/config.js](file:///d:/BlackPuzzle/i-coste%20conference/co_authro_info/js/config.js) and paste your URL into `API_URL`.

---

## 4. How to Publish to GitHub Pages

1. Initialize git and commit your project (if not already done):
   ```bash
   git add .
   git commit -m "IEEE i-COSTE 2026 Co-Author System with static frontend & Apps Script backend"
   ```
2. Push to your GitHub repository:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
   git push -u origin main
   ```
3. Enable GitHub Pages:
   - On GitHub, go to your repository **Settings** > **Pages** (under Code and automation).
   - Under **Build and deployment** > **Source**: choose **Deploy from a branch**.
   - Branch: select `main` and folder `/ (root)`.
   - Click **Save**.
4. Within 1–2 minutes, your website will be live at:
   - **Public Form**: `https://<YOUR_USERNAME>.github.io/<YOUR_REPOSITORY>/`
   - **Admin Portal**: `https://<YOUR_USERNAME>.github.io/<YOUR_REPOSITORY>/admin.html`

---

## 5. How to Publish to Netlify

### Option 1: Drag & Drop (Instant)
1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop this project folder into the Netlify upload box.
3. Your site will be online instantly with an HTTPS URL!

### Option 2: Connect via GitHub
1. In Netlify, click **Add new site** > **Import an existing project** > **GitHub**.
2. Select your repository.
3. Leave build command blank (it is static HTML/CSS/JS) and publish directory as `/`.
4. Click **Deploy**. Netlify will automatically redeploy whenever you push to GitHub!

---

## 6. Admin Portal Credentials

- Login URL: `admin.html` (e.g. `https://your-site.netlify.app/admin.html`)
- **Username**: `mdnuralam@gmail.com`
- **Password**: `01725.Nur`
- **Role**: `super_admin`
- Sessions use a 20-minute sliding token cache managed via Apps Script's `CacheService`.
