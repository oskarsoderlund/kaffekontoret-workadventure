<script lang="ts">
    import { onMount } from "svelte";

    const preferenceKey = "office.backgroundMusic.enabled.v1";
    let audio: HTMLAudioElement;
    let enabled = $state(readPreference());
    let playing = $state(false);
    let error = $state("");

    function readPreference(): boolean {
        try {
            return localStorage.getItem(preferenceKey) !== "false";
        } catch {
            return true;
        }
    }

    function savePreference(): void {
        try {
            localStorage.setItem(preferenceKey, String(enabled));
        } catch {
            // Playback still works when browser storage is unavailable.
        }
    }

    function start(): void {
        if (!enabled || !audio || !audio.paused) return;
        audio.play().catch((cause: unknown) => {
            // Autoplay may need the player's first click/key; pausing can cancel an in-flight play().
            if (cause instanceof DOMException && ["NotAllowedError", "AbortError"].includes(cause.name)) return;
            if (enabled) error = "Bakgrundsmusiken kunde inte startas. Försök igen.";
        });
    }

    function toggle(): void {
        if (playing) {
            enabled = false;
            savePreference();
            audio.pause();
            playing = false;
        } else {
            enabled = true;
            savePreference();
            if (error) {
                error = "";
                audio.load();
            }
            start();
        }
    }

    function unlock(event: Event): void {
        // Let the button's click handler decide its action, avoiding a pointerdown/click toggle race.
        if (event.target instanceof Element && event.target.closest("[data-background-music-toggle]")) return;
        start();
    }

    onMount(() => {
        audio.volume = 0.32;
        document.addEventListener("pointerdown", unlock, true);
        document.addEventListener("keydown", unlock, true);
        start();
        return () => {
            document.removeEventListener("pointerdown", unlock, true);
            document.removeEventListener("keydown", unlock, true);
            audio.pause();
        };
    });
</script>

<button
    data-background-music-toggle
    class="rounded-lg bg-white/10 px-3 py-2 text-sm"
    aria-pressed={playing}
    title="Neon Rooftop · egen synth/funk. Bakgrundsmusik bara för dig."
    onclick={toggle}>{playing ? "♫ Bakgrund på" : enabled ? "▶ Starta musik" : "♫ Bakgrund av"}</button
>
<audio
    bind:this={audio}
    data-testid="office-background-audio"
    src="/office/music/neon-rooftop.ogg"
    loop
    preload="auto"
    onplaying={() => {
        if (!enabled) {
            audio.pause();
            return;
        }
        playing = true;
        error = "";
    }}
    onpause={() => (playing = false)}
    onerror={() => {
        playing = false;
        if (enabled) error = "Bakgrundsmusiken kunde inte laddas. Försök igen.";
    }}
></audio>
{#if error}<p role="alert" class="m-0 max-w-64 text-xs text-amber-200">{error}</p>{/if}
