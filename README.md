# Sketchspace

Sketchspace is a web app where you make collages together with friends. Search for photos, drop them onto a shared canvas together with some shapes, cut the photos into those shapes, and draw on it at the same time as everyone else.

This repo is the frontend. The backend is in [sketchspace-server](https://github.com/yukistillalive/sketchspace-server).

## What we use

- **React + Vite** for the app
- **MobX** for the model
- **React Router** for the pages (hash routing, so URLs look like `#/gallery`)
- **Konva / react-konva** for the canvas
- **socket.io** for live drawing with other people
- **Unsplash API** for the photo search

## Running it locally

**1. Install the packages**

```bash
npm install
```

**2. Add your Unsplash key**

The key isn't in the repo, so you need your own. Make a copy of the example file:

```bash
cp .env.example .env
```

Open `.env` and paste your key in:

```
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

Add the server address if it is not `http://localhost:3000` (optional):

```
VITE_API_URL=http://localhost:3000
```

Don't have a key yet? Log in at [unsplash.com/developers](https://unsplash.com/developers), click **New Application**, accept the terms, and copy the **Access Key**.

Please use your own key rather than sharing one. A demo key only gets 50 requests per hour, and that limit is shared by everyone using it.

**3. Start the server**

The canvases live on the server, so start it first. See [Running with the server](#running-with-the-server) below.

**4. Start the app**

```bash
npm run dev
```

Then open the link that shows up in the terminal (usually http://localhost:8080).

If you change `.env` later, stop the app and run `npm run dev` again, otherwise it won't pick up the change.

## Pages

| URL | What's there |
| --- | --- |
| `#/login` | Log in |
| `#/gallery` | Canvases everyone has shared, with search |
| `#/mywork` | Your own canvases, sorted into folders |
| `#/profile` | Your avatar, name and email |
| `#/canvas` | Start a new canvas |
| `#/canvas/:canvasId` | Open an existing canvas |

## How the code is organised

We use Model-View-Presenter (MVP). In short:

- **Model** (`src/model/`) holds the data and the functions that change it.
- **Presenters** (`src/reactjs/`) read from the model and pass things down to the views. When the user does something, they call a model function. They never change the model directly.
- **Views** (`src/views/`) only show things on screen and report clicks and typing back up. They never touch the model.

```
src/
├── model/
│   ├── mobxReactiveModel.js   puts the parts below together into one model
│   ├── userModel.js           user, login, profile
│   ├── galleryModel.js        canvas list, search, folders, joining by id
│   ├── canvasModel.js         elements on the canvas, tools, photo search
│   ├── openCanvasModel.js     the open canvas: strokes, live drawing, sharing
│   └── toastModel.js          short messages at the bottom of the screen
├── reactjs/                   presenters, one per page
├── views/                     views, one per page
│   └── canvas/                views for the canvas page
│       └── nodes/             one file per thing you can put on the canvas (photo, shape, cutout)
├── api/                       talking to the server (REST and socket.io) and to Unsplash
└── utils/                     small helpers (drawing shapes, geometry, promises)
```

Canvases, strokes and elements come from the server. The user, login and profile still use fake data.

## Debugging tip

The whole model is available in the browser console as `myModel`. For example, type `myModel.elements` to see everything that's on the current canvas.

## Photo search says "Something went wrong"?

Press F12, open the Console tab and look at the error code:

- **401**: your Unsplash key is missing or wrong. Check that the file is called exactly `.env` (not `.env.txt`), that it sits in the project root next to `package.json`, that the variable name is `VITE_UNSPLASH_ACCESS_KEY`, and that you restarted `npm run dev`.
- **403**: you've used up the 50 requests for this hour. Wait a bit, or switch to your own key.

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
