<script lang="ts">
    import { onMount } from "svelte";
    import { emoteStore } from "../Stores/EmoteStore";
    import { gameManager } from "../Phaser/Game/GameManager";
    import { waScaleManager } from "../Phaser/Services/WaScaleManager";
    import { SelectCharacterScene, SelectCharacterSceneName } from "../Phaser/Login/SelectCharacterScene";
    import { selectCharacterSceneVisibleStore } from "../Stores/SelectCharacterStore";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import { menuVisiblilityStore } from "../Stores/MenuStore";
    import {
        enableOfficeSound,
        startOfficeSound,
        officeActions,
        officeActionNotice,
        officeSoundEnabled,
    } from "../Phaser/Entity/OfficeAction";
    import { officeLocalToolsAvailable, officeToolPanelStore } from "../Stores/OfficeBridgeStore";
    import { OfficeAgent } from "../Phaser/Entity/OfficeAgent";
    import {
        officeAgentPanelOpenStore,
        officeAgentNoticeStore,
        officeAgentNoticeJobIdStore,
        officeSelectedJobIdStore,
        startOfficePolling,
    } from "../Stores/OfficeBridgeStore";
    import { officeActivityPanelOpenStore, startOfficeActivityPolling } from "../Stores/OfficeActivityStore";
    import {
        OfficeGameClient,
        officeGameState,
        officeFlightOpen,
        officeGameConnected,
    } from "../Phaser/Entity/OfficeGameClient";
    import OfficeGameplay from "./OfficeGameplay.svelte";
    import OfficeMusic from "./OfficeMusic.svelte";
    import OfficeBackgroundMusic from "./OfficeBackgroundMusic.svelte";
    import OfficeAgentPanel from "./OfficeAgentPanel.svelte";
    import OfficeToolsPanel from "./OfficeToolsPanel.svelte";
    import OfficeActivityPanel from "./OfficeActivityPanel.svelte";

    let { height = $bindable(0) }: { height?: number } = $props();

    let client: OfficeGameClient | undefined = $state();
    let gameOpen = $state(false);
    const me = $derived($officeGameState?.players.find((p) => p.id === client?.id));
    let cooldownUntil = 0;
    let lastAction = -1;
    let soundError = $state("");
    let musicOpen = $state(false);
    onMount(() => {
        const scene = gameManager.getCurrentGameScene();
        const bounds = scene.physics.world.bounds;
        waScaleManager.zoomModifier = waScaleManager.getTargetZoomModifierFor(bounds.width, bounds.height);
        overview(0);
        const agent = officeLocalToolsAvailable ? new OfficeAgent(scene) : undefined;
        client = new OfficeGameClient(scene);
        const stopSound = startOfficeSound();
        const onRandomKey = (event: KeyboardEvent) => {
            const target = event.target;
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== "b")
                return;
            if (
                target instanceof HTMLElement &&
                (target.matches("input, textarea, select") || target.isContentEditable)
            )
                return;
            if ($officeFlightOpen || !scene.userInputManager.isControlsEnabled) return;
            event.preventDefault();
            performRandom().catch(() => {
                soundError = "Ljudet kunde inte startas.";
            });
        };
        window.addEventListener("keydown", onRandomKey);
        const stopPolling = startOfficePolling();
        const stopActivityPolling = startOfficeActivityPolling(scene);
        return () => {
            stopSound();
            window.removeEventListener("keydown", onRandomKey);
            client?.destroy();
            agent?.destroy();
            stopPolling();
            stopActivityPolling();
        };
    });
    async function performRandom() {
        if (Date.now() < cooldownUntil) return;
        const candidates = officeActions.map((_, i) => i).filter((i) => i !== lastAction);
        lastAction = candidates[Math.floor(Math.random() * candidates.length)];
        const action = officeActions[lastAction];
        if (Date.now() < cooldownUntil) return;
        cooldownUntil = Date.now() + 2100;
        try {
            if ($officeSoundEnabled) await enableOfficeSound(true);
            emoteStore.set({ emoji: action.token, name: action.label });
        } catch {
            soundError = "Ljud kunde inte startas. Slå på ljud igen.";
            emoteStore.set({ emoji: action.token, name: action.label });
        }
    }
    async function toggleSound() {
        try {
            await enableOfficeSound(!$officeSoundEnabled);
            soundError = "";
        } catch {
            soundError = "Webbläsaren kunde inte slå på ljud.";
        }
    }
    function zoom(factor: number) {
        gameManager.getCurrentGameScene().getCameraManager().smoothZoomByFactor(factor);
    }
    function changeAvatar() {
        selectCharacterSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCharacterSceneName, new SelectCharacterScene());
    }
    function overview(duration = 350) {
        const scene = gameManager.getCurrentGameScene();
        const bounds = scene.physics.world.bounds;
        scene
            .getCameraManager()
            .setPosition(
                { x: bounds.centerX, y: bounds.centerY, width: bounds.width, height: bounds.height },
                duration,
            );
    }
