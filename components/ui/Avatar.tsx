import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/constants';

type AvatarProps = {
  name?: string;
  uri?: string | null;
  size?: number;
  textSize?: number;
};

export function Avatar({ name, uri, size = 48, textSize }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = name?.trim().charAt(0).toUpperCase() || 'F';
  const radius = size / 2;

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  if (uri && !imageFailed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: radius }]}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.initial, { fontSize: textSize || Math.max(14, size * 0.38) }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  initial: {
    color: '#071210',
    fontWeight: '900',
  },
});
