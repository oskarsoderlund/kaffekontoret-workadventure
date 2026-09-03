import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => ({
    PILOT_SESSION_SECRET: "pilot-session-secret-that-is-at-least-32-chars",
    PILOT_WORKSPACE_ID: "kaffekontoret",
}));

const { areUsersInSameGroup } = vi.hoisted(() => ({ areUsersInSameGroup: vi.fn() }));
const { mintPilotContextToken } = vi.hoisted(() => ({
    mintPilotContextToken: vi.fn().mockResolvedValue("signed-context-token"),
}));
vi.mock("../../src/pusher/services/SocketManager", () => ({
    socketManager: { areUsersInSameGroup },
}));
vi.mock("../../src/pusher/services/PilotSessionToken", () => ({
    mintPilotContextToken,
}));

import { PilotContextTokenController } from "../../src/pusher/controllers/PilotContextTokenController";

type RouteHandler = (request: Request, response: Response) => Promise<void>;

function createMockApp(): { post: ReturnType<typeof vi.fn>; routes: Map<string, RouteHandler> } {
    const routes = new Map<string, RouteHandler>();
    return {
        post: vi.fn((path: string, handler: RouteHandler) => routes.set(path, handler)),
        routes,
    };
}

function createResponse(): Response & { statusCode: number; body?: unknown } {
    const response = {
        statusCode: 200,
        body: undefined as unknown,
        status: vi.fn(function (this: typeof response, statusCode: number) {
            this.statusCode = statusCode;
            return this;
        }),
        json: vi.fn(function (this: typeof response, body: unknown) {
            this.body = body;
            return this;
        }),
    } as unknown as Response & { statusCode: number; body?: unknown };
    return response;
}

function createRequest(body: unknown, authorization = "Bearer wa-token"): Request {
    return {
        body,
        header: (name: string) => (name.toLowerCase() === "authorization" ? authorization : undefined),
    } as unknown as Request;
}

describe("PilotContextTokenController", () => {
    const jwtTokenManager = {
        verifyJWTToken: vi.fn().mockResolvedValue({
            identifier: "alice@kaffekassan.se",
            accessToken: "oidc-access-token",
        }),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("mints a short-lived context only for a live proximity group", async () => {
        areUsersInSameGroup.mockReturnValue(true);
        const app = createMockApp();
        new PilotContextTokenController(app as never, jwtTokenManager as never);
        const response = createResponse();

        await app.routes.get("/pilot/context-token")?.(
            createRequest({
                recipientId: "bob@kaffekassan.se",
                kind: "spotify_question",
                roomId: "https://pilot.example/_/global/maps.example/map.tmj",
            }),
            response,
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject({ expiresInSeconds: 60 });
        expect(response.body).toMatchObject({ contextToken: "signed-context-token" });
        expect(mintPilotContextToken).toHaveBeenCalledWith("pilot-session-secret-that-is-at-least-32-chars", {
            workspaceId: "kaffekontoret",
            requesterId: "alice@kaffekassan.se",
            recipientId: "bob@kaffekassan.se",
            kind: "spotify_question",
            contextId: expect.any(String),
        });
        expect(areUsersInSameGroup).toHaveBeenCalledWith(
            "https://pilot.example/_/global/maps.example/map.tmj",
            "alice@kaffekassan.se",
            "bob@kaffekassan.se",
        );
    });

    it("fails closed when the pair is not in the same group", async () => {
        areUsersInSameGroup.mockReturnValue(false);
        const app = createMockApp();
        new PilotContextTokenController(app as never, jwtTokenManager as never);
        const response = createResponse();

        await app.routes.get("/pilot/context-token")?.(
            createRequest({ recipientId: "bob@kaffekassan.se", kind: "screen_share", roomId: "room" }),
            response,
        );

        expect(response.statusCode).toBe(403);
        expect(response.body).toEqual({ error: "consent_context_unavailable" });
    });

    it("rejects malformed context requests before looking up room state", async () => {
        const app = createMockApp();
        new PilotContextTokenController(app as never, jwtTokenManager as never);
        const response = createResponse();

        await app.routes.get("/pilot/context-token")?.(
            createRequest({ recipientId: "not-an-email", kind: "screen_share", roomId: "room" }),
            response,
        );

        expect(response.statusCode).toBe(400);
        expect(areUsersInSameGroup).not.toHaveBeenCalled();
    });
});
