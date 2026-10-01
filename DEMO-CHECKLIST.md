# Spoonful submission and demo checklist

## Verified results

- Backend and MongoDB run locally in Docker; the frontend Docker workflow was checked.
- The built frontend is deployed to Amazon S3.
- The deployed recipe detail page loads after refreshing its direct URL.
- Live Gemini Assistant output was observed filling progressively. The live Recipe Generator produced an editable draft that was reviewed, given an image URL, saved and viewed publicly.
- Desktop screenshots were compared with retrieved Figma frames and supplied exports: profile, browsing, recipe details, create/edit forms and confirmation dialogs. The supplied logo and profile artwork are in use. This is a structure/styling review, not a pixel-difference certification.
- The developer reported the full 33-case Playwright suite working after the profile/loading/redirect fix. It covers 11 scenarios across desktop, tablet and mobile.
- The latest pasted Mac transcript after the dialog-copy patch confirms 73 unit tests, E2E TypeScript checks and 12 targeted core/UX browser cases passing. Those 12 are part of the 33-case suite. The build and S3 upload succeeded.

## Final repository tasks

- [ ] Confirm the accidental shell command was removed from `client/src/components/brand-logo.css`, and that the new production build has no `Unexpected ">"` CSS warning. Rebuild and re-sync to S3 if this has not been completed.
- [ ] Keep useful final screenshots or a short demo recording.
- [ ] Install these documents, review Git status, commit and push the final changes.

The CSS warning cleanup has not yet been explicitly confirmed in the conversation. Once verified, check it off here and update the corresponding build/status text in README.md.

## Install the documents

Unzip this package into Downloads. Its folder is `spoonful-submission-final`. From the repository root:

```sh
cd ~/code/ga/capstone1/unit-1-capstone
cp -n README.md README-course-original.md
cp ~/Downloads/spoonful-submission-final/README-spoonful.md README.md
cp ~/Downloads/spoonful-submission-final/DEMO-CHECKLIST.md DEMO-CHECKLIST.md
```

The first command preserves the course README if a backup does not already exist. If Finder adds a suffix to the extracted folder, adjust the two Downloads paths to its actual name and quote paths containing spaces.

Review and save the final implementation and documents:

```sh
git status --short
git add -u
git add README.md README-course-original.md DEMO-CHECKLIST.md client/src client/e2e backend/controllers backend/routes backend/middleware backend/services backend/tests scripts
git diff --cached --stat
git commit -m "Complete Spoonful profile flows, desktop UI, and submission documentation"
git push
```

Include any additional new implementation/configuration files shown by Git status if they belong to the project. Keep private environment files, credentials, node_modules, dist, playwright-report and test-results out of the commit. The public API URL is build configuration; private Gemini and AWS credentials are not frontend configuration.

## Before the live demo

Keep the Mac awake, Docker running and the ngrok process active. Use a network that reaches the tunnel. The Mac's Wi-Fi previously failed for ngrok while cellular connectivity worked. Confirm the current public tunnel URL matches the deployed frontend build.

Backend after a restart:

```sh
cd ~/code/ga/capstone1/unit-1-capstone/backend
docker compose -f docker-compose.dev.yml up --build -d
```

In a separate terminal:

```sh
ngrok http 3000
```

If the forwarding URL changes, update `client/.env.production`, rebuild and upload:

```sh
cd ~/code/ga/capstone1/unit-1-capstone/client
npm run build && \
aws s3 sync dist/ s3://nkanna-spoonful-capstone-20261001 \
  --delete --profile spoonful --region us-east-1
```

## Suggested live demo (5–7 minutes)

1. Open the S3 landing page. Browse as a guest, search by title/tag/ingredient and show a no-match result.
2. Open a recipe and refresh its detail URL to demonstrate the S3 route fallback.
3. Log in and show the creator dashboard and profile dropdown. Show Your Profile and its current-password requirement. Account deletion has an explicit confirmation; use a disposable account if demonstrating it.
4. Edit an owned recipe. Change a field and click Cancel to show Save Changes, Continue without Saving and Cancel. Keep editing, demonstrate image preview/Clear Image, restore a valid URL and save.
5. Show recipe deletion on a disposable recipe. Cancel first, then confirm and verify removal from browsing.
6. Ask the AI Assistant a cooking question. Show the initial waiting state, growing response and last-three-exchange history. Explain that refreshing clears this client-side AI history.
7. Generate a recipe draft, review it, add an image URL, explicitly save and open the public result.
8. Show the latest Playwright report and identify which run it represents. Explain the 33-case suite and its three viewports; auth, recipe and profile flows use the real local backend, while AI responses are controlled for repeatable tests. A targeted run produces a report for that subset only.
9. Explain React on S3 → Axios through ngrok → local Express/MongoDB. Express calls Gemini using the private backend key.

Assistant prompt:

```text
Explain three practical vegetarian cooking techniques in about 400 words, with examples and clear steps.
```

Generator ingredients: chickpeas, spinach, canned tomatoes, onion, garlic, coconut milk, olive oil, cumin and curry powder. Choose Vegetarian, 30 minutes and 2 servings.

## Evidence to keep

- Deployed landing page, logo and profile navigation.
- Guest search and a full recipe detail page.
- Creator dashboard, profile and unsaved-changes dialog.
- Assistant while streaming and its session history.
- Generated draft and saved recipe.
- Test results showing the actual run and viewport coverage.
- Frontend and backend Docker Compose service status.

Use a demo account and keep passwords, tokens and private environment settings out of evidence.

## Submission links and selected stretch goals

Repository: https://github.com/nkanna/capstone1

Deployed frontend: http://nkanna-spoonful-capstone-20261001.s3-website-us-east-1.amazonaws.com

Selected stretch goals:

1. Second AI use case: Recipe Generator with a structured, editable draft and explicit save.
2. Playwright E2E suite: 33 cases across desktop, tablet and mobile.

The frontend is deployed on S3. The backend is available through ngrok during the live demo while the local machine and Docker remain running. Forgot Password currently displays an informational notice because no email recovery service is configured. No GitHub Actions deployment is claimed. Final grading is determined by the evaluator.
