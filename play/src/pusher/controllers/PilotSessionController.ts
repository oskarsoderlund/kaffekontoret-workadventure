import type { Application, Request, Response } from "express";
import { PILOT_SESSION_SECRET } from "../enums/EnvironmentVariable";
import type { JWTTokenManager } from "../services/JWTTokenManager";
import { mintPilotExtensionToken, mintPilotSessionToken } from "../services/PilotSessionToken";
import { BaseHttpController } from "./BaseHttpController";

/**
 * Exchanges a WorkAdventure-authenticated session for a short-lived pilot token.
 * The pusher has already completed the OIDC callback and allowlist check; the pilot
 * backend never receives the WorkAdventure signing key or an OIDC refresh token.
 */
export class PilotSessionController extends BaseHttpController {
    constructor(
        app: Application,
        private readonly jwtTokenManager: JWTTokenManager,
    ) {
        super(app);
    }

    routes(): void {
        this.app.post("/pilot/session", async (req: Request, res: Response) => {
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

            try {
                const session = await this.jwtTokenManager.verifyJWTToken(token);
                // Anonymous/API-issued sessions do not carry a verified OIDC access token.
                if (!session.accessToken || !session.identifier.includes("@")) {
                    res.status(403).json({ error: "pilot_member_required" });
                    return;
                }

                const [pilotToken, extensionToken] = await Promise.all([
                    mintPilotSessionToken(PILOT_SESSION_SECRET, session.identifier),
                    mintPilotExtensionToken(PILOT_SESSION_SECRET, session.identifier),
                ]);

                res.status(200).json({ token: pilotToken, extensionToken, expiresInSeconds: 600 });
            } catch {
                res.status(401).json({ error: "unauthorized" });
            }
        });
    }
}
