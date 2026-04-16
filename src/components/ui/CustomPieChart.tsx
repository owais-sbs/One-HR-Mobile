import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { colors } from '../../theme/colors';
import { Text } from './Typography';

interface CustomPieChartProps {
  title: string;
  data: { value: number; color: string; label: string; text?: string }[];
  style?: ViewStyle;
}

export const CustomPieChart: React.FC<CustomPieChartProps> = ({
  title,
  data,
  style,
}) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <View style={[styles.container, style]}>
      <Text variant="semibold" size={14} color={colors.text.primary} style={styles.title}>
        {title}
      </Text>
      <View style={styles.chartSection}>
        <View style={styles.chartCenter}>
          <PieChart
            data={data}
            donut
            showGradient
            sectionAutoFocus
            radius={50}
            innerRadius={38}
            innerCircleColor={'#FFFFFF'}
            centerLabelComponent={() => {
              return (
                <View style={styles.centerLabel}>
                  <Text variant="bold" size={16} color={colors.text.primary}>{total}</Text>
                  <Text variant="medium" size={8} color={colors.text.muted}>TOTAL</Text>
                </View>
              );
            }}
          />
        </View>
        <View style={styles.legendContainer}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text variant="regular" size={11} color={colors.text.secondary} style={styles.legendLabel}>
                {item.label}
              </Text>
              <Text variant="semibold" size={11} color={colors.text.primary}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
    padding: 14,
  },
  title: {
    marginBottom: 12,
  },
  chartSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartCenter: {
    marginRight: 16,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    marginRight: 8,
  },
});
