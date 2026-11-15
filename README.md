# Golden Plan

Golden Plan is a browser-based academic planner for tracking modules, deadlines,
assessment materials, and the 2026 North-West University academic calendar.
It is a static, client-rendered application built with HTML, CSS, and native
JavaScript modules. Firebase Authentication and Realtime Database provide
Google sign-in and per-user cloud synchronization.

## Features

- Google sign-in and synchronized user data
- Academic modules with marks, colors, and exam eligibility status
- Countdown cards and a calendar for assessment deadlines
- 2026 NWU academic calendar
- Assessment and module views, with PDF and image attachments
- Admin user activity dashboard for the configured administrator
- Dark and light themes, responsive navigation, and install metadata

Marks, grade calculator, study plan, goals, projects, habits, notes, and
resources currently appear as coming-soon screens. The web app does not provide
offline support; the manifest supplies install metadata only.

## Requirements

- A modern browser with JavaScript modules enabled
- A local static web server for development (ES modules do not run from
  `file://`)
- A Firebase project configured for Google Authentication and Realtime
  Database

There is no package manager manifest or build step. Firebase SDK modules are
loaded from Google's CDN at runtime.

## Run locally

From the repository root, start a static server:

```sh
python3 -m http.server 5501
```

Open <http://localhost:5501>. To use Google sign-in, add `localhost` to the
Firebase project's authorized domains and configure the Firebase values in
`script.js`.

## Configuration and environment

The app has no `.env` variables. Its Firebase web-app configuration is defined
near the top of `script.js`. Firebase web API keys identify the project; they
are not authorization controls and must not be treated as secrets. Restrict
the key in Google Cloud where appropriate and enforce access using Firebase
Realtime Database Security Rules.

Before deploying, configure and test rules that:

- Require an authenticated Firebase user for user data.
- Restrict `/users/{uid}` to that same authenticated UID.
- Restrict `/allUsers` writes to trusted server-side logic or tightly scoped
  administrator authorization. The current administrator email check in the
  browser only controls UI visibility and is not an authorization boundary.
- Validate the expected shape, size, and types of stored data.

The app currently stores uploaded PDF and image data as base64 values in the
Realtime Database (with a 3 MB per-file client limit). For a production system
with meaningful file usage, migrate binary files to Firebase Storage and keep
only metadata in the database.

## Architecture

```text
.
├── .vscode/settings.json  # Local Live Server port
├── assets/
│   ├── brand-mark.svg     # App identity / manifest icon
│   └── icons.svg          # Shared Lucide-style SVG symbol sprite
├── index.html             # Application shell and view markup
├── manifest.json          # Browser install metadata
├── script.js              # UI, Firebase integration, and calendar logic
├── style.css              # Layout, components, responsive and theme styles
└── README.md
```

The repository also contains five root-level `.mp4` recordings. They are not
loaded by the application and are retained as project media.

The application is intentionally dependency-light. `index.html` loads
`script.js` as a native ES module; the script imports Firebase 10.7.1 modules
from Google's CDN. Data is scoped under
`users/{uid}/events`, `users/{uid}/modules`, and `users/{uid}/pdfs`.
`allUsers` stores sign-in activity for the admin dashboard.

## Development and quality checks

- Edit the existing HTML, CSS, and JavaScript directly; there is no compile or
  bundling command.
- Use a static HTTP server while developing and check the browser console and
  Firebase network requests.
- Run `node --input-type=module --check < script.js` for a JavaScript syntax
  check.
- There is no automated test or lint configuration in this repository yet.

## Deployment

Deploy the repository contents to any static HTTPS host. Set the production
domain as an authorized Firebase Authentication domain, verify database rules
against authenticated and unauthenticated users, and ensure the Firebase
Realtime Database is available in the selected region. Do not rely on the
client-side admin check to protect data.

The project does not currently include a service worker, automated deployment
workflow, automated tests, or a backend API.
