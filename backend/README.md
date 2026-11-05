# Policy Knowledge Assistant Backend

## Local development

The backend uses Python 3.11+, uv, FastAPI, SQLAlchemy, and PostgreSQL.

Create `backend/.env` from `.env.example` and set `DATABASE_URL` to the local
PostgreSQL database connection string.

Install dependencies and run the API:

```powershell
uv sync
uv run uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. Swagger UI is available at
`http://127.0.0.1:8000/docs`.

## Database schema

Phase 3 defines the SQLAlchemy models in `app/models/entities.py`. Create the
initial tables in the configured PostgreSQL database with:

```powershell
uv run python -m app.database.init_db
```

This command creates missing tables and does not delete existing data.

## Authentication

Public registration creates an `EMPLOYEE` account only:

```text
POST /auth/register
```

Log in with `/auth/login` to receive a short-lived bearer access token. The
refresh token is issued as an HttpOnly cookie and can be rotated with
`/auth/refresh`. Use `/auth/logout` to revoke the current refresh token.

Administrator accounts are provisioned locally rather than through public
registration:

```powershell
uv run python -m app.database.create_admin `
  --email admin@example.com `
  --full-name "HR Administrator"
```

Authentication settings, including `JWT_SECRET_KEY`, belong in `backend/.env`.
Use a long random secret and set `SECURE_COOKIES=true` when serving over HTTPS.

## PDF document management

Phase 5 supports PDF uploads through admin-only endpoints:

- `POST /admin/documents`
- `GET /admin/documents`
- `PATCH /admin/documents/{document_id}/approve`
- `PATCH /admin/documents/{document_id}/deactivate`
- `DELETE /admin/documents/{document_id}` (deactivated documents only; removes
  the stored PDF, vector chunks, and document record)

Uploaded files are stored under `uploads/documents` with generated filenames.
The original filename is retained only as metadata. Uploads are limited to
10 MiB by default, must use a `.pdf` filename, and must begin with a PDF
signature. Documents start as `PENDING`; approval and deactivation are
explicit administrator actions. PDF text extraction and indexing are part of
Phase 6.

## PDF processing and retrieval

After an administrator approves a document, process it with:

```text
POST /admin/documents/{document_id}/process
```

Processing extracts text with page numbers, creates overlapping text chunks,
generates normalized Sentence Transformer embeddings, and stores the approved
chunks in the persistent ChromaDB collection
`approved_policy_documents`. The independent retrieval service only queries
chunks marked `APPROVED`.

Deactivating a document removes all of its chunks from ChromaDB before marking
the database record `DEACTIVATED`. Groq generation and answer validation are
not part of this phase.

## Grounded RAG queries

Authenticated employees and administrators can query the approved knowledge
base with:

```text
POST /rag/query
```

The service retrieves only chunks marked `APPROVED`, rejects evidence beyond
the configured `RAG_MAX_DISTANCE`, and sends the remaining evidence to Groq
through LangChain with temperature zero. The response must contain citation
chunk IDs that exactly match retrieved chunks; invalid or unsupported output is
replaced with an uncertainty response that recommends escalation.

Set `GROQ_API_KEY` in `backend/.env` to enable generation. Set `GROQ_MODEL` to a
model available to your Groq key, such as `openai/gpt-oss-20b`. The service
falls back to `GROQ_FALLBACK_MODEL` when the configured model is unavailable. If
the key is absent,
retrieval is empty, the Groq service fails, or citation validation fails, the
API returns an explicit uncertain response instead of inventing an answer.
Conversation and message persistence is implemented in Phase 8.

## Conversations

Authenticated users can create and access only their own conversations:

- `POST /conversations`
- `GET /conversations`
- `GET /conversations/{conversation_id}`
- `POST /conversations/{conversation_id}/questions`

The question endpoint persists the employee question, the grounded assistant
response, uncertainty details, and validated citations in PostgreSQL. A
conversation belonging to another user returns `404` and does not reveal
whether that conversation exists.

## Escalations

Employees can create and view their own unsupported-question tickets:

- `POST /escalations`
- `GET /escalations`
- `GET /escalations/{escalation_id}`

Administrators can manage the escalation inbox:

- `GET /admin/escalations`
- `PATCH /admin/escalations/{escalation_id}/status`
- `POST /admin/escalations/{escalation_id}/responses`
- `GET /admin/escalations/audit-logs`

Valid status progression is `PENDING` to `IN_REVIEW`, then `RESPONDED`, and
finally `CLOSED`. Important creation, status, and response actions are
recorded in `audit_logs`. Employee-owned records are protected by the
authenticated user identity.

## Backend tests

Run the focused backend test suite from `backend/`:

```powershell
uv run pytest tests -q
```

The tests cover password/JWT behavior, authentication and role protection,
PDF upload validation, grounded citation validation, conversation ownership,
escalation status rules, and escalation ownership isolation. External Groq
generation and embedding calls are not required for the deterministic tests.

## AI Learning Companion

The additive learning feature keeps training PDFs under `uploads/learning`
and never indexes them in the policy ChromaDB collection. Administrators can
create courses, list active employees, assign courses, and monitor assignments
through:

- `POST /admin/learning/courses`
- `GET /admin/learning/courses`
- `DELETE /admin/learning/courses/{course_id}` (the creating administrator
  only; also removes assignments and the stored training PDF)
- `GET /admin/learning/employees`
- `POST /admin/learning/courses/{course_id}/assign`
- `GET /admin/learning/assignments`

Employees can access only their own assignments through:

- `GET /learning/my-courses`
- `GET /learning/assignments/{assignment_id}/document`
- `POST /learning/assignments/{assignment_id}/summary`
- `POST /learning/assignments/{assignment_id}/quiz`
- `POST /learning/assignments/{assignment_id}/quiz/{attempt_id}/submit`
- `POST /learning/assignments/{assignment_id}/complete`

Administrator escalation responses include the employee identity associated
with each request (`full_name`, `email`, and `id`).

Run `uv run python -m app.database.init_db` after pulling the learning
backend changes. It creates only missing additive tables:
`learning_courses`, `course_assignments`, and `learning_quiz_attempts`.