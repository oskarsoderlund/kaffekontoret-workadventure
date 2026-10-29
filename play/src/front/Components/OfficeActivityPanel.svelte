<script lang="ts">
    import { asError } from "catch-unknown";
    import { gameManager } from "../Phaser/Game/GameManager";
    import type { OfficeActivityApp } from "../Stores/OfficeActivityStore";
    import {
        officeActivityPanelOpenStore,
        officeOwnActivityStore,
        officePresenceStore,
        shareOfficeActivity,
        stopSharingOfficeActivity,
    } from "../Stores/OfficeActivityStore";
    let app = $state<OfficeActivityApp>("Codex");
    let detail = $state("");
    let error = $state("");
    function share(event: SubmitEvent) {
        event.preventDefault();
        try {
            shareOfficeActivity(gameManager.getCurrentGameScene(), app, detail);
            error = "";
        } catch (e) {
            error = asError(e).message;
        }
    }
</script>

<section
    style:bottom="var(--office-dock-space, 6rem)"
    aria-label="Arbetsstatus i kontoret"
    class="pointer-events-auto fixed right-4 top-16 z-[1200] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-white/20 bg-slate-950/95 p-4 text-white shadow-xl"
>
    <div class="flex items-center justify-between">
        <h2 class="m-0 text-lg">Arbetsstatus</h2>
        <button
            aria-label="Stäng arbetsstatus"
            class="rounded-lg bg-white/10 px-3 py-2"
            onclick={() => officeActivityPanelOpenStore.set(false)}>×</button
        >
    </div>
    <p class="text-sm">Välj själv vad du vill visa för andra i rummet.</p>
    <form onsubmit={share}>
        <label for="office-activity-app" class="block text-sm">Verktyg eller aktivitet</label><select
            id="office-activity-app"
            bind:value={app}
            class="mt-1 w-full rounded-lg bg-slate-800 p-2"
            ><option>Codex</option><option>Shopify</option><option>Annat</option></select
        >
        <label for="office-activity-detail" class="mt-3 block text-sm">Vad arbetar du med?</label><input
            id="office-activity-detail"
            bind:value={detail}
            maxlength="80"
            class="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
            placeholder="Exempel: planerar nästa kampanj"
        />
        <button type="submit" class="mt-3 rounded-lg bg-lime-300 px-3 py-2 text-sm font-bold text-slate-950"
            >Dela min status i två minuter</button
        >
    </form>
    {#if $officeOwnActivityStore}<button
            class="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm"
            onclick={() => stopSharingOfficeActivity(gameManager.getCurrentGameScene())}>Sluta dela min status</button
        >{/if}
    <p class="text-xs text-slate-300">
        Det är en manuellt vald status. Webbflikar, skärmbilder och arbetsdata läses inte. Statusen försvinner när tiden
        går ut eller du slutar dela.
    </p>
    <h3 class="mt-4 text-base">Synliga kollegor som delar status</h3>
    <div data-testid="office-presence" class="space-y-2">
        {#each $officePresenceStore as presence (presence.id)}<article class="rounded-lg bg-white/5 p-3">
                <strong class="text-sm">{presence.name}</strong>
                <p class="mb-0 mt-1 text-sm text-teal-200">
                    {presence.activity.app}{presence.activity.detail ? ` · ${presence.activity.detail}` : ""}
                </p>
            </article>{:else}<p class="text-sm text-slate-300">Ingen delar arbetsstatus just nu.</p>{/each}
    </div>
    {#if error}<p role="alert" class="text-sm text-amber-200">{error}</p>{/if}
</section>
