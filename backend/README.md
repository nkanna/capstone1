# Backend

This directory contains the backend server for the Spoonful application.

## Commands

### Running the Backend

To start the backend services, run the following command. This will build the Docker images and start the containers in detached mode.

```bash
docker-compose -f docker-compose.dev.yml up --build 
```

**When to use:** Use this command when you want to start the backend server for the first time or when you have made changes to the Dockerfile or the backend code — including after adding the `routes/ai.js` file for the AI-powered feature.

### Stopping the Backend

To stop the backend services, run the following command:

```bash
Ctrl + C
```

**When to use:** Use this command when you want to stop the running backend services.

### Viewing Logs

To view the logs for a specific service, use the following commands:

For the API service:
```bash
docker-compose -f docker-compose.dev.yml logs -f api
```

For the database service:
```bash
docker-compose -f docker-compose.dev.yml logs -f mongo
```

**When to use:** Use these commands to debug issues or monitor the output of the backend services — including checking the AI stream endpoint's error logs if a Gemini request fails. The `-f` flag follows the log output.

### Testing the AI Endpoint Directly

Before wiring the AI feature into your React app, confirm the endpoint works on its own:

```bash
curl -X POST http://localhost:3000/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello, tell me a fun fact"}'
```

**When to use:** Use this any time you change `routes/ai.js` or suspect the AI feature isn't working — it's much faster to debug a single `curl` call than a full React component.

### Pruning Containers

To remove stopped containers, run the following command:

```bash
docker container prune
```

**When to use:** Use this command to clean up your system and remove unused containers. This can help free up disk space.

## Deployment

The backend, database, and local dev workflow described above stay as-is — you still develop and grade against `docker-compose -f docker-compose.dev.yml up --build`. What changes: your **React frontend** gets built and deployed as a static site to Amazon S3, and it's configured at build time to call this backend at whatever address it's reachable from (your machine's local network, a tunnel like ngrok, or a small always-on host if you have one — the backend itself does not need to move to AWS for this capstone).

See the root [README.md](../README.md) → **Step 5: Deploy to S3** for the full deployment pipeline.
