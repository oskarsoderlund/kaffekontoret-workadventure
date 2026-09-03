import { randomUUID } from "node:crypto";
import type { Application, Request, Response } from "express";
import { z } from "zod";
import { PILOT_SESSION_SECRET, PILOT_WORKSPACE_ID } from "../enums/EnvironmentVariable";
import type { JWTTokenManager } from "../services/JWTTokenManager";
import { mintPilotContextToken } from "../services/PilotSessionToken";
import { socketManager } from "../services/SocketManager";
import { BaseHttpController } from "./BaseHttpController";

const contextRequestSchema = z.object({
    recipientId: z.string().email().max(256),
    kind: z.enum(["knock", "come_here", "screen_share", "spotify_question"]),
    roomId: z.string().min(1).max(2_048),
});

/** Mints a one-minute consent context only for users in the same live proximity group. */
export class PilotContextTokenController extends BaseHttpController {
    constructor(
        app: Application,
        private readonly jwtTokenManager: JWTTokenManager,
    ) {
        super(app);
    }

    routes(): void {
        this.app.post("/pilot/context-token", async (req: Request, res: Response) => {
            if (!PILOT_SESSION_SECRET) {
                res.status(503).json({ error: "pilot_auth_not_configured" });
                return;
            }

            const authorization = req.header("authorization") ?? "";
            const token = authorization.startsWith("Bearer ")
                ? authorization.slice("Bearer ".length).trim()
                : authorization.trim();
            if (!token || token.length > 8_192) {
                res.status(401).json({ error: "unauthorized" });
                return;
            }

            const parsed = contextRequestSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: "invalid_request" });
                return;
            }

            try {
                const session = await this.jwtTokenManager.verifyJWTToken(token);
                if (!session.accessToken || !session.identifier.includes("@")) {
                    res.status(403).json({ error: "pilot_member_required" });
                    return;
                }
                if (
                    !socketManager.areUsersInSameGroup(parsed.data.roomId, session.identifier, parsed.data.recipientId)
                ) {
                    res.status(403).json({ error: "consent_context_unavailable" });
                    return;
                }

                const contextToken = await mintPilotContextToken(PILOT_SESSION_SECRET, {
                    workspaceId: PILOT_WORKSPACE_ID,
                    requesterId: session.identifier,
                    recipientId: parsed.data.recipientId,
                    kind: parsed.data.kind,
                    contextId: randomUUID(),
                });
                res.status(200).json({ contextToken, expiresInSeconds: 60 });
            } catch {
                res.status(401).json({ error: "unauthorized" });
            }
        });
    }
}
