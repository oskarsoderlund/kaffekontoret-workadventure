import { get, writable } from "svelte/store";
import { menuVisiblilityStore } from "../../Stores/MenuStore";
import { modalVisibilityStore, showModalGlobalComminucationVisibilityStore } from "../../Stores/ModalStore";
import { z } from "zod";
import type { Subscription } from "rxjs";
import type Phaser from "phaser";
import type { GameScene } from "../Game/GameScene";
import { OfficeFlightScene } from "./OfficeFlightScene";
import { playOfficeSound } from "./OfficeAction";

const point = z.object({ x: z.number(), y: z.number() });
const player = point.extend({
    id: z.number(),
    name: z.string(),
    hp: z.number(),
    enabled: z.boolean(),
    kills: z.number(),
    deaths: z.number(),
    protectedUntil: z.number(),
    respawnAt: z.number(),
});
const snapshot = z.object({
    version: z.literal(1),
    now: z.number(),
    players: z.array(player),
    helicopter: point.extend({
        pilot: z.number().nullable(),
        phase: z.enum(["parked", "outbound", "returning"]),
        deadline: z.number(),
        rings: z.array(z.number()),
    }),
    result: z.string(),
    scores: z.array(z.object({ name: z.string(), seconds: z.number(), points: z.number() })),
});
export type OfficeGameState = z.infer<typeof snapshot>;
export const officeGameState = writable<OfficeGameState | null>(null);
export const officeGameNotice = writable("Mus: sikta/skjut · håll inne för fler skott · K: sparka.");
export const officeFlightOpen = writable(false);
export const officeGameConnected = writable(false);
export class OfficeGameClient {
    state: OfficeGameState | null = null;
    readonly id: number;
    private subscription: Subscription;
    private timer: ReturnType<typeof setInterval>;
    private keys = new Set<string>();
    private angle = Math.PI / 2;
    private flight?: OfficeFlightScene;
    private health: Phaser.GameObjects.Graphics;
    private dead = false;
    private closingFlight = false;
    private combatAngles = new Map<number, number>();
    private destroyed = false;
    private lastSync = 0;
    private shooting = false;
    private lastShotSent = 0;
    private stopShooting = () => {
        this.shooting = false;
    };
    private overlayWasActive = false;
    private onUpdate = () => {
        const overlayActive =
            this.state?.players.some((p) => p.enabled || p.id === this.state?.helicopter.pilot) ?? false;
        if (!overlayActive && !this.overlayWasActive) return;
        this.overlayWasActive = overlayActive;
        this.health.clear();
        for (const p of this.state?.players ?? []) {
            const actor = p.id === this.id ? this.scene.CurrentPlayer : this.scene.MapPlayersByKey.get(p.id);
            if (!actor) continue;
            actor.setAlpha(p.hp <= 0 || p.id === this.state?.helicopter.pilot ? 0.28 : 1);
            if (!p.enabled) continue;
            if (p.hp <= 0) {
                // A small stylized body and blood pool remain until authoritative respawn.
                this.health.fillStyle(0x8c142e, 0.8).fillEllipse(actor.x, actor.y + 2, 31, 15);
                this.health.fillStyle(0x231c29).fillRoundedRect(actor.x - 17, actor.y - 5, 29, 10, 4);
                this.health.fillStyle(0xd6a47d).fillCircle(actor.x + 14, actor.y - 1, 5);
            }
            if (p.hp > 0) {
                const angle = p.id === this.id ? this.angle : (this.combatAngles.get(p.id) ?? Math.PI / 2);
                const dx = Math.cos(angle),
                    dy = Math.sin(angle);
                this.health
                    .lineStyle(5, 0x111827)
                    .lineBetween(actor.x + dx * 10, actor.y - 10 + dy * 10, actor.x + dx * 24, actor.y - 10 + dy * 24);
                this.health
                    .lineStyle(2, 0xcbd5e1)
                    .lineBetween(actor.x + dx * 12, actor.y - 12 + dy * 12, actor.x + dx * 24, actor.y - 12 + dy * 24);
            }

            this.health.fillStyle(0x111827, 0.95).fillRect(actor.x - 15, actor.y - 35, 30, 5);
            this.health
                .fillStyle(p.protectedUntil > (this.state?.now ?? 0) ? 0x38bdf8 : 0x34d399)
                .fillRect(actor.x - 14, actor.y - 34, (28 * p.hp) / 100, 3);
        }
        this.scene.markDirty();
    };
    private onAim = (pointer: Phaser.Input.Pointer) => {
        if (!(pointer.event.target instanceof HTMLCanvasElement)) {
            this.stopShooting();
            return;
        }
        this.angle = Math.atan2(
            pointer.worldY - this.scene.CurrentPlayer.y,
            pointer.worldX - this.scene.CurrentPlayer.x,
        );
    };
    private onShoot = (pointer: Phaser.Input.Pointer) => {
        if (pointer.leftButtonDown() && pointer.event.target instanceof HTMLCanvasElement) {
            this.shooting = true;
            this.lastShotSent = Date.now();
            this.onAim(pointer);
            this.attack("shoot");
        }
    };
    private typing(): boolean {
        if (get(menuVisiblilityStore) || get(modalVisibilityStore) || get(showModalGlobalComminucationVisibilityStore))
            return true;
        const el = document.activeElement;
        return el instanceof HTMLElement && (el.matches("input, textarea, select") || el.isContentEditable);
    }
    private onDown = (event: KeyboardEvent) => {
        if (this.typing() || event.ctrlKey || event.metaKey || event.altKey) return;
        const key = event.key.toLowerCase();
        if (this.flight && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
            this.keys.add(key);
            event.preventDefault();
        }
        if (!event.repeat && key === "e" && this.flight) {
            event.preventDefault();
            this.land();
        }
        if (!event.repeat && key === "k" && !this.flight) this.attack("kick");
    };
    private onUp = (event: KeyboardEvent) => {
        this.keys.delete(event.key.toLowerCase());
    };
    private onBlur = () => {
        this.stopShooting();
        this.keys.clear();
        this.flightInput();
    };
    constructor(readonly scene: GameScene) {
        this.id = scene.connection?.getUserId() ?? -1;
        officeGameState.set(null);
        officeGameConnected.set(false);
        this.health = scene.add.graphics().setDepth(100000);
        if (!scene.connection) throw new Error("Kontoret är inte anslutet.");
        this.subscription = scene.connection.receivedEventMessageStream.subscribe((event) => {
            if (event.senderId !== undefined || !event.name.startsWith("office.game.")) return;
            if (event.name === "office.game.state.v1") {
                const parsed = snapshot.safeParse(event.data);
                if (!parsed.success) return;
                const previousPilot = this.state?.helicopter.pilot;
                const previousPhase = this.state?.helicopter.phase;
                this.state = parsed.data;
                if (this.state.helicopter.pilot === null) this.closingFlight = false;
                if (previousPilot != null && this.state.helicopter.pilot === null)
                    officeGameNotice.set(this.state.result);
                officeGameState.set(this.state);
                officeGameConnected.set(true);
                const me = this.state.players.find((p) => p.id === this.id);
                this.scene.userInputManager.officeCombatActive = !!me?.enabled && me.hp > 0;
                const dead = !!me && me.hp <= 0;
                if (dead !== this.dead) {
                    this.dead = dead;
                    if (dead) {
                        scene.CurrentPlayer.finishFollowingPath(true);
                        scene.userInputManager.disableControls("officeKnockout");
                        scene.userInputManager.disableRightClick("officeKnockout");
                    } else {
                        scene.userInputManager.restoreControls("officeKnockout");
                        scene.userInputManager.restoreRightClick("officeKnockout");
                    }
                }
                if (this.state.helicopter.pilot === this.id && !this.flight && !this.closingFlight) this.openFlight();
                if (this.flight && previousPhase === "outbound" && this.state.helicopter.phase === "returning")
                    playOfficeSound("pickup");
                if (
                    this.flight &&
                    previousPilot != null &&
                    this.state.helicopter.pilot === null &&
                    this.state.result.includes("Festen")
                )
                    playOfficeSound("win");
                this.flight?.setState(this.state);
            } else if (event.name === "office.game.notice.v1") {
                const notice = z.object({ text: z.string() }).safeParse(event.data);
                if (notice.success) officeGameNotice.set(notice.data.text);
            } else if (event.name === "office.game.warp.v1") {
                const parsed = point.extend({ id: z.number() }).safeParse(event.data);
                if (parsed.success && parsed.data.id === this.id)
                    scene.CurrentPlayer.teleportTo(parsed.data.x, parsed.data.y);
            } else if (event.name === "office.game.effect.v1") this.effect(event.data);
        });
        this.scene.events.on("update", this.onUpdate);
        this.scene.input.on("pointermove", this.onAim);
        this.scene.input.on("pointerdown", this.onShoot);
        window.addEventListener("keydown", this.onDown);
        window.addEventListener("keyup", this.onUp);
        window.addEventListener("blur", this.onBlur);
        window.addEventListener("pointerup", this.stopShooting);
        window.addEventListener("pointercancel", this.stopShooting);
        this.send({ type: "sync" });
        this.timer = setInterval(() => {
            this.flightInput();
            if (document.hidden) this.stopShooting();
            if (this.shooting && Date.now() - this.lastShotSent >= 350) {
                this.lastShotSent = Date.now();
                this.attack("shoot");
            }
            if (Date.now() - this.lastSync > 900) {
                this.lastSync = Date.now();
                this.send({ type: "sync" });
            }
        }, 100);
    }
    send(command: object): void {
        if (this.destroyed) return;
        this.scene.connection?.emitScriptableEvent("office.game.command.v1", command, []).catch(() => {
            officeGameConnected.set(false);
            officeGameNotice.set("Anslutningen bröts. Väntar på återanslutning.");
        });
    }
    attack(type: "shoot" | "kick"): void {
        const me = this.state?.players.find((p) => p.id === this.id);
        if (
            this.flight ||
            this.typing() ||
            !me?.enabled ||
            me.hp <= 0 ||
            !this.scene.userInputManager.isControlsEnabled
        )
            return;
        this.send({ type, angle: this.angle });
    }
    land(): void {
        this.keys.clear();
        this.send({ type: "flight", x: 0, y: 0 });
        this.send({ type: "land" });
    }
    openFlight(): void {
        if (this.flight) return;
        this.closingFlight = false;
        this.scene.CurrentPlayer.finishFollowingPath(true);
        this.scene.userInputManager.disableControls("officeFlight");
        this.scene.userInputManager.disableRightClick("officeFlight");
        this.scene.scene.setVisible(false);
        document.body.classList.add("office-in-flight");
        officeGameNotice.set(
            "Följ minikartan: DJ Nova på rosa plattan, sedan tillbaka till blå takfesten. E landar när du släppt styrningen.",
        );
        this.flight = new OfficeFlightScene(this);
        this.scene.scene.add("office-flight", this.flight, true);
        officeFlightOpen.set(true);
    }
    closeFlight(): void {
        // Only suppress stale flight snapshots while an active abort awaits acknowledgement.
        // A completed mission already has no pilot and must allow an immediate new launch.
        this.closingFlight = this.state?.helicopter.pilot === this.id;
        if (this.closingFlight) this.send({ type: "abort" });
        this.keys.clear();
        if (this.flight && this.scene.scene.manager) {
            this.scene.scene.remove("office-flight");
            this.scene.scene.setVisible(true);
        }
        this.flight = undefined;
        this.scene.userInputManager.restoreControls("officeFlight");
        this.scene.userInputManager.restoreRightClick("officeFlight");
        document.body.classList.remove("office-in-flight");
        officeFlightOpen.set(false);
    }
    setFlightKey(key: string, pressed: boolean): void {
        if (pressed) this.keys.add(key);
        else this.keys.delete(key);
    }
    private flightInput(): void {
        if (!this.flight || this.state?.helicopter.pilot !== this.id) return;
        if (this.typing() || document.hidden) this.keys.clear();
        const x =
            Number(this.keys.has("d") || this.keys.has("arrowright")) -
            Number(this.keys.has("a") || this.keys.has("arrowleft"));
        const y =
            Number(this.keys.has("s") || this.keys.has("arrowdown")) -
            Number(this.keys.has("w") || this.keys.has("arrowup"));
        this.send({ type: "flight", x, y });
    }
    private effect(input: unknown): void {
        const parsed = z
            .object({
                type: z.enum(["shoot", "kick"]),
                actor: z.number(),
                from: point,
                to: point,
                hit: z.number().nullable(),
                killed: z.boolean().optional().default(false),
            })
            .safeParse(input);
        if (!parsed.success) return;
        const e = parsed.data;
        this.combatAngles.set(e.actor, Math.atan2(e.to.y - e.from.y, e.to.x - e.from.x));
        const graphics = this.scene.add.graphics().setDepth(99999);
        if (e.type === "shoot") graphics.lineStyle(2, 0xffed9a).lineBetween(e.from.x, e.from.y - 9, e.to.x, e.to.y - 9);
        else {
            graphics.lineStyle(6, 0xe2e8f0).lineBetween(e.from.x, e.from.y, e.to.x, e.to.y);
            graphics.lineStyle(3, 0x67e8f9).strokeCircle(e.to.x, e.to.y - 5, 14);
        }
        graphics.fillStyle(e.hit !== null ? 0xd62945 : 0xffd966).fillCircle(e.to.x, e.to.y - 9, 5);
        if (e.hit !== null) {
            const blood = this.scene.add.graphics().setDepth(99998);
            blood.fillStyle(0xa61932, 0.9).fillEllipse(e.to.x, e.to.y + 2, e.killed ? 30 : 17, e.killed ? 14 : 8);
            this.scene.tweens.add({
                targets: blood,
                alpha: 0,
                delay: e.killed ? 2200 : 650,
                duration: 500,
                onComplete: () => blood.destroy(),
            });
            for (let i = 0; i < 7; i++) {
                const drop = this.scene.add.circle(e.to.x, e.to.y - 12, 1.5 + (i % 2), 0xd62945).setDepth(100000);
                const angle = (i / 7) * Math.PI * 2;
                this.scene.tweens.add({
                    targets: drop,
                    x: e.to.x + Math.cos(angle) * 21,
                    y: e.to.y - 8 + Math.sin(angle) * 14,
                    alpha: 0,
                    duration: 450,
                    onComplete: () => drop.destroy(),
                });
            }
        }
        this.scene.tweens.add({ targets: graphics, alpha: 0, duration: 220, onComplete: () => graphics.destroy() });
        const distance = Math.hypot(e.from.x - this.scene.CurrentPlayer.x, e.from.y - this.scene.CurrentPlayer.y);
        if (distance < 650) {
            playOfficeSound(e.type);
            if (e.hit === this.id) playOfficeSound("hit");
        }
    }

    destroy(): void {
        this.closeFlight();
        this.scene.userInputManager.officeCombatActive = false;
        this.destroyed = true;
        clearInterval(this.timer);
        this.subscription.unsubscribe();
        this.scene.events.off("update", this.onUpdate);
        this.scene.input.off("pointermove", this.onAim);
        this.scene.input.off("pointerdown", this.onShoot);
        window.removeEventListener("keydown", this.onDown);
        window.removeEventListener("keyup", this.onUp);
        window.removeEventListener("blur", this.onBlur);
        window.removeEventListener("pointerup", this.stopShooting);
        window.removeEventListener("pointercancel", this.stopShooting);
        this.health.destroy();
        officeGameConnected.set(false);
    }
}
