import { writable } from "svelte/store";
import { z } from "zod";
import type { GameScene } from "../Phaser/Game/GameScene";

const activitySchema = z.object({
    app: z.enum(["Codex", "Shopify", "Annat"]),
    detail: z.string().max(80),
    expiresAt: z.number().positive(),
});
export type OfficeActivity = z.infer<typeof activitySchema>;
export type OfficeActivityApp = OfficeActivity["app"];
export interface OfficePresence {
    id: string;
    name: string;
    activity: OfficeActivity;
}
export const OFFICE_ACTIVITY_KEY = "sidequest_activity_v1";
export const officeActivityPanelOpenStore = writable(false);
export const officePresenceStore = writable<OfficePresence[]>([]);
export const officeOwnActivityStore = writable<OfficeActivity | null>(null);

export function visibleActivity(value: unknown, now = Date.now()): OfficeActivity | null {
    const parsed = activitySchema.safeParse(value);
    return parsed.success && parsed.data.expiresAt > now ? parsed.data : null;
}
export function shareOfficeActivity(scene: GameScene, app: OfficeActivityApp, detail: string) {
    const manager = scene.getPlayerVariablesManager();
    if (!manager) throw new Error("Rummet är inte färdiganslutet ännu.");
    const value = activitySchema.parse({ app, detail: detail.trim(), expiresAt: Date.now() + 120000 });
    manager.setVariableFromApp(OFFICE_ACTIVITY_KEY, value, { public: true, persist: false, scope: "room" });
    officeOwnActivityStore.set(value);
}
export function stopSharingOfficeActivity(scene: GameScene) {
    scene
        .getPlayerVariablesManager()
        ?.setVariableFromApp(OFFICE_ACTIVITY_KEY, null, { public: true, persist: false, scope: "room" });
    officeOwnActivityStore.set(null);
}
export function startOfficeActivityPolling(scene: GameScene) {
    const update = () => {
        const records: OfficePresence[] = [];
        const manager = scene.getPlayerVariablesManager();
        const raw = manager?.variables.get(OFFICE_ACTIVITY_KEY);
        const own = visibleActivity(raw);
        if (!own && activitySchema.safeParse(raw).success)
            manager?.setVariableFromApp(OFFICE_ACTIVITY_KEY, null, { public: true, persist: false, scope: "room" });
        officeOwnActivityStore.set(own);
        if (own) records.push({ id: "self", name: scene.CurrentPlayer.playerName, activity: own });
        for (const player of scene.getRemotePlayersRepository().getPlayers().values()) {
            const activity = visibleActivity(player.variables.get(OFFICE_ACTIVITY_KEY));
            if (activity) records.push({ id: String(player.userId), name: player.name, activity });
        }
        officePresenceStore.set(records);
    };
    update();
    const timer = setInterval(update, 500);
    return () => {
        clearInterval(timer);
        officePresenceStore.set([]);
        officeOwnActivityStore.set(null);
    };
}
