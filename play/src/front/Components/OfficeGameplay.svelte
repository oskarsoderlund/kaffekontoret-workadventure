<script lang="ts">
    import { onMount } from "svelte";
    import type { OfficeGameClient } from "../Phaser/Entity/OfficeGameClient";
    import {
        officeGameState,
        officeGameNotice,
        officeFlightOpen,
        officeGameConnected,
    } from "../Phaser/Entity/OfficeGameClient";
    let { client, open = $bindable(false) }: { client?: OfficeGameClient; open?: boolean } = $props();
    let clock = $state(Date.now());
    let gameFocus = $state(false);
    let showNavigation = $state(false);
    const me = $derived($officeGameState?.players.find((p) => p.id === client?.id));
    const h = $derived($officeGameState?.helicopter);
    const pilot = $derived($officeGameState?.players.find((p) => p.id === h?.pilot));
    const remaining = $derived(Math.max(0, Math.ceil(((h?.deadline ?? 0) - clock) / 1000)));
    $effect(() => {
        document.body.classList.toggle("office-game-focus", gameFocus);
        return () => document.body.classList.remove("office-game-focus");
    });
    onMount(() => {
        const timer = setInterval(() => {
            clock = Date.now();
        }, 200);
        return () => {
            clearInterval(timer);
        };
    });
</script>

