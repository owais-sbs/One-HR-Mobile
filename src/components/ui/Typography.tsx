import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { colors } from '../../theme/colors';

interface CustomTextProps extends TextProps {
  variant?: 'regular' | 'medium' | 'semibold' | 'bold';
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export const Text: React.FC<CustomTextProps> = ({
  children,
  variant = 'regular',
  size = 14,
  color = colors.text.primary,
  align = 'left',
  style,
  ...props
}) => {
  const getFontFamily = () => {
    switch (variant) {
      case 'medium': return 'Poppins_500Medium';
      case 'semibold': return 'Poppins_600SemiBold';
      case 'bold': return 'Poppins_700Bold';
      default: return 'Poppins_400Regular';
    }
  };

  return (
    <RNText
      style={[
        {
          fontFamily: getFontFamily(),
          fontSize: size,
          color: color,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
