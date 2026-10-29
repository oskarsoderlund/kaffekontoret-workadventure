import { derived, writable } from "svelte/store";
import { z } from "zod";

const stateSchema = z.enum([
    "idle",
    "private",
    "queued",
    "running",
    "done",
    "needs_decision",
    "failed",
    "cancelled",
    "offline",
]);
const agentSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: stateSchema,
    title: z.string(),
    sharing: z.boolean(),
});
const jobSchema = z.object({
    id: z.string(),
    title: z.string(),
    state: stateSchema,
    summary: z.string(),
    result: z.string(),
    decision: z.string(),
    error: z.string(),
    created: z.string(),
});
const jobsSchema = z.object({ jobs: z.array(jobSchema), sharing: z.boolean(), publicTitle: z.string() });
export type OfficeJob = z.infer<typeof jobSchema>;
export type OfficeAgentState = z.infer<typeof stateSchema>;
export const officeAgentPanelOpenStore = writable(false);
export const officeToolPanelStore = writable<"" | "slack" | "asana">("");
export const officePrivateConnectedStore = writable(false);
export const officeJobsStore = writable<OfficeJob[]>([]);
export const officeAgentPublicStore = writable<z.infer<typeof agentSchema>>({
    id: "codex",
    name: "Codex",
    state: "offline",
    title: "",
    sharing: false,
});
export const officeBridgeErrorStore = writable("");
export const officeAgentNoticeStore = writable("");
export const officeAgentNoticeJobIdStore = writable("");
export const officeSelectedJobIdStore = writable("");
export const officeProviderStatusStore = writable({
    slack: { connected: false, mode: "unconfigured" },
    asana: { connected: false, mode: "unconfigured" },
});
export const officeStateLabels: Record<z.infer<typeof stateSchema>, string> = {
    idle: "Tillgänglig",
    private: "Privat",
    queued: "Väntar",
    running: "Arbetar",
    done: "Klar",
    needs_decision: "Behöver beslut",
    failed: "Kunde inte slutföra",
    cancelled: "Avbruten",
    offline: "Offline",
};
export const officeAgentDisplayStore = derived(
    [officeAgentPublicStore, officeJobsStore, officePrivateConnectedStore],
    ([agent, jobs, connected]) => {
        const own = jobs.find((job) => job.state === "running" || job.state === "queued") || jobs[0];
        return connected && own ? { ...agent, state: own.state, title: own.title } : agent;
    },
);
// The owner-only Mac bridge is intentionally unavailable on the hosted office.
export const officeLocalToolsAvailable = ["localhost", "office.localhost", "127.0.0.1"].includes(
    window.location.hostname,
);
let privateToken = "";
const seenStates = new Map<string, string>();

export async function officeApi(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<unknown> {
    if (!officeLocalToolsAvailable) throw new Error("Privata Mac-verktyg finns bara i det lokala kontoret.");
    const headers = new Headers(options.headers);
    if (privateToken) headers.set("Authorization", `Bearer ${privateToken}`);
    if (options.body) headers.set("Content-Type", "application/json");
    const response = await fetch(`/office-api/${path}`, {
        ...options,
        headers,
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(16000)]) : AbortSignal.timeout(16000),
    });
    const value: unknown = await response.json();
    if (!response.ok) {
        const error = z.object({ message: z.string() }).safeParse(value);
        throw new Error(error.success ? error.data.message : "Kontrolltjänsten kunde inte nås.");
    }
    return value;
}

