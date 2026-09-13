"""Synthetic borrower data generator for CashFlow Lens.

Generates 24 months (2 seasonal cycles) of income/expense and repayment
history for a handful of borrowers across 3 archetypes, and writes it to
SQLite. Run this once before starting the API.
"""
import random
from datetime import date, timedelta

import numpy as np
from dateutil.relativedelta import relativedelta

from database import Base, engine, SessionLocal
from models import Borrower, CashFlowRecord, RepaymentRecord

N_MONTHS = 24
END_MONTH = date(2026, 9, 1)  # most recent month in the series
START_MONTH = END_MONTH - relativedelta(months=N_MONTHS - 1)


def month_dates():
    return [START_MONTH + relativedelta(months=i) for i in range(N_MONTHS)]


def calendar_month_for(month_idx_1based):
    d = START_MONTH + relativedelta(months=month_idx_1based - 1)
    return d.month


def year_index_for(month_idx_1based):
    return (month_idx_1based - 1) // 12


# ---------------------------------------------------------------------------
# Archetype income/expense generators
# ---------------------------------------------------------------------------

def gen_seasonal_farmer(rng, harvest_months=(4, 10), base_income=8000, spike_mult=3.2):
    incomes = []
    for i in range(1, N_MONTHS + 1):
        cm = calendar_month_for(i)
        noise = rng.normal(0, base_income * 0.05)
        if cm in harvest_months:
            incomes.append(base_income * spike_mult + noise * 2)
        else:
            incomes.append(base_income * 0.55 + noise)
    expenses = [base_income * 0.6 + rng.normal(0, base_income * 0.04) for _ in range(N_MONTHS)]
    return incomes, expenses


def gen_daily_wage_vendor(rng, festival_months=(3, 11), base_income=6000, spike_mult=1.8):
    incomes = []
    dip_months = set(rng.choice(range(1, N_MONTHS + 1), size=2, replace=False))
    for i in range(1, N_MONTHS + 1):
        cm = calendar_month_for(i)
        noise = rng.normal(0, base_income * 0.06)
        val = base_income + noise
        if cm in festival_months:
            val = base_income * spike_mult + noise
        if i in dip_months:
            val *= rng.uniform(0.35, 0.55)
        incomes.append(max(val, base_income * 0.2))
    expenses = [base_income * 0.65 + rng.normal(0, base_income * 0.05) for _ in range(N_MONTHS)]
    return incomes, expenses


def gen_small_shopkeeper(rng, base_income=9000, decline=False, decline_start=16):
    incomes = []
    for i in range(1, N_MONTHS + 1):
        noise = rng.normal(0, base_income * 0.05)
        val = base_income + noise
        if decline and i >= decline_start:
            # sustained decline block starting in months 15-18, persisting to the
            # latest month so the dashboard's "current" classification is
            # Sustained Decline for this borrower
            val = base_income * rng.uniform(0.55, 0.68)
        incomes.append(max(val, 500))
    expenses = [base_income * 0.58 + rng.normal(0, base_income * 0.04) for _ in range(N_MONTHS)]
    return incomes, expenses


ARCHETYPES = {
    "Seasonal Farmer": gen_seasonal_farmer,
    "Daily-Wage Vendor": gen_daily_wage_vendor,
    "Small Shopkeeper": gen_small_shopkeeper,
}

NAMES = {
    "Seasonal Farmer": ["Ramesh Patil", "Sundari Devi", "Gopal Reddy"],
    "Daily-Wage Vendor": ["Kavita Sharma", "Anwar Sheikh", "Lakshmi Nair"],
    "Small Shopkeeper": ["Deepak Mehta", "Farida Khan"],
}


