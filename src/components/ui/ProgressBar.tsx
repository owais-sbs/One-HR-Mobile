import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = colors.secondary,
  backgroundColor = colors.accent.blue,
  height = 8,
  style,
}) => {
  return (
    <View style={[styles.container, { backgroundColor, height }, style]}>
      <View 
        style={[
          styles.progress, 
          { 
            backgroundColor: color, 
            width: `${Math.min(Math.max(progress * 100, 0), 100)}%`,
            height 
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    borderRadius: 4,
  },
});
