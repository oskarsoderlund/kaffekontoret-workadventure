<script lang="ts">
    import { onDestroy } from "svelte";
    import { z } from "zod";
    import { asError } from "catch-unknown";
    import { gameManager } from "../Phaser/Game/GameManager";
    import {
        officeApi,
        officePrivateConnectedStore,
        officeProviderStatusStore,
        officeToolPanelStore,
        connectOfficePrivate,
        officeAgentPanelOpenStore,
        refreshOfficeJobs,
        officeSelectedJobIdStore,
    } from "../Stores/OfficeBridgeStore";
    interface Props {
        kind: "slack" | "asana";
    }
    let { kind }: Props = $props();
    const controller = new AbortController();
    onDestroy(() => controller.abort());
    const optionSchema = z.object({ id: z.string(), name: z.string() });
    const messageSchema = z.object({ id: z.string(), author: z.string(), text: z.string() });
    const taskSchema = z.object({
        id: z.string(),
        name: z.string(),
        completed: z.boolean().optional(),
        due: z.string().nullable().optional(),
        assignee: z.object({ gid: z.string(), name: z.string().optional() }).nullable().optional(),
        url: z.string().optional(),
        notes: z.string(),
    });
    let options = $state<z.infer<typeof optionSchema>[]>([]);
    let messages = $state<z.infer<typeof messageSchema>[]>([]);
    let tasks = $state<z.infer<typeof taskSchema>[]>([]);
    let assignees = $state<z.infer<typeof optionSchema>[]>([]);
    let selected = $state("");
    let person = $state("");
    let text = $state("");
    let allowAssign = $state(false);
    let allowSend = $state(false);
    let senderName = $state("Slack");
    let allowAgent = $state(false);
    let error = $state("");
    let notice = $state("");
    let busy = $state(false);
    let messageRequestId = crypto.randomUUID();
    let messageSnapshot = "";
    let agentRequestId = crypto.randomUUID();
    let agentSnapshot = "";
    const connected = $derived($officePrivateConnectedStore && $officeProviderStatusStore[kind].connected);
    const target = $derived(options.find((option) => option.id === selected)?.name || "");
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
    async function refresh() {
        await perform(async () => {
            if (kind === "slack") {
                const data = z
                    .object({ channels: z.array(optionSchema), sender: z.string(), allowSend: z.boolean() })
                    .parse(await officeApi("slack/channels", {}, controller.signal));
                options = data.channels;
                senderName = data.sender;
                allowSend = data.allowSend;
            } else {
                const data = z
                    .object({
                        projects: z.array(optionSchema),
                        assignees: z.array(optionSchema),
                        allowAssign: z.boolean(),
                        allowAgentAssignment: z.boolean(),
                    })
                    .parse(await officeApi("asana/projects", {}, controller.signal));
                options = data.projects;
                assignees = data.assignees;
                allowAssign = data.allowAssign;
                allowAgent = data.allowAgentAssignment;
            }
            if (!selected) selected = options[0]?.id || "";
            await loadSelected();
        });
    }
    async function loadSelected() {
        if (!selected) return;
        if (kind === "slack")
            messages = z
                .object({ messages: z.array(messageSchema) })
                .parse(
                    await officeApi(`slack/messages?channel=${encodeURIComponent(selected)}`, {}, controller.signal),
                ).messages;
        else
            tasks = z
                .object({ tasks: z.array(taskSchema) })
                .parse(
                    await officeApi(`asana/tasks?project=${encodeURIComponent(selected)}`, {}, controller.signal),
                ).tasks;
    }
    async function send(event: SubmitEvent) {
        event.preventDefault();
        const snapshot = JSON.stringify({ selected, text });
        if (snapshot !== messageSnapshot) {
            messageRequestId = crypto.randomUUID();
            messageSnapshot = snapshot;
        }
        const submittedText = text;
        const destination = selected;
        const destinationName = target;
        await perform(async () => {
            await officeApi(
                "slack/messages",
                {
                    method: "POST",
                    headers: { "Idempotency-Key": messageRequestId },
                    body: JSON.stringify({ channel: destination, text: submittedText }),
                },
                controller.signal,
            );
            if (text === submittedText) text = "";
            notice = `Meddelandet är skickat till ${destinationName}.`;
            await loadSelected();
        });
    }
    async function assign(task: z.infer<typeof taskSchema>) {
        if (!person) {
            error = "Välj först en person.";
            return;
        }
        await perform(async () => {
            await officeApi(
                "asana/assign",
                {
                    method: "POST",
                    body: JSON.stringify({
                        project: selected,
                        task: task.id,
                        assignee: person === "__unassigned" ? null : person,
                    }),
                },
                controller.signal,
            );
            notice = "Tilldelningen är verifierad i Asana.";
            await loadSelected();
        });
    }
    async function assignAgent(task: z.infer<typeof taskSchema>) {
        const snapshot = JSON.stringify({ selected, task: task.id });
        if (snapshot !== agentSnapshot) {
            agentRequestId = crypto.randomUUID();
            agentSnapshot = snapshot;
        }
        await perform(async () => {
            const assignedJob = z.object({ id: z.string() }).parse(
                await officeApi(
                    "asana/agent-assignment",
                    {
                        method: "POST",
                        headers: { "Idempotency-Key": agentRequestId },
                        body: JSON.stringify({ project: selected, task: task.id }),
                    },
                    controller.signal,
                ),
            );
            officeSelectedJobIdStore.set(assignedJob.id);
            await refreshOfficeJobs(controller.signal);
            officeAgentPanelOpenStore.set(true);
            officeToolPanelStore.set("");
        });
    }
