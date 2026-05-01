import React from 'react';
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Typography';
import { colors } from '../../theme/colors';

interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  color?: string;
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  onPress,
  style,
  color = colors.secondary,
  description,
}) => {
  const CardContent = (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <View style={styles.textWrap}>
        <Text variant="bold" size={15} color={colors.text.primary}>
          {value}
        </Text>
        <Text variant="medium" size={10} color={colors.text.secondary} style={styles.label}>
          {label}
        </Text>
        {description && (
          <Text variant="regular" size={9} color={colors.text.muted} style={styles.desc}>
            {description}
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          {
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          }
        ]}
      >
        {CardContent}
      </Pressable>
    );
  }

  return CardContent;
};

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    marginTop: 1,
    letterSpacing: 0.2,
  },
  desc: {
    marginTop: 2,
  },
});
