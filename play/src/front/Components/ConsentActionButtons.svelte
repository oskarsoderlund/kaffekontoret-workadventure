<script lang="ts">
    import { connectionManager } from "../Connection/ConnectionManager";
    import { mintConsentContext, requestConsent } from "../Api/PilotApiClient";

    interface Props {
        recipientId: string;
    }

    let { recipientId }: Props = $props();
    let busy = $state(false);
    let message = $state<string | undefined>();

    function stopPropagation(event: MouseEvent): void {
        event.stopPropagation();
    }

    async function ask(kind: "knock" | "screen_share" | "spotify_question"): Promise<void> {
        if (busy) return;
        const roomId = connectionManager.currentRoom?.key;
        if (!roomId || !recipientId.includes("@")) {
            message = "Förfrågan kräver en aktiv medlemsprofil.";
            return;
        }
        busy = true;
        message = undefined;
        try {
            const { contextToken } = await mintConsentContext(recipientId, kind, roomId);
            await requestConsent(recipientId, kind, contextToken);
            message =
                kind === "spotify_question"
                    ? "Frågan skickad"
                    : kind === "screen_share"
                      ? "Skärmbegäran skickad"
                      : "Knackningen skickad";
        } catch {
            // The server deliberately returns the same failure for stale/non-eligible context.
            message = "Inte tillgängligt i den här kontexten.";
        } finally {
            // eslint-disable-next-line require-atomic-updates
            busy = false;
        }
    }
</script>

{#if recipientId.includes("@")}
    <div class="mt-1 flex flex-wrap gap-1">
        <button
            class="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/80 hover:bg-white/10 disabled:opacity-50"
            disabled={busy}
            title="Skicka en artig knackning"
            onclick={(event) => {
                stopPropagation(event);
                ask("knock").catch(() => undefined);
            }}>Knacka</button
        >
        <button
            class="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/80 hover:bg-white/10 disabled:opacity-50"
            disabled={busy}
            title="Fråga vad personen lyssnar på"
            onclick={(event) => {
                stopPropagation(event);
                ask("spotify_question").catch(() => undefined);
            }}>Spotify?</button
        >
        <button
            class="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/80 hover:bg-white/10 disabled:opacity-50"
            disabled={busy}
            title="Be om skärmdelning"
            onclick={(event) => {
                stopPropagation(event);
                ask("screen_share").catch(() => undefined);
            }}>Skärm?</button
        >
    </div>
    {#if message}<p class="text-[10px] text-white/55">{message}</p>{/if}
{/if}
