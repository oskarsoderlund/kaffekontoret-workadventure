import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfficeGame } from "../src/Model/OfficeGame";
describe("Office gameplay authority", () => {
    const states: unknown[] = [];
    const events: { name: string; data: unknown; targets: number[] }[] = [];
    let game: OfficeGame;
    const user = (id: number, x = 840, y = 488) => ({ id, name: `QA ${id}`, getPosition: () => ({ x, y }) });
    const current = () => {
        const value = states.at(-1);
        return JSON.parse(JSON.stringify(value)) as {
            players: {
                id: number;
                hp: number;
                x: number;
                y: number;
                kills: number;
                deaths: number;
                enabled: boolean;
                protectedUntil: number;
            }[];
            helicopter: { pilot: number | null; x: number; y: number; phase: string; rings: number[] };
            result: string;
            scores: { points: number }[];
        };
    };
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(1000000);
        states.length = 0;
        events.length = 0;
        game = new OfficeGame(
            { tileSize: 16, width: 104, height: 58, spawn: { x: 840, y: 488 }, blocked: [] },
            (name, data, targets) => {
                events.push({ name, data, targets });
                if (name === "office.game.state.v1") states.push(data);
            },
        );
    });
    afterEach(() => {
        game.destroy();
        vi.useRealTimers();
    });
    const join = (id: number, x = 840, y = 488) => {
        const p = user(id, x, y);
        game.command(p, { type: "sync" });
        return p;
    };
    it("requires registration and explicit combat participation", () => {
        const a = join(1),
            b = join(2, 870);
        game.command(a, { type: "shoot", angle: 0 });
        expect(current().players.find((p: { id: number }) => p.id === 2)?.hp).toBe(100);
        game.command(a, { type: "combat", enabled: true });
        vi.advanceTimersByTime(2000);
        game.command(a, { type: "shoot", angle: 0 });
        expect(current().players.find((p: { id: number }) => p.id === 2)?.hp).toBe(100);
        game.command(b, { type: "combat", enabled: true });
        vi.advanceTimersByTime(2000);
        game.command(a, { type: "shoot", angle: 0 });
        expect(current().players.find((p: { id: number }) => p.id === 2)?.hp).toBe(75);
    });
    it("enforces shot cooldown, knockout, score and protected respawn", () => {
        const a = join(1),
            b = join(2, 870);
        for (const p of [a, b]) game.command(p, { type: "combat", enabled: true });
        vi.advanceTimersByTime(2000);
        for (let i = 0; i < 4; i++) {
            game.command(a, { type: "shoot", angle: 0 });
            game.command(a, { type: "shoot", angle: 0 });
            vi.advanceTimersByTime(350);
        }
        expect(current().players[1].hp).toBe(0);
        expect(current().players[0].kills).toBe(1);
        game.command(b, { type: "combat", enabled: false });
        expect(current().players[1].enabled).toBe(true);
        vi.advanceTimersByTime(2600);
        expect(current().players[1].hp).toBe(100);
        expect(current().players[1].x).toBe(840);
        expect(current().players[1].protectedUntil).toBeGreaterThan(Date.now());
    });
    it("stops bullets and kick knockback at obstacles", () => {
        game.destroy();
        game = new OfficeGame(
            { tileSize: 16, width: 104, height: 58, spawn: { x: 840, y: 488 }, blocked: [[54, 30]] },
            (n, d) => {
                if (n === "office.game.state.v1") states.push(d);
            },
        );
        const a = join(1, 840, 488),
            b = join(2, 892, 488);
        for (const p of [a, b]) game.command(p, { type: "combat", enabled: true });
        vi.advanceTimersByTime(2000);
        game.command(a, { type: "shoot", angle: 0 });
        expect(current().players[1].hp).toBe(100);
        game.command(a, { type: "kick", angle: 0 });
        expect(current().players[1].hp).toBe(100);
    });
    it("limits kick range and never pushes across a blocked tile", () => {
        const a = join(1),
            b = join(2, 870, 488);
        for (const p of [a, b]) game.command(p, { type: "combat", enabled: true });
        vi.advanceTimersByTime(2000);
        game.command(a, { type: "kick", angle: 0 });
        expect(current().players[1].hp).toBe(75);
        expect(current().players[1].x).toBe(898);
        vi.advanceTimersByTime(800);
        game.position(2, { x: 940, y: 488 });
        game.command(a, { type: "kick", angle: 0 });
        expect(current().players[1].hp).toBe(75);
    });
    it("keeps angled kick corrections compatible with native integer movement messages", () => {
        const a = join(1, 838, 488),
            b = join(2, 806, 488);
        for (const p of [a, b]) game.command(p, { type: "combat", enabled: true });
        vi.advanceTimersByTime(2000);
        game.command(a, { type: "kick", angle: -3.1306791081133447 });
        const correction = game.position(2, { x: 806, y: 488 });
        expect(current().players[1].hp).toBe(75);
        expect(Number.isInteger(correction.x)).toBe(true);
        expect(Number.isInteger(correction.y)).toBe(true);
        expect(correction).toEqual({ x: 778, y: 488 });
    });
    it("requires proximity, locks pilot occupancy and releases disconnected pilots", () => {
        const far = join(1);
        game.command(far, { type: "launch" });
        expect(current().helicopter.pilot).toBeNull();
        const a = join(2, 360, 232),
            b = join(3, 370, 232);
        game.command(a, { type: "launch" });
        game.command(b, { type: "launch" });
        expect(current().helicopter.pilot).toBe(2);
        game.leave(2);
        expect(current().helicopter.pilot).toBeNull();
        game.command(b, { type: "launch" });
        expect(current().helicopter.pilot).toBe(3);
    });
    it("bounds helicopter speed, stops lost input and times out the mission", () => {
        const a = join(1, 360, 232);
        game.command(a, { type: "launch" });
        game.command(a, { type: "flight", x: 1000, y: 0 });
        vi.advanceTimersByTime(400);
        expect(current().helicopter.x).toBeLessThanOrEqual(728);
        const x = current().helicopter.x;
        vi.advanceTimersByTime(1200);
        expect(current().helicopter.x).toBeLessThanOrEqual(x + 74);
        vi.advanceTimersByTime(150000);
        expect(current().helicopter.pilot).toBeNull();
        expect(current().result).toContain("Tiden tog slut");
    });
    it("does not allow landing remotely or a passenger to control flight", () => {
        const a = join(1, 360, 232),
            b = join(2);
        game.command(a, { type: "launch" });
        game.command(b, { type: "flight", x: 1, y: 0 });
        vi.advanceTimersByTime(400);
        expect(current().helicopter.x).toBe(580);
        game.command(a, { type: "land" });
        expect(current().helicopter.phase).toBe("outbound");
    });
    it("rejects nonfinite angles and inputs without crashing", () => {
        const a = join(1, 360, 232);
        for (const input of [null, {}, "bad", { type: "shoot", angle: NaN }, { type: "flight", x: Infinity, y: 0 }])
            expect(() => game.command(a, input)).not.toThrow();
    });
    it("completes rescue only after pickup and home landing, and rewards bonus rings", () => {
        const a = join(1, 360, 232);
        game.command(a, { type: "launch" });
        const fly = (x: number, y: number) => {
            for (let i = 0; i < 400; i++) {
                const h = current().helicopter;
                const distance = Math.hypot(x - h.x, y - h.y);
                if (distance < 35) break;
                game.command(a, { type: "flight", x: (x - h.x) / distance, y: (y - h.y) / distance });
                vi.advanceTimersByTime(100);
            }
            game.command(a, { type: "flight", x: 0, y: 0 });
        };
        for (const ring of [
            [1000, 700],
            [1700, 1400],
            [2300, 950],
        ])
            fly(ring[0], ring[1]);
        expect(current().helicopter.rings).toHaveLength(3);
        fly(2650, 400);
        game.command(a, { type: "land" });
        expect(current().helicopter.phase).toBe("returning");
        fly(580, 1480);
        game.command(a, { type: "land" });
        expect(current().helicopter.pilot).toBeNull();
        expect(current().scores[0].points).toBeGreaterThanOrEqual(1600);
        expect(current().result).toContain("Festen är räddad");
    });
    it("blocks knockback when a wall is immediately behind the target", () => {
        game.destroy();
        game = new OfficeGame(
            { tileSize: 16, width: 104, height: 58, spawn: { x: 840, y: 488 }, blocked: [[55, 30]] },
            (n, d) => {
                if (n === "office.game.state.v1") states.push(d);
            },
        );
        const a = join(1, 840, 488),
            b = join(2, 870, 488);
        for (const p of [a, b]) game.command(p, { type: "combat", enabled: true });
        vi.advanceTimersByTime(2000);
        game.command(a, { type: "kick", angle: 0 });
        expect(current().players[1].hp).toBe(75);
        expect(current().players[1].x).toBeLessThan(876);
    });
    it("bounds flight to the map even with continuously refreshed extreme input", () => {
        const a = join(1, 360, 232);
        game.command(a, { type: "launch" });
        for (let i = 0; i < 120; i++) {
            game.command(a, { type: "flight", x: -1000000, y: -1000000 });
            vi.advanceTimersByTime(100);
        }
        expect(current().helicopter.x).toBe(80);
        expect(current().helicopter.y).toBe(80);
    });
    it("cannot steal, abort or finish somebody elses mission", () => {
        const a = join(1, 360, 232),
            b = join(2, 360, 232);
        game.command(a, { type: "launch" });
        for (const type of ["launch", "abort", "land"]) game.command(b, { type });
        expect(current().helicopter.pilot).toBe(1);
        expect(current().helicopter.phase).toBe("outbound");
    });
});
