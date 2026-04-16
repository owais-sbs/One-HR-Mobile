import React from 'react';
import { 
  Pressable, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  ActivityIndicator,
  View
} from 'react-native';
import { colors } from '../../theme/colors';
import { Text } from './Typography';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return colors.text.muted;
    switch (variant) {
      case 'primary': return pressed ? colors.primary + 'CC' : colors.primary;
      case 'secondary': return pressed ? colors.secondary + 'CC' : colors.secondary;
      case 'outline': return 'transparent';
      case 'danger': return pressed ? colors.error + 'CC' : colors.error;
      case 'ghost': return 'transparent';
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#FFFFFF';
    switch (variant) {
      case 'outline': return colors.secondary;
      case 'ghost': return colors.text.secondary;
      default: return '#FFFFFF';
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm': return 36;
      case 'md': return 48;
      case 'lg': return 56;
      default: return 48;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBackgroundColor(pressed),
          height: getHeight(),
          borderColor: variant === 'outline' ? colors.secondary : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            variant="semibold"
            size={size === 'sm' ? 14 : 16}
            color={getTextColor()}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
});
