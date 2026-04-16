import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions, ViewStyle } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { colors } from "../../theme/colors";
import { Text } from "./Typography";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CustomLineChartProps {
  title: string;
  data: { value: number; label: string }[];
  yAxisSuffix?: string;
  lineColor?: string;
  style?: ViewStyle;
}

export const CustomLineChart: React.FC<CustomLineChartProps> = ({
  title,
  data,
  yAxisSuffix = "",
  lineColor = colors.success,
  style,
}) => {
  const { maxVal, spacing, chartWidth, initialSpacing } = useMemo(() => {
    const containerPadding = 16;
    const width = SCREEN_WIDTH - containerPadding * 2 - 28;
    const max = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0;
    const initSpace = 8;
    const endSpace = 8;
    const space = data.length > 1 ? (width - initSpace - endSpace) / (data.length - 1) : 0;

    return {
      maxVal: max,
      chartWidth: width,
      initialSpacing: initSpace,
      spacing: space,
    };
  }, [data]);

  const chartData = useMemo(() => data.map((d) => ({ value: d.value })), [data]);

  return (
    <View style={[styles.container, style]}>
      <Text variant="semibold" size={14} color={colors.text.primary} style={styles.title}>
        {title}
      </Text>

      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          curved
          thickness={2.5}
          color={lineColor}
          hideDataPoints={false}
          dataPointsColor={lineColor}
          dataPointsRadius={3.5}
          hideRules
          yAxisThickness={0}
          xAxisThickness={0}
          hideYAxisText
          noOfSections={3}
          maxValue={maxVal * 1.15}
          spacing={spacing}
          initialSpacing={initialSpacing}
          endSpacing={initialSpacing}
          width={chartWidth}
          height={80}
          areaChart
          startFillColor={lineColor}
          endFillColor={lineColor}
          startOpacity={0.12}
          endOpacity={0.02}
        />
      </View>

      <View style={[styles.labelsContainer, { width: chartWidth }]}>
        {data.map((item, index) => {
          const pointX = initialSpacing + index * spacing;
          const LABEL_WIDTH = 40;

          return (
            <View
              key={index}
              style={[
                styles.labelItem,
                {
                  position: "absolute",
                  left: pointX - LABEL_WIDTH / 2,
                  width: LABEL_WIDTH,
                },
              ]}
            >
              <Text variant="medium" size={10} color={colors.text.secondary}>
                {item.label}
              </Text>
              <Text variant="semibold" size={10} color={colors.text.primary}>
                {item.value}
                {yAxisSuffix}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  title: {
    marginBottom: 12,
  },
  chartWrapper: {
    alignItems: "center",
  },
  labelsContainer: {
    height: 32,
    position: "relative",
    marginTop: 6,
  },
  labelItem: {
    alignItems: "center",
    gap: 2,
  },
});
