# Spoonful

Spoonful is a recipe application with public browsing, creator accounts, recipe management, a streamed cooking assistant, and an AI recipe generator. Built for the Deloitte Unit 1 capstone by Niranjanaa Kannan.

- Repository: https://github.com/nkanna/capstone1
- Deployed frontend: http://nkanna-spoonful-capstone-20261001.s3-website-us-east-1.amazonaws.com
- Demo backend: https://platinum-factual-roundish.ngrok-free.dev

The frontend is hosted on Amazon S3. The Express API and MongoDB run locally in Docker and are exposed through ngrok during the demo. The backend requires the local machine, Docker, and ngrok to remain running. If the public API URL changes, update the production frontend environment, rebuild, and upload again.

## Features

| Feature | Behavior |
| --- | --- |
| Public discovery | Guests browse recipes, open details, and search by title, tag, or ingredient. |
| Creator authentication | Email/password signup and login return a JWT. The dashboard and recipe writes require authentication. A full-screen brand loading state is shown while authentication or dashboard data is pending. |
| Your Profile | Creators view their email, save email/password changes after entering the current password, log out, or confirm deletion of their account and owned recipes. Deleted accounts cannot use old JWTs. |
| Recipe creation and editing | Forms collect title, description, image URL, ingredient quantities, ordered instructions, and tags. Validation runs before saving. |
| Recipe ownership | Creators manage their own recipes; the backend rejects unauthorized updates and deletions. |
| Recipe deletion | A confirmation is required before the delete request. Successful deletion updates the displayed list. |
| Recipe form UX | Image URLs produce a preview. Cancel on a changed draft offers save, discard, and keep-editing choices. |
| AI Assistant | A public route streams an answer progressively, supports cancellation, handles failures, and keeps the last three completed exchanges in client-side session state. Refreshing clears that AI history. |
| Recipe Generator | A second AI use case turns ingredients and preferences into a structured recipe draft. A creator reviews it, supplies an image URL, and explicitly saves it through the recipe API. Guests can generate a draft and sign in to save. |

## Technology

React 19, TypeScript, Vite, React Router, Axios, Open Sans, CSS/Flexbox, Express, MongoDB/Mongoose, JWT, bcrypt, Google Gemini, Docker Compose, Vitest/Testing Library, Playwright, Amazon S3, and ngrok.

The browser communicates with the application's API. The Gemini key is read only by the backend; it is not a frontend environment variable or part of the frontend's requests. JWT authorization is enforced by the backend, including recipe ownership checks.

## Routes

| Frontend route | Access |
| --- | --- |
| `/` | Public landing page |
| `/login`, `/signup` | Creator authentication |
| `/recipes` | Public browse and search |
| `/recipes/:id` | Public recipe details |
| `/ai-assistant` | Public streamed cooking assistant |
| `/recipe-generator` | Public generation; authentication required to save a draft |
| `/dashboard` | Authenticated creator dashboard |
| `/profile` | Authenticated account management |
| `/recipes/new`, `/recipes/:id/edit` | Authenticated recipe forms; edits require ownership |

| API endpoint | Access / purpose |
| --- | --- |
| `POST /api/users/signup` | Register a creator |
| `POST /api/users/login` | Authenticate a creator |
| `GET /api/account` | Read the current creator’s account |
| `PUT /api/account` | Change account credentials after current-password verification |
| `DELETE /api/account` | Confirm current password, remove owned recipes and delete the current account |
| `GET /api/recipes` | Public recipe list; supports title, tag, and ingredient query parameters |
| `GET /api/recipes/:id` | Public recipe details |
| `POST /api/recipes` | Create a recipe as the authenticated creator |
| `PUT /api/recipes/:id` | Update an owned recipe |
| `DELETE /api/recipes/:id` | Delete an owned recipe |
| `POST /api/ai/stream` | Stream a cooking response for `{ "prompt": "..." }` |
| `POST /api/ai/recipe` | Generate a recipe from ingredients, diet, minutes, and servings |

## Local setup

Use Node.js 24, npm, and Docker Desktop. Clone the repository and enter its root. Keep existing private environment files when updating an existing checkout.

For a new checkout, create `backend/.env` with a private Gemini key and a strong JWT secret:

```dotenv
GEMINI_API_KEY=replace_with_your_private_key
JWT_SECRET=replace_with_your_generated_secret
```

Generate a JWT secret with `openssl rand -hex 32`, then paste its value privately into the single `JWT_SECRET` entry. The Compose file reads this value using `${JWT_SECRET:?Set JWT_SECRET in backend/.env}`. Optional Gemini model configuration belongs in the backend environment and must use a model supported by the service implementation.

MongoDB's Docker address and API port are supplied by the backend Compose configuration. Environment files must be ignored by Git.

Start the backend and database:

```sh
cd backend
docker compose -f docker-compose.dev.yml up --build -d
curl http://localhost:3000/api/recipes
```

Start the frontend through Docker Compose in another terminal:

```sh
cd client
docker compose -f docker-compose.yml up --build -d
```

Open http://localhost:5173. The API is available at http://localhost:3000. For this browser-based local setup, the frontend API URL uses `localhost`, rather than the MongoDB container's hostname.

For frontend development outside Docker, stop the frontend container first if it occupies port 5173, then run:

```sh
cd client
npm ci
npm run dev
```

Run commands from the appropriate directory relative to the repository root. Backend logs are available with `docker compose -f docker-compose.dev.yml logs --tail=50 api` from `backend/`; frontend logs use `docker compose -f docker-compose.yml logs --tail=50 react-dev` from `client/`.

