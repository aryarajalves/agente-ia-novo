from datetime import datetime, timedelta
import zoneinfo
from tasks import calculate_elapsed_business_minutes

def test_no_business_hours():
    # If no BH, should return normal elapsed distance
    t1 = datetime(2025, 1, 1, 10, 0, 0)
    t2 = datetime(2025, 1, 1, 12, 0, 0)
    assert calculate_elapsed_business_minutes(t1, t2, None) == 120.0
    assert calculate_elapsed_business_minutes(t1, t2, {}) == 120.0
    assert calculate_elapsed_business_minutes(t1, t2, {"enabled": False}) == 120.0

def test_within_business_hours():
    # Same day, entirely inside 08:00 - 18:00
    bh = {
        "enabled": True,
        "start": "08:00",
        "end": "18:00",
        "weekdays": True,
        "saturday": False,
        "sunday": False
    }
    # Important: the function expects UTC datetimes representing DB times.
    # Sao Paulo is UTC-3. 14:00 UTC is 11:00 SP.
    t1 = datetime(2025, 1, 1, 14, 0, 0) # 11:00 SP
    t2 = datetime(2025, 1, 1, 15, 0, 0) # 12:00 SP
    # 2025-01-01 was a Wednesday.
    assert calculate_elapsed_business_minutes(t1, t2, bh) == 60.0

def test_cross_day_boundary():
    bh = {
        "enabled": True,
        "start": "08:00",
        "end": "18:00",
        "weekdays": True,
        "saturday": False,
        "sunday": False
    }
    # 2025-01-01 20:00 UTC = 17:00 SP (1 hour before close)
    t1 = datetime(2025, 1, 1, 20, 0, 0)
    # 2025-01-02 12:00 UTC = 09:00 SP (1 hour after open)
    t2 = datetime(2025, 1, 2, 12, 0, 0)
    
    # Total business time elapsed:
    # Day 1: 17:00 to 18:00 = 60 mins
    # Day 2: 08:00 to 09:00 = 60 mins
    # Total = 120 mins
    assert calculate_elapsed_business_minutes(t1, t2, bh) == 120.0

def test_over_weekend():
    bh = {
        "enabled": True,
        "start": "08:00",
        "end": "18:00",
        "weekdays": True,
        "saturday": False,
        "sunday": False
    }
    # 2025-01-03 is Friday.
    # 20:00 UTC = 17:00 SP
    t1 = datetime(2025, 1, 3, 20, 0, 0)
    
    # 2025-01-06 is Monday.
    # 12:00 UTC = 09:00 SP
    t2 = datetime(2025, 1, 6, 12, 0, 0)
    
    # Friday: 17:00 to 18:00 = 60 mins
    # Sat, Sun: 0 mins
    # Monday: 08:00 to 09:00 = 60 mins
    # Total = 120 mins
    assert calculate_elapsed_business_minutes(t1, t2, bh) == 120.0
