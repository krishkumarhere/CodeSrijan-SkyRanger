# app/core/database.py
# SQLAlchemy setup — connection, session, base model

from sqlalchemy import create_engine, Column, Integer, Float, Boolean, DateTime, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./skyranger.db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# ── Tables ────────────────────────────────────────────────────────────

class SensorReading(Base):
    """One row = one sensor snapshot every 2 seconds"""
    __tablename__ = "sensor_readings"

    id          = Column(Integer, primary_key=True, index=True)
    timestamp   = Column(DateTime, default=datetime.utcnow, index=True)
    temperature = Column(Float, nullable=True)
    humidity    = Column(Float, nullable=True)
    vibration   = Column(Boolean, default=False)
    motion      = Column(Boolean, default=False)
    vib_alarm   = Column(Boolean, default=False)
    pir_alarm   = Column(Boolean, default=False)

class TelemetryReading(Base):
    """One row = telemetry snapshot every 5 seconds (downsampled)"""
    __tablename__ = "telemetry_readings"

    id                = Column(Integer, primary_key=True, index=True)
    timestamp         = Column(DateTime, default=datetime.utcnow, index=True)
    altitude          = Column(Float, nullable=True)
    speed             = Column(Float, nullable=True)
    battery_remaining = Column(Float, nullable=True)
    battery_voltage   = Column(Float, nullable=True)
    satellites        = Column(Integer, nullable=True)
    gps_fix           = Column(Integer, nullable=True)
    roll              = Column(Float, nullable=True)
    pitch             = Column(Float, nullable=True)
    yaw               = Column(Float, nullable=True)
    lat               = Column(Float, nullable=True)
    lon               = Column(Float, nullable=True)
    flight_mode       = Column(String, nullable=True)
    armed             = Column(Boolean, default=False)

def init_db():
    """Create all tables if they don't exist"""
    Base.metadata.create_all(bind=engine)
    print("[DB] Tables created / verified")

def get_db():
    """Dependency — yields a DB session, closes after request"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()