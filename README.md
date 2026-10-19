# Sketchspace

**Live site:** [chaimi760970774.github.io/Sketchspace](https://chaimi760970774.github.io/Sketchspace/)

**Backend:** [sketchspace-server](https://github.com/yukistillalive/sketchspace-server) 

<!-- Add a screenshot of the canvas page here, e.g. ![Sketchspace](screenshot.png) -->

## Description

Sketchspace is a collaborative collage and drawing web app. Users search for photos on Unsplash, drop them onto a canvas together with simple shapes, cut the photos into those shapes, and draw on top with different brushes. A canvas can be kept private or shared, and everyone who opens a shared canvas draws on it at the same time: every line, photo and shape shows up for the others in real time.

Shared canvases appear in the Gallery for everyone to browse. Each user also has a My Work page where they can organise their own canvases into folders.

## Features

- **Collage canvas**: drag photos and shapes (triangle, star, circle, square) onto the canvas, then move, resize, rotate and delete them.
- **Cut photos into shapes**: place a shape over a photo and "mask" it to cut the photo into that shape, or fill the shape with a colour.
- **Drawing**: pencil and pen brushes with adjustable colour, width and opacity, plus an eraser.
- **Photo search**: search Unsplash by keyword and filter by orientation and colour. Photographers are credited on the canvas, as Unsplash requires.
- **Real-time collaboration**: everyone on a shared canvas sees each other's lines, photos and shapes immediately, and how many people are drawing right now.
- **Sharing**: make a canvas public in the Gallery or keep it private; others can also join a shared canvas by its id.
- **My Work and folders**: your own canvases, which you can sort into folders by dragging cards onto folder tabs.
- **Accounts**: sign up with email and password or Google, or continue as a guest. Profile page with name, email, profile picture upload and account deletion.
- **Export**: download the canvas as a PNG.
- **Feedback everywhere**: loading states, error messages with retry, confirmation dialogs and toast messages for every action.

## Technology stack

- [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/), built with [Vite](https://vite.dev/)
- [MobX](https://mobx.js.org/) and [mobx-react-lite](https://mobx.js.org/react-integration.html) for the model
- [React Router](https://reactrouter.com/) (hash routing, so URLs look like `#/gallery`)
- [Konva](https://konvajs.org/) / [react-konva](https://konvajs.org/docs/react/) on top of the HTML Canvas API for the drawing board
- [socket.io-client](https://socket.io/) for live drawing
- [Unsplash API](https://unsplash.com/developers) for the photo search
- [Google Identity Services](https://developers.google.com/identity/gsi/web) for Google sign-in
- [GitHub Pages](https://pages.github.com/) + GitHub Actions for deployment

## Architecture

### Overview

The frontend follows the **Model-View-Presenter (MVP)** pattern:

<img width="2844" height="760" alt="image" src="https://github.com/user-attachments/assets/05be99be-5ff2-4f48-b38c-82061aefaeff" />


```
Views (src/views)          render props, forward user events
   ▲ props   │ events
Presenters (src/reactjs)   MobX observers: read the model, call model methods
   ▲ changes │ method calls
Model (src/model)          one MobX observable: state + all logic, including async work
   ▲ results │ requests
API layer (src/api)        the only code that talks to the server, Unsplash and Google
```

- **Views never import the model or the API.** They only receive data and callbacks through props, so they can be read and changed without knowing where the data comes from.
- **Presenters never fetch and never change model fields directly.** They pass model data down to the views and turn view events into model method calls. The only extra thing they do is navigation (for example, opening a canvas once the model has created it).
- **All async work lives in the model**: REST requests, socket events, `Promise.all` loading, optimistic updates and error handling. This gives the same separation as redux-thunk, without a framework.
- **The API layer** (`src/api`) wraps every external call, so the model never builds URLs or talks to `fetch` or socket.io itself.

One small exception: the canvas views keep a few UI-only refs (the Konva stage for exporting, and the points of a line while it is being drawn). These are pure rendering details; the finished line is handed to the model.

### View

The views are functional components, typed with a `Props` interface each, and styled with plain CSS (`style.css`). Main views:

1. **`galleryView.tsx`**: shared canvases from everyone, with search and "join by canvas id".
2. **`myWorkView.tsx`**: the user's own canvases, folder tabs, drag-and-drop into folders.
3. **`canvas/canvasView.tsx`**: the canvas page layout: toolbar, tool panel, live status and the board.
4. **`canvas/canvasBoardView.tsx`**: the Konva stage that draws photos, shapes, cutouts and lines (one file per element type in `canvas/nodes/`).
5. **`profileView.tsx`**: name, email, profile picture and account deletion.
6. **`loginView.tsx`**: email/password sign-up and login, Google sign-in and guest login.

Reusable views include `buttonView`, `logoView`, `toastView`, `defaultAvatarView`, and the canvas panels (`shapePanelView`, `strokePanelView`, `photoSearchView`, `shareDialogView`, `canvasStatusView`).

### Presenter

Each page has its own presenter in `src/reactjs`, wrapped in MobX's `observer` so it re-renders when the parts of the model it reads change. `ReactRoot.tsx` sets up the routes, and the sidebar and toast presenters are shared by all pages.

### Model

The model is one MobX observable, put together in `mobxReactiveModel.ts` from five parts:

1. **`userModel`**: login, sign-up, Google sign-in, guest mode, session restore; profile editing, profile picture upload and account deletion.
2. **`galleryModel`**: loading the Gallery and My Work lists, search, creating, sharing and deleting canvases, folders (create, delete, move a canvas in or out).
3. **`canvasModel`**: everything on the board: tools, brushes, photos, shapes, cutouts, masking and filling, the eraser, Unsplash search and filters, photo credits.
4. **`openCanvasModel`**: the canvas that is open: loading it, joining it live over socket.io, receiving the other users' changes, renaming, sharing, clearing, lines and save status.
5. **`toastModel`**: the short messages shown at the bottom of the screen.

Shared types for the model, the server data and the props live in `types.ts`.

### Persistence and real-time updates

All data is stored by the Sketchspace server in MongoDB. The frontend talks to it in two ways:

- **REST** (`canvasSource`, `folderSource`, `authSource`): canvases, folders, lines, photos and shapes, accounts and profile pictures. Requests send the login token as `Authorization: Bearer <token>`.
- **socket.io** (`socketSource`): when a canvas is open, the app joins it live. Your own changes are sent as socket events, and the server pushes everyone else's (`stroke:added`, `element:updated`, `canvas:peers`, ...) to the model, which updates the board right away.

New lines and elements are shown immediately and saved in the background (optimistic updates). If saving fails, the change is undone and a toast explains why.

## External APIs

- **Sketchspace server** (our own): data, accounts and live drawing.
- **Unsplash API**: photo search with orientation and colour filters.
- **Google Identity Services**: Google sign-in.

## Running it locally

**1. Install the packages**

```bash
npm install
```

**2. Add your keys**

```bash
cp .env.example .env
```

Then fill in `.env`:

```
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

- **Unsplash**: log in at [unsplash.com/developers](https://unsplash.com/developers), click **New Application** and copy the **Access Key**. A demo key only gets 50 requests per hour, so please use your own.
- **Google** (optional): create an OAuth client of type **Web application** in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add `http://localhost:8080` and `http://localhost` under **Authorized JavaScript origins**, and use the same client id here and in the server's `GOOGLE_CLIENT_ID`. Without it, the Google button is simply hidden.

**3. Start the server** (see the [server README](https://github.com/yukistillalive/sketchspace-server)), then the app:

```bash
npm run dev
```

Open the link shown in the terminal (usually http://localhost:8080). After changing `.env`, stop the app and run `npm run dev` again.

Other scripts: `npm run typecheck` (TypeScript, strict) and `npm run build`.

## End-to-end tests

Run the suite with `npm run test:e2e`. Playwright builds the E2E bundle and serves
it with Vite preview at `http://127.0.0.1:4173`, proxying API/socket traffic to
the local backend at `http://localhost:3000`. Failure screenshots, videos, and
traces are retained.
Use `npx playwright show-report` to inspect the HTML report or
`npx playwright show-trace test-results/<test>/trace.zip` to inspect a trace or `npx playwright test --ui` to open the visual interface.

Account journey tests generate unique credentials, sign up and log in, update
the profile where relevant, and delete the created account in `finally` cleanup.
These tests require a local backend and a test database that permits creating
and deleting users. Do not point disposable-account tests at production data.
Collaboration creates a temporary guest-owned board and verifies synchronization
across two browser contexts. Sketchspace has no checkout or payment flow, so
there is no checkout journey to automate.

## Connecting to the server

The server address is `VITE_API_URL`, set in two committed files (only a public address belongs there, never a secret):

| File | Used by | Value |
| --- | --- | --- |
| `.env.development` | `npm run dev` | `http://localhost:3000` |
| `.env.production` | `npm run build` (the deployed site) | `https://91-98-226-226.sslip.io` |

The address is built into the app, so rebuild after changing it.

**Login.** The site (GitHub Pages) and the server are on different domains, and browsers do not send cookies between sites. So login returns a token, the app keeps it in `localStorage` (`sketchspace_token`) and sends it with every request and in the socket connection. Guests' canvases use their own owner token (`X-Owner-Token`).

The server must list the site's exact origin in `CLIENT_ORIGIN` (for the deployed site: `https://chaimi760970774.github.io`).

## Deployment

Every push to `main` builds the app and publishes it to GitHub Pages (`.github/workflows/deploy.yml`). The Unsplash key is stored as the repository secret `VITE_UNSPLASH_ACCESS_KEY`. Do not set `VITE_API_URL` in the workflow: an empty value there overrides `.env.production`.

## Troubleshooting

- **The app can't reach the server**: open the browser's **Network** tab. A CORS error means the site's origin is missing from the server's `CLIENT_ORIGIN`; a mixed content error means an `https://` page is calling an `http://` address.
- **Photo search says "Something went wrong"**: check the Console. **401** means the Unsplash key is missing or wrong (the file must be named exactly `.env`, sit next to `package.json`, and you must restart `npm run dev`). **403** means the hourly request limit is used up.
- **Debugging**: the whole model is available in the browser console as `myModel`, e.g. `myModel.elements` lists everything on the open canvas.

## The team

- Yuewei He: frontend (MVP structure, pages, canvas tools, backend integration, folders, TypeScript migration, GitHub Pages deployment)
- Yue Zhu: real-time collaboration (socket.io), canvas data, Docker and server hosting
- Thuy An Nguyen: authentication (email/password, Google, sessions), profile pictures
- Maryam Khan: REST API for canvases and lines, UI and interaction design

<!-- Please check that everyone agrees with their line before handing in. -->

## File structure

```
Sketchspace/
├── .github/workflows/deploy.yml   Builds and publishes the site to GitHub Pages
├── .env.example                   Template for your local keys
├── .env.development               Server address for npm run dev
├── .env.production                Server address and Google client id for the deployed site
├── index.html
├── style.css                      All styles
├── vite.config.js
├── public/                        Static files (favicon)
└── src/
    ├── index.tsx                  Entry point
    ├── api/                       Everything that talks to the outside world
    │   ├── canvasSource.ts        REST: canvases, lines, photos/shapes, login token, owner tokens
    │   ├── folderSource.ts        REST: folders
    │   ├── authSource.ts          REST: register, login, session, profile, profile picture
    │   ├── socketSource.ts        socket.io: joining a canvas and live changes
    │   ├── unsplashSource.ts      Unsplash photo search
    │   └── googleauthSource.ts    Google sign-in button
    ├── model/
    │   ├── mobxReactiveModel.ts   Combines the parts below into one observable model
    │   ├── userModel.ts           Accounts, login, profile
    │   ├── galleryModel.ts        Gallery, My Work, folders
    │   ├── canvasModel.ts         Tools, photos, shapes, cutouts, photo search
    │   ├── openCanvasModel.ts     The open canvas, live connection, lines
    │   ├── toastModel.ts          Toast messages
    │   └── types.ts               Shared types
    ├── reactjs/                   Presenters (one per page, plus sidebar and toast) and the router
    ├── views/                     Views
    │   └── canvas/                Canvas page views
    │       └── nodes/             One file per element type on the board (photo, shape, cutout, line)
    └── utils/                     Helpers: geometry, shape paths, brush styles, image resizing,
                                   PNG export, date formatting, promise state
```
