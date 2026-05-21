#!/usr/bin/env python3
"""
Build race-course.geojson from KGC 2026 waypoints via OSRM cycling routing.
Run from project root: python3 scripts/build-course.py
"""

import json
import time
import urllib.request
import urllib.parse
import urllib.error

OSRM = "http://router.project-osrm.org/route/v1/cycling"

# Waypoints derived from the 2026 KGC Full Map Package PDF.
# Beach/dune sections (Dead Man's Drop, Samoa dunes) use intermediate points
# to approximate the path since OSRM snaps to nearest road.
DAYS = [
    {
        "day": 1,
        "name": "Day 1: Arcata → Eureka",
        "color": "#2563eb",
        "waypoints": [
            (40.8666, -124.0828),   # Arcata Plaza (start)
            (40.8603, -124.1050),   # Samoa Blvd west
            (40.8551, -124.1450),   # Approaching SR-255
            (40.8511, -124.1650),   # SR-255 / Old Samoa Rd
            (40.8485, -124.1721),   # Exit SR-255 at Peninsula Rd
            (40.8459, -124.1812),   # Manila Community Center
            (40.8370, -124.1890),   # Dune trail (beach section begins)
            (40.8250, -124.1970),   # Dead Man's Drop area
            (40.8150, -124.1880),   # Rejoining road south of dunes
            (40.8076, -124.1668),   # Halvorsen Park / Eureka waterfront (end Day 1)
        ],
    },
    {
        "day": 2,
        "name": "Day 2: Eureka → Crab Park",
        "color": "#16a34a",
        "waypoints": [
            (40.8076, -124.1668),   # Halvorsen Park / Samoa Bridge (start Day 2)
            (40.7980, -124.1675),   # Hikshari Trail north
            (40.7820, -124.1685),   # Hikshari Trail mid
            (40.7680, -124.1695),   # Hikshari South / Herrick Ave
            (40.7600, -124.1730),   # Elk River area, back to US-101
            (40.7497, -124.1724),   # Exit 101 at Humboldt Hill Rd
            (40.7430, -124.1760),   # Re-enter 101 south
            (40.7277, -124.2016),   # Exit 101 at Fields Landing
            (40.7200, -124.2080),   # Re-enter 101 south
            (40.7021, -124.2144),   # Exit 101 at Tompkins Hill Rd
            (40.6937, -124.1946),   # College of the Redwoods
            (40.6800, -124.2050),   # Hookton Rd area
            (40.6600, -124.2150),   # Approach Crab Park via Cannibal Island Rd
            (40.6389, -124.2173),   # Crab Park (end Day 2)
        ],
    },
    {
        "day": 3,
        "name": "Day 3: Crab Park → Ferndale",
        "color": "#ea580c",
        "waypoints": [
            (40.6389, -124.2173),   # Crab Park (start Day 3)
            (40.6420, -124.2300),   # Cannibal Island Rd west
            (40.6300, -124.2450),   # Toward Fernbridge
            (40.5932, -124.2576),   # Fernbridge crossing
            (40.5870, -124.2590),   # Into Ferndale approach
            (40.5758, -124.2625),   # Ferndale finish line
        ],
    },
]


def osrm_route(waypoints):
    coords = ";".join(f"{lon},{lat}" for lat, lon in waypoints)
    url = f"{OSRM}/{coords}?overview=full&geometries=geojson"
    req = urllib.request.Request(url, headers={"User-Agent": "kgc-race-tracker/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    if data.get("code") != "Ok":
        raise ValueError(f"OSRM error: {data.get('code')} — {data.get('message')}")
    return data["routes"][0]["geometry"]["coordinates"]


def straight_line(waypoints, steps=4):
    """Fallback: linearly interpolate between waypoints."""
    coords = []
    for i in range(len(waypoints) - 1):
        lat1, lon1 = waypoints[i]
        lat2, lon2 = waypoints[i + 1]
        for s in range(steps):
            t = s / steps
            coords.append([lon1 + t * (lon2 - lon1), lat1 + t * (lat2 - lat1)])
    lat, lon = waypoints[-1]
    coords.append([lon, lat])
    return coords


features = []
for day in DAYS:
    print(f"Routing {day['name']}...")
    try:
        coords = osrm_route(day["waypoints"])
        print(f"  OK — {len(coords)} points via OSRM")
    except Exception as e:
        print(f"  OSRM failed ({e}), falling back to straight-line interpolation")
        coords = straight_line(day["waypoints"])
        print(f"  OK — {len(coords)} points (interpolated)")

    features.append({
        "type": "Feature",
        "properties": {
            "day": day["day"],
            "name": day["name"],
            "color": day["color"],
        },
        "geometry": {"type": "LineString", "coordinates": coords},
    })
    time.sleep(1)  # be polite to public OSRM

geojson = {"type": "FeatureCollection", "features": features}
out = "backend/static/race-course.geojson"
with open(out, "w") as f:
    json.dump(geojson, f)

print(f"\nWrote {out}")
for feat in features:
    p = feat["properties"]
    n = len(feat["geometry"]["coordinates"])
    print(f"  Day {p['day']}: {n} coordinate points — {p['name']}")
