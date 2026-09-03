<script lang="ts">
    import { onMount } from "svelte";
    import {
        getSpotifyDisclosure,
        getSpotifyMode,
        getOperationsSummary,
        getPendingConsents,
        hasPilotSession,
        refreshSpotify,
        respondConsent,
        setSpotifyContinuous,
        shareCurrentSpotifyTrack,
        type PendingConsent,
        type SpotifyDisclosure,
    } from "../Api/PilotApiClient";
    import { pilotPanelVisibleStore } from "../Stores/PilotPanelStore";
    import { mapEditorModeStore, mapExplorationModeStore } from "../Stores/MapEditorStore";
    import { gameManager } from "../Phaser/Game/GameManager";
    import { EditorToolName } from "../Phaser/Game/MapEditor/MapEditorModeManager";

    let loading = $state(false);
    let error = $state<string | undefined>();
    let continuous = $state(false);
    let disclosure = $state<SpotifyDisclosure | undefined>();
    let metricId = $state("");
    let operationsSummary = $state<Record<string, unknown> | undefined>();
    let pendingConsents = $state<PendingConsent[]>([]);

    function formatValue(value: unknown): string {
        if (value === undefined || value === null) return "—";
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
        return "—";
    }

    function setDisclosure(result: SpotifyDisclosure | { sharing: false }): void {
        disclosure = "trackId" in result ? result : undefined;
    }

    function openBuildMode(): void {
        const scene = gameManager.getCurrentGameScene();
        const manager = scene?.getMapEditorModeManager();
        if (!manager) {
            error = "Byggläget är inte tillgängligt i den här världen.";
            return;
        }
        mapEditorModeStore.switchMode(true);
        mapExplorationModeStore.set(false);
        manager.equipTool(EditorToolName.EntityEditor);
        pilotPanelVisibleStore.set(false);
    }

    async function loadDisclosure(): Promise<void> {
        if (!hasPilotSession()) return;
        try {
            const result = await getSpotifyDisclosure();
            setDisclosure(result);
        } catch (reason) {
            error = reason instanceof Error ? reason.message : "kunde inte läsa Spotify";
        }
    }

    async function loadMode(): Promise<void> {
        if (!hasPilotSession()) return;
        try {
            continuous = (await getSpotifyMode()).mode === "continuous";
        } catch {
            // A user without a configured Spotify connection sees the private default.
        }
    }

    async function shareCurrent(): Promise<void> {
        loading = true;
        error = undefined;
        try {
            disclosure = await shareCurrentSpotifyTrack();
        } catch (reason) {
            error = reason instanceof Error ? reason.message : "kunde inte dela låten";
        } finally {
            loading = false;
        }
    }

    async function toggleContinuous(): Promise<void> {
        loading = true;
        error = undefined;
        try {
            const result = await setSpotifyContinuous(!continuous);
            // eslint-disable-next-line require-atomic-updates
            continuous = result.mode === "continuous";
            if (!continuous) disclosure = undefined;
        } catch (reason) {
            error = reason instanceof Error ? reason.message : "kunde inte ändra Spotify-läge";
        } finally {
            loading = false;
        }
    }

    async function refresh(): Promise<void> {
        loading = true;
        error = undefined;
        try {
            const result = await refreshSpotify();
            setDisclosure(result);
        } catch (reason) {
            error = reason instanceof Error ? reason.message : "kunde inte uppdatera Spotify";
        } finally {
            loading = false;
        }
    }

    async function loadOperations(): Promise<void> {
        if (!metricId.trim()) return;
        loading = true;
        error = undefined;
        try {
            operationsSummary = await getOperationsSummary(metricId.trim());
        } catch (reason) {
            error = reason instanceof Error ? reason.message : "kunde inte läsa driftmåttet";
            operationsSummary = undefined;
        } finally {
            loading = false;
        }
    }

    async function loadPendingConsents(): Promise<void> {
        if (!hasPilotSession()) return;
        try {
            pendingConsents = (await getPendingConsents()).requests.filter((item) => item.state === "pending");
        } catch {
            // Consent notifications are best-effort and must never interrupt movement or media.
        }
    }

    async function decideConsent(id: string, decision: "accepted" | "declined"): Promise<void> {
        loading = true;
        error = undefined;
        try {
            await respondConsent(id, decision);
            const consent = pendingConsents.find((item) => item.id === id);
            if (decision === "accepted" && consent?.kind === "spotify_question") {
                // Accepting the icebreaker means one current-track disclosure, never continuous sharing.
                disclosure = await shareCurrentSpotifyTrack();
            }
            pendingConsents = pendingConsents.filter((item) => item.id !== id);
        } catch (reason) {
            error = reason instanceof Error ? reason.message : "kunde inte svara på förfrågan";
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        loadDisclosure().catch(() => undefined);
        loadMode().catch(() => undefined);
        loadPendingConsents().catch(() => undefined);
        const pendingTimer = window.setInterval(() => {
            loadPendingConsents().catch(() => undefined);
        }, 5_000);
        return () => window.clearInterval(pendingTimer);
    });
</script>

