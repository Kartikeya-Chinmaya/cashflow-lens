from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


class Borrower(Base):
    __tablename__ = "borrowers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    archetype = Column(String, nullable=False)
    ai_explanation = Column(Text, nullable=True)

    cash_flows = relationship("CashFlowRecord", back_populates="borrower", cascade="all, delete-orphan")
    repayments = relationship("RepaymentRecord", back_populates="borrower", cascade="all, delete-orphan")


class CashFlowRecord(Base):
    __tablename__ = "cash_flow_records"

    id = Column(Integer, primary_key=True, index=True)
    borrower_id = Column(Integer, ForeignKey("borrowers.id"), nullable=False)
    year_index = Column(Integer, nullable=False)  # 0 or 1 (which of the 2 years)
    month_index = Column(Integer, nullable=False)  # 1-24, sequential across both years
    calendar_month = Column(Integer, nullable=False)  # 1-12
    income = Column(Float, nullable=False)
    expenses = Column(Float, nullable=False)
    net_flow = Column(Float, nullable=False)

    borrower = relationship("Borrower", back_populates="cash_flows")


class RepaymentRecord(Base):
    __tablename__ = "repayment_records"

    id = Column(Integer, primary_key=True, index=True)
    borrower_id = Column(Integer, ForeignKey("borrowers.id"), nullable=False)
    month_index = Column(Integer, nullable=False)  # 1-24, matches CashFlowRecord.month_index
    due_date = Column(Date, nullable=False)
    amount_due = Column(Float, nullable=False)
    amount_paid = Column(Float, nullable=False)
    paid_date = Column(Date, nullable=True)

    borrower = relationship("Borrower", back_populates="repayments")