</script>

<section
    style:bottom="var(--office-dock-space, 6rem)"
    aria-label={kind === "slack" ? "Slack i kontoret" : "Asana i kontoret"}
    class="pointer-events-auto fixed right-4 top-16 z-[1100] w-[440px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-white/20 bg-slate-950/95 p-4 text-white shadow-xl"
>
    <div class="flex items-center justify-between">
        <h2 class="m-0 text-lg">{kind === "slack" ? "Slack" : "Asana"}</h2>
        <button
            aria-label="Stäng arbetsverktyg"
            class="rounded-lg bg-white/10 px-3 py-2"
            onclick={() => officeToolPanelStore.set("")}>×</button
        >
    </div>
    {#if !$officePrivateConnectedStore}
        <p class="text-sm">Arbetsdata visas i den privata kopplingen på Macen som kör kontoret.</p>
        <button
            class="rounded-lg bg-lime-300 px-3 py-2 text-sm font-bold text-slate-950"
            disabled={busy}
            onclick={connect}>Anslut privata verktyg</button
        >
    {:else if !connected}
        <p class="text-sm text-amber-200">{kind === "slack" ? "Slack" : "Asana"} är inte anslutet.</p>
        <p class="text-sm">
            Inga kanaler eller projekt är aktiverade. Välj vilka arbetsdata kontoret ska få tillgång till innan
            kopplingen aktiveras.
        </p>
    {:else}
        <p class="text-xs text-teal-200">Privat koppling · gäster kan inte läsa detta innehåll</p>
        <button class="rounded-lg bg-white/10 px-3 py-2 text-sm" onclick={refresh} disabled={busy}
            >Hämta {kind === "slack" ? "kanaler" : "projekt"}</button
        >
        {#if options.length}
            <label for="office-source" class="mt-3 block text-sm">{kind === "slack" ? "Kanal" : "Projekt"}</label
            ><select
                id="office-source"
                bind:value={selected}
                disabled={busy}
                onchange={() => perform(loadSelected)}
                class="mt-1 w-full rounded-lg bg-slate-800 p-2"
                >{#each options as option (option.id)}<option value={option.id}>{option.name}</option>{/each}</select
            >
            <button
                class="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm"
                onclick={() => perform(loadSelected)}
                disabled={busy}>Uppdatera</button
            >
        {/if}
        {#if kind === "slack" && selected}
            <div class="mt-3 space-y-2">
                {#each messages as message (message.id)}<article class="rounded-lg bg-white/5 p-3">
                        <span class="text-xs text-teal-200">{message.author}</span>
                        <p class="m-0 mt-1 whitespace-pre-wrap text-sm">{message.text}</p>
                    </article>{/each}
            </div>
            <p class="text-xs text-slate-300">Meddelanden i {target} (upp till 15 sökträffar).</p>
            {#if allowSend}<p class="text-xs text-slate-300">Skickas som {senderName}.</p>
                <form onsubmit={send}>
                    <label for="slack-message" class="text-sm">Meddelande till {target}</label><textarea
                        id="slack-message"
                        bind:value={text}
                        maxlength="4000"
                        rows="3"
                        required
                        class="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                    ></textarea><button
                        type="submit"
                        disabled={busy}
                        class="mt-2 rounded-lg bg-lime-300 px-3 py-2 text-sm font-bold text-slate-950"
                        >Skicka till {target}</button
                    >
                </form>{/if}
        {:else if kind === "asana" && selected}
            {#if allowAssign}<label for="asana-person" class="mt-3 block text-sm">Person att tilldela</label><select
                    id="asana-person"
                    bind:value={person}
                    disabled={busy}
                    class="mt-1 w-full rounded-lg bg-slate-800 p-2"
                    ><option value="">Välj person</option>
                    <option value="__unassigned">Ej tilldelad</option>{#each assignees as assignee (assignee.id)}<option
                            value={assignee.id}>{assignee.name}</option
                        >{/each}</select
                >{/if}
            <div class="mt-3 space-y-2">
                {#each tasks as task (task.id)}<article class="rounded-lg bg-white/5 p-3">
                        <h3 class="m-0 text-sm">{task.name}</h3>
                        <p class="text-xs text-slate-300">
                            {task.assignee?.name || "Ej tilldelad"}{task.due ? ` · ${task.due}` : ""}{task.completed
                                ? " · Klar"
                                : ""}
                        </p>
                        {#if allowAssign}<button
                                class="rounded-lg bg-white/10 px-3 py-2 text-sm"
                                disabled={busy || !person}
                                onclick={() => assign(task)}
                                >Tilldela {person === "__unassigned"
                                    ? "ingen"
                                    : assignees.find((a) => a.id === person)?.name || "vald person"}</button
                            >{/if}{#if allowAgent}<button
                                class="ml-2 rounded-lg bg-white/10 px-3 py-2 text-sm"
                                disabled={busy}
                                onclick={() => assignAgent(task)}>Ge till Codex</button
                            >
                            <p class="text-xs text-slate-300">
                                AI-ansvar här i kontoret. Asanas personfält ändras inte.
                            </p>{/if}
                    </article>{/each}
            </div>
            <p class="text-xs text-slate-300">Upp till 50 uppgifter i projektet.</p>
        {/if}
    {/if}
    {#if notice}<p aria-live="polite" class="text-sm text-teal-200">{notice}</p>{/if}{#if error}<p
            role="alert"
            class="text-sm text-amber-200"
        >
            {error}
        </p>{/if}
</section>