{#if $pilotPanelVisibleStore}
    <div
        class="fixed inset-0 z-[1800] pointer-events-auto flex items-start justify-end p-4"
        role="dialog"
        aria-label="Kaffekontoret"
    >
        <button
            class="absolute inset-0 bg-black/40 cursor-default"
            aria-label="Stäng"
            onclick={() => pilotPanelVisibleStore.set(false)}
        ></button>
        <section
            class="relative w-full max-w-sm rounded-xl bg-contrast/95 text-white shadow-2xl border border-white/10 p-5 space-y-5"
        >
            <header class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-amber-300">Kaffekontoret</p>
                    <h2 class="text-xl font-bold">Workspace-signaler</h2>
                    <p class="text-sm text-white/70 mt-1">Privat som standard. Du väljer själv vad andra får se.</p>
                </div>
                <button
                    class="text-2xl leading-none text-white/70 hover:text-white"
                    aria-label="Stäng"
                    onclick={() => pilotPanelVisibleStore.set(false)}>×</button
                >
            </header>

            <div class="rounded-lg bg-white/5 p-4 space-y-3">
                <div>
                    <h3 class="font-semibold">Spotify</h3>
                    <p class="text-xs text-white/60">Låtstatus delas aldrig automatiskt.</p>
                </div>
                <div class="flex gap-2">
                    <button
                        class="rounded bg-amber-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                        disabled={loading}
                        onclick={shareCurrent}
                    >
                        Dela låten jag spelar
                    </button>
                    <button
                        class="rounded border border-white/20 px-3 py-2 text-sm disabled:opacity-50"
                        disabled={loading}
                        onclick={toggleContinuous}
                    >
                        {continuous ? "Stäng av löpande" : "Tillåt löpande"}
                    </button>
                </div>
                {#if disclosure}
                    <div class="flex items-center gap-3 rounded bg-black/20 p-2">
                        {#if disclosure.artworkUrl}<img
                                src={disclosure.artworkUrl}
                                alt=""
                                class="h-10 w-10 rounded"
                            />{/if}
                        <div class="min-w-0 text-sm">
                            <p class="truncate font-semibold">{disclosure.title}</p>
                            <p class="truncate text-white/60">{disclosure.artist}</p>
                        </div>
                        <button class="ml-auto text-xs text-amber-300" onclick={refresh}>Uppdatera</button>
                    </div>
                {:else}
                    <p class="text-xs text-white/60">Ingen låt delas just nu.</p>
                {/if}
            </div>

            <div class="rounded-lg bg-white/5 p-4 space-y-3">
                <div>
                    <h3 class="font-semibold">Operations</h3>
                    <p class="text-xs text-white/60">
                        Visa ett konfigurerat driftmått. Endast aggregerade värden lämnar källsystemet.
                    </p>
                </div>
                <form
                    class="flex gap-2"
                    onsubmit={(event) => {
                        event.preventDefault();
                        loadOperations().catch(() => undefined);
                    }}
                >
                    <input
                        bind:value={metricId}
                        class="min-w-0 flex-1 rounded border border-white/20 bg-black/20 px-2 py-2 text-sm"
                        placeholder="metric-id"
                        aria-label="Driftmåttets id"
                    />
                    <button
                        class="rounded border border-white/20 px-3 py-2 text-sm disabled:opacity-50"
                        disabled={loading || !metricId.trim()}>Visa</button
                    >
                </form>
                {#if operationsSummary}
                    <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                        <dt class="text-white/60">Värde</dt>
                        <dd class="text-right">{formatValue(operationsSummary.value)}</dd>
                        <dt class="text-white/60">Status</dt>
                        <dd class="text-right">{formatValue(operationsSummary.status)}</dd>
                        <dt class="text-white/60">Källa</dt>
                        <dd class="text-right">{formatValue(operationsSummary.source)}</dd>
                    </dl>
                {/if}
            </div>

            <div class="rounded-lg bg-white/5 p-4 space-y-3">
                <div>
                    <h3 class="font-semibold">Bygg världen</h3>
                    <p class="text-xs text-white/60">
                        Forma ditt skrivbord och de gemensamma ytorna. Strukturella ändringar kräver admin-behörighet.
                    </p>
                </div>
                <button
                    class="w-full rounded bg-lime-200 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-lime-100"
                    onclick={openBuildMode}
                >
                    Öppna byggläge
                </button>
            </div>

            {#if pendingConsents.length > 0}
                <div class="rounded-lg bg-amber-300/10 p-4 space-y-3 border border-amber-300/20">
                    <div>
                        <h3 class="font-semibold">Förfrågningar</h3>
                        <p class="text-xs text-white/60">Du bestämmer alltid om en kontakt eller delning ska ske.</p>
                    </div>
                    {#each pendingConsents as consent (consent.id)}
                        <div class="rounded bg-black/20 p-3 space-y-2">
                            <p class="text-sm">
                                <span class="font-semibold">{consent.requesterId}</span> frågar om {consent.kind ===
                                "spotify_question"
                                    ? "vad du lyssnar på"
                                    : consent.kind === "screen_share"
                                      ? "skärmdelning"
                                      : consent.kind === "come_here"
                                        ? "att du kommer dit"
                                        : "kontakt"}.
                            </p>
                            <div class="flex gap-2">
                                <button
                                    class="rounded bg-amber-400 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
                                    disabled={loading}
                                    onclick={() => decideConsent(consent.id, "accepted")}>Acceptera</button
                                >
                                <button
                                    class="rounded border border-white/20 px-3 py-1.5 text-sm disabled:opacity-50"
                                    disabled={loading}
                                    onclick={() => decideConsent(consent.id, "declined")}>Avböj</button
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}

            {#if error}<p class="rounded bg-red-500/20 p-2 text-sm text-red-200">{error}</p>{/if}
        </section>
    </div>
{/if}
