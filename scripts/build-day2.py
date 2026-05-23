#!/usr/bin/env python3
"""
Build Day 2 LineString from KML waypoints.

Segments:
  A  straight  Day 2 Start -> ... -> Point 49*       (all '*' points)
  B  OSRM      Point 50 -> 65 -> 61 -> 62 -> 63 -> Eureka Natural Foods -> 67..70
  C  straight  Point 70 -> 71* -> ... -> 118* -> Point 119
  D  OSRM      Point 119 -> 120..127, 130, 136, 141 -> Day 2 END

Boundaries between segments are joined by a single straight line
(last point of segment N -> first point of segment N+1).

Run from repo root:  python3 scripts/build-day2.py
"""

import json
import time
import urllib.request
import xml.etree.ElementTree as ET

KML = "data/kml/KMR-2026.kml"
GEOJSON = "backend/static/race-course.geojson"
OSRM_CYCLING = "http://router.project-osrm.org/route/v1/cycling"
OSRM_DRIVING = "http://router.project-osrm.org/route/v1/driving"
NS = {"k": "http://www.opengis.net/kml/2.2"}


def load_points(path):
    t = ET.parse(path)
    pts = {}
    for pm in t.iter("{http://www.opengis.net/kml/2.2}Placemark"):
        n = pm.find("k:name", NS)
        p = pm.find(".//k:Point/k:coordinates", NS)
        if n is not None and p is not None and n.text:
            name = n.text.strip()
            lon, lat, *_ = p.text.strip().split(",")
            pts.setdefault(name, (float(lat), float(lon)))
    return pts


