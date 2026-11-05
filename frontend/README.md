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
npm run test
npm run build
```

Public registration creates employee accounts. Administrator accounts must be
provisioned through the backend administrator command.

## Employee workspace

The employee workspace provides:

- Conversation history and new conversation creation
- Questions sent to the authenticated backend conversation API
- Assistant answers with uncertainty notices and policy citations
- Escalation submission for questions that need HR support

Only conversations and escalations belonging to the signed-in employee are
shown. Access tokens remain in memory and are attached to authenticated API
requests; the backend refresh cookie restores the session after a page reload.

## Administrator workspace

Administrators can use the command center to:

- Upload PDF policy documents
- Filter, approve, process, and deactivate documents
- Monitor document processing health
- Review employee escalations and move them through their lifecycle
- Send responses and close handled requests
- Review the administrative audit activity

## Reliability and deployment configuration

The API client automatically attaches the in-memory access token. When an API
request receives an expired-token response, it refreshes the session through
the HttpOnly refresh cookie and retries the original request once. If refresh
fails, protected routes return the user to the login screen.

API failures are shown with server validation details when available and with a
clear connectivity message when the backend cannot be reached. PDF uploads
show determinate progress in the administrator workspace.

For production, copy `.env.example` to `.env.production` and set
`VITE_API_URL` to the deployed HTTPS backend URL. Configure the backend
`FRONTEND_ORIGIN` to the deployed frontend origin and enable secure cookies.

## Frontend tests

The Vitest and React Testing Library suite runs without a backend server. It
covers:

- Protected route authentication and role guards
- Employee login success and error states
- Employee conversation loading, question submission, and citation rendering
- Administrator document loading and approval actions

Use `npm run test:watch` while developing a frontend feature.
