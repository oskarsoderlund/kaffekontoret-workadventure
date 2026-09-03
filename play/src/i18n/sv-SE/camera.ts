import type { BaseTranslation } from "../i18n-types";

const camera: BaseTranslation = {
    editCam: "Byt kamera",
    editMic: "Byt mikrofon",
    editSpeaker: "Byt ljudutgång",
    active: "På",
    disabled: "Av",
    notRecommended: "Not recommended",
    enable: {
        title: "Välj kamera och mikrofon",
        start: "Du bestämmer vad som är på. Kamera, mikrofon och skärmdelning startar aldrig utan att du själv väljer det här eller inne i kontoret.",
    },
    help: {
        title: "Kamera eller mikrofon behöver åtkomst",
        cameraTitle: "Kameran behöver åtkomst",
        microphoneTitle: "Mikrofonen behöver åtkomst",
        permissionDenied: "Åtkomst nekades",
        cameraPermissionDenied: "Kameraåtkomst nekades",
        microphonePermissionDenied: "Mikrofonåtkomst nekades",
        cameraMicrophonePermissionDenied: "Kamera- och mikrofonåtkomst nekades",
        content: "Tillåt kamera och mikrofon i webbläsaren om du vill använda dem.",
        cameraContent: "Tillåt kameran i webbläsaren om du vill använda den.",
        microphoneContent: "Tillåt mikrofonen i webbläsaren om du vill använda den.",
        firefoxContent:
            'Please click the "Remember this decision" checkbox, if you don\'t want Firefox to keep asking you the authorization.',
        allow: "Tillåt kamera",
        allowMicrophone: "Tillåt mikrofon",
        allowCameraMicrophone: "Tillåt kamera och mikrofon",
        continue: "Fortsätt utan kamera",
        continueWithoutMicrophone: "Fortsätt utan mikrofon",
        continueCameraMicrophone: "Fortsätt utan kamera och mikrofon",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
        tooltip: {
            permissionDeniedTitle: "Camera access blocked",
            permissionDeniedDesc:
                "Your browser denied camera access for this site. Allow it from the address bar (lock or camera icon) or in site settings. The illustration below matches your browser.",
            noDeviceTitle: "No usable camera",
            noDeviceDesc:
                "Your browser does not see any camera you can use. Try another browser, check that a camera is connected, check your computer's settings (privacy, devices), or restart your computer if the device should work.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "Microphone access blocked",
            permissionDeniedDesc:
                "Your browser denied microphone access for this site. Allow it from the address bar (lock or microphone icon) or in site settings. The illustration below matches your browser.",
            noDeviceTitle: "No usable microphone",
            noDeviceDesc:
                "Your browser does not see any microphone you can use. Try another browser, check that a microphone is connected, check your computer's settings (privacy, devices), or restart your computer if the device should work.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
    },
    webrtc: {
        title: "Video relay server connection error",
        titlePending: "Video relay server connection pending",
        error: "TURN server isn't reachable",
        content: "The video relay server cannot be reached. You may be unable to communicate with other users.",
        solutionVpn:
            "If you are <strong>connecting via a VPN</strong>, please disconnect from you VPN and refresh the web page.",
        solutionVpnNotAskAgain: "Understood. Don't warn me again 🫡",
        solutionHotspot:
            "If you are on a restricted network (company network...), try switching network. For instance, create a <strong>Wifi hotspot</strong> with your phone and connect via your phone.",
        solutionNetworkAdmin: "If you are a <strong>network administrator</strong>, review the ",
        preparingYouNetworkGuide: '"Preparing your network" guide',
        refresh: "Refresh",
        continue: "Continue",
        newDeviceDetected: "New device detected {device} 🎉 Switch? [SPACE] Ignore [ESCAPE]",
    },
    my: {
        silentZone: "Silent zone",
        silentZoneDesc:
            "You are in a silent zone. You can only see and hear the people you are with. You can not see or hear the other people in the room.",
        nameTag: "You",
        loading: "Loading your camera...",
    },
    disable: "Stäng av kameran",
    menu: {
        moreAction: "More actions",
        closeMenu: "Close menu",
        senPrivateMessage: "Send a private message (coming soon)",
        kickoffUser: "Kick off user",
        muteAudioUser: "Mute audio",
        askToMuteAudioUser: "Ask to mute audio",
        muteAudioEveryBody: "Mute audio for everybody",
        muteVideoUser: "Turn off video",
        askToMuteVideoUser: "Ask to turn off video",
        muteVideoEveryBody: "Turn off video for everybody",
        blockOrReportUser: "Moderation",
    },
    backgroundEffects: {
        imageTitle: "Background Images",
        videoTitle: "Background Videos",
        blurTitle: "Background Blur",
        resetTitle: "Disable background effects",
        title: "Background Effects",
        close: "Close",
        blurAmount: "Blur Amount",
    },
};

export default camera;
