import type * as Phaser from "phaser";
import type { GameScene } from "../Game/GameScene";
import { getPlayerAnimations } from "../Player/Animation";
import { officeAgentDisplayStore, officeAgentPanelOpenStore, officeStateLabels } from "../../Stores/OfficeBridgeStore";
import type { OfficeAgentState } from "../../Stores/OfficeBridgeStore";
import { officeToolPanelStore } from "../../Stores/OfficeBridgeStore";
import { officeActivityPanelOpenStore } from "../../Stores/OfficeActivityStore";

export const OFFICE_AGENT_POSITION = { x: 836, y: 263 };
export class OfficeAgent {
    private sprite: Phaser.GameObjects.Sprite | undefined;
    private label: Phaser.GameObjects.Text | undefined;
    private destroyed = false;
    private status: { state: OfficeAgentState; title: string } = { state: "offline", title: "" };
    private readonly onUpdate = () => {
        if (this.status.state === "running") this.scene.markDirty();
    };
    private readonly unsubscribe: () => void;
    private readonly open = () => {
        officeActivityPanelOpenStore.set(false);
        officeToolPanelStore.set("");
        officeAgentPanelOpenStore.set(true);
    };
    private readonly create = () => {
        if (this.destroyed) return;
        const map = this.scene.getGameMapFrontWrapper().getGameMap();
        const mapX = map.getMapPropertyByKey("officeAgentX")?.value;
        const mapY = map.getMapPropertyByKey("officeAgentY")?.value;
        const x = typeof mapX === "number" ? mapX : OFFICE_AGENT_POSITION.x;
        const y = typeof mapY === "number" ? mapY : OFFICE_AGENT_POSITION.y;
        this.sprite = this.scene.add
            .sprite(x, y, "office-codex-agent", 1)
            .setDepth(y + 16)
            .setInteractive({ useHandCursor: true });
        this.sprite.on("pointerdown", this.open);
        this.label = this.scene.add
            .text(x, y - 22, "Codex", {
                fontFamily: "sans-serif",
                fontSize: "10px",
                color: "#9fe9dd",
                backgroundColor: "#17232e",
                align: "center",
                padding: { x: 4, y: 3 },
            })
            .setOrigin(0.5, 1)
            .setDepth(y + 17)
            .setInteractive({ useHandCursor: true });
        this.label.on("pointerdown", this.open);
        for (const animation of getPlayerAnimations("office-codex-agent"))
            if (!this.scene.anims.exists(animation.key)) {
                this.scene.anims.create({
                    key: animation.key,
                    frames: this.scene.anims.generateFrameNumbers(animation.frameModel, { frames: animation.frames }),
                    frameRate: animation.frameRate,
                    repeat: animation.repeat,
                });
            }
        this.renderStatus();
    };
    constructor(private readonly scene: GameScene) {
        this.scene.events.on("update", this.onUpdate);
        this.unsubscribe = officeAgentDisplayStore.subscribe((status) => {
            this.status = status;
            this.renderStatus();
        });
        if (scene.textures.exists("office-codex-agent")) this.create();
        else {
            scene.load.spritesheet("office-codex-agent", "/office/avatars/codex-crew.png", {
                frameWidth: 32,
                frameHeight: 32,
            });
            scene.load.once("complete", this.create);
            if (!scene.load.isLoading()) scene.load.start();
        }
    }
    private renderStatus() {
        this.label?.setText(
            `Codex · ${officeStateLabels[this.status.state] || this.status.state}${this.status.title ? `\n${this.status.title.slice(0, 40)}` : ""}`,
        );
        if (!this.sprite) return;
        if (this.status.state === "running") this.sprite.play("office-codex-agent-down-walk", true);
        else {
            this.sprite.anims.stop();
            this.sprite.setFrame(1);
        }
        this.scene.markDirty();
    }
    destroy() {
        this.destroyed = true;
        this.unsubscribe();
        this.scene.events.off("update", this.onUpdate);
        this.scene.load.off("complete", this.create);
        this.sprite?.off("pointerdown", this.open);
        this.label?.off("pointerdown", this.open);
        this.sprite?.destroy();
        this.label?.destroy();
        this.scene.markDirty();
    }
}
