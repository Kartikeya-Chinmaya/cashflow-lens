import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Vercel's serverless filesystem is read-only except /tmp. Locally we keep
# the DB file next to the code for easy inspection.
if os.environ.get("VERCEL"):
    DB_PATH = "/tmp/cashflow_lens.db"
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "cashflow_lens.db")

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
