import os

import pandas as pd
import numpy as np


# =========================================================
# LOAD DATA
# =========================================================

# Resolved relative to this file, not the process's working directory,
# so this loads correctly whether run locally (uvicorn from this folder)
# or from Vercel's serverless function (different cwd).
_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "borrowers.csv")
df = pd.read_csv(_DATA_PATH)
CURRENCY_SYMBOLS = {
    "INR": "₹",
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "JPY": "¥",
    "AED": "د.إ",
    "SGD": "S$"
}


# =========================================================
# CLASSIFY BORROWER
# =========================================================

def classify_borrower(borrower):

    borrower = borrower.sort_values("month")

    months = borrower["month"].values
    income = borrower["income"].values

    # Income trend
    slope = np.polyfit(months, income, 1)[0]
    average_income = income.mean()

    normalized_slope = slope / average_income

    # Early vs recent income
    early_income = income[:6].mean()
    recent_income = income[-6:].mean()

    income_change = (
        (recent_income - early_income)
        / early_income
    ) * 100

    # Seasonal pattern
    sin_pattern = np.sin(2 * np.pi * months / 12)
    cos_pattern = np.cos(2 * np.pi * months / 12)

    sin_corr = np.corrcoef(income, sin_pattern)[0, 1]
    cos_corr = np.corrcoef(income, cos_pattern)[0, 1]

    seasonal_strength = np.sqrt(
        sin_corr ** 2 + cos_corr ** 2
    )

    # Classification
    if (
        seasonal_strength >= 0.55
        and income_change > -20
    ):
        classification = "Seasonal"

    elif (
        income_change <= -20
        or normalized_slope < -0.015
    ):
        classification = "Deteriorating"

    else:
        classification = "Stable"

    return classification


# =========================================================
# CALCULATE STRESS SCORE
# =========================================================

def calculate_stress(borrower):

    borrower = borrower.sort_values("month")

    income = borrower["income"].values

    early_income = income[:6].mean()
    recent_income = income[-6:].mean()

    income_change = (
        (recent_income - early_income)
        / early_income
    ) * 100

    missed_payments = borrower["missed_payment"].sum()

    total_delay_days = borrower["payment_delay_days"].sum()

    repayment_burden = (
        borrower["repayment_burden"].mean()
    )

    recent_cash_flow = (
        borrower["cash_flow"].tail(3).mean()
    )

    score = 0

    # Income decline
    if income_change < 0:
        score += min(abs(income_change), 30)

    # Missed payments
    score += min(missed_payments * 5, 25)

    # Delays
    score += min(total_delay_days * 0.15, 15)

    # Repayment burden
    if repayment_burden > 0.30:
        score += 20

    elif repayment_burden > 0.20:
        score += 10

    # Negative recent cash flow
    if recent_cash_flow < 0:
        score += 20

    return min(round(score), 100)



# =========================================================
# FORECAST CASH FLOW
# =========================================================

# =========================================================
# FORECAST CASH FLOW
# =========================================================

# =========================================================
# FORECAST CASH FLOW
# =========================================================

# =========================================================
# FORECAST CASH FLOW
# =========================================================

def forecast_cash_flow(
    borrower,
    future_months=3,
    classification=None
):

    borrower = borrower.sort_values("month")

    months = borrower["month"].values
    cash_flow = borrower["cash_flow"].values

    last_month = months[-1]

    future = np.arange(
        last_month + 1,
        last_month + future_months + 1
    )

    # -----------------------------------------------------
    # SEASONAL FORECAST
    # -----------------------------------------------------

    if classification == "Seasonal":

        predictions = []

        for future_month in future:

            # Same position in the previous 12-month cycle
            reference_month = future_month - 12

            matching_rows = borrower[
                borrower["month"] == reference_month
            ]

            if not matching_rows.empty:

                prediction = matching_rows[
                    "cash_flow"
                ].iloc[0]

            else:

                prediction = cash_flow.mean()

            predictions.append(prediction)

        return np.array(predictions)


    # -----------------------------------------------------
    # TREND FORECAST
    # -----------------------------------------------------

    else:

        slope, intercept = np.polyfit(
            months,
            cash_flow,
            1
        )

        predictions = (
            slope * future
            + intercept
        )

        return predictions