</script>

<div
    class="office-header pointer-events-none fixed top-4 left-4 z-[50] hidden sm:block rounded-xl border border-fuchsia-400/30 bg-slate-950/80 px-3 py-2 text-white shadow-xl"
>
    <div class="text-xs tracking-[0.18em] text-fuchsia-300">OSKAR BUSINESSOS</div>
    <div class="mt-1 text-xs text-cyan-200">NEON ROOFTOP</div>
</div>
<nav
    aria-label="Kontorsverktyg"
    bind:clientHeight={height}
    class="office-tools pointer-events-auto fixed bottom-4 left-4 z-[100000] flex max-h-[35dvh] max-w-[calc(100vw-2rem)] overflow-y-auto flex-wrap items-center gap-2 rounded-2xl border border-fuchsia-400/40 bg-slate-950/90 p-2 text-white shadow-xl backdrop-blur-md"
>
    <div class="flex flex-wrap gap-2">
        <button
            data-testid="office-random-sound"
            aria-label="Slumpat ljud (B)"
            title="Slumpat ljud · B · hörs också av andra som har ljud på"
            class="flex min-h-11 items-center gap-2 rounded-lg bg-fuchsia-300 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-fuchsia-200"
            disabled={$officeFlightOpen}
            onclick={performRandom}
            ><svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3zM16 8c3 2 3 6 0 8M19 5c5 4 5 10 0 14" /></svg
            ><kbd>B</kbd></button
        >
        <button
            class="rounded-lg bg-white/10 px-3 py-2 text-sm"
            data-office-sound-toggle
            onclick={toggleSound}
            aria-pressed={$officeSoundEnabled}>{$officeSoundEnabled ? "🔊 Ljud på" : "🔇 Ljud av"}</button
        >
    </div>
    <OfficeBackgroundMusic />
    <button
        class="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950"
        onclick={() => (gameOpen = !gameOpen)}>🚁 Spela</button
    >
    <button
        class="rounded-lg bg-white/10 px-3 py-2 text-sm"
        aria-pressed={me?.enabled ?? false}
        disabled={!$officeGameConnected || $officeFlightOpen || me?.hp === 0}
        onclick={() => client?.toggleCombat()}>{me?.enabled ? "🎯 Kaos på" : "🎯 Kaos av"}</button
    >
    {#if me?.enabled && !$officeFlightOpen}
        <button class="rounded-lg bg-rose-500 px-3 py-2 text-sm" onclick={() => client?.attack("kick")}
            >Sparka (K)</button
        >
        <span class="text-xs" data-testid="office-health">♥ {me.hp} · {me.kills} poäng</span>
    {/if}

    <div class="flex flex-wrap gap-2">
        <button
            class="rounded-lg bg-white/10 px-3 py-2 text-sm"
            onclick={() => chatVisibilityStore.set(!$chatVisibilityStore)}>Chatt</button
        >
        <button
            class="rounded-lg bg-white/10 px-3 py-2 text-sm"
            onclick={() => menuVisiblilityStore.set(!$menuVisiblilityStore)}>Meny</button
        >
        <button aria-label="Zooma ut" class="rounded-lg bg-white/10 px-3 py-2 text-sm" onclick={() => zoom(0.8)}
            >−</button
        >
        <button aria-label="Zooma in" class="rounded-lg bg-white/10 px-3 py-2 text-sm" onclick={() => zoom(1.25)}
            >+</button
        >
        <button class="rounded-lg bg-white/10 px-3 py-2 text-sm" onclick={() => overview()}>Överblick</button>
        <button class="rounded-lg bg-white/10 px-3 py-2 text-sm" onclick={changeAvatar}>Byt avatar</button>
        <button
            class="rounded-lg bg-white/10 px-3 py-2 text-sm"
            onclick={() => {
                const next = !musicOpen;
                officeActivityPanelOpenStore.set(false);
                officeAgentPanelOpenStore.set(false);
                officeToolPanelStore.set("");
                musicOpen = next;
            }}>♫ Musik</button
        >
        {#if officeLocalToolsAvailable}
            <button
                class="rounded-lg bg-white/10 px-3 py-2 text-sm"
                onclick={() => {
                    officeToolPanelStore.set("");
                    officeAgentPanelOpenStore.set(!$officeAgentPanelOpenStore);
                }}>Codex</button
            >
            <button
                class="rounded-lg bg-white/10 px-3 py-2 text-sm"
                onclick={() => {
                    officeAgentPanelOpenStore.set(false);
                    officeToolPanelStore.set("slack");
                }}>Slack</button
            >
            <button
                class="rounded-lg bg-white/10 px-3 py-2 text-sm"
                onclick={() => {
                    officeAgentPanelOpenStore.set(false);
                    officeToolPanelStore.set("asana");
                }}>Asana</button
            >
        {/if}
    </div>
    <button
        class="rounded-lg bg-white/10 px-3 py-2 text-sm"
        onclick={() => {
            officeAgentPanelOpenStore.set(false);
            officeToolPanelStore.set("");
            musicOpen = false;
            officeActivityPanelOpenStore.set(!$officeActivityPanelOpenStore);
        }}>Arbetsstatus</button
    >
    <p aria-live="polite" data-testid="office-action-notice" class="mb-0 max-w-80 text-xs text-slate-300">
        {soundError || $officeActionNotice}
    </p>
    <a
        href="https://github.com/oskarsoderlund/kaffekontoret-workadventure/tree/codex/gate-4-core"
        class="inline-block text-xs text-slate-400 underline"
        target="_blank"
        rel="noreferrer"
    >
        WorkAdventure · källkod
    </a>
</nav>
{#if musicOpen}<OfficeMusic onclose={() => (musicOpen = false)} />{/if}

{#if $officeAgentPanelOpenStore}<OfficeAgentPanel />{/if}
{#if $officeAgentNoticeStore}<button
        aria-live="polite"
        style:bottom="var(--office-dock-space, 6rem)"
        class="pointer-events-auto fixed right-4 z-[100001] max-w-[calc(100vw-2rem)] rounded-xl bg-teal-700 p-3 text-sm text-white shadow-xl"
        onclick={() => {
            officeActivityPanelOpenStore.set(false);
            officeToolPanelStore.set("");
            officeSelectedJobIdStore.set($officeAgentNoticeJobIdStore);
            officeAgentPanelOpenStore.set(true);
            officeAgentNoticeStore.set("");
        }}>{$officeAgentNoticeStore}</button
    >{/if}

{#if $officeToolPanelStore}{#key $officeToolPanelStore}<OfficeToolsPanel
            kind={$officeToolPanelStore === "asana" ? "asana" : "slack"}
        />{/key}{/if}

{#if $officeActivityPanelOpenStore}<OfficeActivityPanel />{/if}

<OfficeGameplay {client} bind:open={gameOpen} />
