from datetime import datetime, timedelta, timezone
from bookings.db import db

db.services.delete_many({})
db.barbers.delete_many({})
db.time_slots.delete_many({})
db.products.delete_many({})

db.services.insert_one({"name":"Skin Fade","duration_min":45,"price_cents":20000,"is_active":True})
b = db.barbers.insert_one({"display_name":"Ramad","specialties":["fades","beards"],"is_active":True})

now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
for i in range(6):
    start = now + timedelta(hours=i+1)
    db.time_slots.insert_one({
        "barber_id": str(b.inserted_id),
        "start_ts": start,
        "end_ts": start + timedelta(minutes=45),
        "status": "open"
    })

db.products.insert_many([
  {"name":"BBIT Cap","price_cents":2500,"image":None,"is_active":True,"created_at":datetime.now(timezone.utc)},
  {"name":"BBIT Tee","price_cents":3500,"image":None,"is_active":True,"created_at":datetime.now(timezone.utc)},
  {"name":"Matte Pomade","price_cents":1800,"image":None,"is_active":True,"created_at":datetime.now(timezone.utc)},
])

print("Seeded.")
