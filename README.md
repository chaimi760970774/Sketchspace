Sketchspace

A collaborative collage and drawing web app. Users can search photos, drag photos and shapes onto a shared canvas, cut photos into shapes, and draw together in real time.

This repository contains the frontend. The backend lives in a separate repository: sketchspace-server

Tech stack
React with Vite
MobX for the reactive model
React Router (hash routing)
Konva / react-konva on top of the HTML Canvas API for the drawing board
Unsplash API for searching collage photos
Getting started
1. Install dependencies
bash
npm install
2. Set up environment variables

The Unsplash access key is not stored in the repository. Copy the example file and fill in your own key:

bash
cp .env.example .env

Then open .env and replace the placeholder:

VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here

To get a key:

Go to unsplash.com/developers and log in
Click New Application and accept the terms
Copy the Access Key into .env

Each team member should use their own key. Demo keys are limited to 50 requests per hour, and the limit is shared by everyone using the same key.

3. Run the app
bash
npm run dev

Then open the URL shown in the terminal (e.g. http://localhost:8080).

If you change .env, restart npm run dev for the change to take effect.

Pages
Route	Page
#/login	Login
#/gallery	Gallery: all canvases, search, categories
#/mywork	My Work: the current user's canvases
#/profile	Profile: avatar, name, email
#/canvas	Canvas: new canvas
#/canvas/:canvasId	Canvas: an existing canvas
Project structure

The project follows the Model-View-Presenter (MVP) pattern.

src/
├── reactjs/              Presenters: connect the model to the views
├── views/                Views: only display data and forward user events
│   └── canvas/           Views for the canvas page
│       └── nodes/        One file per element type drawn on the canvas
├── model/                Model: app data and the methods that change it
│   ├── mobxReactiveModel.js   Combines the parts below into one observable model
│   ├── userModel.js           User, login, profile
│   ├── galleryModel.js        Canvas list, search, categories
│   └── canvasModel.js         Canvas elements, tools, Unsplash search
├── utils/                Helpers (canvas drawing, geometry, promise handling)
└── api/                  Code that talks to external services (Unsplash, backend)
Presenters read from props.model and call model methods, they never change model fields directly.
Views receive everything through props and never import the model.
Fake data is currently used in the model. It will be replaced with data from the backend.
Debugging

The model is exposed in the browser console as myModel, e.g. type myModel.elements to see everything on the current canvas.

Troubleshooting

Photo search shows "Something went wrong" Open the browser console (F12) and check the error code:

401: the Unsplash key is missing or wrong. Check that the file is named exactly .env (not .env.txt), that it is in the project root next to package.json, that the variable name is VITE_UNSPLASH_ACCESS_KEY, and that you restarted npm run dev.
403: the hourly request limit is reached. Wait an hour or use your own key.
