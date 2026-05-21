#!/usr/bin/env python3
"""Seed the database with 2026 KGC racers. Safe to re-run (skips existing)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import colorsys
from database import SessionLocal, init_db
from models import Team

RACERS = [
    (101, "Pa Pa Smurf's Coach"),
    (102, "HMS Sea Cow"),
    (103, "Astro Bunny & the Space Cadets"),
    (104, "Rocket Ham"),
    (105, "Estate Peddlers"),
    (106, "Asgard Racing is the Würst"),
    (107, "LUCY"),
    (108, "DragStrip Divas"),
    (109, "Running on Glory"),
    (110, "The Rebel Appliance"),
    (111, "Chitty Chitty Bling Bling"),
    (112, "Sparky the Magnificent"),
    (114, "Hot Dawg and the Glory Hunters"),
    (115, "Cowbus"),
    (116, "Glory as the Magic School Bus"),
    (117, "Kinetic Gyro Copter"),
    (118, "Bikin' Fool"),
    (119, "Four Norsemen of the Apocalypse"),
    (120, "Coho Cowboys"),
    (121, "Hobart's Duangels"),
    (122, "OH Mickey (You're So Fine)"),
    (123, "License to Grill"),
    (124, "Cycle-Delic Rock Fish"),
    (125, "The Oregon Fail"),
    (126, "Megoosa"),
    (127, "Bob Moss and the Happy Little Bees"),
    (128, "Trooth Decay"),
    (129, "Wheely Wonka"),
    (130, "The Shoe Shine & the Heel n Soles"),
    (131, "cac-TIE: Dressed to the Spines"),
    (132, "Rolling Thunder"),
    (133, "SLUG Life"),
    (134, "Ravens in the Machine"),
    (135, "Ravens Against The Machine"),
    (136, "Home Base"),
    (137, "Helen Wheels"),
    (138, "Yeastie Boys - Brass Monkey"),
    (139, "The 'Ccino Machino"),
    (140, "E.T. Phone Humboldt"),
    (141, "KPS Tools of Liberté"),
    (143, "Pretty Sketchy and the Kewl Doodz"),
    (420, "Hippie-potamus"),
]

def make_color(index: int, total: int) -> str:
    h = index / total
    r, g, b = colorsys.hsv_to_rgb(h, 0.72, 0.88)
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"

init_db()
db = SessionLocal()

added = skipped = 0
for i, (number, name) in enumerate(RACERS):
    display = f"#{number} {name}"
    existing = db.query(Team).filter(Team.name == display).first()
    if existing:
        skipped += 1
        continue
    team = Team(name=display, color=make_color(i, len(RACERS)))
    db.add(team)
    added += 1

db.commit()
db.close()
print(f"Seeded {added} teams, skipped {skipped} existing.")
