import React from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors } from '../../theme/colors';
import { Text } from './Typography';

const screenWidth = Dimensions.get('window').width;

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
  const chartData = data.map(item => ({
    value: item.value,
    label: item.label,
    frontColor: barColor,
    topLabelComponent: () => (
      <View style={styles.topLabelContainer}>
        <Text variant="bold" size={9} color={colors.text.primary}>
          {item.value}
        </Text>
      </View>
    ),
  }));

  const maxVal = Math.max(...data.map(d => d.value));
  // (12*2 from dashboard padding + 18*2 from chart container padding) = 60
  const chartWidth = screenWidth - 64; 
  
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

      <View style={styles.chartArea}>
        <BarChart
          data={chartData}
          barWidth={32}
          spacing={28}
          roundedTop
          roundedBottom
          barBorderRadius={8}
          hideRules={false}
          rulesType="dashed"
          rulesColor={colors.border}
          rulesThickness={1}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={{ color: colors.text.muted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.text.secondary, fontSize: 10, fontWeight: '600' }}
          noOfSections={4}
          maxValue={Math.max(12, maxVal + 2)}
          isAnimated
          animationDuration={800}
          height={140}
          width={chartWidth}
          initialSpacing={16}
          yAxisLabelSuffix={yAxisSuffix}
          dashGap={4}
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
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
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
    alignItems: 'center',
    marginLeft: -20, // Offset for Y-axis labels
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
