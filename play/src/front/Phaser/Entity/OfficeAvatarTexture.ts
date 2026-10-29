/** HD frames are scoped to our reference crew. Native and layered Wokas stay at 32 px. */
const crewIds = new Set([
    "crew-oski",
    "crew-captain",
    "crew-diva",
    "crew-bouncer",
    "crew-hacker",
    "crew-party",
    "crew-fixer",
    "crew-punk",
    "crew-gamer",
    "crew-phantom",
    "crew-don",
    "crew-rasta",
]);

export const OFFICE_CREW_FRAME_SIZE = 128;
export const OFFICE_CREW_DISPLAY_SIZE = 40;

export function isOfficeCrewTexture(id: string): boolean {
    return crewIds.has(id);
}

export function getPlayerTextureFrameConfig(id: string): { frameWidth: number; frameHeight: number } {
    const size = isOfficeCrewTexture(id) ? OFFICE_CREW_FRAME_SIZE : 32;
    return { frameWidth: size, frameHeight: size };
}
