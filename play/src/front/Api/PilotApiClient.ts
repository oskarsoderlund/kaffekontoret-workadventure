export interface PilotSession {
    token: string;
    extensionToken: string;
    /** Original WorkAdventure auth token; used only at the pusher context-minting boundary. */
    workAdventureAuthToken: string;
    backendUrl: string;
}

export interface SpotifyDisclosure {
    trackId: string;
    title: string;
    artist: string;
    artworkUrl?: string;
    spotifyUrl: string;
    expiresAt: string;
}

export type ActivityCategory = "operations" | "support" | "marketing" | "focus" | "away";

let session: PilotSession | undefined;

export function setPilotSession(next: PilotSession): void {
    session = next;
}

export function clearPilotSession(): void {
    session = undefined;
}

export function hasPilotSession(): boolean {
    return session !== undefined;
}

async function request<T>(path: string, init: RequestInit = {}, includeExtensionAttestation = false): Promise<T> {
    if (!session) throw new Error("pilot_session_missing");
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${session.token}`);
    if (includeExtensionAttestation) headers.set("x-kaffekontoret-extension-token", session.extensionToken);
    headers.set("accept", "application/json");
    const response = await fetch(new URL(path, session.backendUrl), { ...init, headers, credentials: "same-origin" });
    if (!response.ok) {
        const payload = (await response.json().catch(() => undefined)) as { error?: unknown } | undefined;
        throw new Error(typeof payload?.error === "string" ? payload.error : `pilot_http_${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
}

export function getSpotifyDisclosure(): Promise<SpotifyDisclosure | { sharing: false }> {
    return request("/api/pilot/spotify/disclosure");
}

export function shareCurrentSpotifyTrack(): Promise<SpotifyDisclosure> {
    return request("/api/pilot/spotify/share-current", { method: "POST" });
}

export function setSpotifyContinuous(enabled: boolean): Promise<{ mode: "private" | "continuous" }> {
    return request("/api/pilot/spotify/mode", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
    });
}

export function getSpotifyMode(): Promise<{ mode: "private" | "continuous" }> {
    return request("/api/pilot/spotify/mode");
}

export function refreshSpotify(): Promise<SpotifyDisclosure | { sharing: false }> {
    return request("/api/pilot/spotify/refresh", { method: "POST" });
}

export function getOperationsSummary(metricId: string): Promise<Record<string, unknown>> {
    return request(`/api/pilot/operations/${encodeURIComponent(metricId)}`);
}

export function getActivity(userId: string): Promise<{ category: ActivityCategory; expiresAt: string }> {
    return request(`/api/pilot/activity/${encodeURIComponent(userId)}`);
}

export function mintConsentContext(
    recipientId: string,
    kind: "knock" | "come_here" | "screen_share" | "spotify_question",
    roomId: string,
): Promise<{ contextToken: string; expiresInSeconds: number }> {
    if (!session) return Promise.reject(new Error("pilot_session_missing"));
    const headers = new Headers({
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${session.workAdventureAuthToken}`,
    });
    return fetch(new URL("/pilot/context-token", session.backendUrl), {
        method: "POST",
        headers,
        body: JSON.stringify({ recipientId, kind, roomId }),
        credentials: "same-origin",
    }).then(async (response) => {
        if (!response.ok) {
            const payload = (await response.json().catch(() => undefined)) as { error?: unknown } | undefined;
            throw new Error(typeof payload?.error === "string" ? payload.error : `pilot_http_${response.status}`);
        }
        return (await response.json()) as { contextToken: string; expiresInSeconds: number };
    });
}

export function requestConsent(
    recipientId: string,
    kind: "knock" | "come_here" | "screen_share" | "spotify_question",
    contextToken: string,
): Promise<Record<string, unknown>> {
    return request("/api/pilot/consent", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-kaffekontoret-context-token": contextToken,
        },
        body: JSON.stringify({ recipientId, kind }),
    });
}

export interface PendingConsent {
    id: string;
    requesterId: string;
    recipientId: string;
    kind: "knock" | "come_here" | "screen_share" | "spotify_question";
    state: "pending" | "accepted" | "declined" | "cancelled" | "expired";
    expiresAt: string;
}

export function getPendingConsents(): Promise<{ requests: PendingConsent[] }> {
    return request("/api/pilot/consent/pending");
}

export function respondConsent(id: string, decision: "accepted" | "declined"): Promise<PendingConsent> {
    return request(`/api/pilot/consent/${encodeURIComponent(id)}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
    });
}
