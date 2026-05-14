import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from './Typography';

function getInitials(firstName?: string, lastName?: string) {
  const f = firstName?.charAt(0) || '';
  const l = lastName?.charAt(0) || '';
  return (f + l).toUpperCase() || '??';
}

interface EmployeeAvatarProps {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
  size?: number;
  borderRadius?: number;
  backgroundColor?: string;
  textColor?: string;
}

export default function EmployeeAvatar({
  firstName,
  lastName,
  profileImageUrl,
  size = 48,
  borderRadius = 24,
  backgroundColor = '#FFFFFF',
  textColor = '#000000',
}: EmployeeAvatarProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profileImageUrl]);

  const showImage = profileImageUrl && !imageError;

  const textSize = size <= 32 ? 12 : size <= 48 ? 14 : size <= 56 ? 18 : 24;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor,
        },
      ]}
    >
      <Text variant="bold" size={textSize} color={textColor}>
        {getInitials(firstName, lastName)}
      </Text>
      {showImage && (
        <Image
          source={{ uri: profileImageUrl }}
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius },
          ]}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
