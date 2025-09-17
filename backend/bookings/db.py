import os
from datetime import datetime, timezone
from pymongo import MongoClient

client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
db = client[os.getenv("MONGODB_DB", "barbershop")]

def iso(dt: datetime):
    if isinstance(dt, datetime):
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    return dt

def norm(doc):
    if not doc: return None
    d = dict(doc); d["id"] = str(d.pop("_id"))
    for k in ("start_ts","end_ts","hold_expires_at","created_at"):
        if k in d: d[k] = iso(d[k])
    return d

db.services.create_index([("is_active", 1)])
db.barbers.create_index([("is_active", 1)])
db.time_slots.create_index([("barber_id", 1), ("start_ts", 1), ("end_ts", 1)], unique=True)
db.time_slots.create_index([("status", 1), ("hold_expires_at", 1)])
db.bookings.create_index([("user_id", 1), ("created_at", 1)])
