import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Coffee, LogIn, LogOut } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Text } from './Typography';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmSubtext?: string;
  cancelText?: string;
  secondaryText?: string;
  secondarySubtext?: string;
  secondaryDestructive?: boolean;
  destructive?: boolean;
  loading?: boolean;
  loadingAction?: "confirm" | "secondary";
  onConfirm: () => void;
  onCancel: () => void;
  onSecondary?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = "Confirm",
  confirmSubtext,
  cancelText = "Cancel",
  secondaryText,
  secondarySubtext,
  secondaryDestructive = false,
  destructive = false,
  loading = false,
  loadingAction,
  onConfirm,
  onCancel,
  onSecondary,
}) => {
  const getActionIcon = (label: string, isDestructive: boolean) => {
    const normalized = label.toLowerCase();
    if (normalized.includes("break")) return Coffee;
    if (normalized.includes("resume") || normalized.includes("clock in")) return LogIn;
    if (isDestructive || normalized.includes("end") || normalized.includes("clock out")) return LogOut;
    return LogIn;
  };

  const renderActionButton = ({
    label,
    subtext,
    onPress,
    isDestructive,
    isSecondary,
    actionKey,
  }: {
    label: string;
    subtext?: string;
    onPress?: () => void;
    isDestructive: boolean;
    isSecondary?: boolean;
    actionKey: "confirm" | "secondary";
  }) => {
    const isActionLoading = loading && loadingAction === actionKey;
    const Icon = getActionIcon(label, isDestructive);
    const tintColor = isDestructive
      ? colors.error
      : isSecondary
        ? colors.warning
        : colors.secondary;
    const tintBg = isDestructive
      ? colors.accent.red
      : isSecondary
        ? colors.accent.amber
        : colors.accent.blue;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.actionCard,
          pressed && styles.actionCardPressed,
          loading && !isActionLoading && styles.actionCardDisabled,
        ]}
        onPress={onPress}
        disabled={loading}
      >
        <View style={[styles.actionIcon, { backgroundColor: tintBg }]}>
          {isActionLoading ? (
            <ActivityIndicator color={tintColor} size="small" />
          ) : (
            <Icon size={20} color={tintColor} />
          )}
        </View>
        <View style={styles.actionText}>
          <Text variant="semibold" size={15} color="#0F172A">
            {label}
          </Text>
          {subtext ? (
            <Text variant="medium" size={12} color="#64748B" style={styles.actionSubtext}>
              {subtext}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text variant="bold" size={19} color="#0F172A" align="center">
              {title}
            </Text>
          </View>

          <Text
            variant="medium"
            size={14}
            color="#64748B"
            style={styles.message}
            align="center"
          >
            {message}
          </Text>

          {secondaryText ? (
            <View style={styles.actionsStack}>
              {renderActionButton({
                label: confirmText,
                subtext: confirmSubtext,
                onPress: onConfirm,
                isDestructive: destructive,
                actionKey: "confirm",
              })}
              {renderActionButton({
                label: secondaryText,
                subtext: secondarySubtext,
                onPress: onSecondary,
                isDestructive: secondaryDestructive,
                isSecondary: true,
                actionKey: "secondary",
              })}
              <Pressable
                style={styles.cancelTextBtn}
                onPress={onCancel}
                disabled={loading}
              >
                <Text variant="semibold" size={15} color="#64748B">
                  {cancelText}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={onCancel}
                disabled={loading}
              >
                <Text variant="semibold" size={15} color="#64748B">
                  {cancelText}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmBtn,
                  destructive && styles.confirmBtnDestructive,
                ]}
                onPress={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text variant="semibold" size={15} color="#FFFFFF">
                    {confirmText}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 360,
  },
  header: {
    marginBottom: 10,
  },
  message: {
    lineHeight: 21,
    marginBottom: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionsStack: {
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDestructive: {
    backgroundColor: colors.error,
  },
  actionCard: {
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionCardPressed: {
    backgroundColor: "#F8FAFC",
    transform: [{ scale: 0.99 }],
  },
  actionCardDisabled: {
    opacity: 0.7,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionSubtext: {
    marginTop: 2,
    lineHeight: 17,
  },
  cancelTextBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
