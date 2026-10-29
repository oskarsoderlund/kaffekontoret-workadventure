import * as Phaser from "phaser";
import { CancelablePromise } from "cancelable-promise";
import type { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";
import { PlayerTexturesKey } from "./PlayerTextures";
import type { WokaTextureDescriptionInterface, PlayerTextures } from "./PlayerTextures";
import { getPlayerTextureFrameConfig } from "./OfficeAvatarTexture";

import Texture = Phaser.Textures.Texture;
import LoaderPlugin = Phaser.Loader.LoaderPlugin;

export interface FrameConfig {
    frameWidth: number;
    frameHeight: number;
}

export const loadAllLayers = (
    load: LoaderPlugin,
    playerTextures: PlayerTextures,
): WokaTextureDescriptionInterface[][] => {
    const returnArray: WokaTextureDescriptionInterface[][] = [];
    playerTextures.getLayers().forEach((layer) => {
        const layerArray: WokaTextureDescriptionInterface[] = [];
        Object.values(layer).forEach((textureDescriptor) => {
            layerArray.push(textureDescriptor);
            if (!textureDescriptor.url) {
                console.warn("Player resource has no URL", textureDescriptor);
                return;
            }
            load.spritesheet(
                textureDescriptor.id,
                textureDescriptor.url,
                getPlayerTextureFrameConfig(textureDescriptor.id),
            );
        });
        returnArray.push(layerArray);
    });
    return returnArray;
};
export const loadAllDefaultModels = (
    load: LoaderPlugin,
    playerTextures: PlayerTextures,
): WokaTextureDescriptionInterface[] => {
    const returnArray = Object.values(playerTextures.getTexturesResources(PlayerTexturesKey.Woka));
    returnArray.forEach((playerResource: WokaTextureDescriptionInterface) => {
        if (!playerResource.url) {
            console.warn("Player resource has no URL", playerResource);
            return;
        }
        load.spritesheet(playerResource.id, playerResource.url, getPlayerTextureFrameConfig(playerResource.id));
    });
    return returnArray;
};

export const loadWokaTexture = (
    superLoaderPlugin: SuperLoaderPlugin,
    texture: WokaTextureDescriptionInterface,
): CancelablePromise<Texture> => {
    return superLoaderPlugin.spritesheet(texture.id, texture.url, getPlayerTextureFrameConfig(texture.id));
};

export const lazyLoadPlayerCharacterTextures = (
    superLoaderPlugin: SuperLoaderPlugin,
    textures: WokaTextureDescriptionInterface[],
): CancelablePromise<string[]> => {
    const promisesList: CancelablePromise<Texture>[] = [];
    for (const texture of textures) {
        promisesList.push(
            superLoaderPlugin.spritesheet(texture.id, texture.url, getPlayerTextureFrameConfig(texture.id)),
        );
    }
    const returnPromise: CancelablePromise<Texture[]> = CancelablePromise.all(promisesList);

    return returnPromise.then(() =>
        textures.map((key) => {
            return key.id;
        }),
    );
};
