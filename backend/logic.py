"""Rule-based cash-flow shape classification, stress scoring, and
restructuring recommendations. No ML / no LLM in this file.
"""
from datetime import date


def compute_baselines(months):
    """months: list of dicts sorted by month_index ascending, each with
    keys month_index, calendar_month, net_flow.
    Returns the same list of dicts with 'baseline' and 'deviation_pct' added.

    "2+ prior years of data" is interpreted at the borrower-year level: once
    a borrower's history has completed at least one full prior 12-month
    cycle (i.e. the current month falls in year 2 or later), the baseline
    for a given calendar month is the average of that borrower's own net
    cash flow for that same calendar month across all completed prior
    years. Within the borrower's first 12 months (cold start, no prior
    cycle yet), baseline falls back to the trailing 3-month rolling
    average.
    """
    by_calendar_month = {}
    for m in months:
        by_calendar_month.setdefault(m["calendar_month"], []).append(m)

    for i, m in enumerate(months):
        cm = m["calendar_month"]
        year_idx = (m["month_index"] - 1) // 12

        if year_idx >= 1:
            prior_years_same_month = [
                x for x in by_calendar_month[cm]
                if (x["month_index"] - 1) // 12 < year_idx
            ]
        else:
            prior_years_same_month = []

        if prior_years_same_month:
            baseline = sum(x["net_flow"] for x in prior_years_same_month) / len(prior_years_same_month)
        else:
            window = [x["net_flow"] for x in months[max(0, i - 3):i]]
            baseline = sum(window) / len(window) if window else m["net_flow"]

        m["baseline"] = round(baseline, 2)
        if baseline != 0:
            m["deviation_pct"] = round((m["net_flow"] - baseline) / baseline * 100, 2)
        else:
            m["deviation_pct"] = 0.0

    return months


def _has_seasonal_precedent(months, idx, tolerance=10):
    """Does this calendar month have a prior-cycle deviation_pct within
    `tolerance` percentage points of the current one?"""
    current = months[idx]
    cm = current["calendar_month"]
    prior_same_month = [
        x for x in months[:idx]
        if x["calendar_month"] == cm and x.get("deviation_pct") is not None
    ]
    for x in prior_same_month:
        if abs(x["deviation_pct"] - current["deviation_pct"]) <= tolerance:
            return True
    return False


def classify_shapes(months):
    """months: output of compute_baselines, sorted ascending by month_index.
    Returns the same list with 'shape' and 'provisional' (bool) added per month.
    """
    for i, m in enumerate(months):
        m["shape"] = "STABLE"
        m["provisional"] = False

    for i, m in enumerate(months):
        dev = m["deviation_pct"]

        # Rule 1: SUSTAINED_DECLINE — 3+ consecutive months dev <= -10, no seasonal precedent
        if dev <= -10:
            run_start = i
            while run_start > 0 and months[run_start - 1]["deviation_pct"] <= -10:
                run_start -= 1
            run_len = i - run_start + 1
            if run_len >= 3 and not _has_seasonal_precedent(months, i):
                m["shape"] = "SUSTAINED_DECLINE"
                continue

        # Rule 2: SEASONAL_DIP — dev <= -15 this month AND seasonal precedent exists
        if dev <= -15 and _has_seasonal_precedent(months, i):
            m["shape"] = "SEASONAL_DIP"
            continue

        # Rule 3: ISOLATED_SHOCK — dev <= -25, no seasonal precedent, not part of 3+ month run
        if dev <= -25 and not _has_seasonal_precedent(months, i):
            run_start = i
            while run_start > 0 and months[run_start - 1]["deviation_pct"] <= -10:
                run_start -= 1
            run_len = i - run_start + 1
            if run_len < 3:
                m["shape"] = "ISOLATED_SHOCK"
                if i == len(months) - 1:
                    m["provisional"] = True
                continue

        m["shape"] = "STABLE"

    return months


