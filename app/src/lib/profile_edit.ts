import { Platform } from "react-native";

import { ApiError, apiFetch, getApiBaseUrl } from "./api";
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

const DEFAULT_PROFILE_IMAGE_PATH = "/static/default-profile.svg";
const PROFILE_IMAGE_UPLOAD_TIMEOUT = 30000;

export function resolveProfileImageUrl(
  url: string | null | undefined,
): string | null {
  const value = url?.trim();
  if (!value || value.endsWith(DEFAULT_PROFILE_IMAGE_PATH)) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith("/")) return null;

  try {
    return `${getApiBaseUrl()}${value}`;
  } catch {
    return null;
  }
}

async function toUploadFile(uri: string): Promise<Blob> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    return response.blob();
  }
  return { uri, name: "profile.jpg", type: "image/jpeg" } as unknown as Blob;
}

export async function uploadMyProfileImage(
  uri: string,
  signal?: AbortSignal,
): Promise<UserProfile> {
  const formData = new FormData();
  formData.append("file", await toUploadFile(uri), "profile.jpg");

  const result = await apiFetch<unknown>("/api/users/me/profile-image", {
    method: "PUT",
    body: formData,
    signal,
    timeout: PROFILE_IMAGE_UPLOAD_TIMEOUT,
  });

  if (!isUserProfile(result)) {
    throw new Error("프로필 사진 변경에 실패했습니다.");
  }
  return result;
}

export async function resetMyProfileImage(
  signal?: AbortSignal,
): Promise<UserProfile> {
  const result = await apiFetch<unknown>("/api/users/me/profile-image", {
    method: "DELETE",
    signal,
  });

  if (!isUserProfile(result)) {
    throw new Error("프로필 사진 변경에 실패했습니다.");
  }
  return result;
}

export function getProfileImageErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "IMAGE_TOO_LARGE":
        return "5MB 이하의 사진만 올릴 수 있어요.";
      case "UNSUPPORTED_IMAGE_FORMAT":
        return "JPG, PNG, WebP 사진만 올릴 수 있어요.";
      case "IMAGE_DIMENSIONS_EXCEEDED":
        return "해상도가 너무 큰 사진이에요.";
      case "ANIMATED_IMAGE_NOT_ALLOWED":
        return "움직이는 이미지는 사용할 수 없어요.";
      case "INVALID_IMAGE_FILE":
      case "EMPTY_IMAGE_FILE":
        return "사진을 읽을 수 없어요. 다른 사진을 선택해 주세요.";
    }
    if (error.status === 413) {
      return "5MB 이하의 사진만 올릴 수 있어요.";
    }
    if (error.status === 0) {
      return "연결을 확인하고 다시 시도해 주세요.";
    }
  }
  return "프로필 사진을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.";
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
