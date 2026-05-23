#!/usr/bin/env python3
"""
Build Day 3 LineString from the manually-drawn Google My Maps KML.

The user already drew the route in Google My Maps and exported the result as
two pre-rendered LineStrings plus a folder of Day-3 waypoints. We just
stitch those together — no OSRM re-routing.

Segments:
  A  LineString from KML: "Directions from Day 3 - Start to Point 124"
  B  Straight lines between Day-3-folder points 125 .. 142
     ("Point 134 - Deflate" included in its numeric position)
  C  LineString from KML: "Directions from Point 143 to Day 3 - Finish Line"

Run from repo root:  python3 scripts/build-day3.py
"""

import json
import os
import xml.etree.ElementTree as ET

KML = "data/kml/KGC-2026-manual.kml"
GEOJSON = "backend/static/race-course.geojson"
EXPORT_DIR = "data/kml/exports"
K = "{http://www.opengis.net/kml/2.2}"


def parse_coords(text):
    """KML coordinates string -> [[lon, lat], ...]"""
    out = []
    for tok in text.split():
        lon, lat, *_ = tok.split(",")
        out.append([float(lon), float(lat)])
    return out


# Find the Day 3 folder so we get the *correct* point coordinates for
# duplicated names (Day 1 and Day 3 both define some "Point N" placemarks).
tree = ET.parse(KML)
folders = {}
for f in tree.iter(K + "Folder"):
    n = f.find(K + "name")
    if n is not None and n.text:
        folders[n.text.strip()] = f

day3 = folders["Day 1"]  # the all-points "Day 1" folder also contains Day 3 points
seg_a_folder = folders["Directions from Day 3 - Start to Point 124"]
seg_c_folder = folders["Directions from Point 143 to Day 3 - Finish Line"]


def points_from_folder(folder):
    """Return {name: (lat, lon)} for Point placemarks inside this folder only."""
    pts = {}
    for pm in folder.findall(K + "Placemark"):
        n = pm.find(K + "name")
        c = pm.find(".//" + K + "Point/" + K + "coordinates")
        if n is None or c is None or not n.text or not c.text:
            continue
        name = n.text.strip()
        lon, lat, *_ = c.text.strip().split(",")
        # last occurrence wins so Day 3's points override Day 1's stale ones
        pts[name] = (float(lat), float(lon))
    return pts


def linestring_coords(folder):
    """Return [[lon, lat], ...] for the LineString placemark in this folder."""
    for pm in folder.findall(K + "Placemark"):
        c = pm.find(".//" + K + "LineString/" + K + "coordinates")
        if c is not None and c.text:
            return parse_coords(c.text)
    raise RuntimeError(f"no LineString in folder")


pts = points_from_folder(day3)

# Segment A — pre-rendered driving route
coords_A = linestring_coords(seg_a_folder)
print(f"A  KML LineString (Start -> 124): {len(coords_A)} points")

# Segment B — straight lines between point coords
names_B = (
    [f"Point {i}" for i in range(125, 134)]
    + ["Point 134 - Deflate"]
    + [f"Point {i}" for i in range(135, 143)]
)
coords_B = [[pts[n][1], pts[n][0]] for n in names_B]
print(f"B  straight lines 125..142: {len(coords_B)} points")

# Segment C — pre-rendered driving route
coords_C = linestring_coords(seg_c_folder)
print(f"C  KML LineString (143 -> Finish): {len(coords_C)} points")

segment_coords = [("A", coords_A), ("B", coords_B), ("C", coords_C)]
all_coords = coords_A + coords_B + coords_C
print(f"\nTotal: {len(all_coords)} coords")


# Patch into geojson
with open(GEOJSON) as f:
    gj = json.load(f)
for feat in gj["features"]:
    if feat["properties"].get("day") == 3:
        feat["geometry"]["coordinates"] = all_coords
        feat["properties"]["name"] = "Day 3: Crab Park → Ferndale"
        break
with open(GEOJSON, "w") as f:
    json.dump(gj, f)
print(f"Wrote Day 3 -> {GEOJSON}")


# --- Google-importable KML exports ---------------------------------------

os.makedirs(EXPORT_DIR, exist_ok=True)

ordered_names = ["Day 3 - Start", "Point 123", "Point 124"] + names_B + \
                [f"Point {i}" for i in range(143, 149)] + ["Day 3 - Finish Line"]

def is_special(name):
    return not name.startswith("Point ") or " - " in name

renumbered = []
counter = 0
for n in ordered_names:
    if n not in pts:
        print(f"  warning: '{n}' not in Day 3 folder, skipping")
        continue
    counter += 1
    label = n if is_special(n) else f"Day 3 - {counter}"
    lat, lon = pts[n]
    renumbered.append((n, label, lat, lon))


def kml_doc(name, body):
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        f'<Document><name>{name}</name>\n'
        '<Style id="line"><LineStyle><color>ffea580c</color><width>4</width></LineStyle></Style>\n'
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

points_body = "".join(
    kml_point(label, lat, lon, desc=f"orig: {orig}" if orig != label else "")
    for orig, label, lat, lon in renumbered
)

with open(f"{EXPORT_DIR}/day3-waypoints.kml", "w") as f:
    f.write(kml_doc("Day 3 — waypoints (renumbered)", points_body))

with open(f"{EXPORT_DIR}/day3-waypoints-and-route.kml", "w") as f:
    f.write(kml_doc(
        "Day 3 — waypoints + full route",
        points_body + kml_line("Day 3 route", all_coords),
    ))

seg_body = "".join(kml_line(label, coords) for label, coords in segment_coords)
with open(f"{EXPORT_DIR}/day3-waypoints-and-segments.kml", "w") as f:
    f.write(kml_doc(
        "Day 3 — waypoints + per-segment routes",
        points_body + seg_body,
    ))

print(f"\nWrote KML exports to {EXPORT_DIR}/:")
print("  day3-waypoints.kml              — points only, renumbered")
print("  day3-waypoints-and-route.kml    — points + one LineString")
print("  day3-waypoints-and-segments.kml — points + one LineString per segment")
