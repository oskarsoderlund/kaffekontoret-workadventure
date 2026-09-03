import type { BaseTranslation } from "../i18n-types";

const warning: BaseTranslation = {
    title: "Observera",
    content: `This world is close to its limit!. You can upgrade its capacity <a href="{upgradeLink}" target="_blank">here</a>`,
    limit: "This world is close to its limit!",
    accessDenied: {
        camera: "Kameraåtkomst nekades. Kontrollera webbläsarens behörigheter.",
        screenSharing: "Skärmdelning nekades. Kontrollera webbläsarens behörigheter.",
        teleport: "Du får inte hoppa direkt till den personen.",
        room: "Du har inte åtkomst till det här rummet.",
    },
    importantMessage: "Important message",
    connectionLost: "Anslutningen bröts. Försöker igen...",
    connectionLostTitle: "Anslutningen bröts",
    connectionLostSubtitle: "Försöker ansluta igen",
    waitingConnectionTitle: "Väntar på anslutning",
    waitingConnectionSubtitle: "Ansluter",
    megaphoneNeeds: "To use the megaphone, you must activate your camera or your microphone or share your screen.",
    mapEditorShortCut: "There was an error while trying to open the map editor.",
    mapEditorNotEnabled: "The map editor is not enabled on this world.",
    popupBlocked: {
        title: "Popup blocked",
        content: "Please allow popups for this website in your browser settings.",
        done: "Ok",
    },
    backgroundProcessing: {
        failedToApply: "Failed to apply background effects",
    },
    duplicateUserConnected: {
        title: "Already connected",
        message:
            "You are already connected to this room from another tab or device. To avoid conflicts, please close the other tab or window.",
        confirmContinue: "I understand, continue",
        dontRemindAgain: "Don't show this message again",
    },
    browserNotSupported: {
        title: "😢 Browser Not Supported",
        message: "Your browser ({browserName}) is no longer supported by WorkAdventure.",
        description: "Your browser is too old to run WorkAdventure. Please update to the latest version to continue.",
        whatToDo: "What can you do?",
        option1: "Update {browserName} to the latest version",
        option2: "Leave WorkAdventure and use a different browser",
        updateBrowser: "Update Browser",
        leave: "Leave",
    },
    pwaInstall: {
        title: "Installera Kaffekontoret",
        description: "Installera kontoret för snabbare åtkomst och ett eget appfönster.",
        descriptionIos: "Lägg Kaffekontoret på hemskärmen för snabbare åtkomst.",
        feature1Title: "Snabb åtkomst",
        feature1Description: "Öppna Kaffekontoret från startmenyn, Dock eller skrivbordet.",
        feature2Title: "Eget appfönster",
        feature2Description: "Håll kontoret separat från resten av webbläsarens flikar.",
        feature3Title: "Starta med datorn",
        feature3Description: "Öppna Kaffekontoret automatiskt när datorn startar.",
        iosStepsTitle: "Så installerar du",
        iosStep1: "Tryck på delningsknappen längst ner i Safari.",
        iosStep2: "Välj Lägg till på hemskärmen.",
        iosStep3: "Tryck på Lägg till.",
        install: "Installera Kaffekontoret",
        installing: "Installerar...",
        skip: "Fortsätter i webbläsaren",
        continue: "Fortsätt i webbläsaren",
        neverShowPage: "Fråga inte igen",
    },
};

export default warning;
