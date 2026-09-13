# CashFlow Lens

A microfinance repayment affordability prototype: rule-based cash-flow shape
classification and stress scoring for borrowers, with an AI layer that only
phrases the results in plain English for a loan officer (never decides the
score, shape, or recommendation).

Monolith repo, no auth, built for a fast local demo:

- `backend/` — FastAPI + SQLite (SQLAlchemy) + pandas/numpy
- `frontend/` — React + Vite + Tailwind CSS + Recharts

## Backend setup

```
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python data_gen.py           # generates synthetic borrowers into cashflow_lens.db
uvicorn main:app --port 8000
```

The API runs at `http://127.0.0.1:8000`. Re-run `data_gen.py` any time to
reset the database with a fresh synthetic dataset (it drops and recreates
all tables).

Copy `.env.example` to `.env` and set `GROQ_API_KEY` if you need to rotate
the key — a working key ships in `backend/.env` already for this demo.

## Frontend setup

```
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. The backend must be running on port 8000
(CORS is configured for `localhost:5173`).

## What's in the demo

- **Dashboard** — all borrowers with stress bucket (stamp badge) and current
  cash-flow shape.
- **Borrower detail** — 24-month net cash flow vs. baseline chart (flagged
  months shaded), the raw evidence breakdown, an AI-generated plain-English
  summary (cached in the DB, with a button to regenerate live), and a
  before/after repayment schedule based on the restructuring decision table.

Borrower #7 (Deepak Mehta, Small Shopkeeper) carries a deliberate sustained
decline and is the High-risk walkthrough example.

## Notes

- `backend/logic.py` is pure rule-based classification/scoring — no ML or
  LLM calls. Run it directly (`python logic.py`) to print a classification
  sanity check against the generated data.
- `backend/explain.py` calls the Groq chat completions API
  (`openai/gpt-oss-20b` — the fast/small model the spec's
  `llama-3.1-8b-instant` was retired in favor of on Groq's current model
  list) purely to narrate the structured breakdown.
