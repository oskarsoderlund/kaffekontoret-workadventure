import * as Phaser from "phaser";
import type { OfficeGameClient, OfficeGameState } from "./OfficeGameClient";

/** Original generated neon harbour art and our own crew avatar. No third-party game assets. */
export class OfficeFlightScene extends Phaser.Scene {
    private state: OfficeGameState | null = null;
    private helicopter?: Phaser.GameObjects.Container;
    private rotor?: Phaser.GameObjects.Rectangle;
    private shadow?: Phaser.GameObjects.Ellipse;
    private ringGraphics?: Phaser.GameObjects.Graphics;
    private target?: Phaser.GameObjects.Text;
    private colleague?: Phaser.GameObjects.Sprite;
    private passenger?: Phaser.GameObjects.Text;
    private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    private party?: Phaser.GameObjects.Graphics;
    constructor(private client: OfficeGameClient) {
        super({ key: "office-flight" });
    }
    preload(): void {
        if (!this.textures.exists("neon-express-harbour"))
            this.load.image("neon-express-harbour", "/office/neon-express-harbour.png");
        if (!this.textures.exists("neon-express-dj"))
            this.load.spritesheet("neon-express-dj", "/office/avatars/crew/crew-party.png", {
                frameWidth: 128,
                frameHeight: 128,
            });
    }
    setState(state: OfficeGameState): void {
        this.state = state;
    }
    create(): void {
        this.state = this.client.state;
        this.cameras.main.setBackgroundColor("#0d4379").setBounds(0, 0, 3200, 2000).setZoom(0.72);
        // Match the illustrated roof centres along each axis, without a rotated image edge across the world.
        // The raster stays unchanged; only its aerial projection onto game coordinates changes.
        const scaleX = (2650 - 580) / (1260 - 250),
            scaleY = (1480 - 400) / (545 - 148);
        this.add
            .image(580 - 250 * scaleX, 1480 - 545 * scaleY, "neon-express-harbour")
            .setOrigin(0)
            .setScale(scaleX, scaleY);
        const g = this.add.graphics();
        for (const [x, y, label, color] of [
            [580, 1480, "HEM · TAKFEST", 0x48e5f4],
            [2650, 400, "DJ NOVA · HÄMTA HÄR", 0xf876dc],
        ] as const) {
            g.fillStyle(0x10172f, 0.42).fillCircle(x, y, 100);
            g.lineStyle(6, color).strokeCircle(x, y, 100);
            this.add.text(x, y, "H", { fontSize: "60px", fontFamily: "sans-serif", color: "#ffffff" }).setOrigin(0.5);
            this.label(x, y + 126, label, "#ffffff");
        }
        this.colleague = this.add.sprite(2700, 355, "neon-express-dj", 1).setDisplaySize(52, 52);
        this.ringGraphics = this.add.graphics();
        this.party = this.add.graphics().setDepth(11);
        this.target = this.add
            .text(0, 0, "", { fontSize: "16px", color: "#fff1b8", backgroundColor: "#11172d", padding: { x: 8, y: 5 } })
            .setOrigin(0.5)
            .setDepth(12);
        this.shadow = this.add.ellipse(600, 1510, 105, 36, 0x06091b, 0.5).setDepth(9);
        const body = this.add.graphics();
        body.lineStyle(5, 0xc8b8d3).lineBetween(-25, 14, 27, 14).lineBetween(-25, -14, 27, -14);
        body.fillStyle(0x1f1934).fillRoundedRect(-23, -17, 53, 34, 13).fillRect(-65, -5, 45, 10);
        body.lineStyle(3, 0xd955e6).strokeRoundedRect(-23, -17, 53, 34, 13);
        body.fillStyle(0x61deed).fillEllipse(16, 0, 20, 26);
        body.lineStyle(5, 0xf0b35d).lineBetween(-63, -17, -63, 17);
        this.rotor = this.add.rectangle(0, 0, 120, 4, 0xf7ebf3, 0.85);
        this.passenger = this.add
            .text(0, 45, "DJ NOVA À BORD", {
                fontSize: "13px",
                color: "#c2ffe0",
                backgroundColor: "#10172f",
                padding: { x: 6, y: 4 },
            })
            .setOrigin(0.5)
            .setVisible(false)
            .setDepth(12);
        this.helicopter = this.add.container(580, 1480, [body, this.rotor]).setDepth(10);
        this.cameras.main.startFollow(this.helicopter, true, 0.12, 0.12).setFollowOffset(-140, 30);
    }
    private label(x: number, y: number, text: string, color: string): void {
        this.add
            .text(x, y, text, {
                fontFamily: "sans-serif",
                fontSize: "18px",
                fontStyle: "bold",
                color,
                backgroundColor: "#17132c",
                padding: { x: 10, y: 6 },
            })
            .setOrigin(0.5);
    }
    update(time: number, delta: number): void {
        const h = this.state?.helicopter;
        if (!h || !this.helicopter || !this.rotor) return;
        const lerp = Math.min(1, delta / 80);
        const dx = h.x - this.helicopter.x,
            dy = h.y - this.helicopter.y;
        this.helicopter.x = Phaser.Math.Linear(this.helicopter.x, h.x, lerp);
        this.helicopter.y = Phaser.Math.Linear(this.helicopter.y, h.y, lerp);
        if (!this.reducedMotion && Math.hypot(dx, dy) > 0.5)
            this.helicopter.rotation = Phaser.Math.Angle.RotateTo(
                this.helicopter.rotation,
                Math.atan2(dy, dx),
                delta * 0.005,
            );
        if (!this.reducedMotion) this.rotor.rotation += delta * 0.05;
        this.shadow?.setPosition(this.helicopter.x + 20, this.helicopter.y + 36);
        this.passenger?.setPosition(this.helicopter.x, this.helicopter.y + 46).setVisible(h.phase === "returning");
        this.colleague?.setVisible(h.phase === "outbound");
        this.ringGraphics?.clear();
        for (const [i, r] of [
            { x: 1000, y: 700 },
            { x: 1700, y: 1400 },
            { x: 2300, y: 950 },
        ].entries()) {
            this.ringGraphics?.lineStyle(9, h.rings.includes(i) ? 0x46e4a2 : 0xffd369, 0.15).strokeCircle(r.x, r.y, 77);
            this.ringGraphics?.lineStyle(4, h.rings.includes(i) ? 0x46e4a2 : 0xffd369, 0.95).strokeCircle(r.x, r.y, 67);
        }
        const goal = h.phase === "returning" ? { x: 580, y: 1480 } : { x: 2650, y: 400 };
        this.target
            ?.setPosition(h.x, h.y - 68)
            .setText(
                h.phase === "parked"
                    ? "RUNDA AVSLUTAD"
                    : `${h.phase === "returning" ? "TAKFEST" : "DJ NOVA"} · ${Math.round(Math.hypot(goal.x - h.x, goal.y - h.y))} m`,
            );
        this.party?.clear();
        if (h.phase === "parked" && this.state?.result.includes("Festen")) {
            for (let i = 0; i < 36; i++) {
                const angle = i * 2.4,
                    radius = 100 + (this.reducedMotion ? 0 : (time / 10 + i * 17) % 200);
                this.party
                    ?.fillStyle([0xff77df, 0x4ce5ef, 0xffcf70][i % 3], 0.8)
                    .fillRect(580 + Math.cos(angle) * radius, 1480 + Math.sin(angle) * radius, 6, 6);
            }
        }
    }
}
