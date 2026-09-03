import { SignJWT } from "jose";

export const PILOT_SESSION_ISSUER = "kaffekontoret-workadventure";
export const PILOT_SESSION_AUDIENCE = "kaffekontoret-pilot";
export const PILOT_EXTENSION_AUDIENCE = "kaffekontoret-extension";
export const PILOT_CONTEXT_AUDIENCE = "kaffekontoret-context";

export async function mintPilotSessionToken(secret: string, identifier: string): Promise<string> {
    if (secret.length < 32) throw new Error("Pilot session secret must be at least 32 characters");
    if (!identifier.includes("@")) throw new Error("Pilot session requires a member email identifier");
    return (
        new SignJWT({ sub: identifier, email_verified: true })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setIssuer(PILOT_SESSION_ISSUER)
            .setAudience(PILOT_SESSION_AUDIENCE)
            .setIssuedAt()
            .setExpirationTime("10m")
            // Construct the bytes without relying on the browser/JSDOM TextEncoder realm.
            .sign(Uint8Array.from(secret, (character) => character.charCodeAt(0)))
    );
}

export async function mintPilotExtensionToken(secret: string, identifier: string): Promise<string> {
    if (secret.length < 32) throw new Error("Pilot session secret must be at least 32 characters");
    if (!identifier.includes("@")) throw new Error("Pilot extension requires a member email identifier");
    return new SignJWT({ sub: identifier, email_verified: true, token_type: "extension_attestation" })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(PILOT_SESSION_ISSUER)
        .setAudience(PILOT_EXTENSION_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime("10m")
        .sign(Uint8Array.from(secret, (character) => character.charCodeAt(0)));
}

export async function mintPilotContextToken(
    secret: string,
    input: { workspaceId: string; requesterId: string; recipientId: string; kind: string; contextId: string },
): Promise<string> {
    if (secret.length < 32) throw new Error("Pilot session secret must be at least 32 characters");
    if (!input.requesterId.includes("@") || !input.recipientId.includes("@")) {
        throw new Error("Pilot context requires verified member identifiers");
    }
    return new SignJWT({
        workspace_id: input.workspaceId,
        requester_id: input.requesterId,
        recipient_id: input.recipientId,
        kind: input.kind,
        context_id: input.contextId,
        token_type: "context_attestation",
    })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(PILOT_SESSION_ISSUER)
        .setAudience(PILOT_CONTEXT_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime("60s")
        .sign(Uint8Array.from(secret, (character) => character.charCodeAt(0)));
}
