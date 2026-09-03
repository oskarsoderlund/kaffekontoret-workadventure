import { deepmerge } from "deepmerge-ts";
import en_US from "../en-US";
import camera from "./camera";
import login from "./login";
import menu from "./menu";
import onboarding from "./onboarding";
import refreshPrompt from "./refreshPrompt";
import warning from "./warning";
import woka from "./woka";

const sv_SE = deepmerge(en_US, {
    camera,
    login,
    menu,
    onboarding,
    refreshPrompt,
    warning,
    woka,
});

export default sv_SE;
