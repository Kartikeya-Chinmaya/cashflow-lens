from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from data_gen import ensure_seeded
from database import SessionLocal
from models import Borrower, CashFlowRecord, RepaymentRecord
from logic import analyze_borrower
from explain import build_breakdown_payload, generate_explanation

ensure_seeded()

app = FastAPI(title="CashFlow Lens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


def get_db_session():
    return SessionLocal()


def _load_borrower_analysis(db: Session, borrower: Borrower):
    cf = (
        db.query(CashFlowRecord)
        .filter_by(borrower_id=borrower.id)
        .order_by(CashFlowRecord.month_index)
        .all()
    )
    rp = (
        db.query(RepaymentRecord)
        .filter_by(borrower_id=borrower.id)
        .order_by(RepaymentRecord.month_index)
        .all()
    )
    cf_dicts = [
        {
            "month_index": r.month_index,
            "calendar_month": r.calendar_month,
            "year_index": r.year_index,
            "net_flow": r.net_flow,
            "income": r.income,
            "expenses": r.expenses,
        }
        for r in cf
    ]
    rp_dicts = [
        {
            "month_index": r.month_index,
            "due_date": r.due_date.isoformat(),
            "amount_due": r.amount_due,
            "amount_paid": r.amount_paid,
            "paid_date": r.paid_date.isoformat() if r.paid_date else None,
        }
        for r in rp
    ]
    result = analyze_borrower(cf_dicts, rp_dicts)
    return result, rp_dicts


@api.get("/borrowers")
def list_borrowers():
    db = get_db_session()
    try:
        borrowers = db.query(Borrower).all()
        out = []
        for b in borrowers:
            result, _ = _load_borrower_analysis(db, b)
            out.append({
                "id": b.id,
                "name": b.name,
                "archetype": b.archetype,
                "stress_score": result["score_breakdown"]["score"],
                "bucket": result["score_breakdown"]["bucket"],
                "latest_shape": result["latest_month"]["shape"],
                "provisional": result["latest_month"]["provisional"],
            })
        return out
    finally:
        db.close()


@api.get("/borrowers/{borrower_id}")
def get_borrower_detail(borrower_id: int):
    db = get_db_session()
    try:
        borrower = db.query(Borrower).filter_by(id=borrower_id).first()
        if not borrower:
            raise HTTPException(status_code=404, detail="Borrower not found")

        result, rp_dicts = _load_borrower_analysis(db, borrower)
        score_breakdown = result["score_breakdown"]
        recommendation = result["recommendation"]
        latest_month = result["latest_month"]

        if not borrower.ai_explanation:
            payload = build_breakdown_payload(
                borrower.name, borrower.archetype, latest_month, score_breakdown, recommendation
            )
            explanation = generate_explanation(payload)
            borrower.ai_explanation = explanation
            db.add(borrower)
            db.commit()

        installment = rp_dicts[-1]["amount_due"] if rp_dicts else 0

        return {
            "id": borrower.id,
            "name": borrower.name,
            "archetype": borrower.archetype,
            "months": result["months"],
            "score_breakdown": score_breakdown,
            "recommendation": recommendation,
            "ai_explanation": borrower.ai_explanation,
            "repayments": rp_dicts,
            "current_installment": installment,
        }
    finally:
        db.close()


@api.post("/borrowers/{borrower_id}/refresh-explanation")
def refresh_explanation(borrower_id: int):
    db = get_db_session()
    try:
        borrower = db.query(Borrower).filter_by(id=borrower_id).first()
        if not borrower:
            raise HTTPException(status_code=404, detail="Borrower not found")

        result, _ = _load_borrower_analysis(db, borrower)
        payload = build_breakdown_payload(
            borrower.name,
            borrower.archetype,
            result["latest_month"],
            result["score_breakdown"],
            result["recommendation"],
        )
        explanation = generate_explanation(payload)
        borrower.ai_explanation = explanation
        db.add(borrower)
        db.commit()

        return {"ai_explanation": explanation}
    finally:
        db.close()


app.include_router(api)
