import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Text } from './Typography';

export type SnackbarType = 'success' | 'error';

export type SnackbarState = {
  visible: boolean;
  message: string;
  type: SnackbarType;
};

interface SnackbarProps extends SnackbarState {
  onDismiss: () => void;
  durationMs?: number;
}

export function Snackbar({
  visible,
  message,
  type,
  onDismiss,
  durationMs = 3500,
}: SnackbarProps) {
  useEffect(() => {
    if (!visible) return undefined;

    const timeout = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timeout);
  }, [durationMs, onDismiss, visible]);

  if (!visible) return null;

  const Icon = type === 'success' ? CheckCircle2 : XCircle;
  const accentColor = type === 'success' ? colors.success : colors.error;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => [
          styles.snackbar,
          { borderLeftColor: accentColor },
          pressed && styles.snackbarPressed,
        ]}
      >
        <Icon size={18} color={accentColor} strokeWidth={2.4} />
        <Text variant="medium" size={12} color={colors.text.primary} style={styles.message}>
          {message}
        </Text>
      </Pressable>
    </View>
  );
}

export const initialSnackbarState: SnackbarState = {
  visible: false,
  message: '',
  type: 'success',
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    zIndex: 20,
  },
  snackbar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  snackbarPressed: {
    opacity: 0.9,
  },
  message: {
    flex: 1,
    lineHeight: 17,
  },
});
