import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Check,
  X,
  MessageSquare,
} from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Button } from '../components/ui/Button';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/apiConfig';
import apiClient from '../api/apiClient';
import { normalizeEmployeeData } from '../utils/employeeData';

type LeaveStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  status: string;
  startDate: string;
  endDate: string;
  leaveDays: number;
  reason: string;
  isExtra: boolean;
  requestedAt: string;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

const STATUS_FILTERS: { label: string; value: LeaveStatus }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: colors.warning + '15', text: colors.warning },
  APPROVED: { bg: colors.success + '15', text: colors.success },
  REJECTED: { bg: colors.error + '15', text: colors.error },
};

export default function TeamLeavesScreen({ navigation }: any) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<LeaveRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<LeaveStatus>('PENDING');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadLeaves();
    }, [])
  );

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      if (!cached) return;
      const emp = normalizeEmployeeData(JSON.parse(cached));
      setEmployee(emp);

      if (emp?.id) {
        const response = await apiClient.get(API_ENDPOINTS.LEAVE.TEAM_LEAVES(emp.id));
        if (response.data?.isSuccess !== false) {
          const data = response.data?.data || [];
          setLeaves(data);
          filterLeaves(data, activeFilter);
        }
      }
    } catch (error) {
      console.error('Load team leaves error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeaves = (data: LeaveRequest[], filter: LeaveStatus) => {
    if (filter === 'ALL') {
      setFilteredLeaves(data);
    } else {
      setFilteredLeaves(data.filter(l => l.status === filter));
    }
  };

  const handleFilterChange = (filter: LeaveStatus) => {
    setActiveFilter(filter);
    filterLeaves(leaves, filter);
  };

  const openActionModal = (leave: LeaveRequest, type: 'APPROVE' | 'REJECT') => {
    setSelectedLeave(leave);
    setActionType(type);
    setRejectionReason('');
    setModalVisible(true);
  };

  const handleAction = async () => {
    if (!selectedLeave || !actionType || !employee?.id) return;

    setActionLoading(true);
    try {
      const payload = {
        actionById: employee.id,
        actionByName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.accountName,
        rejectionReason: actionType === 'REJECT' ? rejectionReason.trim() : undefined,
      };

      const endpoint = actionType === 'APPROVE'
        ? API_ENDPOINTS.LEAVE.APPROVE(selectedLeave.id)
        : API_ENDPOINTS.LEAVE.REJECT(selectedLeave.id);

      const response = await apiClient.put(endpoint, payload);
      if (response.data?.isSuccess === false) {
        Alert.alert('Error', response.data?.error || 'Action failed');
        return;
      }

      Alert.alert('Success', `Leave ${actionType === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
      setModalVisible(false);
      setSelectedLeave(null);
      setActionType(null);
      loadLeaves();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Action failed';
      Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle2 size={16} color={colors.success} />;
      case 'REJECTED': return <XCircle size={16} color={colors.error} />;
      default: return <AlertCircle size={16} color={colors.warning} />;
    }
  };

  const renderLeaveCard = (leave: LeaveRequest) => {
    const statusStyle = STATUS_COLORS[leave.status] || STATUS_COLORS.PENDING;
    const canAct = leave.status !== 'APPROVED' && leave.status !== 'REJECTED' ||
      (leave.status === 'REJECTED' && new Date(leave.endDate) >= new Date(new Date().setHours(0,0,0,0)));

    return (
      <View key={leave.id} style={styles.leaveCard}>
        <View style={styles.leaveCardHeader}>
          <View style={styles.employeeRow}>
            <View style={styles.avatar}>
              <User size={16} color={colors.text.secondary} />
            </View>
            <View style={styles.employeeInfo}>
              <Text variant="semibold" size={14} color={colors.text.primary}>
                {leave.employeeName || 'Employee'}
              </Text>
              <Text variant="regular" size={11} color={colors.text.muted}>
                {leave.leaveTypeName}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              {getStatusIcon(leave.status)}
              <Text variant="medium" size={11} color={statusStyle.text} style={styles.statusText}>
                {leave.status}
              </Text>
            </View>
          </View>
          {leave.isExtra && (
            <View style={styles.extraBadge}>
              <Text variant="medium" size={10} color={colors.error}>EXTRA LEAVE</Text>
            </View>
          )}
        </View>

        <View style={styles.leaveCardBody}>
          <View style={styles.infoRow}>
            <Calendar size={14} color={colors.text.muted} />
            <Text variant="regular" size={12} color={colors.text.secondary}>
              {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={14} color={colors.text.muted} />
            <Text variant="regular" size={12} color={colors.text.secondary}>
              {leave.leaveDays} day{leave.leaveDays > 1 ? 's' : ''}
            </Text>
          </View>
          {leave.reason && (
            <View style={styles.infoRow}>
              <MessageSquare size={14} color={colors.text.muted} />
              <Text variant="regular" size={12} color={colors.text.secondary}>
                {leave.reason}
              </Text>
            </View>
          )}
        </View>

        {leave.status === 'PENDING' && (
          <View style={styles.actionRow}>
            <Button
              title="Approve"
              variant="secondary"
              size="sm"
              onPress={() => openActionModal(leave, 'APPROVE')}
              style={[styles.actionButton, styles.approveButton]}
            />
            <Button
              title="Reject"
              variant="danger"
              size="sm"
              onPress={() => openActionModal(leave, 'REJECT')}
              style={[styles.actionButton, styles.rejectButton]}
            />
          </View>
        )}

        {leave.status === 'REJECTED' && canAct && (
          <View style={styles.actionRow}>
            <Button
              title="Approve"
              variant="secondary"
              size="sm"
              onPress={() => openActionModal(leave, 'APPROVE')}
              style={[styles.actionButton, styles.approveButton]}
            />
          </View>
        )}

        <View style={styles.leaveCardFooter}>
          {leave.status === 'APPROVED' && leave.approvedByName && (
            <Text variant="regular" size={11} color={colors.success}>
              Approved by {leave.approvedByName} on {formatDateTime(leave.approvedAt!)}
            </Text>
          )}
          {leave.status === 'REJECTED' && leave.rejectedByName && (
            <View>
              <Text variant="regular" size={11} color={colors.error}>
                Rejected by {leave.rejectedByName} on {formatDateTime(leave.rejectedAt!)}
              </Text>
              {leave.rejectionReason && (
                <Text variant="regular" size={11} color={colors.text.muted}>
                  Reason: {leave.rejectionReason}
                </Text>
              )}
            </View>
          )}
          {leave.status === 'PENDING' && (
            <Text variant="regular" size={11} color={colors.text.muted}>
              Requested on {formatDateTime(leave.requestedAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Team Leave Requests" onBack={() => navigation.goBack()} />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map(filter => (
            <Pressable
              key={filter.value}
              onPress={() => handleFilterChange(filter.value)}
              style={[
                styles.filterChip,
                activeFilter === filter.value && styles.filterChipActive,
              ]}
            >
              <Text
                variant="medium"
                size={12}
                color={activeFilter === filter.value ? '#FFFFFF' : colors.text.secondary}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredLeaves.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={48} color={colors.text.muted} />
              <Text variant="medium" size={14} color={colors.text.muted} style={styles.emptyText}>
                No leave requests found
              </Text>
            </View>
          ) : (
            filteredLeaves.map(renderLeaveCard)
          )}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="semibold" size={16} color={colors.text.primary} style={styles.modalTitle}>
              {actionType === 'APPROVE' ? 'Approve Leave' : 'Reject Leave'}
            </Text>
            {selectedLeave && (
              <View style={styles.modalInfo}>
                <Text variant="regular" size={13} color={colors.text.secondary}>
                  {selectedLeave.employeeName} - {selectedLeave.leaveTypeName}
                </Text>
                <Text variant="regular" size={12} color={colors.text.muted}>
                  {formatDate(selectedLeave.startDate)} - {formatDate(selectedLeave.endDate)} ({selectedLeave.leaveDays} days)
                </Text>
              </View>
            )}
            {actionType === 'REJECT' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Enter rejection reason (optional)"
                placeholderTextColor={colors.text.muted}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={3}
              />
            )}
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setModalVisible(false)}
                style={styles.modalButton}
              />
              <Button
                title={actionType === 'APPROVE' ? 'Confirm Approve' : 'Confirm Reject'}
                variant={actionType === 'APPROVE' ? 'secondary' : 'danger'}
                size="sm"
                onPress={handleAction}
                disabled={actionLoading}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  filterContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
  },
  leaveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  leaveCardHeader: {
    marginBottom: 10,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfo: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 2,
  },
  extraBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.error + '10',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leaveCardBody: {
    gap: 6,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    height: 36,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  leaveCardFooter: {
    gap: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    marginBottom: 12,
  },
  modalInfo: {
    marginBottom: 16,
    gap: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.text.primary,
    backgroundColor: '#FAFAFA',
    minHeight: 80,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    height: 44,
  },
});
