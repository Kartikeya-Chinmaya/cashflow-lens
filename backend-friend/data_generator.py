import pandas as pd
import numpy as np
import os

# Reproducible random values
np.random.seed(42)

# Number of months
MONTHS = 18

# Create data folder
os.makedirs("data", exist_ok=True)

records = []


def gen_stable(borrower_id, base_income, income_noise, base_expenses, expenses_noise, repayment):
    for month in range(1, MONTHS + 1):
        income = np.random.normal(base_income, income_noise)
        expenses = np.random.normal(base_expenses, expenses_noise)
        records.append({
            "borrower_id": borrower_id,
            "month": month,
            "type": "stable",
            "income": round(income),
            "expenses": round(expenses),
            "repayment": repayment,
            "payment_delay_days": 0,
            "missed_payment": 0,
            "currency": "INR",
        })


def gen_seasonal(borrower_id, base_income, income_noise, base_expenses, expenses_noise, repayment, seasonal_amplitude=0.30, dip_threshold_frac=0.875):
    dip_threshold = base_income * dip_threshold_frac
    for month in range(1, MONTHS + 1):
        seasonal_factor = 1 + seasonal_amplitude * np.sin((month / 12) * 2 * np.pi)
        income = base_income * seasonal_factor + np.random.normal(0, income_noise)
        expenses = np.random.normal(base_expenses, expenses_noise)

        if income < dip_threshold:
            payment_delay_days = np.random.choice([0, 3, 5])
        else:
            payment_delay_days = 0

        missed_payment = 1 if payment_delay_days >= 10 else 0

        records.append({
            "borrower_id": borrower_id,
            "month": month,
            "type": "seasonal",
            "income": round(income),
            "expenses": round(expenses),
            "repayment": repayment,
            "payment_delay_days": payment_delay_days,
            "missed_payment": missed_payment,
            "currency": "INR",
        })


def gen_deteriorating(borrower_id, start_income, income_decline_per_month, start_expenses, expenses_growth_per_month, repayment):
    for month in range(1, MONTHS + 1):
        income = start_income - (month * income_decline_per_month) + np.random.normal(0, 1000)
        expenses = start_expenses + (month * expenses_growth_per_month) + np.random.normal(0, 800)

        if month <= 6:
            payment_delay_days = np.random.choice([0, 0, 2])
            missed_payment = 0
        elif month <= 12:
            payment_delay_days = np.random.choice([2, 5, 10])
            missed_payment = 1 if payment_delay_days >= 10 else 0
        else:
            payment_delay_days = np.random.choice([5, 10, 15, 20])
            missed_payment = 1 if payment_delay_days >= 10 else 0

        records.append({
            "borrower_id": borrower_id,
            "month": month,
            "type": "deteriorating",
            "income": round(income),
            "expenses": round(expenses),
            "repayment": repayment,
            "payment_delay_days": payment_delay_days,
            "missed_payment": missed_payment,
            "currency": "INR",
        })


# =========================================================
# ORIGINAL 3 BORROWERS — same generation order/params as the
# original data_generator.py, so B001-B003 reproduce identically
# with the same np.random.seed(42) start.
# =========================================================

gen_stable("B001", base_income=25000, income_noise=1500, base_expenses=15000, expenses_noise=1000, repayment=5000)
gen_seasonal("B002", base_income=24000, income_noise=800, base_expenses=13500, expenses_noise=700, repayment=4500)
gen_deteriorating("B003", start_income=28000, income_decline_per_month=700, start_expenses=14000, expenses_growth_per_month=500, repayment=6000)


# =========================================================
# ADDITIONAL 7 BORROWERS — same three archetypes, varied
# parameters so the dashboard has a realistic-sized portfolio.
# =========================================================

# Stable
gen_stable("B004", base_income=32000, income_noise=1800, base_expenses=19000, expenses_noise=1200, repayment=6500)
gen_stable("B005", base_income=21000, income_noise=1200, base_expenses=13000, expenses_noise=900, repayment=4000)

# Seasonal
gen_seasonal("B006", base_income=27000, income_noise=900, base_expenses=15000, expenses_noise=800, repayment=5200, seasonal_amplitude=0.35)
gen_seasonal("B007", base_income=19000, income_noise=700, base_expenses=11000, expenses_noise=600, repayment=3600, seasonal_amplitude=0.25)
gen_seasonal("B008", base_income=30000, income_noise=1000, base_expenses=17000, expenses_noise=900, repayment=6000, seasonal_amplitude=0.40)

# Deteriorating
gen_deteriorating("B009", start_income=22000, income_decline_per_month=550, start_expenses=11500, expenses_growth_per_month=400, repayment=4800)
gen_deteriorating("B010", start_income=34000, income_decline_per_month=900, start_expenses=17000, expenses_growth_per_month=650, repayment=7200)


# =========================================================
# CREATE DATAFRAME
# =========================================================

df = pd.DataFrame(records)

# Calculate money left after expenses and repayment
df["cash_flow"] = (
    df["income"]
    - df["expenses"]
    - df["repayment"]
)

# Calculate repayment burden
df["repayment_burden"] = (
    df["repayment"] / df["income"]
)

# Save dataset
file_path = "data/borrowers.csv"

df.to_csv(file_path, index=False)

print("======================================")
print("Synthetic borrower data generated!")
print("======================================")
print(f"Total records: {len(df)}")
print(f"Saved to: {file_path}")
print()

print("Borrowers:")
print(df["borrower_id"].unique())

print()
print("Records per borrower:")
print(df["borrower_id"].value_counts())
