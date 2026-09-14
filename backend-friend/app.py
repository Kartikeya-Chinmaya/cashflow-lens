from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from pipeline import analyze_borrower,df
from llm_explainer import explain_borrower

# In-memory cache so repeated dashboard/detail loads for the same
# borrower don't re-call Groq every time; refresh-explanation bypasses
# this deliberately.
_explanation_cache = {}


def get_cached_explanation(borrower_id, result):
    if borrower_id not in _explanation_cache:
        _explanation_cache[borrower_id] = explain_borrower(result)
    return _explanation_cache[borrower_id]


# =========================================================
# RESPONSE MODEL
# =========================================================

class BorrowerAnalysisResponse(BaseModel):
    borrower_id: str
    currency: str
    currency_symbol: str
    pattern: str
    stress_score: int
    forecast: list[int]
    recommendation: str
    suggested_payment: int
    reason: str
    forecast_status: str
    explanation: str


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="Adaptive Repayment Planner API",
    description="AI-powered microfinance repayment planning system",
    version="1.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DEMO BORROWERS
# =========================================================

BORROWERS = {
    "B001": {
        "name": "Borrower B001",
        "archetype": "Stable income profile"
    },
    "B002": {
        "name": "Borrower B002",
        "archetype": "Seasonal income profile"
    },
    "B003": {
        "name": "Borrower B003",
        "archetype": "Deteriorating income profile"
    }
}


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():
    return {
        "message": "Adaptive Repayment Planner API is running"
    }


# =========================================================
# ORIGINAL ANALYSIS ENDPOINT
# =========================================================

@app.get(
    "/analyze/{borrower_id}",
    response_model=BorrowerAnalysisResponse
)
def analyze(borrower_id: str):

    result = analyze_borrower(borrower_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Borrower not found"
        )

    try:
        explanation = explain_borrower(result)
        result["explanation"] = explanation

    except Exception as e:
        result["explanation"] = "AI explanation unavailable."
        print("Groq error:", e)

    return result


# =========================================================
# FRONTEND: LIST BORROWERS
# =========================================================

@app.get("/api/borrowers")
def list_borrowers():

    borrowers = []

    for borrower_id, info in BORROWERS.items():

        result = analyze_borrower(borrower_id)

        if result is None:
            continue

        score = result["stress_score"]

        if score < 30:
            bucket = "Low"
        elif score < 60:
            bucket = "Medium"
        else:
            bucket = "High"

        borrowers.append({
            "id": borrower_id,
            "name": info["name"],
            "archetype": info["archetype"],
            "stress_score": score,
            "bucket": bucket,
            "latest_shape": result["pattern"],
            "provisional": False
        })

    return borrowers


# =========================================================
# FRONTEND: BORROWER DETAIL
# =========================================================

@app.get("/api/borrowers/{borrower_id}")
def get_borrower_detail(borrower_id: str):

    result = analyze_borrower(borrower_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Borrower not found")

    borrower = df[df["borrower_id"] == borrower_id].sort_values("month").copy()

    classification = result["pattern"]

    shape_map = {
        "Stable": "STABLE",
        "Seasonal": "SEASONAL_DIP",
        "Deteriorating": "SUSTAINED_DECLINE"
    }

    detected_shape = shape_map.get(classification, "STABLE")

    # Historical 18-month data
    historical_months = []

    for _, row in borrower.iterrows():

        month_number = int(row["month"])

        calendar_month = ((month_number - 1) % 12) + 1
        year_index = (month_number - 1) // 12

        # Baseline:
        # for months that have a previous-year equivalent,
        # use that previous-year cash flow.
        previous_year_month = month_number - 12

        previous = borrower[
            borrower["month"] == previous_year_month
        ]

        if not previous.empty:
            baseline = float(previous["cash_flow"].iloc[0])
        else:
            baseline = float(borrower["cash_flow"].mean())

        historical_months.append({
            "month_index": month_number,
            "calendar_month": calendar_month,
            "year_index": year_index,
            "net_flow": round(float(row["cash_flow"])),
            "baseline": round(baseline),
            "shape": detected_shape,
            "provisional": False,
            "deviation_pct": 0
        })

    # Add the 3 forecast months
    last_month = int(borrower["month"].max())

    forecast_months = []

    for i, prediction in enumerate(result["forecast"], start=1):

        month_number = last_month + i

        calendar_month = ((month_number - 1) % 12) + 1
        year_index = (month_number - 1) // 12

        forecast_months.append({
            "month_index": month_number,
            "calendar_month": calendar_month,
            "year_index": year_index,
            "net_flow": int(prediction),
            "baseline": 0,
            "shape": "FORECAST",
            "provisional": True,
            "deviation_pct": 0
        })

    months = historical_months + forecast_months

    # Calculate recent evidence
    recent = borrower.tail(3)

    missed_payments = int(recent["missed_payment"].sum())

    partial_payments = int(
        (
            (recent["repayment"] > 0)
            & (recent["repayment"] < borrower["repayment"].iloc[-1])
        ).sum()
    )

    current_installment = int(borrower["repayment"].iloc[-1])

    return {
        "id": result["borrower_id"],
        "name": BORROWERS[borrower_id]["name"],
        "archetype": BORROWERS[borrower_id]["archetype"],

        "currency": result["currency"],
        "currency_symbol": result["currency_symbol"],

        "months": months,

        "score_breakdown": {
            "score": result["stress_score"],
            "bucket": (
                "High"
                if result["stress_score"] >= 60
                else "Medium"
                if result["stress_score"] >= 30
                else "Low"
            ),
            "missed_payments": missed_payments,
            "partial_payments": partial_payments
        },

        "recommendation": result["recommendation"],
        "suggested_payment": result["suggested_payment"],
        "reason": result["reason"],
        "forecast_status": result["forecast_status"],

        "current_installment": current_installment,

        "ai_explanation": get_cached_explanation(borrower_id, result)
    }# =========================================================
# FRONTEND: REFRESH AI EXPLANATION
# =========================================================

@app.post("/api/borrowers/{borrower_id}/refresh-explanation")
def refresh_explanation(borrower_id: str):

    result = analyze_borrower(borrower_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Borrower not found"
        )

    explanation = explain_borrower(result)
    _explanation_cache[borrower_id] = explanation

    return {
        "ai_explanation": explanation
    }


# =========================================================
# AI EXPLANATION HELPER
# =========================================================

def get_explanation(result):

    try:
        return explain_borrower(result)

    except Exception as e:

        print("Groq error:", e)

        return "AI explanation unavailable."