# Policy Knowledge Assistant frontend

The frontend is a React 19 application built with Vite, Tailwind CSS, and
Material UI. It connects to the FastAPI backend for authentication and uses
HttpOnly refresh-token cookies for session restoration.

## Setup

From `frontend/`, install dependencies and create a local environment file:

```powershell
npm install
Copy-Item .env.example .env
```

Set `VITE_API_URL` in `.env` if the backend is not running at the default
`http://127.0.0.1:8000`.

## Development

Start the backend first, then run:

```powershell
npm run dev
```

The development server is available at `http://localhost:5173`. The backend
must allow that origin through its `FRONTEND_ORIGIN` setting.

## Validation

```powershell
npm run lint
npm run build
```

Public registration creates employee accounts. Administrator accounts must be
provisioned through the backend administrator command.