# =========================================================
# REPAYMENT RECOMMENDATION
# =========================================================

def generate_recommendation(
    borrower,
    classification,
    stress_score,
    forecast
):

    current_repayment = borrower["repayment"].iloc[-1]

    missed_payments = borrower["missed_payment"].sum()

    total_delay_days = borrower["payment_delay_days"].sum()

    recent_cash_flow = (
        borrower["cash_flow"].tail(3).mean()
    )

    # -----------------------------------------------------
    # LOW STRESS
    # -----------------------------------------------------

    if stress_score < 30:

        # Seasonal borrowers with payment history issues
        if (
            classification == "Seasonal"
            and (
                missed_payments > 0
                or total_delay_days > 0
            )
        ):

            action = "Shift repayment timing"

            reason = (
                "The borrower shows a seasonal income pattern "
                "and some repayment delays. Aligning the payment "
                "date with stronger income periods may reduce stress."
            )

            suggested_payment = current_repayment

        else:

            action = "Continue normal repayment"

            reason = (
                "The borrower shows manageable financial stress "
                "and sufficient recent cash flow."
            )

            suggested_payment = current_repayment


    # -----------------------------------------------------
    # MODERATE STRESS
    # -----------------------------------------------------

    elif stress_score < 60:

        action = "Consider flexible repayment"

        reason = (
            "Financial stress is increasing. The lender should "
            "monitor the borrower and consider a more flexible "
            "repayment schedule."
        )

        suggested_payment = round(
            current_repayment * 0.85
        )


    # -----------------------------------------------------
    # HIGH STRESS
    # -----------------------------------------------------

    else:

        action = "Consider repayment restructuring"

        reason = (
            "The borrower shows significant repayment stress "
            "and worsening financial conditions. A revised "
            "repayment structure may improve sustainable recovery."
        )

        suggested_payment = round(
            current_repayment * 0.70
        )


    # -----------------------------------------------------
    # FORECAST STATUS
    # -----------------------------------------------------

    if np.any(forecast < 0):

        forecast_status = "Negative future cash flow expected"

    else:

        forecast_status = "Positive future cash flow expected"


    return {
        "action": action,
        "reason": reason,
        "suggested_payment": int(suggested_payment),
        "forecast_status": forecast_status
    }


# =========================================================
# COMPLETE BORROWER ANALYSIS
# =========================================================

def analyze_borrower(borrower_id):

    borrower = df[
        df["borrower_id"] == borrower_id
    ].copy()

    if borrower.empty:
        return None

    # Pattern
    classification = classify_borrower(
        borrower
    )

    # Stress
    stress_score = calculate_stress(
        borrower
    )

    # Forecast
    forecast = forecast_cash_flow(
        borrower,
        classification=classification
    )

    # Recommendation
    recommendation = generate_recommendation(
        borrower,
        classification,
        stress_score,
        forecast
    )

    # Create structured result
    result = {
        "borrower_id": borrower_id,
        "currency": borrower["currency"].iloc[0],
    "currency_symbol": CURRENCY_SYMBOLS.get(
        borrower["currency"].iloc[0],
        borrower["currency"].iloc[0]
    ),
        "pattern": classification,
        "stress_score": stress_score,
        "forecast": [
            round(value)
            for value in forecast
        ],
        "recommendation": recommendation["action"],
        "suggested_payment": recommendation[
            "suggested_payment"
        ],
        "reason": recommendation["reason"],
        "forecast_status": recommendation[
            "forecast_status"
        ]
    }

    return result


# =========================================================
# RUN PIPELINE
# =========================================================

if __name__ == "__main__":

    print("======================================")
    print("COMPLETE AI PIPELINE")

    for borrower_id in ["B001", "B002", "B003"]:
        result = analyze_borrower(borrower_id)

        print("\nBorrower:", borrower_id)
        print("Pattern:", result["pattern"])
        print("Stress Score:", result["stress_score"])
        print(
            "Suggested payment:",
            result["currency_symbol"],
            result["suggested_payment"]
        )

    print("\nPIPELINE COMPLETE")