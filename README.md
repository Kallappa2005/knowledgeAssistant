# PolicyIQ Knowledge Assistant

PolicyIQ is an internal employee knowledge platform for answering workplace
policy questions from approved company documents. It combines grounded
retrieval-augmented generation (RAG), HR escalation workflows, and an AI
Learning Companion for assigned training courses.

The project has two role-based experiences:

- **Employee**: ask policy questions, inspect citations, submit unsupported
  questions to HR, manage conversations, and complete assigned training.
- **Administrator / HR**: upload and approve policy documents, monitor the
  knowledge base, answer escalated questions, manage training courses, assign
  employees, and review learning progress.

## 🎥 Product Demo

Watch the complete demonstration of Brainwave's PolicyIQ application.

[![Brainwave Project Demo](https://img.youtube.com/vi/MwAY4v01rz8/0.jpg)](https://www.youtube.com/watch?v=MwAY4v01rz8)

**[▶ Watch the Project Demo](https://www.youtube.com/watch?v=MwAY4v01rz8)**

## Product problem

Employees often need quick answers about policies such as leave, payroll,
benefits, workplace conduct, or safety. A generic chatbot can produce
confident but unsupported answers, while a manual HR process is slow and
difficult to track.

PolicyIQ addresses this by:

1. Indexing only administrator-approved policy PDFs.
2. Retrieving the most relevant policy excerpts for each question.
3. Asking the language model to answer only from those excerpts.
4. Returning source citations with the answer.
5. Escalating unsupported questions to HR instead of inventing an answer.
6. Keeping training material separate from the policy knowledge base.

## User journeys

### Employee policy journey

1. Register as an employee or sign in.
2. Create or select a conversation.
3. Ask a workplace policy question.
4. Read the concise answer and its source excerpts.
5. If the approved documents do not contain enough evidence, submit the
   original question to HR.
6. Track open and closed HR requests from the employee workspace.

### HR policy journey

1. Sign in with an administrator account.
2. Upload a policy PDF.
3. Approve the document.
4. Process it into page-aware chunks and embeddings.
5. Review the escalation inbox.
6. Respond to employees and close completed requests.

### Learning Companion journey

1. An administrator creates a course by uploading a training PDF.
2. The administrator selects active employees for assignment.
3. The employee opens **My Learning** and reviews assigned courses.
4. The employee opens the authorized training PDF and generates an AI summary.
5. The employee completes a three-question knowledge check.
6. The employee reports completion.
7. HR reviews assignment status and quiz score in Learning Management.

## Architecture

```text
                         +----------------------+
                         |  React + Vite UI     |
                         |  Employee / HR views |
                         +----------+-----------+
                                    |
                              Axios / JSON
                                    |
                         +----------v-----------+
                         | FastAPI application  |
                         | Auth, RAG, learning, |
                         | conversations, HR   |
                         +---+--------------+---+
                             |              |
                 +-----------v---+      +---v----------------+
                 | PostgreSQL    |      | ChromaDB           |
                 | users, docs,  |      | approved policy    |
                 | chats, HR,    |      | chunks + vectors   |
                 | learning      |      +--------------------+
                 +---------------+
                             |
                    +--------v---------+
                    | Local PDF files  |
                    | policy and      |
                    | learning paths  |
                    +------------------+

             Groq / LangChain is used for grounded answers,
             summaries, quiz generation, and conversational replies.
```

### Backend responsibilities

- **FastAPI** exposes the REST API and OpenAPI documentation.
- **SQLAlchemy** models PostgreSQL entities and relationships.
- **PostgreSQL** stores accounts, roles, documents, conversations, messages,
  escalations, audit logs, courses, assignments, and quiz attempts.
- **ChromaDB** persists embeddings for approved policy chunks only.
- **Sentence Transformers** creates normalized document/query embeddings.
- **PyPDF** extracts page-aware PDF text.
- **Groq through LangChain** generates validated answers, summaries, quizzes,
  and casual conversational responses.
- **HttpOnly refresh cookies plus short-lived access tokens** provide session
  authentication.

### Frontend responsibilities

- React and React Router provide role-protected dashboards.
- Material UI supplies accessible controls and dialogs.
- Tailwind utility classes and the existing `pka-*` design classes provide
  the visual system.
- Axios centralizes API calls, bearer tokens, refresh handling, and API error
  messages.

## Key technical decisions

### Grounded answers instead of free-form answers

Only approved policy chunks are queried. Retrieved evidence is rejected when
it is beyond the configured distance threshold. The generated response must
refer to retrieved chunk IDs; otherwise the system returns an explicit
uncertainty response and offers HR escalation.

### Separate policy and learning storage

Policy PDFs are stored in `backend/uploads/documents` and indexed in the
approved policy ChromaDB collection. Training PDFs are stored in
`backend/uploads/learning` and are never added to the policy collection.
This prevents training content from becoming accidental policy evidence.

### Server-side ownership checks

Employee routes derive the employee identity from the authenticated user. The
frontend cannot request another employee's conversations, escalations,
training PDFs, summaries, quizzes, or completion records by changing an ID.

### Explicit validation and safe failure

PDFs must have a `.pdf` filename, a PDF signature, and remain within the
configured size limit. AI summary and quiz output is validated before it is
returned. Unsupported questions do not receive fabricated answers.

### Additive database initialization

The project uses `Base.metadata.create_all()` through the initialization
command. It creates missing tables without deleting existing data. The
learning feature adds:

- `learning_courses`
- `course_assignments`
- `learning_quiz_attempts`

## Prerequisites

Install the following before setup:

- Windows 10/11
- Python **3.11.9** or another Python 3.11 release
- [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+ and npm
- PostgreSQL 14+ with a database and user
- A Groq API key for answer generation, summaries, quizzes, and
  conversational responses

The first backend run may download the configured Sentence Transformer model,
so internet access is required during that initial setup.

## Configuration

### Backend environment

From `backend`, copy the example file:

```powershell
cd C:\Users\kalla\Desktop\knowledgeAssistant\backend
Copy-Item .env.example .env
```

Edit `backend\.env` and set at least:

```dotenv
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/policy_assistant
JWT_SECRET_KEY=replace-with-a-long-random-secret
GROQ_API_KEY=your-groq-api-key
FRONTEND_ORIGIN=http://localhost:5173
SECURE_COOKIES=false
```

The defaults in `.env.example` also configure:

- `uploads/documents` for policy PDFs
- `uploads/learning` for training PDFs
- `chroma_db` for persistent approved-policy vectors
- `openai/gpt-oss-20b` with a configured fallback model
- RAG chunk size, overlap, top-k, distance, and citation limits

Do not commit `.env` or any API key.

### Frontend environment

From `frontend`, copy the example file:

```powershell
cd C:\Users\kalla\Desktop\knowledgeAssistant\frontend
Copy-Item .env.example .env
```

The default value is suitable for local development:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

## Installation and first run

### 1. Create the PostgreSQL database

Create a PostgreSQL database named `policy_assistant`, or choose another name
and use that name in `DATABASE_URL`.

For example, from `psql`:

```sql
CREATE DATABASE policy_assistant;
```

### 2. Install backend dependencies and initialize tables

Open a PowerShell terminal:

```powershell
cd C:\Users\kalla\Desktop\knowledgeAssistant\backend
uv sync
uv run python -m app.database.init_db
```

### 3. Create an administrator account

The command prompts for the administrator password:

```powershell
uv run python -m app.database.create_admin `
  --email admin@example.com `
  --full-name "HR Administrator"
```

The password must contain at least eight characters.

### 4. Install frontend dependencies

Open another PowerShell terminal:

```powershell
cd C:\Users\kalla\Desktop\knowledgeAssistant\frontend
npm install
```

### 5. Start the backend

In the backend terminal:

```powershell
cd C:\Users\kalla\Desktop\knowledgeAssistant\backend
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check:

- API health: <http://127.0.0.1:8000/health>
- Database health: <http://127.0.0.1:8000/health/database>
- Swagger UI: <http://127.0.0.1:8000/docs>

### 6. Start the frontend

In the frontend terminal:

```powershell
cd C:\Users\kalla\Desktop\knowledgeAssistant\frontend
npm run dev
```

Open <http://localhost:5173>.

If Windows reports `WinError 10013` for the backend port, another process is
using or reserving that port. Stop that specific process or run Uvicorn on
another available port and update `frontend\.env` to match.

## Reviewer smoke test

### Authentication

1. Open the frontend and register an employee account.
2. Sign in and confirm that the employee dashboard opens.
3. Sign out.
4. Sign in with the administrator account and confirm that the admin dashboard
   opens.
5. Try opening the other role's URL after signing in. The application should
   redirect to the appropriate access-denied page.

### Policy RAG

1. In the admin dashboard, upload a valid policy PDF.
2. Approve the document.
3. Process the approved document.
4. In the employee dashboard, ask a question whose answer appears in the PDF.
5. Confirm the answer is concise and includes citations.
6. Ask an unrelated question such as “What is meant by quantum computing?”
7. Confirm that the response does not invent a policy answer and can be
   escalated to HR.
8. In the admin escalation inbox, confirm that the original employee question
   is shown.
9. Reply and close the escalation, then confirm the response appears for the
   employee.

### Learning Companion

1. Open **Learning Management** as an administrator.
2. Enter a course title, description, due date, estimated minutes, and a
   training PDF.
3. Create the course.
4. Select an employee and assign the course.
5. Confirm that the assigned employee becomes disabled and is labeled
   **Already assigned**.
6. Sign in as that employee and open **My Learning**.
7. Open the training PDF and generate a summary.
8. Generate the knowledge check, answer all three questions, and submit.
9. Confirm that the score is displayed and completion can be reported.
10. Return to Learning Management and confirm the employee status and score.

## API areas

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Policy documents and RAG

- `POST /admin/documents`
- `GET /admin/documents`
- `PATCH /admin/documents/{document_id}/approve`
- `PATCH /admin/documents/{document_id}/deactivate`
- `DELETE /admin/documents/{document_id}` (deactivated documents only;
  removes the stored PDF, vector chunks, and document record)
- `POST /admin/documents/{document_id}/process`
- `POST /rag/query`

### Conversations and escalations

- `POST /conversations`
- `GET /conversations`
- `GET /conversations/{conversation_id}`
- `POST /conversations/{conversation_id}/questions`
- `DELETE /conversations/{conversation_id}`
- Employee and administrator escalation endpoints are documented in Swagger.

### Learning Companion

- `POST /admin/learning/courses`
- `GET /admin/learning/courses`
- `DELETE /admin/learning/courses/{course_id}` (creator only; removes its
  employee assignments and stored training PDF)
- `GET /admin/learning/employees`
- `POST /admin/learning/courses/{course_id}/assign`
- `GET /admin/learning/assignments`
- `GET /learning/my-courses`
- `GET /learning/assignments/{assignment_id}/document`
- `POST /learning/assignments/{assignment_id}/summary`
- `POST /learning/assignments/{assignment_id}/quiz`
- `POST /learning/assignments/{assignment_id}/quiz/{attempt_id}/submit`
- `POST /learning/assignments/{assignment_id}/complete`

Administrator escalation responses include the originating employee's name,
email address, and user ID so HR can identify who submitted each request.

## Validation commands

Run backend checks from `backend`:

```powershell
uv run pytest
uv run python -m compileall app
```

Run frontend checks from `frontend`:

```powershell
npm run lint
npm test -- --run
npm run build
```

The production build is the most reliable frontend integration check. Some
legacy frontend tests may reflect the earlier dashboard markup and can fail
because of pre-existing accessibility-label assumptions; the backend
regression suite is deterministic and does not require external Groq calls.

## Important local files

```text
backend/
  app/
    routes/                 FastAPI route modules
    services/               RAG, PDF, escalation, and learning services
    models/entities.py      SQLAlchemy entities
    schemas/                Pydantic request/response schemas
    database/               Session, table initialization, admin provisioning
  uploads/documents/        Policy PDF storage
  uploads/learning/         Training PDF storage
  chroma_db/                Persistent approved-policy vector store
  tests/                    Deterministic backend tests

frontend/
  src/
    pages/admin/            Administrator dashboards
    pages/employee/         Employee dashboards
    services/               Axios API clients
    context/                Authentication state and session refresh
    routes/                 Role-protected routes
```

## Security and operational notes

- Use a long random `JWT_SECRET_KEY` outside local development.
- Set `SECURE_COOKIES=true` when the application is served over HTTPS.
- Keep `backend\.env`, uploaded documents, `uploads`, and `chroma_db` out of
  source control when deploying.
- The default local storage is filesystem-based. Production deployments
  should use durable protected storage and a managed PostgreSQL instance.
- AI output is not treated as policy evidence; the source document and
  retrieved citations remain authoritative.
