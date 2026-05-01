import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Text } from './Typography';
import { colors } from '../../theme/colors';
import { ProgressBar } from './ProgressBar';

interface LeaveCardProps {
  label: string;
  left: number;
  total: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const LeaveCard: React.FC<LeaveCardProps> = ({
  label,
  left,
  total,
  color = colors.secondary,
  style,
}) => {
  const progress = left / total;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <Text variant="semibold" size={11} color={colors.text.primary} numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        <View style={[styles.badge, { backgroundColor: color + '15' }]}>
          <Text variant="semibold" size={9} color={color}>
            {left}d
          </Text>
        </View>
      </View>

      <ProgressBar
        progress={progress}
        color={color}
        backgroundColor={color + '12'}
        height={4}
        style={styles.progressBar}
      />

      <Text variant="regular" size={9} color={colors.text.muted} style={styles.usageText}>
        {total - left}/{total} used
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 14,
    padding: 12,
    width: 130,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    flex: 1,
    marginRight: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  progressBar: {
    borderRadius: 3,
    marginBottom: 6,
  },
  usageText: {
    textAlign: 'right',
  },
});
