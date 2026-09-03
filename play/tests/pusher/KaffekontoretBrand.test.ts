import { describe, expect, it, vi } from "vitest";

import sourcePage from "../../public/static/kaffekontoret/source.html?raw";

vi.mock("../../src/pusher/enums/EnvironmentVariable", async () => import("./mocks/pusherEnvironmentVariableMock"));

import { localAdmin } from "../../src/pusher/services/LocalAdmin";
import { MetaTagsDefaultValue } from "../../src/pusher/services/MetaTagsBuilder";

describe("Kaffekontoret branding", () => {
    it("uses Kaffekontoret metadata and install assets", () => {
        expect(MetaTagsDefaultValue).toMatchObject({
            title: "Kaffekontoret",
            author: "Kaffekassan",
            provider: "Kaffekassan",
            appName: "Kaffekontoret",
            shortAppName: "KK",
            themeColor: "#1B3730",
        });
        expect(MetaTagsDefaultValue.favIcons[0]?.src).toBe("/static/kaffekontoret/kk-icon.svg");
        expect(MetaTagsDefaultValue.manifestIcons[0]?.src).toBe("/static/kaffekontoret/kk-icon.svg");
    });

    it("exposes branding, privacy and source attribution on local rooms", async () => {
        const details = await localAdmin.fetchMapDetails("https://office.example/_/global/maps.example/map.tmj");

        if (!("metatags" in details)) {
            throw new Error("Expected map details");
        }

        expect(details).toMatchObject({
            roomName: "Kaffekontoret",
            loadingLogo: "/static/kaffekontoret/kaffekontoret-logo.svg",
            loginSceneLogo: "/static/kaffekontoret/kaffekontoret-logo.svg",
            errorSceneLogo: "/static/kaffekontoret/kaffekontoret-logo.svg",
            showPoweredBy: true,
            backgroundColor: "#1B3730",
            primaryColor: "#EAFACF",
            contactPage: "/static/kaffekontoret/source.html",
            legals: {
                termsOfUseUrl: "/static/kaffekontoret/terms.html",
                privacyPolicyUrl: "/static/kaffekontoret/privacy.html",
            },
        });
    });

    it("keeps the source and license links in the shipped static page", () => {
        expect(sourcePage).toContain("github.com/oskarsoderlund/kaffekontoret-workadventure");
        expect(sourcePage).toContain("github.com/workadventure/workadventure");
        expect(sourcePage).toMatch(/GNU Affero General Public License\s+version 3/);
        expect(sourcePage).toContain("Commons Clause");
    });
});
