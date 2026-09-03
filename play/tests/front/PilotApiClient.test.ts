import { afterEach, describe, expect, it, vi } from "vitest";
import {
    clearPilotSession,
    getActivity,
    getOperationsSummary,
    mintConsentContext,
    setPilotSession,
} from "../../src/front/Api/PilotApiClient";

describe("PilotApiClient", () => {
    afterEach(() => {
        clearPilotSession();
        vi.unstubAllGlobals();
    });

    it("keeps extension attestation off activity reads and operations reads", async () => {
        const requests: RequestInit[] = [];
        vi.stubGlobal(
            "fetch",
            vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
                requests.push(init ?? {});
                return Promise.resolve(
                    new Response(JSON.stringify({ category: "operations", expiresAt: "2026-09-03T12:00:00.000Z" }), {
                        status: 200,
                    }),
                );
            }),
        );
        setPilotSession({
            token: "pilot-token",
            extensionToken: "extension-token",
            workAdventureAuthToken: "wa-token",
            backendUrl: "https://pilot.example.test/",
        });

        await getActivity("member@example.com");
        await getOperationsSummary("orders_today");

        expect(new Headers(requests[0].headers).has("x-kaffekontoret-extension-token")).toBe(false);
        expect(new Headers(requests[1].headers).has("x-kaffekontoret-extension-token")).toBe(false);
    });

    it("uses the original WorkAdventure token only for context minting", async () => {
        const requests: RequestInit[] = [];
        vi.stubGlobal(
            "fetch",
            vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
                requests.push(init ?? {});
                return Promise.resolve(
                    new Response(JSON.stringify({ contextToken: "context", expiresInSeconds: 60 }), { status: 200 }),
                );
            }),
        );
        setPilotSession({
            token: "pilot-token",
            extensionToken: "extension-token",
            workAdventureAuthToken: "wa-token",
            backendUrl: "https://pilot.example.test/",
        });

        await mintConsentContext("member@example.com", "spotify_question", "room");

        const headers = new Headers(requests[0].headers);
        expect(headers.get("authorization")).toBe("Bearer wa-token");
        expect(headers.has("x-kaffekontoret-extension-token")).toBe(false);
    });
});
