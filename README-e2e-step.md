# Spoonful: browser end-to-end tests

This overlay adds Playwright tests and documentation. It does not replace application source, your package.json, your lockfile, or the backend. Keep the previous authentication, recipe, and AI changes installed.

## Install on your Mac

Unzip spoonful-e2e-step.zip in Downloads. In a terminal:

```sh
cd ~/code/ga/capstone1/unit-1-capstone
cp -R ~/Downloads/spoonful-e2e-step/client/. ./client/
cp ~/Downloads/spoonful-e2e-step/README-e2e-step.md ./README-e2e-step.md
```

Append these entries to the root .gitignore once:

```gitignore
playwright-report/
test-results/
```

Start the backend (Docker Desktop must be open):

```sh
cd backend
docker compose -f docker-compose.dev.yml up --build -d
cd ../client
npm install -D @playwright/test @types/node
npx playwright install chromium
npm pkg set 'scripts.test:e2e=playwright test' 'scripts.test:e2e:report=playwright show-report' 'scripts.test:e2e:types=tsc -p tsconfig.e2e.json'
npm run test:e2e:types
npm run test:e2e
```

If npm fails with the earlier edgesOut resolver error, use `npx --yes npm@11 install -D @playwright/test @types/node` instead of the install command. Use Node 24.

The test runner starts an isolated Vite server on 5174 and a controlled AI server on 4188, then shuts both down. Your frontend Docker container on 5173 can keep running. Keep ports 5174 and 4188 free. AI test fixtures belong exclusively to the test suite.

## Scope and expected result

Eight browser scenarios run at three Chromium viewport sizes: desktop 1440, tablet 768, and mobile 390. A successful full run reports **24 passed**. `npm run test:e2e -- --project=desktop` runs the eight desktop cases first when debugging.

| Scenario | Coverage | API used |
| --- | --- | --- |
| Account and recipe journey | UI signup, session after reload, wrong-password feedback, login, required fields, dynamic ingredient/step rows, create, prefilled edit, guest title/tag/ingredient search, details, cancel/confirm deletion, removal from public list | Real Express + MongoDB |
| Ownership | Other creator cannot see the recipe on their dashboard, cannot use edit/delete UI, receives 403 from attempted API writes; ownerId cannot be changed | Real Express + MongoDB |
| Access and missing data | Guest browse, guards on dashboard/create/edit, missing recipe feedback, 401 on unauthenticated writes | Real Express + MongoDB |
| AI streaming and history | Empty prompt sends no request; waiting state; first token visible before completion; only latest three pairs; SPA navigation retains pairs; refresh clears them | Controlled local HTTP/SSE fixture |
| AI failures | Quota error, prompt retained, retry, partial text survives stream failure, incomplete answer excluded from history | Controlled local HTTP/SSE fixture |
| Stop response | Abort active stream and submit another question | Controlled local HTTP/SSE fixture |
| Generated draft to saved recipe | Preferences sent, guest preview, no automatic save, draft retained through SPA login, image URL validation, explicit save to dashboard | Controlled AI generation; real auth and recipe save |
| Responsive basics | Main navigation visible and no horizontal page overflow on public pages; forms/details also checked in the longer journeys | Real UI; real public recipes API |

AI fixtures let the browser tests release the first token and final token separately. They do not call Gemini, require a Gemini key, or consume model quota. The backend unit/HTTP tests cover the Gemini proxy logic separately. Your successful manual live-Gemini checks provide the remaining integration evidence. These are viewport tests in Chromium, not Safari/Firefox device tests or pixel-perfect Figma comparisons.

Tests create uniquely named accounts (`spoonful-e2e-…@example.test`) in your local MongoDB. They delete only recipes created by that scenario, including cleanup after an assertion fails once a recipe ID is recorded. The starter has no account-delete endpoint, so those test accounts remain. Tests never delete your own recipes or clear the database. Run against your local development backend. Set E2E_API_URL only if your development API uses another address.

## Evidence and debugging

After a run:

```sh
npm run test:e2e:report
```

The HTML report shows all scenarios and viewport projects. Failed tests include screenshots and traces. Use `npm run test:e2e -- --project=desktop --headed` to watch the browser. A trace contains test traffic and authentication tokens: keep generated reports out of Git using the ignore entries above. Share a screenshot of the passing summary for grading.

The test-source TypeScript check and two real HTTP fixture checks were run during preparation. The application component/transport suite and production build were already validated. The full Playwright browser suite must be run on your Mac against your running Express/MongoDB backend; no full browser-pass result is claimed before that run.

Optional fixture-only transport check:

```sh
node --test e2e/ai-fixture.check.mjs
```

## Remaining Gold work

Once the browser suite passes, the two chosen stretches have evidence: the separate AI recipe-generator use case and formal browser E2E coverage. Core requirements still include checking Figma fidelity and all responsive screens, the Docker workflow, documenting the application, and deploying the frontend to S3 with an accessible backend during grading. Gold is not complete solely because these tests pass.
