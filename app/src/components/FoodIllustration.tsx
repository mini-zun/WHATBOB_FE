import { Image, type ImageProps, type ImageSource } from "expo-image";
import { useState } from "react";

const DEFAULT_IMAGE = require("@/assets/images/whatbob_icon.png");

type Props = {
  imageUrl?: string | null;
  imageKey?: number;
  source?: ImageSource | number;
  style?: ImageProps["style"];
  accessibilityLabel?: string;
};

function IllustrationImage({ source, style, accessibilityLabel }: Props) {
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      source={hasError ? DEFAULT_IMAGE : source}
      contentFit="contain"
      style={style}
      accessibilityLabel={accessibilityLabel}
      onError={hasError ? undefined : () => setHasError(true)}
    />
  );
}

export default function FoodIllustration({
  imageUrl,
  imageKey,
  source,
  ...props
}: Props) {
  const imageSource = source ?? (imageUrl ? { uri: imageUrl } : DEFAULT_IMAGE);

  return (
    <IllustrationImage
      key={JSON.stringify([imageKey, imageSource])}
      {...props}
      source={imageSource}
    />
  );
}
