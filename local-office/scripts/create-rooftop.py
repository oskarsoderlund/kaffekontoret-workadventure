"""Build a Tiled map from the unmodified generated environment and authored walk surfaces.

Art is copied byte-for-byte, never repainted. Geometry is authored in reference-image
coordinates so the collision plan remains readable independently of the asset resolution.
"""
from collections import deque
from pathlib import Path
import json
import shutil
import struct

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "local-office/assets"
OUT = ROOT / "play/public/office"
layout = json.loads((ASSETS / "rooftop-layout.json").read_text())
art = ASSETS / "rooftop-empty.png"
width, height = struct.unpack(">II", art.read_bytes()[16:24])
tile = layout["tileSize"]
cols, rows = width // tile, height // tile
sx, sy = width / layout["referenceSize"][0], height / layout["referenceSize"][1]


def contains(box, x, y):
    return box[0] <= x < box[2] and box[1] <= y < box[3]


def is_open(col, row):
    x, y = (col * tile + tile / 2) / sx, (row * tile + tile / 2) / sy
    return any(contains(box, x, y) for box in layout["surfaces"]) and not any(
        contains(obstacle["box"], x, y) for obstacle in layout["obstacles"]
    )


blocked = {(x, y) for y in range(rows) for x in range(cols) if not is_open(x, y)}


def tile_at(point):
    return int(point[0] * sx // tile), int(point[1] * sy // tile)


# Fail before replacing the served map if any intended destination is unreachable.
start = tile_at(layout["spawn"])
assert start not in blocked, "Spawn is blocked"
visited, queue = {start}, deque([start])
while queue:
    x, y = queue.popleft()
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        point = (nx, ny)
        if 0 <= nx < cols and 0 <= ny < rows and point not in blocked and point not in visited:
            visited.add(point)
            queue.append(point)
for destination in layout["destinations"]:
    assert tile_at(destination["point"]) in visited, f"Unreachable: {destination['name']}"
assert tile_at(layout["agent"]) in visited, "Codex cannot be reached"


def layer(index, name, data, visible=True):
    return dict(id=index, name=name, type="tilelayer", width=cols, height=rows,
                x=0, y=0, opacity=1, visible=visible, data=data)


spawn = [0] * (cols * rows)
for x in range(start[0] - 1, start[0] + 2):
    assert (x, start[1]) not in blocked
    spawn[start[1] * cols + x] = start[1] * cols + x + 1

properties = lambda values: [dict(name=k, type="string", value=v) for k, v in values.items()]
destinations = [dict(id=i + 1, name=d["name"], type="", x=round(d["point"][0] * sx),
                     y=round(d["point"][1] * sy), width=0, height=0, point=True, rotation=0, visible=True)
                for i, d in enumerate(layout["destinations"])]
data = dict(
    compressionlevel=-1, height=rows, width=cols, infinite=False,
    nextlayerid=5, nextobjectid=len(destinations) + 1, orientation="orthogonal",
    renderorder="right-down", tiledversion="1.10.2", tileheight=tile, tilewidth=tile,
    type="map", version="1.10",
    properties=properties({
        "mapName": "OSKAR BUSINESSOS — Neon Rooftop",
        "mapDescription": "Takterrass med reception, arbetsplatser, neonbar, pool, spelrum, eldstad och helikopterplatta.",
        "mapCopyright": "Reference supplied by Oskar; character-free environment edited with OpenAI imagegen, 2026. No GTA assets."
    }) + [dict(name="officeAgentX", type="int", value=round(layout["agent"][0] * sx)),
          dict(name="officeAgentY", type="int", value=round(layout["agent"][1] * sy))],
    layers=[layer(1, "floor", list(range(1, cols * rows + 1))), layer(2, "start", spawn, False),
            dict(id=3, name="floorLayer", type="objectgroup", opacity=1, visible=True,
                 objects=[], draworder="topdown", x=0, y=0),
            dict(id=4, name="Destinationer", type="objectgroup", opacity=1, visible=False,
                 objects=destinations, draworder="topdown", x=0, y=0)],
    tilesets=[dict(columns=cols, firstgid=1, image="office.png", imageheight=height,
                   imagewidth=width, margin=0, name="oskar-neon-rooftop", spacing=0,
                   tilecount=cols * rows, tileheight=tile, tilewidth=tile,
                   tiles=[dict(id=y * cols + x, properties=[dict(name="collides", type="bool", value=True)])
                          for x, y in sorted(blocked)])]
)
OUT.mkdir(parents=True, exist_ok=True)
shutil.copyfile(art, OUT / "office.png")
(OUT / "map.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
navigation = dict(tileSize=tile, width=cols, height=rows, scale=dict(x=sx, y=sy),
                  spawn=dict(x=start[0] * tile + tile / 2, y=start[1] * tile + tile / 2),
                  agent=dict(x=round(layout["agent"][0] * sx), y=round(layout["agent"][1] * sy)),
                  destinations=[dict(id=d["id"], name=d["name"],
                                     x=tile_at(d["point"])[0] * tile + tile / 2,
                                     y=tile_at(d["point"])[1] * tile + tile / 2)
                                for d in layout["destinations"]],
                  blocked=[list(point) for point in sorted(blocked)])
(OUT / "navigation.json").write_text(json.dumps(navigation, ensure_ascii=False))
print(f"Rooftop: {cols}×{rows} tiles, {len(visited)} connected floor cells, all 10 destinations reachable.")