def osrm_route(waypoints, profile=OSRM_CYCLING):
    coords = ";".join(f"{lon},{lat}" for lat, lon in waypoints)
    url = f"{profile}/{coords}?overview=full&geometries=geojson"
    req = urllib.request.Request(url, headers={"User-Agent": "kgc-race-tracker/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    if data.get("code") != "Ok":
        raise RuntimeError(f"OSRM: {data.get('code')} {data.get('message')}")
    return data["routes"][0]["geometry"]["coordinates"]


def straight(waypoints):
    return [[lon, lat] for lat, lon in waypoints]


pts = load_points(KML)

names_A = (
    ["Day 2 - Start - Water IN*", "Day 2 - Water*"]
    + [f"Point {i}*" for i in range(40, 48)]
    + ["Day 2 - Water OUT*", "Point 49*"]
)
names_B1 = ["Point 50", "Eureka Natural Foods"]                       # cycling
names_B2 = ["Eureka Natural Foods", "Point 67", "Point 68", "Point 69"]  # driving; ends at 69
names_B3 = ["Point 69", "Point 70"]  # straight line bridge (Point 70 sits off-road)
names_C = ["Point 70"] + [f"Point {i}*" for i in range(71, 119)] + ["Point 119"]
names_D = [
    "Point 119", "Point 120", "Point 121", "Point 122", "Point 123",
    "Point 124", "Point 127",
    "Point 130", "Point 136", "Point 141", "Point 147", "Day 2 - END",
]

segments = [
    ("A  straight",         "straight", names_A,  None),
    ("B1 OSRM cycling",     "osrm",     names_B1, OSRM_CYCLING),
    ("B2 OSRM driving",     "osrm",     names_B2, OSRM_DRIVING),
    ("B3 straight bridge",  "straight", names_B3, None),
    ("C  straight",         "straight", names_C,  None),
    ("D  OSRM cycling",     "osrm",     names_D,  OSRM_CYCLING),
]

all_coords = []
segment_coords = []  # list of (label, [[lon,lat],...])
for label, mode, names, profile in segments:
    wps = [pts[n] for n in names]
    if mode == "osrm":
        print(f"{label}: routing {len(wps)} waypoints via OSRM...")
        coords = osrm_route(wps, profile)
        time.sleep(1)
    else:
        print(f"{label}: {len(wps)} straight-line waypoints")
        coords = straight(wps)
    segment_coords.append((label, coords))
    all_coords.extend(coords)
    print(f"  -> {len(coords)} points (running total: {len(all_coords)})")

with open(GEOJSON) as f:
    gj = json.load(f)

for feat in gj["features"]:
    if feat["properties"].get("day") == 2:
        feat["geometry"]["coordinates"] = all_coords
        feat["properties"]["name"] = "Day 2: Eureka → Crab Park"
        break

with open(GEOJSON, "w") as f:
    json.dump(gj, f)

print(f"\nWrote Day 2 with {len(all_coords)} coordinates -> {GEOJSON}")


# --- Google-importable KML exports ---------------------------------------

EXPORT_DIR = "data/kml/exports"
import os
os.makedirs(EXPORT_DIR, exist_ok=True)

# Build route-order list of (original_name, renumbered_name, lat, lon)
ordered_names = []
seen = set()
for _label, _mode, names, _profile in segments:
    for n in names:
        if n not in seen:
            ordered_names.append(n)
            seen.add(n)

def is_special(name):
    # preserve descriptive names; renumber only "Point N" / "Point N*"
    return not name.startswith("Point ")

renumbered = []
counter = 0
for n in ordered_names:
    counter += 1
    label = n if is_special(n) else f"Day 2 - {counter}"
    lat, lon = pts[n]
    renumbered.append((n, label, lat, lon))


def kml_doc(name, body):
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        f'<Document><name>{name}</name>\n'
        '<Style id="line"><LineStyle><color>ff16a34a</color><width>4</width></LineStyle></Style>\n'
        f'{body}'
        '</Document></kml>\n'
    )

def kml_point(label, lat, lon, desc=""):
    d = f"<description>{desc}</description>" if desc else ""
    return f'<Placemark><name>{label}</name>{d}<Point><coordinates>{lon},{lat},0</coordinates></Point></Placemark>\n'

def kml_line(name, coords):
    pts_str = " ".join(f"{c[0]},{c[1]},0" for c in coords)
    return (
        f'<Placemark><name>{name}</name><styleUrl>#line</styleUrl>'
        f'<LineString><tessellate>1</tessellate><coordinates>{pts_str}</coordinates></LineString>'
        f'</Placemark>\n'
    )

points_body = "".join(kml_point(label, lat, lon, desc=f"orig: {orig}" if orig != label else "")
                      for orig, label, lat, lon in renumbered)

# Variant 1: waypoints only
v1 = kml_doc("Day 2 — waypoints (renumbered)", points_body)
with open(f"{EXPORT_DIR}/day2-waypoints.kml", "w") as f:
    f.write(v1)

# Variant 2: waypoints + single full route
v2 = kml_doc(
    "Day 2 — waypoints + full route",
    points_body + kml_line("Day 2 route", all_coords),
)
with open(f"{EXPORT_DIR}/day2-waypoints-and-route.kml", "w") as f:
    f.write(v2)

# Variant 3: waypoints + per-segment LineStrings
seg_body = "".join(kml_line(label.strip(), coords) for label, coords in segment_coords)
v3 = kml_doc(
    "Day 2 — waypoints + per-segment routes",
    points_body + seg_body,
)
with open(f"{EXPORT_DIR}/day2-waypoints-and-segments.kml", "w") as f:
    f.write(v3)

print(f"\nWrote KML exports to {EXPORT_DIR}/:")
print("  day2-waypoints.kml              — points only, renumbered")
print("  day2-waypoints-and-route.kml    — points + one LineString")
print("  day2-waypoints-and-segments.kml — points + one LineString per segment")


# --- Day 1 KML exports (waypoints from source KML, route from geojson) ----

# Day 1 placemark order in source KML, up to & including "Day 1 END".
# Skip duplicate "The Arcata Plaza" (same as "Arcata Plaza") and LineString-typed
# Points 17/18 (which were Part 1 polyline pieces, not true single waypoints).
DAY1_ORDER = [
    "Arcata Plaza",
    "Point 3", "Point 4", "Point 5", "Point 6", "Point 7", "Point 8",
    "Point 9", "Point 10", "Point 11", "Point 12", "Point 13", "Point 14",
    "Point 15", "Community Center",
    "Point 19", "Point 20", "Point 21", "Point 22", "Point 23", "Samoa Beach",
    "Point 25", "Point 26", "Point 27", "Point 28 - Begin OSRM", "Point 29",
    "Eureka", "Point 31", "Point 32", "Point 33", "Point 34", "Point 35",
    "Point 36", "Point 37", "Day 1 END",
]

day1_renumbered = []
counter = 0
for n in DAY1_ORDER:
    if n not in pts:
        print(f"  warning: Day 1 waypoint '{n}' not found in KML, skipping")
        continue
    counter += 1
    label = n if is_special(n) else f"Day 1 - {counter}"
    lat, lon = pts[n]
    day1_renumbered.append((n, label, lat, lon))

day1_points_body = "".join(
    kml_point(label, lat, lon, desc=f"orig: {orig}" if orig != label else "")
    for orig, label, lat, lon in day1_renumbered
)

# Day 1 full route from existing geojson
day1_coords = next(f["geometry"]["coordinates"] for f in gj["features"]
                   if f["properties"].get("day") == 1)

v1d1 = kml_doc("Day 1 — waypoints (renumbered)", day1_points_body)
with open(f"{EXPORT_DIR}/day1-waypoints.kml", "w") as f:
    f.write(v1d1)

v2d1 = kml_doc(
    "Day 1 — waypoints + full route",
    day1_points_body + kml_line("Day 1 route", day1_coords),
)
with open(f"{EXPORT_DIR}/day1-waypoints-and-route.kml", "w") as f:
    f.write(v2d1)

print("\nDay 1 exports:")
print("  day1-waypoints.kml              — points only, renumbered")
print("  day1-waypoints-and-route.kml    — points + full route from geojson")
print("  (no per-segment variant: Day 1 build logic isn't in this script)")
