import type { Translation } from "../i18n-types";

export default {
    input: {
        name: {
            placeholder: "Vad heter du?",
            empty: "Skriv ditt namn",
            tooLongError: "Namnet är för långt",
            notValidError: "Namnet innehåller tecken som inte stöds",
        },
    },
    genericError: "Något gick fel",
    terms: "När du fortsätter godkänner du våra {links}.",
    termsOfUse: "pilotvillkor",
    privacyPolicy: "integritetspolicy",
    cookiePolicy: "cookiepolicy",
    continue: "Fortsätt",
} satisfies Translation["login"];
