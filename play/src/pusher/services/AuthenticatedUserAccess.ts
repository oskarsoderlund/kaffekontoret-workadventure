export function isAuthenticatedUserAllowed(
    email: string,
    allowedEmails: readonly string[],
    allowedEmailDomains: readonly string[],
    emailVerified?: boolean,
): boolean {
    if (allowedEmails.length === 0 && allowedEmailDomains.length === 0) {
        return true;
    }

    if (emailVerified !== true) {
        return false;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (allowedEmails.includes(normalizedEmail)) {
        return true;
    }

    const separatorIndex = normalizedEmail.lastIndexOf("@");
    if (separatorIndex === -1) {
        return false;
    }

    return allowedEmailDomains.includes(normalizedEmail.slice(separatorIndex + 1));
}
