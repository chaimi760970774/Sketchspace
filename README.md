# Sketchspace

Sketchspace is a web app where you make collages together with friends. Search for photos, drop them onto a shared canvas together with some shapes, cut the photos into those shapes, and draw on it at the same time as everyone else.

This repo is the frontend. The backend is in [sketchspace-server](https://github.com/yukistillalive/sketchspace-server).

## What we use

- **React + Vite** for the app
- **MobX** for the model
- **React Router** for the pages (hash routing, so URLs look like `#/gallery`)
- **Konva / react-konva** for the canvas
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

Don't have a key yet? Log in at [unsplash.com/developers](https://unsplash.com/developers), click **New Application**, accept the terms, and copy the **Access Key**.

Please use your own key rather than sharing one. A demo key only gets 50 requests per hour, and that limit is shared by everyone using it.

**3. Start the app**

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
│   ├── mobxReactiveModel.js   puts the three parts below together into one model
│   ├── userModel.js           user, login, profile
│   ├── galleryModel.js        canvas list, search, folders
│   └── canvasModel.js         what's on the canvas, tools, photo search
├── reactjs/                   presenters, one per page
├── views/                     views, one per page
│   └── canvas/                views for the canvas page
│       └── nodes/             one file per thing you can put on the canvas (photo, shape, cutout)
├── api/                       talking to Unsplash (and the backend later)
└── utils/                     small helpers (drawing shapes, geometry, promises)
```

Right now the model uses fake data. It will be swapped for real data from the backend once we connect the two.

## Debugging tip

The whole model is available in the browser console as `myModel`. For example, type `myModel.elements` to see everything that's on the current canvas.

## Photo search says "Something went wrong"?

Press F12, open the Console tab and look at the error code:

- **401**: your Unsplash key is missing or wrong. Check that the file is called exactly `.env` (not `.env.txt`), that it sits in the project root next to `package.json`, that the variable name is `VITE_UNSPLASH_ACCESS_KEY`, and that you restarted `npm run dev`.
- **403**: you've used up the 50 requests for this hour. Wait a bit, or switch to your own key.
