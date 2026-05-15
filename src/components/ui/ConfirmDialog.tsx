import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Text } from './Typography';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  secondaryText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onSecondary?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  secondaryText,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  onSecondary,
}) => {
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
            <Text variant="bold" size={17} color="#0F172A">
              {title}
            </Text>
          </View>

          <Text
            variant="medium"
            size={14}
            color="#64748B"
            style={styles.message}
          >
            {message}
          </Text>

          {secondaryText ? (
            <View style={styles.actionsThree}>
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
                style={styles.secondaryBtn}
                onPress={onSecondary}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text variant="semibold" size={15} color="#FFFFFF">
                    {secondaryText}
                  </Text>
                )}
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
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  header: {
    marginBottom: 8,
  },
  message: {
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionsThree: {
    flexDirection: "row",
    gap: 8,
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
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
});