## Tests

From `client/`:

```sh
npm ci
npm test
npm run build
npm run test:e2e:types
npx playwright install chromium
npm run test:e2e
```

Keep the real local backend running for Playwright. The configuration starts a separate frontend on port 5174 and a controlled AI fixture on port 4188. These ports must be available.

The browser suite performs real authentication and recipe CRUD against the local API/database. Only AI requests are redirected to controlled responses so streaming boundaries, failures, cancellation, and history can be tested reproducibly without depending on Gemini timing or quota. Live Gemini behavior is checked separately on the deployed application.

Latest recorded validation on October 1, 2026:

- The developer reported the complete **33-case Playwright suite** working after the profile/loading/redirect corrections. It covers 11 scenarios across desktop, tablet and mobile.
- The final dialog wording patch was followed by a pasted Mac transcript showing **73 frontend unit tests across 17 files**, successful E2E TypeScript checks and **12 targeted browser cases passed** (core recipe/auth flows and editor UX). The most recent targeted run completed in 20.6 seconds. This 12-case run is a subset of the 33-case suite, not 12 additional cases.
- The final production build completed and the Mac transcript shows an S3 sync. The developer subsequently confirmed removal of the accidentally pasted shell command, a successful build without that warning, and redeployment to S3.
- Live Gemini streaming and generation were checked separately from controlled AI fixtures. The developer saw the Assistant response filling gradually and generated, reviewed, supplied an image for and saved a recipe on the deployed app.
- Deployed desktop screenshots were reviewed for Your Profile, account deletion, public browsing, recipe details, create/edit forms, and the unsaved/deletion dialogs. Recipe-dialog wording was then corrected to match the retrieved Figma text.
- Frontend and backend Docker operation had previously been confirmed by the developer.
- The developer confirmed that a deployed recipe-detail page still loads after refreshing its direct URL.

The frontend suite covers more than four React components, including authentication, navigation, protected routes, recipe forms, dashboard deletion, recipe browsing/details, and AI interfaces. Playwright also checks cross-owner permissions, guest route access, missing recipes, and lack of horizontal overflow at its configured viewports.

From `backend/`, run `node --test tests/account.test.cjs` for the account controller/service tests after installing dependencies with `npm ci`. View the latest Playwright report with `npx playwright show-report` from `client/`; its contents reflect the most recent run, which may be a targeted subset.

## S3 build and deployment

Configure the S3 bucket for static website hosting with both index and error documents set to `index.html`, and public read access to the built frontend objects.

Start a public tunnel while the local API is running:

```sh
ngrok http 3000
```

Set `client/.env.production` to the current HTTPS forwarding URL, without an `/api` suffix:

```dotenv
VITE_BACKEND_URL=https://platinum-factual-roundish.ngrok-free.dev
```

The frontend adds the ngrok browser-warning bypass header when calling a recognized ngrok hostname. The URL is public configuration; actual Gemini and AWS credentials stay outside frontend source.

From `client/`, build and upload using the configured AWS CLI profile:

```sh
npm run build && \
aws s3 sync dist/ s3://nkanna-spoonful-capstone-20261001 \
  --delete --profile spoonful --region us-east-1
```

The API URL is baked into the build. Changing only an environment file does not update files already deployed to S3. Rebuild and upload after changing the public backend URL.

Plain S3 website hosting uses HTTP. Its `index.html` error-document fallback can render React routes while returning a raw 404 status for a deep link. Verify deep-link behavior in a browser by refreshing a recipe-detail URL, rather than judging only that status code.

## Gold stretch goals and design status

The two implemented stretch goals are:

1. **A second AI use case:** Recipe Generator produces an editable structured draft, separate from the streamed cooking assistant.
2. **Playwright E2E tests:** 33 cases cover 11 scenarios across desktop, tablet and mobile. Authentication, recipe CRUD and account management use the real local backend; AI responses are controlled for reproducible automated tests.

The desktop implementation uses Open Sans, the supplied Spoonful/profile SVG artwork, cream background, green primary and outlined secondary buttons, yellow tags, centered content columns, stacked public recipe cards and confirmation dialogs. Navigation is available through the profile icon dropdown, including both AI routes.

Retrieved desktop frames from the accessible Figma copy and user-supplied exports were compared with deployed screenshots. The image remains a URL input as the brief requires. Description, ingredient quantity rows, sequential instructions and account reauthentication controls extend older static mockups to support the current data/API flows. Account deletion explicitly includes the creator’s recipes. Long dynamic titles and tags wrap. These screenshot comparisons establish the checked structure and styling; they do not constitute a same-viewport pixel-difference certification.

Figma design reference: https://www.figma.com/design/w4yhfzJs6bUT7VO6P7ORhg/Spoonful--Copy-?node-id=96-4773

## Known limits

- Forgot Password opens an informational notice. No email service or reset-token delivery is configured, so email password recovery is unavailable.
- The backend is available through the demo tunnel while the Mac, Docker and ngrok remain running. An S3 deployment alone does not keep the local backend alive. Network filtering previously caused tunnel connectivity failures; use a working network for the demo.
- Account deletion removes recipes and then the user in separate database operations on standalone MongoDB. This is not a cross-document transaction; a database failure between operations could partially complete cleanup.
- No GitHub Actions deployment is configured. CI/CD is an additional optional stretch goal, not one of the two selected.

Gold requires the core criteria as well as the two stretch goals; the evaluator makes the final assessment.
