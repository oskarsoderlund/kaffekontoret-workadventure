import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Välkommen till {worldName}",
        description:
            "Gå runt som på ett vanligt kontor. Samtal börjar när du går nära någon, och du styr alltid kamera och mikrofon.",
        start: "Visa mig",
        skip: "Hoppa över",
    },
    movement: {
        title: "Gå runt",
        descriptionDesktop: "Använd piltangenterna eller WASD. Du kan också högerklicka dit du vill gå. Prova nu.",
        descriptionMobile: "Styr med joysticken eller tryck dit du vill gå. Prova nu.",
        next: "Nästa",
    },
    communication: {
        title: "Samtal börjar när ni möts",
        description: "När du går nära en kollega hamnar ni i samma samtal. Gå därifrån när du vill lämna samtalet.",
        video: "./static/Videos/Meet.mp4",
        next: "Jag fattar",
    },
    lockBubble: {
        title: "Gör samtalet privat",
        description: "Lås samtalet när ni inte vill att fler ska kunna gå in i det.",
        video: "./static/Videos/LockBubble.mp4",
        hint: "Tryck på det markerade låset och testa.",
        next: "Nästa",
    },
    screenSharing: {
        title: "Dela din skärm",
        description:
            "Du väljer själv skärm, fönster eller flik i webbläsarens dialog. Ingen annan kan starta delning åt dig.",
        video: "./static/images/screensharing.mp4",
        hint: "Tryck på den markerade knappen för att testa.",
        next: "Nästa",
    },
    pictureInPicture: {
        title: "Ha samtalet ovanpå",
        description: "Bild-i-bild håller videosamtalet synligt när du går runt i kontoret.",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "Tryck på den markerade knappen för att testa.",
        next: "Nästa",
    },
    complete: {
        title: "Klart",
        description: "Nu kan du gå in i {worldName}. Hjälpen finns alltid i menyn.",
        finish: "Gå in",
    },
} satisfies Translation["onboarding"];
