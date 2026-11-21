let logoutOwner: symbol | null = null;

export function isLogoutInProgress(): boolean {
    return logoutOwner !== null;
}

export function beginLogoutOperation(): () => void {
    if (logoutOwner !== null) {
        throw new Error("이미 로그아웃을 처리하고 있습니다.");
    }

    const owner = Symbol("logout");
    logoutOwner = owner;

    return () => {
        if (logoutOwner === owner) {
            logoutOwner = null;
        }
    };
}
