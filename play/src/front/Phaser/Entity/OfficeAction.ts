import { writable } from "svelte/store";
import type { Character } from "./Character";

export const officeActions = [
    { id: "fart", label: "Fisa", icon: "💨", token: "💨💨" },
    { id: "burp", label: "Rapa", icon: "🫧", token: "🫧🫧" },
    { id: "pee", label: "Kissa", icon: "💧", token: "💧💧" },
];
const preferenceKey = "office.effects.enabled.v1";
function readSoundPreference(): boolean {
    try {
        return localStorage.getItem(preferenceKey) !== "false";
    } catch {
        return true;
    }
}
let soundEnabled = readSoundPreference();
export const officeSoundEnabled = writable(soundEnabled);
export const officeActionNotice = writable(
    "WASD / pilar · B: slumpat ljud · K: sparka · Mus: sikta/skjut · Shift springer",
);
let audio: AudioContext | undefined;
let volume: GainNode | undefined;

export async function enableOfficeSound(enabled: boolean): Promise<void> {
    if (enabled) {
        audio ??= new AudioContext();
        if (!volume) {
            volume = audio.createGain();
            volume.connect(audio.destination);
        }
        await audio.resume();
    }
    if (audio && volume) volume.gain.setValueAtTime(enabled ? 1 : 0, audio.currentTime);
    soundEnabled = enabled;
    officeSoundEnabled.set(enabled);
    try {
        localStorage.setItem(preferenceKey, String(enabled));
    } catch {
        /* Sound works without storage. */
    }
}

/** Browsers require a user gesture. Unlock once the player clicks or presses a key; preserve explicit mute. */
export function startOfficeSound(): () => void {
    const unlock = (event: Event) => {
        if (!soundEnabled || (event.target instanceof Element && event.target.closest("[data-office-sound-toggle]")))
            return;
        if (audio?.state === "running") return;
        enableOfficeSound(true).catch(() => officeActionNotice.set("Tryck på ljudknappen för att starta ljudet."));
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
        document.removeEventListener("pointerdown", unlock, true);
        document.removeEventListener("keydown", unlock, true);
    };
}

/** Original synthesized effects share one context and the same mute preference. */
export function playOfficeSound(kind: string): void {
    if (!soundEnabled || !audio || audio.state !== "running") return;
    const duration =
        kind === "pee"
            ? 1.1
            : kind === "shoot"
              ? 0.15
              : kind === "kick" || kind === "hit"
                ? 0.19
                : kind === "win"
                  ? 0.9
                  : 0.65;
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
        const t = i / audio.sampleRate;
        const noise = Math.random() * 2 - 1;
        const envelope = Math.sin((Math.PI * t) / duration) * 0.16;
        if (kind === "shoot") samples[i] = (noise * 0.8 + Math.sin(t * 700) * 0.2) * Math.exp(-t * 35) * 0.35;
        else if (kind === "kick" || kind === "hit")
            samples[i] = (Math.sin(t * (700 - t * 1700)) + noise * 0.25) * Math.exp(-t * 22) * 0.2;
        else if (kind === "pickup" || kind === "win") {
            const note = [523, 659, 784, 1047][Math.min(3, Math.floor((t / duration) * 4))];
            samples[i] = Math.sin(t * Math.PI * 2 * note) * envelope * 0.6;
        } else
            samples[i] =
                kind === "pee"
                    ? noise * envelope * 0.4
                    : (Math.sin(t * (kind === "burp" ? 420 : 170) + Math.sin(t * 50) * 5) + noise * 0.2) * envelope;
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(volume ?? audio.destination);
    source.start();
    source.onended = () => source.disconnect();
}

/** Uses WorkAdventure's existing emote transport for both local and remote actors. */
export function playOfficeAction(character: Character, token: string): boolean {
    const action = officeActions.find((candidate) => candidate.token === token);
    if (!action) return false;
    playOfficeSound(action.id);
    officeActionNotice.set(`Ljud från ${character.playerName} · B för ett nytt slumpat ljud`);
    const scene = character.scene;
    const effect = scene.add.container(0, 0);
    character.add(effect);
    const label = scene.add
        .text(0, -42, `${action.icon} ${action.label}`, {
            fontSize: "10px",
            fontFamily: "sans-serif",
            color: "#ffffff",
            backgroundColor: "#17232e",
            padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5);
    effect.add(label);
    for (let i = 0; i < 9; i++) {
        const pee = action.id === "pee";
        const bubble = scene.add.circle(
            pee ? 9 : -8,
            pee ? 8 : -4,
            pee ? 1.5 : 3 + (i % 3),
            pee ? 0xfbd554 : action.id === "fart" ? 0x92d365 : 0x67d8ea,
            0.8,
        );
        effect.add(bubble);
        scene.tweens.add({
            targets: bubble,
            x: pee ? 14 + i * 2 : -12 - i * 3,
            y: pee ? 22 + (i % 3) * 3 : -12 - i * 3,
            alpha: 0,
            scale: pee ? 1 : 2,
            delay: i * 70,
            duration: 900,
        });
    }
    scene.tweens.add({
        targets: label,
        y: -52,
        alpha: 0,
        delay: 1400,
        duration: 600,
        onComplete: () => effect.destroy(),
    });
    return true;
}
