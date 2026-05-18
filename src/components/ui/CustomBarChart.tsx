import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
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
  const tickValues = useMemo(
    () =>
      Array.from({ length: noOfSections + 1 }, (_, index) =>
        computedMaxValue - (computedMaxValue / noOfSections) * index,
      ),
    [computedMaxValue],
  );

  const { chartWidth, barWidth, barGap, plotHeight } = useMemo(() => {
    const safeWidth = Math.max(chartAreaWidth, 220);
    const drawableWidth = Math.max(safeWidth - 42, 160);
    const barCount = Math.max(data.length, 1);
    const idealGap = 10;
    const nextBarWidth = Math.max(
      14,
      Math.min(28, Math.floor((drawableWidth - idealGap * (barCount - 1)) / barCount)),
    );
    const remaining = Math.max(drawableWidth - nextBarWidth * barCount, 0);
    const nextGap = barCount > 1 ? Math.max(6, Math.min(18, Math.floor(remaining / (barCount - 1)))) : 0;
    return {
      chartWidth: safeWidth,
      barWidth: nextBarWidth,
      barGap: nextGap,
      plotHeight: 132,
    };
  }, [chartAreaWidth, data.length]);

  const axisLabelWidth = 38;
  const labelHeight = 24;
  const chartBodyHeight = plotHeight + labelHeight + 8;
  const barHeightLimit = plotHeight - 24;

  const formatValue = (value: number) => {
    const rounded = Number(value.toFixed(1));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  const barHeights = data.map((item) =>
    item.value > 0
      ? Math.max(6, (item.value / computedMaxValue) * barHeightLimit)
      : 2,
  );

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
        <View style={[styles.chartShell, { width: chartWidth, height: chartBodyHeight }]}>
          <View style={[styles.yAxis, { width: axisLabelWidth }]}>
            {tickValues.map((tick, index) => (
              <Text
                key={index}
                variant="medium"
                size={10}
                color={colors.text.muted}
                style={index < tickValues.length - 1 ? styles.yAxisLabel : styles.yAxisLabelLast}
              >
                {formatValue(tick)}
                {yAxisSuffix}
              </Text>
            ))}
          </View>

          <View style={styles.plotWrap}>
            <View style={[styles.gridLayer, { height: plotHeight }]}>
              {tickValues.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.gridLine,
                    {
                      bottom: (plotHeight / noOfSections) * (tickValues.length - 1 - index),
                    },
                  ]}
                />
              ))}
            </View>

            <View style={[styles.barsRow, { height: chartBodyHeight }]}>
              {data.map((item, index) => {
                const height = barHeights[index] || 2;
                return (
                  <View
                    key={`${item.label}-${index}`}
                    style={[styles.barColumn, { marginRight: index === data.length - 1 ? 0 : barGap }]}
                  >
                    <View style={[styles.barStack, { height: plotHeight }]}>
                      {item.value > 0 ? (
                        <View style={styles.valueBadge}>
                          <Text variant="bold" size={9} color={colors.text.primary}>
                            {formatValue(item.value)}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.valueBadgeSpacer} />
                      )}
                      <View
                        style={[
                          styles.bar,
                          {
                            width: barWidth,
                            height,
                            backgroundColor: item.value > 0 ? barColor : colors.border,
                          },
                        ]}
                      />
                    </View>
                    <Text variant="medium" size={10} color={colors.text.secondary} style={styles.xLabel}>
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
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
    alignItems: 'flex-start',
  },
  chartShell: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 4,
    paddingTop: 8,
    paddingBottom: 22,
  },
  yAxisLabel: {
    textAlign: 'right',
    minHeight: 16,
  },
  yAxisLabelLast: {
    textAlign: 'right',
    minHeight: 16,
  },
  plotWrap: {
    flex: 1,
    position: 'relative',
    paddingTop: 8,
    paddingBottom: 0,
  },
  gridLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}80`,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barStack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  valueBadge: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  valueBadgeSpacer: {
    height: 14,
  },
  bar: {
    borderRadius: 999,
  },
  xLabel: {
    marginTop: 6,
    textAlign: 'center',
  },
});
