# Sketchspace (frontend)

A collaborative collage and sketching app. Built with React, Vite, MobX and react-konva, using an MVP structure:

```
src/
├── api/        all requests to outside services (Sketchspace server over REST and socket.io, Unsplash)
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

The frontend loads canvases, strokes and elements from the server and draws live over socket.io, so start the server first.

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

## How it works with the server

There are no accounts. Ownership works with an **owner token**:

- Creating a canvas returns an `ownerToken` once. The frontend keeps it in this browser's `localStorage`
  (`sketchspace-owner-tokens`) and sends it as the `X-Owner-Token` header on every request for that canvas
  and in `canvas:join`.
- A private canvas can only be opened with its token. Changing its name, sharing, deleting it and clearing its lines
  are owner-only.
- Tokens only exist in the browser that created the canvas. Another browser or device does not see those
  canvases in My Work, and clearing site data loses the token.

**Sharing and joining**

1. Open a canvas and click **Share**. A private canvas becomes shared, and a popup shows its canvas id with a
   **Copy** button. **Make private** (owner only) is in the same popup and removes everyone else.
2. The other person pastes the id into **Join canvas** on the Gallery page.

A shared canvas can be drawn on by anyone who has its id, and it is also listed in the Gallery.

**Live drawing.** After a canvas loads over REST, the frontend joins it over socket.io. The topbar shows the
connection and how many people are in the canvas. Strokes and elements go out over the socket while it is joined,
and over REST when it is not, so drawing still works offline from the live connection. After a reconnect the
canvas is joined again and missed changes are loaded.

If the owner makes a canvas private or deletes it while someone else is in it, that person sees a screen saying so.

## What is connected to the server

| Feature | Source |
|---|---|
| Canvas list (Gallery: shared ones, My Work: the ones this browser owns), create, rename, share, delete | Server (REST) |
| Join a canvas by its id | Server (REST + socket.io) |
| Opening a canvas, its strokes and elements | Server (REST, socket.io on join) |
| Drawing strokes, undo (your last line), delete a selected line, clear lines (owner) | Server (socket.io, REST as fallback) |
| Photos, shapes and cutouts: add, move, resize, fill, cut, delete | Server (socket.io, REST as fallback) |
| Live headcount, other people's strokes and elements | Server (socket.io) |
| Folders in My Work | Frontend only, lost on reload |
| User, login, profile | Fake data for now |
| Photo search | Unsplash API |

## Known limits

- **Undo** needs the live connection, and only removes your own most recent line. Strokes saved over REST cannot
  be undone. There is no redo.
- **Clear lines** removes strokes only. Photos, shapes and cutouts stay.
- Two people changing the same element at once is last write wins.
- Resizing an element with a flip can produce a negative size, which the server rejects. The change is undone.
- Canvases created before owner tokens have no owner: they do not appear in My Work and cannot be opened while private.
