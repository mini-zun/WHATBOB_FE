import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const PROFILE_IMAGE_MAX_SIDE = 512;
const PROFILE_IMAGE_COMPRESS = 0.85;

export type ProfileImageSource = "camera" | "library";

export type ProfileImagePickResult =
  | { status: "picked"; uri: string; width: number; height: number }
  | { status: "canceled" }
  | { status: "permission-denied"; canAskAgain: boolean };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
};

export async function pickProfileImage(
  source: ProfileImageSource,
): Promise<ProfileImagePickResult> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return { status: "permission-denied", canAskAgain: permission.canAskAgain };
    }
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: "canceled" };

  return {
    status: "picked",
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  };
}

export async function prepareProfileImage(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  const context = ImageManipulator.manipulate(uri);

  if (Math.max(width, height) > PROFILE_IMAGE_MAX_SIDE) {
    context.resize(
      width >= height
        ? { width: PROFILE_IMAGE_MAX_SIDE, height: null }
        : { width: null, height: PROFILE_IMAGE_MAX_SIDE },
    );
  }

  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: PROFILE_IMAGE_COMPRESS,
  });
  return saved.uri;
}
