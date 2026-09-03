<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { getActivity, type ActivityCategory } from "../Api/PilotApiClient";

    interface Props {
        userId?: string;
    }

    let { userId }: Props = $props();
    let category = $state<ActivityCategory | undefined>();

    const labels: Record<ActivityCategory, string> = {
        operations: "Operations",
        support: "Support",
        marketing: "Marketing",
        focus: "Fokus",
        away: "Borta",
    };

    const colors: Record<ActivityCategory, string> = {
        operations: "bg-cyan-300",
        support: "bg-violet-300",
        marketing: "bg-pink-300",
        focus: "bg-amber-300",
        away: "bg-white/40",
    };

    let refreshTimer: number | undefined;

    async function refresh(): Promise<void> {
        if (!userId?.includes("@")) return;
        try {
            category = (await getActivity(userId)).category;
        } catch {
            category = undefined;
            // Activity is optional and ephemeral; absence is the neutral UI state.
        }
    }

    onMount(() => {
        refresh().catch(() => undefined);
        refreshTimer = window.setInterval(() => {
            refresh().catch(() => undefined);
        }, 90_000);
    });

    onDestroy(() => {
        if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
    });
</script>

{#if category}
    <span
        class="inline-block h-2 w-2 flex-shrink-0 rounded-full {colors[category]}"
        title={labels[category]}
        aria-label={`Aktivitet: ${labels[category]}`}
    ></span>
{/if}
