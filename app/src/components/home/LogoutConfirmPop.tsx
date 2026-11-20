import { PopUpBox } from "./PopUpMessage";

type Props = {
    visible: boolean;
    busy?: boolean;
    errorMessage?: string;
    canCancel?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export function LogoutConfirmPopUp({
    visible,
    busy = false,
    errorMessage,
    canCancel = true,
    onCancel,
    onConfirm,
}: Props) {
    const handleConfirm = () => {
        if (busy) return;
        onConfirm();
    };

    const handleCancel = () => {
        if (busy || !canCancel) return;
        onCancel();
    };

    const message = busy ? "로그아웃을 처리하고 있어요.\n잠시 기다려 주세요." : errorMessage ||
        "로그아웃할까요?\n계정 기록은 유지되며,\n익명 사용자로 이용할 수 있어요."

    return (
        <PopUpBox
            visible={visible}
            message={message}
            leftButtonText={ busy ? "처리중..." : errorMessage ? "다시 시도" : "로그아웃"}
            rightButtonText={canCancel ? "취소" : "상태 확인 필요"}
            leftDisabled={busy}
            rightDisabled={busy || !canCancel}
            closeDisabled={busy || !canCancel}
            onLeftButtonClick={handleConfirm}
            onRightButtonClick={handleCancel}
            onClose={handleCancel}
        />
    );
}