"""Seed the database with 2026 KGC racers. Safe to re-run (skips existing)."""
import colorsys
from sqlalchemy.orm import Session
from models import Team

# (number, sculpture_name, team_name_or_None)
RACERS = [
    (1, "Royal Kinetic Madness Band", None),
    (101, "Pa Pa Smurf's Coach", "Team Pa Pa"),
    (102, "HMS Sea Cow", "Team Needs More Cowbell"),
    (103, "Astro Bunny & the Space Cadets", "Team Goddess Racing"),
    (104, "Rocket Ham", "Team Hamtastic Glory"),
    (105, "Estate Peddlers", None),
    (106, "Asgard Racing is the Würst", "Team Asgard Racing"),
    (107, "LUCY", "The Peppers"),
    (108, "DragStrip Divas", "Team Formerly Known As"),
    (109, "Running on Glory", "Colfax High School Engineering Art"),
    (110, "The Rebel Appliance", "Team Pineapple"),
    (111, "Chitty Chitty Bling Bling", "Team For Shifts and Giggles"),
    (112, "Sparky the Magnificent", None),
    (114, "Hot Dawg and the Glory Hunters", "Asgard Presents: Patric and the Other Jacklegs"),
    (115, "Cowbus", None),
    (116, "Glory as the Magic School Bus", None),
    (117, "Kinetic Gyro Copter", None),
    (118, "Bikin' Fool", None),
    (119, "Four Norsemen of the Apocalypse", "Team Tempus Fugitives"),
    (120, "Coho Cowboys", "Team Coho Cowboys"),
    (121, "Hobart's Duangels", None),
    (122, "OH Mickey (You're So Fine)", None),
    (123, "License to Grill", "Team Picante"),
    (124, "Cycle-Delic Rock Fish", None),
    (125, "The Oregon Fail", "Team Pedal Snappers Youth Kinetics"),
    (126, "Megoosa", "The Kinetic A-Team"),
    (127, "Bob Moss and the Happy Little Bees", "Team PLAN BEE"),
    (128, "Trooth Decay", "The Apple Pedalers"),
    (129, "Wheely Wonka", "Team Half-Fast"),
    (130, "The Shoe Shine & the Heel n Soles", None),
    (131, "cac-TIE: Dressed to the Spines", "Cooper Family Team"),
    (132, "Rolling Thunder", "Kinetic Dream Team"),
    (133, "SLUG Life", None),
    (134, "Ravens in the Machine", "Team Subneutral"),
    (135, "Ravens Against The Machine", "Team Subneutral"),
    (136, "Home Base", "The Sequoia Humane Society Rescues!"),
    (137, "Helen Wheels", None),
    (138, "Yeastie Boys - Brass Monkey", "Team Waggle Kinetics"),
    (139, "The 'Ccino Machino", None),
    (140, "E.T. Phone Humboldt", "Team K3D"),
    (141, "KPS Tools of Liberté", "The Kinetic Paranormal Society"),
    (142, "Bosozoku (AKA Reckless Driving Crew)", None),
    (143, "Pretty Sketchy and the Kewl Doodz", "Team Royal Pain Inc"),
    (144, "Bone Shaker", None),
    (145, "Bounced Forty 9th Glory", None),
    (146, "Five Year Plan", None),
    (147, "Baby Got Back to the Future", None),
    (420, "Hippypotamus", None),
]

# Non-race categories — for photos not tied to a specific sculpture
# (color, name)
NON_RACERS = [
    ("#6b7280", "Spectator"),
    ("#6b7280", "Volunteer"),
    ("#6b7280", "Pit Crew"),
    ("#6b7280", "Course / Scenery"),
    ("#7c3aed", "Rutabaga Queen"),
    ("#a855f7", "Rutabaga Royalty"),
]

# Colors that override make_color() for specific racer numbers
RACER_COLOR_OVERRIDES = {
    1: "#fbbf24",  # gold — the band stands out
}


def make_color(index: int, total: int) -> str:
    h = index / total
    r, g, b = colorsys.hsv_to_rgb(h, 0.72, 0.88)
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"


def seed_teams(db: Session):
    """Seed 2026 KGC racers into database.

    Safe to re-run (skips existing teams).
    """
    added = skipped = 0

    # Cleanup: prior band entries (pre-rename / pre-numbering) so the new #001
    # entry isn't a duplicate.
    for stale in [
        "Kinetic Madness Band", "Royal Kinetic Madness Band",  # pre-numbering band names
        "#420 Hippie-potamus",                                  # superseded by Hippypotamus rename
    ]:
        old = db.query(Team).filter(Team.name == stale).first()
        if old:
            db.delete(old)

    # Race teams
    for i, (number, sculpture, team_name) in enumerate(RACERS):
        display = f"#{number:03d} {sculpture}" + (f" — {team_name}" if team_name else "")
        existing = db.query(Team).filter(Team.name == display).first()
        if existing:
            skipped += 1
            continue
        # Remove old entry without team name if present
        old = db.query(Team).filter(Team.name == f"#{number:03d} {sculpture}").first()
        if old:
            db.delete(old)
        color = RACER_COLOR_OVERRIDES.get(number, make_color(i, len(RACERS)))
        team = Team(name=display, color=color)
        db.add(team)
        added += 1

    # Non-race categories
    for color, name in NON_RACERS:
        existing = db.query(Team).filter(Team.name == name).first()
        if existing:
            skipped += 1
            continue
        team = Team(name=name, color=color)
        db.add(team)
        added += 1

    db.commit()
    print(f"✓ Seeded {added} teams, skipped {skipped} existing")
