import { PopUpBox } from "./PopUpMessage";

type Props = {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export function LogoutConfirmPopUp({
    visible,
    onCancel,
    onConfirm,
}: Props) {
    return (
        <PopUpBox
        visible={visible}
        message={"로그아웃할까요?\n계정 기록은 유지되며,\n익명 사용자로 이용할 수 있어요."}
        leftButtonText="로그아웃"
        rightButtonText="취소"
        onLeftButtonClick={onConfirm}
        onRightButtonClick={onCancel}
        onClose={onCancel}
        />
    );
}