import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(new URL(".", import.meta.url).pathname, "..");
const sourcePath = resolve(repositoryRoot, "maps/starter/map.json");
const outputPath = resolve(repositoryRoot, "maps/kaffekontoret/map.tmj");
const wamOutputPath = resolve(repositoryRoot, "maps/kaffekontoret/map.wam");
const source = JSON.parse(await readFile(sourcePath, "utf8"));

const width = 96;
const height = 64;
const offsetX = Math.floor((width - source.width) / 2);
const offsetY = Math.floor((height - source.height) / 2);
const centralWidth = source.width;
const centralHeight = source.height;

function shiftedLayerData(layer, targetX = offsetX, targetY = offsetY) {
  const output = Array(width * height).fill(0);
  for (let y = 0; y < centralHeight; y += 1) {
    for (let x = 0; x < centralWidth; x += 1) {
      output[(y + targetY) * width + x + targetX] =
        layer.data[y * centralWidth + x];
    }
  }
  return output;
}

const floorLayer = source.layers.find(
  (layer) => layer.type === "tilelayer" && layer.name === "floor",
);
const floorTile = floorLayer?.data.find((tile) => tile > 0) ?? 1;
const layers = source.layers.map((layer) => {
  if (layer.type === "tilelayer") {
    const next = { ...layer, width, height, data: shiftedLayerData(layer) };
    if (layer.name === "jitsiMeetingRoom" || layer.name === "jitsiChillzone") {
      next.name =
        layer.name === "jitsiMeetingRoom"
          ? "focusMeetingRoom"
          : "focusChillRoom";
      next.properties = [
        { name: "kaffekontoretFocusRoom", type: "bool", value: true },
        {
          name: "kaffekontoretFocusZoom",
          type: "float",
          value: layer.name === "jitsiMeetingRoom" ? 1.45 : 1.35,
        },
      ];
    }
    if (layer.name === "floor") {
      next.data = Array(width * height).fill(floorTile);
      for (let y = 0; y < centralHeight; y += 1) {
        for (let x = 0; x < centralWidth; x += 1) {
          next.data[(y + offsetY) * width + x + offsetX] =
            layer.data[y * centralWidth + x];
        }
      }
    }
    return next;
  }
  if (layer.type === "objectgroup") {
    return {
      ...layer,
      objects: layer.objects.map((object) => ({
        ...object,
        x: object.x + offsetX * source.tilewidth,
        y: object.y + offsetY * source.tileheight,
      })),
    };
  }
  return layer;
});

// Reuse the licensed starter-office kit as four small neighbourhood pods around
// the original room. This adds landmarks and visual variety without importing
// an unlicensed external map.
const podOffsets = [
  { x: 4, y: 4 },
  { x: width - centralWidth - 4, y: 4 },
  { x: 4, y: height - centralHeight - 4 },
  { x: width - centralWidth - 4, y: height - centralHeight - 4 },
];
const podLayerNames = new Set([
  "collisions",
  "walls",
  "furniture",
  "aboveFurniture",
  "abovePlayer1",
  "abovePlayer2",
  "abovePlayer3",
]);
const mergeLayerAtOffset = (targetLayer, sourceLayer, targetX, targetY) => {
  for (let y = 0; y < centralHeight; y += 1) {
    for (let x = 0; x < centralWidth; x += 1) {
      const tile = sourceLayer.data[y * centralWidth + x];
      if (tile > 0) {
        targetLayer.data[(y + targetY) * width + x + targetX] = tile;
      }
    }
  }
};

for (const layer of source.layers) {
  if (layer.type !== "tilelayer" || !podLayerNames.has(layer.name)) {
    continue;
  }
  const targetLayer = layers.find((candidate) => candidate.name === layer.name);
  if (!targetLayer || targetLayer.type !== "tilelayer") {
    continue;
  }
  podOffsets.forEach((podOffset) => {
    mergeLayerAtOffset(targetLayer, layer, podOffset.x, podOffset.y);
  });
}

const maxObjectId = Math.max(
  0,
  ...layers.flatMap((layer) =>
    layer.type === "objectgroup"
      ? layer.objects.map((object) => object.id)
      : [],
  ),
);
layers.push({
  draworder: "topdown",
  id: source.nextlayerid,
  name: "expansionAreas",
  opacity: 1,
  type: "objectgroup",
  visible: true,
  x: 0,
  y: 0,
  objects: [
    {
      class: "area",
      height: height * source.tileheight,
      id: maxObjectId + 1,
      name: "westExpansion",
      properties: [
        { name: "zone", type: "string", value: "kaffekontoret-west-expansion" },
        {
          name: "description",
          type: "string",
          value: "Byggzon väst - gör platsen till er egen",
        },
      ],
      rotation: 0,
      visible: true,
      width: offsetX * source.tilewidth,
      x: 0,
      y: 0,
    },
    {
      class: "area",
      height: height * source.tileheight,
      id: maxObjectId + 2,
      name: "eastExpansion",
      properties: [
        { name: "zone", type: "string", value: "kaffekontoret-east-expansion" },
        {
          name: "description",
          type: "string",
          value: "Byggzon öst - gör platsen till er egen",
        },
      ],
      rotation: 0,
      visible: true,
      width: offsetX * source.tilewidth,
      x: (width - offsetX) * source.tilewidth,
      y: 0,
    },
  ],
});

const map = {
  ...source,
  height,
  width,
  layers,
  nextlayerid: source.nextlayerid + 1,
  nextobjectid: maxObjectId + 3,
  properties: [
    {
      name: "mapCopyright",
      type: "string",
      value:
        "Kaffekontoret intern pilot. Tileset credits and licenses are retained below.",
    },
    {
      name: "mapDescription",
      type: "string",
      value:
        "Kaffekontoret: en större, lekfull arbetsplats med fokusrum och fria byggzoner.",
    },
    {
      name: "mapVersion",
      type: "int",
      value: 2,
    },
    {
      name: "mapName",
      type: "string",
      value: "Kaffekontoret",
    },
    {
      name: "mapLink",
      type: "string",
      value: "https://github.com/oskarsoderlund/kaffekontoret-workadventure",
    },
  ],
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");
const wam = {
  version: "2.1.0",
  mapUrl: "./map.tmj",
  areas: [],
  entities: {},
  entityCollections: [],
  metadata: {
    name: "Kaffekontoret",
    description:
      "En större, lekfull arbetsplats med fokusrum och fria byggzoner.",
    copyright:
      "Kaffekontoret intern pilot. Tileset credits and licenses are retained in map.tmj.",
  },
};
await writeFile(wamOutputPath, `${JSON.stringify(wam, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath} (${width}x${height}) and ${wamOutputPath}`);
