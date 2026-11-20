export type AuthContextChange = {
    event_id: string;
    user_uuid: string;
};

const STORAGE_KEY = "whatbob_auth_context";

function parseAuthContext(
    raw: string | null,
): AuthContextChange | null {
    if (!raw) return null;

    try {
        const data: unknown = JSON.parse(raw);

        if (
            !data ||
            typeof data !== "object" ||
            !("event_id" in data) ||
            typeof data.event_id !== "string" ||
            !data.event_id.trim() ||
            !("user_uuid" in data) ||
            typeof data.user_uuid !== "string" ||
            !data.user_uuid.trim()
        ) {
            return null;
        }

        return {
            event_id: data.event_id,
            user_uuid: data.user_uuid,
        };
    } catch {
        return null;
    }
}

export function readSharedAuthContext(): AuthContextChange | null {
    if (typeof window === "undefined") return null;

    try {
        return parseAuthContext(
            window.localStorage.getItem(STORAGE_KEY),
        );
    } catch {
        return null;
    }
}

export function publishAuthContextChange(userUuid: string): boolean {
    if (typeof window === "undefined" || !userUuid.trim()) {
        return false;
    }

    try {
        const change: AuthContextChange = {
            event_id: window.crypto.randomUUID(),
            user_uuid: userUuid,
        };

        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(change),
        );

        return true;
    } catch {
        return false;
    }
}

export function subscribeAuthContextChange(
    onChange: (change: AuthContextChange) => void,
): () => void {
    if (typeof window === "undefined") {
        return () => { };
    }

    const handleStorage = (event: StorageEvent) => {
        if (
            event.storageArea !== window.localStorage ||
            event.key !== STORAGE_KEY
        ) {
            return;
        }

        const change = parseAuthContext(event.newValue);
        if (change) onChange(change);
    };

    window.addEventListener("storage", handleStorage);

    return () => {
        window.removeEventListener("storage", handleStorage);
    };
}