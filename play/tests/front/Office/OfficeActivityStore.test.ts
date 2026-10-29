import { describe, expect, it } from "vitest";
import { visibleActivity } from "../../../src/front/Stores/OfficeActivityStore";

describe("user-consented room activity", () => {
    it("does not display unshared, malformed or oversized activity", () => {
        expect(visibleActivity(undefined, 1000)).toBeNull();
        expect(visibleActivity({ app: "Unknown", detail: "private", expiresAt: 2000 }, 1000)).toBeNull();
        expect(visibleActivity({ app: "Codex", detail: "x".repeat(81), expiresAt: 2000 }, 1000)).toBeNull();
    });
    it("hides activity at the expiration boundary without treating it as current work", () => {
        const activity = { app: "Shopify", detail: "Drafting a storefront", expiresAt: 2000 };
        expect(visibleActivity(activity, 1999)).toEqual(activity);
        expect(visibleActivity(activity, 2000)).toBeNull();
        expect(visibleActivity(activity, 2001)).toBeNull();
    });
});
