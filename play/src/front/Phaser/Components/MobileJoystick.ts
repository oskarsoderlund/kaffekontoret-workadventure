import * as Phaser from "phaser";
import VirtualJoystick from "phaser4-rex-plugins/plugins/virtualjoystick.js";
import { waScaleManager } from "../Services/WaScaleManager";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import { DirtyScene } from "../Game/DirtyScene";

import Image = Phaser.GameObjects.Image;

//the assets were found here: https://hannemann.itch.io/virtual-joystick-pack-free
export const joystickBaseKey = "joystickBase";
export const joystickBaseImg = "resources/objects/joystickSplitted.png";
export const joystickThumbKey = "joystickThumb";
export const joystickThumbImg = "resources/objects/smallHandleFilledGrey.png";

const baseSize = 50;
const thumbSize = 25;
const radius = 17.5;

export class MobileJoystick extends VirtualJoystick {
    private readonly joystickScene: Phaser.Scene;
    private readonly joystickBase: Image;
    private readonly joystickThumb: Image;
    private resizeCallback: () => void;

    private setimeout: NodeJS.Timeout | null = null;
    private destroyed: boolean = false;

    constructor(private scene: Phaser.Scene) {
        const joystickBase = scene.add
            .image(0, 0, joystickBaseKey)
            .setDisplaySize(
                (baseSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
                (baseSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
            )
            .setDepth(DEPTH_INGAME_TEXT_INDEX);
        const joystickThumb = scene.add
            .image(0, 0, joystickThumbKey)
            .setDisplaySize(
                (thumbSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
                (thumbSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
            )
            .setDepth(DEPTH_INGAME_TEXT_INDEX);

        super(scene, {
            x: -1000,
            y: -1000,
            radius: radius * window.devicePixelRatio,
            base: joystickBase,
            thumb: joystickThumb,
            enable: true,
            dir: "8dir",
        });
        this.joystickScene = scene;
        this.joystickBase = joystickBase;
        this.joystickThumb = joystickThumb;

        // Disable the joystick by default
        this.visible = false;

        // Add opacity
        this.joystickBase.setAlpha(0.3);
        this.joystickThumb.setAlpha(0.3);

        this.resizeCallback = this.resize.bind(this);
        this.joystickScene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }

    public showAt(pointer: Phaser.Input.Pointer): void {
        const camera = this.joystickScene.cameras.main;
        const point = camera.getWorldPoint(pointer.x, pointer.y);
        // The base has scrollFactor 0 but still uses the camera's zoom transform.
        this.x = point.x - camera.scrollX;
        this.y = point.y - camera.scrollY;
        this.resizeImages();
        this.visible = true;

        if (this.setimeout) clearTimeout(this.setimeout);
        // The base was hidden/off-screen during Phaser's hit test for this first touch.
        // Forward that same pointer to Rex so dragging works without a second touch.
        this.joystickBase.emit(Phaser.Input.Events.POINTER_DOWN, pointer);
    }

    public hide(delay: number): void {
        // The joystick is not used by the player
        this.enable = false;

        // After the timeout, disable the joystick
        if (this.setimeout) clearTimeout(this.setimeout);
        this.setimeout = setTimeout(() => {
            if (this.destroyed) {
                return;
            }
            this.visible = false;
            if (this.scene instanceof DirtyScene) {
                this.scene.markDirty();
            }
        }, delay);
    }

    public resize() {
        this.resizeImages();
    }

    private resizeImages(): void {
        this.joystickBase.setDisplaySize(
            this.getDisplaySizeByElement(baseSize),
            this.getDisplaySizeByElement(baseSize),
        );
        this.joystickThumb.setDisplaySize(
            this.getDisplaySizeByElement(thumbSize),
            this.getDisplaySizeByElement(thumbSize),
        );
    }

    private getDisplaySizeByElement(element: number): number {
        const canvasWidth = this.joystickScene.game.canvas.getBoundingClientRect().width;
        const cameraZoom = this.joystickScene.cameras.main.zoom;
        return (element * this.joystickScene.scale.width) / (canvasWidth * cameraZoom);
    }

    public destroy() {
        this.joystickScene.scale.removeListener(Phaser.Scale.Events.RESIZE, this.resizeCallback);
        if (this.setimeout) clearTimeout(this.setimeout);
        super.destroy();
        this.destroyed = true;
    }
}
