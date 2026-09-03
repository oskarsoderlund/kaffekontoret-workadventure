import { describe, expect, it } from "vitest";
import { isAuthenticatedUserAllowed } from "../../src/pusher/services/AuthenticatedUserAccess";

describe("isAuthenticatedUserAllowed", () => {
    it("keeps the upstream unrestricted behavior when no allowlist is configured", () => {
        expect(isAuthenticatedUserAllowed("person@example.com", [], [])).toBe(true);
    });

    it("allows an exact email without depending on casing or surrounding spaces", () => {
        expect(isAuthenticatedUserAllowed(" Person@Example.com ", ["person@example.com"], [], true)).toBe(true);
    });

    it("allows every account in an explicitly configured domain", () => {
        expect(isAuthenticatedUserAllowed("person@kaffekassan.se", [], ["kaffekassan.se"], true)).toBe(true);
    });

    it("rejects emails outside both allowlists", () => {
        expect(
            isAuthenticatedUserAllowed("person@outside.example", ["consultant@gmail.com"], ["kaffekassan.se"], true),
        ).toBe(false);
    });

    it("does not treat a domain suffix as the allowed domain", () => {
        expect(isAuthenticatedUserAllowed("person@notkaffekassan.se", [], ["kaffekassan.se"], true)).toBe(false);
    });

    it("rejects an unverified identity even when its email is allowlisted", () => {
        expect(isAuthenticatedUserAllowed("person@kaffekassan.se", [], ["kaffekassan.se"], false)).toBe(false);
        expect(isAuthenticatedUserAllowed("person@kaffekassan.se", [], ["kaffekassan.se"])).toBe(false);
    });
});
