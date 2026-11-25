import { Platform } from "react-native";

import { ApiError, apiFetch } from "./api";
import { readWebSession, saveWebSession } from "./web-auth";

export type UserProfile = {
  id: number;
  uuid: string;
  kakao_id: number | null;
  nickname: string | null;
  email: string | null;
  profile_image: string | null;
};

export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;
const NICKNAME_ALLOWED_RE = /^[가-힣A-Za-z0-9 ]+$/;

export function validateNickname(raw: string): string | null {
  const nickname = raw.trim();

  if (nickname.length < NICKNAME_MIN_LENGTH) {
    return `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 입력해 주세요.`;
  }
  if (nickname.length > NICKNAME_MAX_LENGTH) {
    return `닉네임은 ${NICKNAME_MAX_LENGTH}자까지 입력할 수 있어요.`;
  }
  if (!NICKNAME_ALLOWED_RE.test(nickname)) {
    return "한글, 영문, 숫자, 공백만 사용할 수 있어요.";
  }
  return null;
}

function isUserProfile(data: unknown): data is UserProfile {
  if (!data || typeof data !== "object") return false;
  const user = data as Partial<UserProfile>;
  return (
    typeof user.id === "number" &&
    typeof user.uuid === "string" &&
    (user.kakao_id === null || typeof user.kakao_id === "number") &&
    (user.nickname === null || typeof user.nickname === "string") &&
    (user.profile_image === undefined ||
      user.profile_image === null ||
      typeof user.profile_image === "string")
  );
}

export async function updateMyNickname(
  nickname: string,
  signal?: AbortSignal,
): Promise<UserProfile> {
  const result = await apiFetch<unknown>("/api/users/me/nickname", {
    method: "PATCH",
    body: { nickname: nickname.trim() },
    signal,
  });

  if (!isUserProfile(result)) {
    throw new Error("닉네임 변경에 실패했습니다.");
  }
  return result;
}

export function getNicknameErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "NICKNAME_DUPLICATE":
        return "이미 사용 중인 닉네임이에요.";
      case "INVALID_NICKNAME":
        return "한글, 영문, 숫자, 공백으로 2~20자 입력해 주세요.";
    }
    if (error.status === 0) {
      return "연결을 확인하고 다시 시도해 주세요.";
    }
  }
  return "닉네임을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export function syncSessionUser(user: UserProfile): void {
  if (Platform.OS !== "web") return; // TODO: 네이티브 세션 저장소가 생기면 함께 갱신

  const session = readWebSession();
  if (!session || session.user.uuid !== user.uuid) return;

  saveWebSession({
    ...session,
    user: {
      ...session.user,
      nickname: user.nickname,
      profile_image: user.profile_image,
    },
  });
}
