<script lang="ts">
    import { onDestroy } from "svelte";
    import { asError } from "catch-unknown";
    import { gameManager } from "../Phaser/Game/GameManager";
    import {
        connectOfficePrivate,
        disconnectOfficePrivate,
        officePrivateConnectedStore,
        officeJobsStore,
        officeAgentPanelOpenStore,
        officeStateLabels,
        officeSelectedJobIdStore,
        officeAgentPublicStore,
        submitOfficeJob,
        answerOfficeJob,
        cancelOfficeJob,
        shareOfficeAgentStatus,
    } from "../Stores/OfficeBridgeStore";
    const controller = new AbortController();
    onDestroy(() => controller.abort());
    let title = $state("");
    let prompt = $state("");
    let answer = $state("");
    let publicTitle = $state("");
    let error = $state("");
    let busy = $state(false);
    let requestId = crypto.randomUUID();
    let previousInput = "";
    const selectedJob = $derived(
        $officeJobsStore.find((job) => job.id === $officeSelectedJobIdStore) || $officeJobsStore[0],
    );
    const running = $derived($officeJobsStore.some((job) => job.state === "running" || job.state === "queued"));
    async function perform(action: () => Promise<unknown>) {
        busy = true;
        error = "";
        try {
            await action();
        } catch (e) {
            if (!controller.signal.aborted) error = asError(e).message;
        } finally {
            if (!controller.signal.aborted) busy = false;
        }
    }
    async function connect() {
        await perform(() => connectOfficePrivate(gameManager.getPlayerName() || "Kontorsägare", controller.signal));
    }
    async function submit(event: SubmitEvent) {
        event.preventDefault();
        const input = JSON.stringify({ title, prompt });
        if (input !== previousInput) {
            requestId = crypto.randomUUID();
            previousInput = input;
        }
        const submittedTitle = title;
        const submittedPrompt = prompt;
        await perform(async () => {
            await submitOfficeJob(submittedTitle, submittedPrompt, requestId, controller.signal);
            if (title === submittedTitle && prompt === submittedPrompt) {
                title = "";
                prompt = "";
            }
        });
    }
    async function decide(event: SubmitEvent) {
        event.preventDefault();
        if (!selectedJob) return;
        const submittedAnswer = answer;
        await perform(async () => {
            await answerOfficeJob(selectedJob.id, submittedAnswer, controller.signal);
            if (answer === submittedAnswer) answer = "";
        });
    }
</script>

<section
    style:bottom="var(--office-dock-space, 6rem)"
    aria-label="Codex-agent"
    class="pointer-events-auto fixed right-4 top-16 z-[1100] w-[440px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-white/20 bg-slate-950/95 p-4 text-white shadow-xl"
>
    <div class="flex items-center justify-between">
        <h2 class="m-0 text-lg">Codex</h2>
        <button
            aria-label="Stäng Codex"
            class="rounded-lg bg-white/10 px-3 py-2"
            onclick={() => officeAgentPanelOpenStore.set(false)}>×</button
        >
    </div>
    <p class="text-sm text-teal-200">{officeStateLabels[selectedJob?.state || $officeAgentPublicStore.state]}</p>
    {#if !$officePrivateConnectedStore}
        <p class="text-sm">Privata uppgifter och resultat är tillgängliga på Macen som kör kontoret.</p>
        <button
            class="rounded-lg bg-lime-300 px-3 py-2 text-sm font-bold text-slate-950"
            onclick={connect}
            disabled={busy}>Anslut privata verktyg</button
        >
    {:else}
        <form onsubmit={submit} class="mt-3">
            <label for="agent-title" class="block text-sm">Uppgiftens namn</label><input
                id="agent-title"
                bind:value={title}
                maxlength="80"
                required
                class="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
            />
            <label for="agent-prompt" class="mt-3 block text-sm">Uppgift och kontext</label><textarea
                id="agent-prompt"
                bind:value={prompt}
                maxlength="6000"
                rows="4"
                required
                class="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
            ></textarea>
            <p class="text-xs text-slate-300">
                Codex arbetar med texten du skickar. Lokala filer och externa system är inte anslutna.
            </p>
            <button
                type="submit"
                disabled={busy || running}
                class="rounded-lg bg-lime-300 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
                >Ge Codex uppgiften</button
            >
        </form>
        {#if $officeJobsStore.length > 1}<label for="office-job-history" class="mt-4 block text-sm">Välj uppgift</label
            ><select
                id="office-job-history"
                bind:value={$officeSelectedJobIdStore}
                class="mt-1 w-full rounded-lg bg-slate-800 p-2"
                ><option value="">Senaste uppgiften</option>{#each $officeJobsStore as job (job.id)}<option
                        value={job.id}>{job.title} · {officeStateLabels[job.state]}</option
                    >{/each}</select
            >{/if}
        {#if selectedJob}
            <article data-testid="agent-result" class="mt-4 rounded-lg bg-white/5 p-3">
                <h3 class="m-0 text-base">{selectedJob.title}</h3>
                <p class="text-sm">{officeStateLabels[selectedJob.state]}</p>
                {#if selectedJob.summary}<p class="text-sm">{selectedJob.summary}</p>{/if}
                {#if selectedJob.result}<p class="whitespace-pre-wrap text-sm">{selectedJob.result}</p>{/if}
                {#if selectedJob.error}<p class="text-sm text-amber-200">{selectedJob.error}</p>{/if}
                {#if selectedJob.state === "needs_decision"}
                    <form onsubmit={decide}>
                        <p class="text-sm text-amber-200">{selectedJob.decision}</p>
                        <label for="agent-answer" class="text-sm">Ditt beslut eller svar</label><textarea
                            id="agent-answer"
                            bind:value={answer}
                            rows="2"
                            maxlength="3000"
                            required
                            class="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                        ></textarea><button
                            disabled={busy}
                            type="submit"
                            class="mt-2 rounded-lg bg-lime-300 px-3 py-2 text-sm font-bold text-slate-950"
                            >Lämna beslut</button
                        >
                    </form>
                {:else if selectedJob.state === "running"}
                    <button
                        class="rounded-lg bg-white/10 px-3 py-2 text-sm"
                        onclick={() => perform(() => cancelOfficeJob(selectedJob.id, controller.signal))}
                        >Avbryt uppgiften</button
                    >
                {/if}
            </article>
        {/if}
        <div class="mt-4 border-t border-white/10 pt-3">
            <label for="agent-public-title" class="text-sm">Statusrubrik som andra får se</label><input
                id="agent-public-title"
                bind:value={publicTitle}
                maxlength="80"
                class="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                placeholder="Exempel: arbetar med veckoplanering"
            />
            <button
                class="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm"
                onclick={() =>
                    perform(() =>
                        shareOfficeAgentStatus(!$officeAgentPublicStore.sharing, publicTitle, controller.signal),
                    )}
                >{$officeAgentPublicStore.sharing ? "Sluta dela agentstatus" : "Dela agentstatus i kontoret"}</button
            >
            <p class="text-xs text-slate-300">
                Delning visar status och rubriken ovan. Uppgiftstext och resultat är privata.
            </p>
        </div>
        <button class="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm" onclick={disconnectOfficePrivate}
            >Koppla från privata verktyg</button
        >
    {/if}
    {#if error}<p role="alert" class="text-sm text-amber-200">{error}</p>{/if}
</section>
