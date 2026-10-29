<script lang="ts">
    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();
    let link = $state("");
    let embed = $state("");
    let error = $state("");

    function loadMusic(event: SubmitEvent) {
        event.preventDefault();
        try {
            const url = new URL(link);
            const match =
                /^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9]{22})\/?$/.exec(
                    url.pathname,
                );
            if (url.protocol !== "https:" || url.hostname !== "open.spotify.com" || !match) {
                throw new Error("Invalid Spotify URL");
            }
            embed = `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`;
            error = "";
        } catch {
            error = "Klistra in en Spotify-länk till en låt, spellista eller ett album.";
        }
    }
</script>

<section
    style:bottom="var(--office-dock-space, 6rem)"
    aria-label="Spotify i kontoret"
    class="pointer-events-auto fixed right-4 top-16 z-[1000] overflow-y-auto w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-white/20 bg-slate-950/95 p-4 text-white shadow-xl"
>
    <div class="mb-3 flex items-center justify-between">
        <h2 class="m-0 text-lg">♫ Spotify</h2>
        <button aria-label="Stäng musik" class="rounded-lg bg-white/10 px-3 py-2" onclick={onclose}>×</button>
    </div>
    <form onsubmit={loadMusic}>
        <label for="office-spotify" class="text-sm">Spotify-länk</label>
        <input
            id="office-spotify"
            type="url"
            bind:value={link}
            class="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
            placeholder="https://open.spotify.com/playlist/…"
            required
        />
        <button type="submit" class="mt-2 rounded-lg bg-lime-300 px-3 py-2 text-sm font-bold text-slate-950"
            >Öppna spelare</button
        >
    </form>
    {#if error}<p role="alert" class="text-sm text-amber-200">{error}</p>{/if}
    {#if embed}
        <iframe
            title="Spotify-spelare"
            src={embed}
            width="100%"
            height="352"
            class="mt-3 rounded-xl border-0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowfullscreen
        ></iframe>
    {/if}
    <p class="mb-0 mt-3 text-xs text-slate-300">
        Spelas för dig. Full uppspelning beror på ditt Spotify-konto och webbläsaren. Stäng spelaren för att stoppa
        musiken.
    </p>
</section>
