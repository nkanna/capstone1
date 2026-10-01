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
| Creator authentication | Email/password signup and login return a JWT. The dashboard and recipe writes require authentication. |
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
| `/recipes/new`, `/recipes/:id/edit` | Authenticated recipe forms; edits require ownership |

| API endpoint | Access / purpose |
| --- | --- |
| `POST /api/users/signup` | Register a creator |
| `POST /api/users/login` | Authenticate a creator |
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

- **27 Playwright cases passed in 30.6 seconds on the developer's Mac**, covering desktop, tablet, and mobile. The preceding E2E TypeScript check also passed.
- **54 frontend tests passed across 15 files** in the reference validation checkout; its strict TypeScript check and production build passed.
- The developer verified progressive live AI Assistant output through the public backend earlier in the demo setup.
- After restarting the computer, the developer verified live recipe generation on S3, added an image, saved the draft, opened its details, and found it through guest browsing/search.
- The deployed Spoonful icon was visually confirmed by the developer.
- The developer subsequently confirmed that the frontend running through Docker could receive a live AI Assistant response progressively, completing the frontend Docker smoke check.

The frontend suite covers more than four React components, including authentication, navigation, protected routes, recipe forms, dashboard deletion, recipe browsing/details, and AI interfaces. Playwright also checks cross-owner permissions, guest route access, missing recipes, and lack of horizontal overflow at its configured viewports.

From `backend/`, run `npm ci && npm test` for the Node controller/service tests. View the latest Playwright report with `npx playwright show-report` from `client/`.

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

## Gold stretch goals and remaining checks

The two implemented stretch goals are:

1. **A second AI use case:** Recipe Generator produces an editable structured draft, separate from the streamed cooking assistant.
2. **Playwright E2E tests:** 27 cases cover nine scenarios across desktop, tablet, and mobile.

Gold also requires all core requirements. The remaining verification status is:

- [x] Confirm the frontend and backend run together through their Docker Compose files. Backend Docker operation and the frontend's live AI streaming smoke check are verified by the developer.
- [ ] Complete and verify the final desktop visual match. Remaining differences include dashboard card arrangement, the stacked browse layout, recipe-detail ordering, and exact wordmark lettering.
- [ ] Capture final screenshots and demo evidence, verify a refreshed recipe-detail deep link, and commit the final documentation and changes.

The provided UX exports also include profile editing, account deletion, and a Forgot Password link. The supplied API and core user-story acceptance criteria do not provide those account endpoints. Those flows are not implemented and must be reconciled with the instructor if they are part of the assessed screen scope. There are no placeholder controls claiming those actions work.

The logo icon uses the supplied SVG. The surrounding lettering uses Open Sans; exact wordmark reproduction remains part of the visual pass. The original Figma file was unavailable to the connected design tools because editor access was not granted. Automated layout checks establish viewport fit, not pixel-perfect fidelity.

This project has no automated GitHub Actions deployment; deployment automation is a third optional stretch goal rather than one of the two selected above.
