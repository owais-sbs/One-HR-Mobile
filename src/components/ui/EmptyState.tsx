import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Typography';
import { colors } from '../../theme/colors';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  onAction?: () => void;
  actionTitle?: string;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  onAction,
  actionTitle,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text variant="bold" size={20} align="center" style={styles.title}>
        {title}
      </Text>
      <Text variant="regular" size={14} color={colors.text.secondary} align="center" style={styles.message}>
        {message}
      </Text>
      {onAction && actionTitle && (
        <Button
          onPress={onAction}
          title={actionTitle}
          variant="outline"
          size="sm"
          style={styles.action}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    marginBottom: 20,
    opacity: 0.5,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 24,
    lineHeight: 20,
  },
  action: {
    minWidth: 160,
  },
});
