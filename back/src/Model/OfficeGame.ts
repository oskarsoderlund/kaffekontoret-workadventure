import { z } from "zod";

export const officeNavigationSchema = z.object({
    tileSize: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    blocked: z.array(z.array(z.number())),
    spawn: z.object({ x: z.number(), y: z.number() }),
});
/** Local office gameplay. Commands travel over WorkAdventure's authenticated room event channel.
 * The server owns vehicle movement, occupancy, hits, cooldowns, health and mission results.
 */
export interface OfficeNavigation {
    tileSize: number;
    width: number;
    height: number;
    blocked: number[][];
    spawn: { x: number; y: number };
}
interface Point {
    x: number;
    y: number;
}
interface Fighter extends Point {
    id: number;
    name: string;
    hp: number;
    enabled: boolean;
    kills: number;
    deaths: number;
    protectedUntil: number;
    respawnAt: number;
    lastShot: number;
    lastKick: number;
    lastSync: number;
    correctionUntil: number;
}
interface Pilot {
    id: number;
    name: string;
    getPosition(): Point;
}
interface Vehicle extends Point {
    pilot: number | null;
    phase: "parked" | "outbound" | "returning";
    vx: number;
    vy: number;
    deadline: number;
    started: number;
    inputAt: number;
    rings: number[];
}
const HOME = { x: 580, y: 1480 };
const RESCUE = { x: 2650, y: 400 };
const RINGS = [
    { x: 1000, y: 700 },
    { x: 1700, y: 1400 },
    { x: 2300, y: 950 },
];
export class OfficeGame {
    private players = new Map<number, Fighter>();
    private blocked: Set<string>;
    private helicopter: Vehicle = this.parked();
    private timer: ReturnType<typeof setInterval> | undefined;
    private lastTick = Date.now();
    private lastBroadcast = 0;
    private result = "Neon Express: hämta DJ Nova i hamnen och flyg hem till takfesten.";
    private scores: { name: string; seconds: number; points: number }[] = [];
    constructor(
        private navigation: OfficeNavigation,
        private send: (name: string, data: unknown, targets: number[]) => void,
    ) {
        this.blocked = new Set(navigation.blocked.map(([x, y]) => `${x},${y}`));
    }
    private parked(): Vehicle {
        return { ...HOME, pilot: null, phase: "parked", vx: 0, vy: 0, deadline: 0, started: 0, inputAt: 0, rings: [] };
    }
    private safe(point: Point): boolean {
        const { tileSize: t, width, height } = this.navigation;
        return (
            point.x >= 8 &&
            point.y >= 8 &&
            point.x < width * t - 8 &&
            point.y < height * t - 8 &&
            ![-4, 4].some((dx) =>
                [-4, 4].some((dy) =>
                    this.blocked.has(`${Math.floor((point.x + dx) / t)},${Math.floor((point.y + dy) / t)}`),
                ),
            )
        );
    }
    private distance(a: Point, b: Point): number {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }
    private tell(id: number, text: string): void {
        this.send("office.game.notice.v1", { text }, [id]);
    }
    private publish(targets: number[] = []): void {
        this.send(
            "office.game.state.v1",
            {
                version: 1,
                now: Date.now(),
                players: [...this.players.values()].map(({ lastShot, lastKick, lastSync, correctionUntil, ...p }) => p),
                helicopter: this.helicopter,
                result: this.result,
                scores: this.scores,
            },
            targets,
        );
    }
    command(user: Pilot, input: unknown): void {
        if (!input || typeof input !== "object" || !("type" in input) || typeof input.type !== "string") return;
        let p = this.players.get(user.id);
        if (!p) {
            if (input.type !== "sync") return;
            p = {
                id: user.id,
                name: user.name,
                ...user.getPosition(),
                hp: 100,
                enabled: false,
                kills: 0,
                deaths: 0,
                protectedUntil: 0,
                respawnAt: 0,
                lastShot: 0,
                lastKick: 0,
                lastSync: 0,
                correctionUntil: 0,
            };
            this.players.set(user.id, p);
        }
        const now = Date.now();
        if (input.type === "sync") {
            if (now - p.lastSync < 200) return;
            p.lastSync = now;
            this.publish([p.id]);
            return;
        }
        if (input.type === "combat" && "enabled" in input && typeof input.enabled === "boolean") {
            if (p.hp <= 0 || this.helicopter.pilot === p.id) return;
            if (input.enabled === p.enabled) return;
            p.enabled = input.enabled;
            // Re-entering cannot immediately attack or refresh protection while already enabled.
            p.protectedUntil = now + 1800;
            this.publish();
            return;
        }
        if (input.type === "launch") {
            if (this.helicopter.pilot !== null) {
                this.tell(p.id, "Helikoptern är upptagen. Du kan följa flygningen som åskådare.");
                return;
            }
            if (p.hp <= 0 || this.distance(p, { x: 360, y: 232 }) > 115) {
                this.tell(p.id, "Gå närmare helikopterplattan först.");
                return;
            }
            p.enabled = false;
            this.helicopter = {
                ...this.parked(),
                pilot: p.id,
                phase: "outbound",
                started: now,
                deadline: now + 60000,
                inputAt: now,
            };
            this.result = `${p.name} flyger Neon Express — takfesten väntar!`;
            this.startTimer();
            this.publish();
            return;
        }
        if (input.type === "abort" && this.helicopter.pilot === p.id) {
            this.finish("Uppdrag avbrutet. Försök igen!", false);
            return;
        }
        if (input.type === "land" && this.helicopter.pilot === p.id) {
            const h = this.helicopter;
            const target = h.phase === "outbound" ? RESCUE : HOME;
            if (this.distance(h, target) > 100) {
                this.tell(p.id, "Flyg in i den markerade landningszonen och tryck E.");
                return;
            }
            if (Math.hypot(h.vx, h.vy) > 0.1) {
                this.tell(p.id, "Släpp styrningen innan du landar.");
                return;
            }
            if (h.phase === "outbound") {
                h.phase = "returning";
                this.tell(p.id, "DJ Nova är ombord! Flyg hem till takfesten.");
                this.publish();
            } else this.finish("Festen är räddad! DJ Nova är framme.", true);
            return;
        }
        if (
            input.type === "flight" &&
            this.helicopter.pilot === p.id &&
            "x" in input &&
            "y" in input &&
            typeof input.x === "number" &&
            typeof input.y === "number" &&
            Number.isFinite(input.x) &&
            Number.isFinite(input.y)
        ) {
            const norm = Math.max(1, Math.hypot(input.x, input.y));
            this.helicopter.vx = input.x / norm;
            this.helicopter.vy = input.y / norm;
            this.helicopter.inputAt = now;
            return;
        }
        if (
            (input.type === "shoot" || input.type === "kick") &&
            "angle" in input &&
            typeof input.angle === "number" &&
            Number.isFinite(input.angle)
        ) {
            if (!p.enabled || p.hp <= 0 || p.protectedUntil > now || this.helicopter.pilot === p.id) return;
            const kick = input.type === "kick";
            if (now - (kick ? p.lastKick : p.lastShot) < (kick ? 750 : 350)) return;
            if (kick) p.lastKick = now;
            else p.lastShot = now;
            const direction = { x: Math.cos(input.angle), y: Math.sin(input.angle) };
            const range = kick ? 48 : 330;
            let hit: Fighter | undefined;
            let end: Point = { ...p };
            for (let d = 8; d <= range; d += 3) {
                end = { x: p.x + direction.x * d, y: p.y + direction.y * d };
                if (!this.safe(end)) break;
                hit = [...this.players.values()].find(
                    (other) =>
                        other.id !== p.id &&
                        other.enabled &&
                        other.hp > 0 &&
                        other.protectedUntil <= now &&
                        other.id !== this.helicopter.pilot &&
                        this.distance(end, other) < 13,
                );
                if (hit) break;
            }
            if (hit) {
                hit.hp = Math.max(0, hit.hp - 25);
                if (kick && hit.hp > 0) {
                    let target = { x: hit.x, y: hit.y };
                    for (let d = 2; d <= 28; d += 2) {
                        const candidate = {
                            x: Math.round(hit.x + direction.x * d),
                            y: Math.round(hit.y + direction.y * d),
                        };
                        if (!this.safe(candidate)) break;
                        target = candidate;
                    }
                    this.warp(hit, target);
                }
                if (hit.hp === 0) {
                    hit.deaths++;
                    p.kills++;
                    hit.respawnAt = now + 2500;
                    this.startTimer();
                }
            }
            this.send(
                "office.game.effect.v1",
                { type: input.type, actor: p.id, from: { x: p.x, y: p.y }, to: end, hit: hit?.id ?? null },
                [],
            );
            this.publish();
        }
    }
    private warp(p: Fighter, point: Point): void {
        // WorkAdventure's native movement messages encode coordinates as int32.
        p.x = Math.round(point.x);
        p.y = Math.round(point.y);
        p.correctionUntil = Date.now() + 650;
        this.send("office.game.warp.v1", { id: p.id, x: p.x, y: p.y }, []);
    }
    /** Hold the pedestrian still in a vehicle, while knocked out, and during correction acknowledgement. */
    position(id: number, point: Point): Point {
        const p = this.players.get(id);
        if (!p) return point;
        if (p.hp <= 0 || this.helicopter.pilot === id || p.correctionUntil > Date.now()) return { x: p.x, y: p.y };
        if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
            p.x = point.x;
            p.y = point.y;
        }
        return { x: p.x, y: p.y };
    }
    private startTimer(): void {
        if (this.timer) return;
        this.lastTick = Date.now();
        this.timer = setInterval(() => this.tick(), 100);
        this.timer.unref();
    }
    tick(): void {
        const now = Date.now();
        const dt = Math.min(0.2, (now - this.lastTick) / 1000);
        this.lastTick = now;
        const h = this.helicopter;
        if (h.pilot !== null) {
            if (now >= h.deadline) this.finish("Tiden tog slut. Festen väntar — prova en rakare rutt!", false);
            else {
                if (now - h.inputAt > 500) {
                    h.vx = 0;
                    h.vy = 0;
                }
                h.x = Math.max(80, Math.min(3120, h.x + h.vx * 370 * dt));
                h.y = Math.max(80, Math.min(1920, h.y + h.vy * 370 * dt));
                RINGS.forEach((ring, i) => {
                    if (!h.rings.includes(i) && this.distance(h, ring) < 105) h.rings.push(i);
                });
            }
        }
        for (const p of this.players.values())
            if (p.respawnAt && now >= p.respawnAt) {
                p.hp = 100;
                p.respawnAt = 0;
                p.protectedUntil = now + 2200;
                this.warp(p, this.navigation.spawn);
            }
        if (now - this.lastBroadcast >= 100) {
            this.publish();
            this.lastBroadcast = now;
        }
        if (this.helicopter.pilot === null && ![...this.players.values()].some((p) => p.respawnAt)) {
            if (this.timer) clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    private finish(text: string, success: boolean): void {
        const pilot = this.players.get(this.helicopter.pilot ?? -1);
        if (success && pilot) {
            const seconds = Math.round((Date.now() - this.helicopter.started) / 1000);
            const points = 1000 + this.helicopter.rings.length * 200 + Math.max(0, 60 - seconds) * 10;
            this.scores.push({ name: pilot.name, seconds, points });
            this.scores.sort((a, b) => b.points - a.points);
            this.scores = this.scores.slice(0, 5);
            const stars = "★".repeat(1 + Math.min(2, Math.floor((this.helicopter.rings.length * 2) / 3)));
            text += ` ${seconds} s · ${points} poäng · ${stars}.`;
        }
        this.result = text;
        this.helicopter = this.parked();
        this.publish();
    }
    leave(id: number): void {
        if (this.helicopter.pilot === id) this.finish("Piloten lämnade. Helikoptern är tillbaka på plattan.", false);
        this.players.delete(id);
        this.publish();
        if (this.players.size === 0) this.destroy();
    }
    destroy(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = undefined;
    }
}