export async function refreshOfficeJobs(signal?: AbortSignal) {
    if (!privateToken) return;
    const tokenAtStart = privateToken;
    const data = jobsSchema.parse(await officeApi("jobs", {}, signal));
    if (tokenAtStart !== privateToken || signal?.aborted) return;
    officeJobsStore.set(data.jobs);
    for (const job of data.jobs) {
        const previous = seenStates.get(job.id);
        if (previous && previous !== job.state && ["done", "needs_decision", "failed"].includes(job.state)) {
            officeAgentNoticeJobIdStore.set(job.id);
            officeAgentNoticeStore.set(`Codex: ${officeStateLabels[job.state]} — ${job.title}`);
        }
        seenStates.set(job.id, job.state);
    }
}
export async function connectOfficePrivate(name: string, signal?: AbortSignal) {
    if (!officeLocalToolsAvailable) throw new Error("Privata Mac-verktyg finns bara i det lokala kontoret.");
    const response = await fetch("http://localhost:4390/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Privata verktyg kan bara anslutas från den här Macen.");
    const data = z.object({ token: z.string(), owner: z.string() }).parse(await response.json());
    if (signal?.aborted) return;
    privateToken = data.token;
    officePrivateConnectedStore.set(true);
    const session = z
        .object({
            providers: z.object({
                slack: z.object({ connected: z.boolean(), mode: z.string() }),
                asana: z.object({ connected: z.boolean(), mode: z.string() }),
            }),
        })
        .parse(await officeApi("session", {}, signal));
    officeProviderStatusStore.set(session.providers);
    officeBridgeErrorStore.set("");
    await refreshOfficeJobs(signal);
}
export function disconnectOfficePrivate() {
    privateToken = "";
    officePrivateConnectedStore.set(false);
    officeJobsStore.set([]);
    officeProviderStatusStore.set({
        slack: { connected: false, mode: "unconfigured" },
        asana: { connected: false, mode: "unconfigured" },
    });
    officeAgentNoticeStore.set("");
    officeAgentNoticeJobIdStore.set("");
    officeSelectedJobIdStore.set("");
    seenStates.clear();
}
export async function submitOfficeJob(title: string, prompt: string, requestId: string, signal?: AbortSignal) {
    const job = jobSchema.parse(
        await officeApi(
            "jobs",
            { method: "POST", headers: { "Idempotency-Key": requestId }, body: JSON.stringify({ title, prompt }) },
            signal,
        ),
    );
    officeSelectedJobIdStore.set(job.id);
    await refreshOfficeJobs(signal);
    return job;
}
export async function answerOfficeJob(jobId: string, answer: string, signal?: AbortSignal) {
    await officeApi(
        `jobs/${encodeURIComponent(jobId)}/decision`,
        { method: "POST", body: JSON.stringify({ answer }) },
        signal,
    );
    await refreshOfficeJobs(signal);
}
export async function cancelOfficeJob(jobId: string, signal?: AbortSignal) {
    await officeApi(`jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST", body: "{}" }, signal);
    await refreshOfficeJobs(signal);
}
export async function shareOfficeAgentStatus(enabled: boolean, title: string, signal?: AbortSignal) {
    const data = agentSchema.parse(
        await officeApi("sharing", { method: "POST", body: JSON.stringify({ enabled, title }) }, signal),
    );
    officeAgentPublicStore.set(data);
}
export function startOfficePolling() {
    if (!officeLocalToolsAvailable) return () => undefined;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
        try {
            const data = agentSchema.parse(await officeApi("public/agents/codex", {}, controller.signal));
            if (controller.signal.aborted) return;
            officeAgentPublicStore.set(data);
            if (privateToken) await refreshOfficeJobs(controller.signal);
        } catch {
            if (controller.signal.aborted) return;
            officeAgentPublicStore.set({ id: "codex", name: "Codex", state: "offline", title: "", sharing: false });
            officeBridgeErrorStore.set("Kontrolltjänsten svarar inte. Privata verktyg uppdateras inte just nu.");
        }
        if (!controller.signal.aborted)
            timer = setTimeout(() => {
                poll().catch(() => officeBridgeErrorStore.set("Kontrolltjänsten kunde inte uppdateras."));
            }, 2000);
    };
    poll().catch(() => officeBridgeErrorStore.set("Kontrolltjänsten kunde inte uppdateras."));
    return () => {
        controller.abort();
        if (timer) clearTimeout(timer);
    };
}
