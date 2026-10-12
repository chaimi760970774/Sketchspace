# Sketchspace (frontend)

A collaborative collage and sketching app. Built with React, Vite, MobX and react-konva, using an MVP structure:

```
src/
├── api/        all requests to outside services (Sketchspace server, Unsplash)
├── model/      app state and logic (MobX); async requests are started and handled here
├── reactjs/    presenters: read the model, call model methods, pick the views
├── views/      views: only get data through props and send events up
└── utils/      small helpers (geometry, drawing, validation, dates)
```

The server lives in a separate repository:
[yukistillalive/sketchspace-server](https://github.com/yukistillalive/sketchspace-server).

## Setup

```bash
npm install
cp .env.example .env
```

Then fill in `.env`:

| Variable | Meaning |
|---|---|
| `VITE_UNSPLASH_ACCESS_KEY` | Unsplash API access key, used by the photo search |
| `VITE_API_URL` | Address of the Sketchspace server. Optional, defaults to `http://localhost:3000` |

Vite reads `.env` only when it starts, so restart `npm run dev` after changing it.

## Running with the server

The frontend loads canvases and strokes from the server, so start the server first.

1. **Start the server** (in the `sketchspace-server` repository, see its README for details):

   ```bash
   docker start mongo        # first time: docker run -d -p 27017:27017 --name mongo mongo
   npm run dev               # serves the API on http://localhost:3000
   ```

2. **Allow this frontend's address.** The server only accepts browser requests from the origins
   in `CLIENT_ORIGIN` (default `http://localhost:5173`). This frontend runs on port **8080**, so the
   server's `.env` must contain:

   ```
   MONGODB_URI=mongodb://localhost:27017/sketch-space
   PORT=3000
   CLIENT_ORIGIN=http://localhost:8080
   ```

   Restart the server after changing its `.env`. Without this, every request fails with a CORS
   error in the browser console and the app shows "Cannot reach the server".

3. **Start the frontend:**

   ```bash
   npm run dev               # http://localhost:8080
   ```

## What is connected to the server

| Feature | Source |
|---|---|
| Canvas list (Gallery: shared ones, My Work: all), create, rename, share, delete | Server (REST) |
| Opening a canvas, its strokes, drawing new strokes | Server (REST) |
| Photos, shapes and cutouts on a canvas | Frontend only, lost on reload |
| Folders in My Work | Frontend only, lost on reload |
| User, login, profile, collaborators | Fake data for now |
| Photo search | Unsplash API |
