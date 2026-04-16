import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Typography';
import { colors } from '../../theme/colors';

interface StatusBadgeProps {
  status: string;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const getColors = () => {
    switch (status.toLowerCase()) {
      case 'present':
        return { bg: colors.accent.green, text: colors.success };
      case 'on leave':
      case 'leave':
        return { bg: colors.accent.amber, text: colors.warning };
      case 'absent':
        return { bg: colors.accent.red, text: colors.error };
      default:
        return { bg: colors.accent.blue, text: colors.secondary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text variant="semibold" size={10} color={text} style={styles.text}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    letterSpacing: 0.5,
  },
});
