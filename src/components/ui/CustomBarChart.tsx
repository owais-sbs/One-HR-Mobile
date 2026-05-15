import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors } from '../../theme/colors';
import { Text } from './Typography';

interface CustomBarChartProps {
  title: string;
  data: { value: number; label: string }[];
  yAxisSuffix?: string;
  barColor?: string;
  style?: ViewStyle;
}

export const CustomBarChart: React.FC<CustomBarChartProps> = ({
  title,
  data,
  yAxisSuffix = '',
  barColor = colors.secondary,
  style,
}) => {
  const [chartAreaWidth, setChartAreaWidth] = useState(0);
  const maxVal = data.reduce((max, d) => Math.max(max, d.value), 0);
  const noOfSections = 4;
  const computedMaxValue = Math.max(maxVal * 1.2, 8);
  const stepValue = computedMaxValue / noOfSections;

  const { barWidth, spacing, chartWidth, initialSpacing } = useMemo(() => {
    const safeWidth = Math.max(chartAreaWidth, 220);
    const estimatedYAxisWidth = 34;
    const drawableWidth = Math.max(safeWidth - estimatedYAxisWidth, 160);
    const barCount = Math.max(data.length, 1);
    const candidateBarWidth = Math.floor(drawableWidth / (barCount * 2.2));
    const nextBarWidth = Math.max(14, Math.min(28, candidateBarWidth));
    const candidateSpacing = Math.floor((drawableWidth - nextBarWidth * barCount) / Math.max(barCount - 1, 1));
    const nextSpacing = Math.max(8, Math.min(20, candidateSpacing));
    const nextInitialSpacing = Math.max(8, Math.min(14, nextSpacing));
    return {
      barWidth: nextBarWidth,
      spacing: nextSpacing,
      chartWidth: safeWidth,
      initialSpacing: nextInitialSpacing,
    };
  }, [chartAreaWidth, data.length]);

  const chartData = data.map((item, index) => ({
    value: item.value,
    label: item.label,
    frontColor: item.value > 0 ? barColor : colors.text.muted,
    topLabelComponent: () =>
      item.value > 0 ? (
        <View style={styles.topLabelContainer}>
          <Text variant="bold" size={9} color={colors.text.primary}>
            {item.value}
          </Text>
        </View>
      ) : null,
  }));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View>
          <Text variant="bold" size={15} color={colors.text.primary}>
            {title}
          </Text>
          <Text variant="medium" size={10} color={colors.text.secondary}>
            Daily work hours
          </Text>
        </View>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: barColor }]} />
          <Text variant="medium" size={10} color={colors.text.secondary}>Hours</Text>
        </View>
      </View>

      <View
        style={styles.chartArea}
        onLayout={(event) => {
          const nextWidth = Math.floor(event.nativeEvent.layout.width);
          if (nextWidth > 0 && nextWidth !== chartAreaWidth) {
            setChartAreaWidth(nextWidth);
          }
        }}
      >
        <BarChart
          data={chartData}
          barWidth={barWidth}
          spacing={spacing}
          roundedTop
          roundedBottom
          barBorderRadius={6}
          hideRules={false}
          rulesType="solid"
          rulesColor={colors.border + '80'}
          rulesThickness={1}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={{ color: colors.text.muted, fontSize: 10, fontFamily: 'Inter-Medium' }}
          xAxisLabelTextStyle={{ color: colors.text.secondary, fontSize: 10, fontFamily: 'Inter-SemiBold' }}
          noOfSections={noOfSections}
          maxValue={computedMaxValue}
          stepValue={stepValue}
          showFractionalValues
          roundToDigits={1}
          isAnimated
          animationDuration={800}
          height={140}
          width={chartWidth}
          initialSpacing={initialSpacing}
          yAxisLabelSuffix={yAxisSuffix}
          yAxisLabelContainerStyle={{ width: 32 }}
          yAxisSide={0}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chartArea: {
    width: '100%',
    alignItems: 'stretch',
  },
  topLabelContainer: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