{#if open && !$officeFlightOpen}
    <section
        aria-label="Spel och uppdrag"
        class="pointer-events-auto fixed left-4 z-[100001] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-cyan-300/50 bg-slate-950/95 p-5 text-white shadow-xl"
        style:bottom="var(--office-dock-space, 7rem)"
        style:max-height="calc(100dvh - var(--office-dock-space, 7rem) - 2rem)"
    >
        <div class="flex justify-between">
            <h2 class="text-lg font-bold text-cyan-200">NEON EXPRESS · Takfesten</h2>
            <button aria-label="Stäng spelpanelen" onclick={() => (open = false)}>✕</button>
        </div>
        <p class="text-sm">
            Takfesten saknar sin DJ. Hämta DJ Nova på hamntaket och flyg tillbaka innan nedräkningen på 60 sekunder tar
            slut.
        </p>
        <p class="text-sm text-slate-300">
            1. Gå till helikopterplattan uppe till vänster. 2. Flyg till den rosa DJ-plattan och landa med E. 3. Flyg
            hem till den blå festplattan och landa igen. WASD/pilar styr. Släpp styrningen innan du landar.
        </p>
        <p class="rounded-xl border border-fuchsia-300/30 bg-fuchsia-400/10 p-3 text-sm text-fuchsia-100">
            Kort flygtävling: en hemkomst vinner rundan. Tre gula bonusportar ligger på omvägar — ta dem för högre poäng
            och upp till tre stjärnor, eller flyg direkt för en snabb tid. Turas om och slå kompisens rekord.
        </p>
        <button
            class="my-2 rounded-lg bg-cyan-300 p-3 font-bold text-slate-950"
            disabled={!$officeGameConnected || h?.pilot != null}
            onclick={() => client?.send({ type: "launch" })}>Starta helikopteruppdrag</button
        >
        {#if h?.pilot != null}<p class="text-sm">{pilot?.name ?? "En kollega"} flyger just nu.</p>
            <button class="rounded-lg bg-violet-700 p-3" onclick={() => client?.openFlight()}
                >{h.pilot === client?.id ? "Återgå till helikoptern" : "Följ flygningen"}</button
            >{/if}
        {#if $officeGameNotice !== $officeGameState?.result}
            <p aria-live="polite" class="text-sm text-yellow-200">{$officeGameNotice}</p>
        {/if}
        <p class="text-sm text-emerald-200">{$officeGameState?.result ?? "Ansluter till spelservern…"}</p>
        <h3 class="mt-4 text-sm font-bold">Skjuta och sparka</h3>
        <p class="text-sm">
            Alla spelare på marken kan träffas. Sikta med musen, håll vänster musknapp för pistol och tryck K för spark.
            100 hälsa, 25 skada per träff. Du återkommer efter 2,5 sekunder. Blå hälsomätare betyder tillfälligt skydd.
        </p>
        {#if $officeGameState?.scores.length}<h3 class="text-sm font-bold">Kvällens topplista</h3>
            <ol class="text-sm">
                {#each $officeGameState.scores as score, i (`${score.name}-${score.seconds}-${i}`)}<li>
                        {score.name} · {score.points} p · {score.seconds} s
                    </li>{/each}
            </ol>{/if}
    </section>
{/if}
{#if $officeFlightOpen}
    <aside
        aria-label="Helikopteruppdrag"
        data-testid="office-flight"
        data-x={h?.x}
        data-y={h?.y}
        data-phase={h?.phase}
        data-pilot={h?.pilot ?? "none"}
        style:max-height="calc(100dvh - var(--office-dock-space, 7rem) - 2rem)"
        class="pointer-events-auto fixed top-4 left-4 z-[100001] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-cyan-300/50 bg-slate-950/95 p-4 text-white shadow-xl"
    >
        <h2 class="text-lg font-bold text-cyan-200">
            NEON EXPRESS · {h?.phase === "parked" ? "Resultat" : h?.pilot === client?.id ? "Du är pilot" : "Åskådare"}
        </h2>
        <p class="mb-1 text-sm">
            {h?.phase === "outbound"
                ? "1 / 2 · Hämta DJ Nova i hamnen ↗"
                : h?.phase === "returning"
                  ? "2 / 2 · DJ:n är ombord — hem till festen ↙"
                  : $officeGameState?.result}
        </p>
        {#if h?.pilot != null}<p class="text-sm font-bold text-yellow-200">
                {remaining} s · Bonusportar {h.rings.length}/3
            </p>{/if}
        <button
            class="mb-2 rounded-lg bg-white/10 px-3 py-2 text-sm sm:hidden"
            aria-expanded={showNavigation}
            onclick={() => (showNavigation = !showNavigation)}
            >{showNavigation ? "Dölj karta" : "Karta och styrning"}</button
        >
        <div class={showNavigation ? "block" : "hidden sm:block"}>
            {#if h?.pilot != null}
                <p class="text-xs text-slate-300">
                    {h.pilot === client?.id
                        ? "WASD/pilar · Släpp styrningen, E landar · Gula portar: valfri omväg för bonus"
                        : `${pilot?.name ?? "Piloten"} styr helikoptern. Du följer flygningen och ser samma resultat.`}
                </p>
                {#if h.pilot === client?.id}
                    <p aria-live="polite" class="mb-2 max-w-96 text-xs text-yellow-200">{$officeGameNotice}</p>
                {/if}
            {/if}
            <svg
                viewBox="0 0 3200 2000"
                role="img"
                aria-label="Minikarta: blått är takfesten, rosa är DJ:n, vitt är helikoptern"
                class="mb-3 h-20 w-32 rounded-lg border border-cyan-300/40 bg-slate-800"
            >
                <path d="M 580 1480 L 2650 400" stroke="#94a3b8" stroke-width="18" stroke-dasharray="40 40" />
                {#each [{ x: 1000, y: 700 }, { x: 1700, y: 1400 }, { x: 2300, y: 950 }] as ring, i (i)}<circle
                        cx={ring.x}
                        cy={ring.y}
                        r="55"
                        fill={h?.rings.includes(i) ? "#34d399" : "#fde047"}
                    />{/each}
                <circle cx="580" cy="1480" r="100" fill="#22d3ee" />
                <circle cx="2650" cy="400" r="100" fill="#f472b6" />
                <circle cx={h?.x ?? 580} cy={h?.y ?? 1480} r="70" fill="white" stroke="#0f172a" stroke-width="18" />
            </svg>
        </div>
        {#if h?.pilot === client?.id}<button
                class="mr-2 rounded-lg bg-cyan-300 p-2 text-sm font-bold text-slate-950"
                onclick={() => client?.land()}>Landa / hämta (E)</button
            >{/if}
        <button
            class="rounded-lg bg-white/10 p-2 text-sm"
            onclick={() => {
                client?.closeFlight();
                open = true;
            }}>{h?.pilot === client?.id ? "Avbryt och gå tillbaka" : "Till kontoret"}</button
        >
        {#if h?.pilot === client?.id}<div class="mt-3 flex gap-2" aria-label="Flygkontroller">
                {#each [["a", "←"], ["w", "↑"], ["s", "↓"], ["d", "→"]] as [key, label] (key)}<button
                        class="touch-none rounded-lg bg-white/20 px-5 py-3"
                        aria-label={`Flyg ${label}`}
                        onpointerdown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            client?.setFlightKey(key, true);
                        }}
                        onpointerup={() => client?.setFlightKey(key, false)}
                        onpointercancel={() => client?.setFlightKey(key, false)}>{label}</button
                    >{/each}
            </div>{/if}
    </aside>
{/if}
{#if open || $officeFlightOpen || me?.enabled || gameFocus}
    <div
        class="pointer-events-auto fixed right-4 z-[100001] rounded-xl bg-slate-950/95 p-2 text-white"
        style:bottom="var(--office-dock-space, 7rem)"
    >
        <button
            data-testid="office-game-focus"
            aria-pressed={gameFocus}
            class="rounded-lg px-3 py-2 text-sm"
            onclick={() => (gameFocus = !gameFocus)}
            >{gameFocus ? "Visa samtalsrutor" : "Spelfokus: dölj samtalsrutor"}</button
        >
        {#if gameFocus}<p class="mb-0 px-3 text-xs text-slate-300">Samtalet fortsätter.</p>{/if}
    </div>
{/if}
{#if me?.hp === 0}
    <div
        role="status"
        class="pointer-events-none fixed top-1/2 left-1/2 z-[100002] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-slate-950/95 p-6 text-center text-white"
    >
        <strong class="text-2xl text-rose-300">DÖD</strong>
        <p>Du återkommer om 2,5 sekunder med fullt liv och ett kort skydd.</p>
    </div>
{/if}

<style>
    :global(body.office-game-focus [data-testid="cameras-container"]),
    :global(body.office-game-focus [data-testid="pip-local-camera-overlay"]) {
        visibility: hidden;
        pointer-events: none;
    }
    :global(body.office-in-flight .username-display),
    :global(body.office-in-flight .office-header) {
        visibility: hidden;
    }
</style>
