# Spoonful final verification and demo

## Current verified evidence

- [x] Backend and database operate locally in Docker.
- [x] Frontend is deployed to the S3 website.
- [x] Live AI Assistant output was seen filling progressively through the public API.
- [x] Live Recipe Generator on S3 generated a draft after the computer restart.
- [x] The generated recipe accepted an image URL, saved, opened correctly, and was found by a guest.
- [x] The deployed logo icon was confirmed visually.
- [x] E2E TypeScript check and all 27 browser tests passed on the Mac, including the new image-preview and save/discard/cancel flow.
- [x] Frontend Docker Compose smoke check, including a live progressively rendered AI response.
- [ ] Final desktop design comparison and corrections.
- [ ] Refreshed deployed recipe-detail deep link and final submission screenshots.
- [ ] Final README/status update and Git commit.

## 1. Frontend Docker check (completed)

The developer confirmed the live AI Assistant response streamed progressively in the Docker frontend. Keep these commands for reproducing the check during grading or after a restart.

Keep Docker Desktop and the backend running. In the terminal where `npm run dev` is running, press Ctrl+C to release port 5173. Then:

```sh
cd ~/code/ga/capstone1/unit-1-capstone/client
docker compose -f docker-compose.yml up --build -d
docker compose -f docker-compose.yml ps
```

Open http://localhost:5173. Log in, confirm the saved recipe appears, and open it. Submit one AI question to confirm the frontend container can call the local API.

If the frontend fails to load, inspect its service logs:

```sh
docker compose -f docker-compose.yml logs --tail=50 react-dev
```

This check is needed because the rubric explicitly requires both client and backend to run through Docker Compose. Do not mark it complete based only on passing npm/Vite tests.

To return to npm development after the check, stop the frontend service and start Vite:

```sh
docker compose -f docker-compose.yml stop react-dev
npm run dev
```

## 2. Finish the visual comparison

Obtain an editable Figma copy for exact measurements/assets, or individual full-resolution desktop frame exports for a direct visual comparison. The existing overview exports compress several frames together.

Compare:

- Login/signup spacing, button sizes, labels, and typography.
- Dashboard empty state, card arrangement, and Create Recipe/Browse Recipes placement.
- Public recipe list's centered card stack, search input, dates, tags, and View Recipe links.
- Recipe details: photo position, title, breadcrumbs, ingredients, instructions, and tags.
- Create/edit forms and both confirmation dialogs.
- The complete logo wordmark, in addition to the corrected icon.

Keep the brief's explicit image-URL input requirement. Preserve the required AI Assistant navigation and the Recipe Generator stretch feature even though older reference screens omit them. Resolve whether the instructor assesses profile/password-reset flows before calling the visual requirement complete.

## 3. Live demo sequence

Keep the Mac awake, Docker running, and ngrok's terminal open. Use the working network connection; the Mac's Wi-Fi previously failed for ngrok, while the hotspot worked. Check the current public URL matches the frontend build.

Suggested demonstration, approximately 5–7 minutes:

1. Open the S3 landing page and identify the app's purpose.
2. Browse as a guest. Search using a recipe title, then a tag or ingredient. Show a no-match result and restore the search.
3. Open a recipe and refresh the browser at its detail URL. Confirm the app and recipe reload.
4. Log in and show the creator dashboard. Open an owned recipe for editing. Change a field and choose Cancel to show save/discard/keep-editing choices. Demonstrate that Cancel preserves the draft.
5. Show image preview and Clear Image. Restore a valid image URL and save a valid edit. Show the success feedback.
6. Demonstrate recipe deletion with a disposable demo recipe: cancel the dialog first, then confirm deletion. Confirm it disappears from browsing.
7. Open AI Assistant. Submit a question, show the initial waiting state and progressively growing response, and identify its three-exchange session history. Empty prompt, error, and abort behavior are also covered by automated tests.
8. Open Recipe Generator. Generate a structured draft, review it, add an image URL, explicitly save it, and show the resulting recipe publicly.
9. Show the Playwright report with 27 passed cases and explain that auth/recipe operations use the real backend while AI behavior is controlled for repeatable automated tests.
10. Explain the deployment: React build on S3 → Axios requests through ngrok → local Express/MongoDB; Express alone calls Gemini with the private backend key.

For a visible streamed answer, use:

```text
Explain three practical vegetarian cooking techniques in about 400 words, with examples and clear steps.
```

For Recipe Generator, use ingredients `chickpeas, spinach, canned tomatoes, onion, garlic, coconut milk, olive oil, cumin, curry powder`, diet Vegetarian, 30 minutes, and 2 servings.

## 4. Capture evidence

Save useful screenshots or a short recording in a local submission folder:

- Deployed landing page and corrected logo.
- Guest browse/search and full recipe.
- Creator dashboard and an edit confirmation dialog.
- AI Assistant during progressive rendering, then its history.
- Generated draft and saved recipe.
- Playwright HTML report: 27 passed, showing desktop/tablet/mobile coverage.
- Frontend and backend Compose service status.

Use a demo account and keep credentials, environment files, and tokens out of screenshots. Test reports contain synthetic account data and request traces; review them before sharing externally.

## 5. Prepare the repository README

The accompanying `README-spoonful.md` is a ready-to-review project README. It records the completed Docker check and honestly labels the remaining visual and evidence checks. After those checks are completed, update the checklist/status text with the verified result.

To install it while retaining the course README, unzip this package into Downloads and run:

```sh
cd ~/code/ga/capstone1/unit-1-capstone
cp -n README.md README-course-original.md
cp ~/Downloads/spoonful-submission/README-spoonful.md README.md
cp ~/Downloads/spoonful-submission/DEMO-CHECKLIST.md DEMO-CHECKLIST.md
```

Do not replace the honest pending status with a claim of pixel-perfect implementation until the comparison and corrections are finished.

## 6. Commit the final result

From the repository root:

```sh
git status --short
git add README.md README-course-original.md DEMO-CHECKLIST.md client/src client/e2e
git commit -m "Document Spoonful deployment, verification, and Gold stretch goals"
git push
```

The scoped add does not include private environment files or generated test reports. Include additional actual implementation changes explicitly if the later visual pass changes files outside these paths. Keep `dist/`, `node_modules/`, private environment files, `playwright-report/`, and `test-results/` ignored.

The submission should provide the GitHub repository and S3 URL, identify both selected stretch goals, and explain that the public backend is available during the live demo while the local machine and tunnel are running. A final Gold decision belongs to the evaluator and depends on the remaining core checks as well as the two stretch goals.