def compute_stress_score(latest_shape, repayments_trailing_3mo):
    """repayments_trailing_3mo: list of dicts with amount_due, amount_paid, due_date, paid_date."""
    base_points = {
        "STABLE": 0,
        "SEASONAL_DIP": 10,
        "ISOLATED_SHOCK": 20,
        "SUSTAINED_DECLINE": 60,
    }
    score = base_points.get(latest_shape, 0)

    missed = 0
    partial = 0
    for r in repayments_trailing_3mo:
        if r["amount_paid"] == 0:
            missed += 1
        elif 0 < r["amount_paid"] < r["amount_due"]:
            partial += 1

    missed_points = min(missed * 15, 30)
    partial_points = min(partial * 5, 20)
    score += missed_points + partial_points
    score = min(score, 100)

    if score <= 30:
        bucket = "Low"
    elif score <= 60:
        bucket = "Medium"
    else:
        bucket = "High"

    return {
        "score": score,
        "bucket": bucket,
        "missed_payments": missed,
        "partial_payments": partial,
        "missed_points": missed_points,
        "partial_points": partial_points,
        "base_points": base_points.get(latest_shape, 0),
    }


def get_recommendation(bucket, shape):
    if bucket == "Low":
        return "No action needed — continue monitoring"
    if bucket == "Medium" and shape in ("SEASONAL_DIP", "ISOLATED_SHOCK"):
        return "Shift due date by 30 days to align with next income peak, no change to installment amount"
    if bucket == "Medium" and shape == "SUSTAINED_DECLINE":
        return "Reduce installment by 20%, extend tenure proportionally"
    if bucket == "High":
        return "Grant 1-installment grace period, then reduce installment by 30-40% and extend tenure; flag for lender manual review"
    return "No action needed — continue monitoring"


def analyze_borrower(cash_flow_records, repayment_records):
    """cash_flow_records / repayment_records: lists of dicts (already sorted
    by month_index ascending). Returns full analysis breakdown.
    """
    months = [
        {
            "month_index": r["month_index"],
            "calendar_month": r["calendar_month"],
            "year_index": r.get("year_index", (r["month_index"] - 1) // 12),
            "net_flow": r["net_flow"],
            "income": r["income"],
            "expenses": r["expenses"],
        }
        for r in cash_flow_records
    ]
    months = compute_baselines(months)
    months = classify_shapes(months)

    latest = months[-1]
    latest_shape = latest["shape"]

    max_month_index = latest["month_index"]
    trailing_3mo = [r for r in repayment_records if r["month_index"] > max_month_index - 3]

    score_breakdown = compute_stress_score(latest_shape, trailing_3mo)
    recommendation = get_recommendation(score_breakdown["bucket"], latest_shape)

    return {
        "months": months,
        "latest_month": latest,
        "score_breakdown": score_breakdown,
        "recommendation": recommendation,
    }


if __name__ == "__main__":
    # Quick sanity check against generated data
    import sys
    from database import SessionLocal
    from models import Borrower, CashFlowRecord, RepaymentRecord

    db = SessionLocal()
    borrowers = db.query(Borrower).all()
    for b in borrowers:
        cf = db.query(CashFlowRecord).filter_by(borrower_id=b.id).order_by(CashFlowRecord.month_index).all()
        rp = db.query(RepaymentRecord).filter_by(borrower_id=b.id).order_by(RepaymentRecord.month_index).all()
        cf_dicts = [{"month_index": r.month_index, "calendar_month": r.calendar_month, "net_flow": r.net_flow, "income": r.income, "expenses": r.expenses} for r in cf]
        rp_dicts = [{"month_index": r.month_index, "amount_due": r.amount_due, "amount_paid": r.amount_paid, "due_date": r.due_date, "paid_date": r.paid_date} for r in rp]
        result = analyze_borrower(cf_dicts, rp_dicts)
        print(f"\n--- {b.name} ({b.archetype}) ---")
        print(f"Latest shape: {result['latest_month']['shape']} (provisional={result['latest_month']['provisional']}) dev={result['latest_month']['deviation_pct']}%")
        print(f"Stress score: {result['score_breakdown']}")
        print(f"Recommendation: {result['recommendation']}")
        shapes_seen = set(m["shape"] for m in result["months"])
        print(f"Shapes seen across history: {shapes_seen}")
    db.close()
