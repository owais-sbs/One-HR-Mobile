import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
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
  ChevronRight,
  Filter,
} from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/apiConfig';
import apiClient from '../api/apiClient';

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

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: colors.warning + '15', text: colors.warning, icon: colors.warning },
  APPROVED: { bg: colors.success + '15', text: colors.success, icon: colors.success },
  REJECTED: { bg: colors.error + '15', text: colors.error, icon: colors.error },
};

export default function LeaveHistoryScreen({ navigation }: any) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<LeaveRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<LeaveStatus>('ALL');
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<any>(null);

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
      const emp = JSON.parse(cached);
      setEmployee(emp);

      if (emp?.id) {
        const response = await apiClient.get(API_ENDPOINTS.LEAVE.MY_LEAVES(emp.id));
        if (response.data?.isSuccess !== false) {
          const data = response.data?.data || [];
          setLeaves(data);
          filterLeaves(data, activeFilter);
        }
      }
    } catch (error) {
      console.error('Load leaves error:', error);
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
    return (
      <View key={leave.id} style={styles.leaveCard}>
        <View style={styles.leaveCardHeader}>
          <View style={styles.leaveTypeRow}>
            <Text variant="semibold" size={14} color={colors.text.primary}>
              {leave.leaveTypeName || 'Leave'}
            </Text>
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
              <Text variant="regular" size={12} color={colors.text.secondary} style={styles.reasonText}>
                Reason: {leave.reason}
              </Text>
            </View>
          )}
        </View>

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
      <ScreenHeader title="My Leave Requests" onBack={() => navigation.goBack()} />

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
  leaveTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  reasonText: {
    marginLeft: 0,
  },
  leaveCardFooter: {
    gap: 2,
  },
});
