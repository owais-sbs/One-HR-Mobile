import React from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors } from '../../theme/colors';
import { Text } from './Typography';

const screenWidth = Dimensions.get('window').width;

interface ActivityChartProps {
  title: string;
  data: { value: number; label: string }[];
  style?: ViewStyle;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({
  title,
  data,
  style,
}) => {
  const chartData = data.map(item => ({
    value: item.value,
    label: item.label,
    dataPointText: item.value.toString(),
  }));

  return (
    <View style={[styles.container, style]}>
      <Text variant="bold" size={16} color={colors.text.primary} style={styles.title}>
        {title}
      </Text>
      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          areaChart
          curved
          height={180}
          width={screenWidth - 80}
          initialSpacing={20}
          spacing={50}
          color={colors.secondary}
          thickness={4}
          startFillColor={colors.secondary}
          endFillColor={colors.secondary}
          startOpacity={0.2}
          endOpacity={0.01}
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={0}
          hideRules={false}
          rulesType="dashed"
          rulesColor={colors.border}
          yAxisTextStyle={{ color: colors.text.muted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.text.secondary, fontSize: 10 }}
          isAnimated
          animationDuration={1000}
          pointerConfig={{
            pointerStripHeight: 160,
            pointerStripColor: colors.border,
            pointerStripWidth: 2,
            pointerColor: colors.secondary,
            radius: 6,
            pointerLabelComponent: (items: any) => {
              return (
                <View style={styles.tooltip}>
                  <Text color="white" size={12} variant="bold">{items[0].value}h</Text>
                </View>
              );
            },
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  title: {
    marginBottom: 20,
  },
  chartWrapper: {
    marginLeft: -10,
  },
  tooltip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
