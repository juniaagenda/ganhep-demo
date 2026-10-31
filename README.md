# GANHeP demo site (Netlify)

Files: index.html (public site) · admin.html (admin login, members, site content editor) · netlify/functions/api.mjs (server) · netlify.toml · package.json

## Deploy
1. Put this folder in a GitHub repository (or use the Netlify CLI: `npx netlify deploy --prod`).
   The server function needs `npm install` to run, so deploy through GitHub or the CLI rather than plain drag-and-drop (drag-and-drop may not install dependencies).
2. In Netlify: Add new site > Import from Git > pick the repo. No build command; publish directory `.`
3. Site configuration > Environment variables, add:
   - ADMIN_PASSWORD = a strong password (required)
   - SESSION_SECRET = any long random text
4. Redeploy. Open /admin.html and log in.

## Try it
1. Open the site > Join GANHeP > submit a test registration.
2. /admin.html > Members: Approve it (a Member ID like GANHeP-2026-0001 is created), try Edit, PDF, Export Excel.
3. /admin.html > Site content: change the mission, add a leader with a photo, add a news item, add a resource and upload a PDF to it (max 4 MB; PDF, Word, Excel, PowerPoint, JPG, PNG), add social media and other links > Save & publish. Refresh the public site.
4. Uploaded files are stored on the server and only kept if the resource that uses them is saved.

## Demo limits (to fix in the full build)
- One shared admin password, not individual accounts or roles.
- Data lives in Netlify Blobs; fine for a demo, not for a final register. Member numbers could clash if two admins approve at the same instant.
- Photos are stored inside the content record (small, resized), fine for a handful of leaders.
- No email/SMS notices, no rate limiting on registration, no backups beyond Netlify's.
- Use only test data in the demo; do not enter real members' personal details until the final hosting, privacy policy and consent wording are agreed.