def build_repayments(rng, month_dates_list, net_flows, base_installment):
    """Build a repayment schedule. Miss/partial payments especially around dips."""
    records = []
    # find months where net flow dips notably below the trailing average -> stress points
    trailing_avg = np.convolve(net_flows, np.ones(3) / 3, mode="same")
    for i, d in enumerate(month_dates_list):
        due_date = d + timedelta(days=4)
        amount_due = base_installment
        is_dip = net_flows[i] < trailing_avg[i] * 0.75
        roll = rng.random()
        if is_dip and roll < 0.55:
            amount_paid = 0.0
            paid_date = None
        elif is_dip and roll < 0.8:
            amount_paid = round(amount_due * rng.uniform(0.3, 0.7), 2)
            paid_date = due_date + timedelta(days=int(rng.integers(3, 15)))
        elif roll < 0.05:
            # rare random late/partial even without a dip
            amount_paid = round(amount_due * rng.uniform(0.5, 0.9), 2)
            paid_date = due_date + timedelta(days=int(rng.integers(2, 10)))
        else:
            amount_paid = amount_due
            paid_date = due_date - timedelta(days=int(rng.integers(0, 3)))
        records.append((due_date, amount_due, amount_paid, paid_date))
    return records


def generate_and_store():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    dates_list = month_dates()
    summary_rows = []
    borrower_seed = 0

    for archetype, gen_fn in ARCHETYPES.items():
        instance_names = NAMES[archetype]
        for idx, name in enumerate(instance_names):
            rng = np.random.default_rng(seed=1000 + borrower_seed)
            py_rng = random.Random(1000 + borrower_seed)
            borrower_seed += 1

            if archetype == "Small Shopkeeper":
                incomes, expenses = gen_fn(rng, decline=(idx == 0))
            else:
                incomes, expenses = gen_fn(rng)

            net_flows = [round(inc - exp, 2) for inc, exp in zip(incomes, expenses)]

            borrower = Borrower(name=name, archetype=archetype)
            db.add(borrower)
            db.flush()

            for i in range(1, N_MONTHS + 1):
                cm = calendar_month_for(i)
                yi = year_index_for(i)
                db.add(CashFlowRecord(
                    borrower_id=borrower.id,
                    year_index=yi,
                    month_index=i,
                    calendar_month=cm,
                    income=round(incomes[i - 1], 2),
                    expenses=round(expenses[i - 1], 2),
                    net_flow=net_flows[i - 1],
                ))

            avg_net = float(np.mean(net_flows))
            base_installment = round(max(avg_net * 0.35, 500), 2)
            repayment_rows = build_repayments(rng, dates_list, net_flows, base_installment)
            for i, (due_date, amount_due, amount_paid, paid_date) in enumerate(repayment_rows, start=1):
                db.add(RepaymentRecord(
                    borrower_id=borrower.id,
                    month_index=i,
                    due_date=due_date,
                    amount_due=amount_due,
                    amount_paid=amount_paid,
                    paid_date=paid_date,
                ))

            summary_rows.append({
                "id": borrower.id,
                "name": name,
                "archetype": archetype,
                "avg_income": round(float(np.mean(incomes)), 2),
                "avg_expenses": round(float(np.mean(expenses)), 2),
                "avg_net_flow": round(avg_net, 2),
                "min_net_flow": round(float(np.min(net_flows)), 2),
                "max_net_flow": round(float(np.max(net_flows)), 2),
                "installment": base_installment,
            })

    db.commit()
    db.close()

    print("\n=== CashFlow Lens synthetic data summary ===")
    header = f"{'ID':<4}{'Name':<18}{'Archetype':<20}{'AvgInc':>10}{'AvgExp':>10}{'AvgNet':>10}{'MinNet':>10}{'MaxNet':>10}{'Installment':>12}"
    print(header)
    print("-" * len(header))
    for row in summary_rows:
        print(f"{row['id']:<4}{row['name']:<18}{row['archetype']:<20}{row['avg_income']:>10}{row['avg_expenses']:>10}{row['avg_net_flow']:>10}{row['min_net_flow']:>10}{row['max_net_flow']:>10}{row['installment']:>12}")
    print(f"\nTotal borrowers generated: {len(summary_rows)}")
    print(f"Months per borrower: {N_MONTHS} ({START_MONTH} to {END_MONTH})")


def ensure_seeded():
    """Seed the DB only if it's empty. Safe to call on every cold start —
    generation is deterministic (fixed RNG seeds), so this is idempotent
    and cheap, which is what makes it workable on ephemeral serverless
    filesystems (e.g. Vercel's /tmp).
    """
    from models import Borrower

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        has_data = db.query(Borrower).first() is not None
    finally:
        db.close()
    if not has_data:
        generate_and_store()


if __name__ == "__main__":
    generate_and_store()
