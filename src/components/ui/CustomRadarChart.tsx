import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Dimensions, ViewStyle } from "react-native";
import Svg, {
  Polygon,
  Polyline,
  Line,
  Text as SvgText,
  G,
  Circle,
} from "react-native-svg";
import { colors } from "../../theme/colors";
import { Text } from "./Typography";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface RadarData {
  label: string;
  value: number;
  max: number;
}

interface CustomRadarChartProps {
  title: string;
  data: RadarData[];
  style?: ViewStyle;
  chartPadding?: number;
  currencySymbol?: string;
}

const GRID_LEVELS = [0.25, 0.5, 0.75, 1];
const LABEL_OFFSET = 18;

function formatCompactCurrency(value: number, currencySymbol: string) {
  if (!Number.isFinite(value)) return `${currencySymbol}0`;
  if (value >= 1000000) return `${currencySymbol}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${currencySymbol}${(value / 1000).toFixed(1)}K`;
  return `${currencySymbol}${Math.round(value)}`;
}

export const CustomRadarChart: React.FC<CustomRadarChartProps> = ({
  title,
  data,
  style,
  chartPadding = 40,
  currencySymbol = "$",
}) => {
  const cleanedData = useMemo(
    () =>
      data.filter(
        (item) =>
          item &&
          typeof item.label === "string" &&
          Number.isFinite(item.value) &&
          item.value >= 0,
      ),
    [data],
  );
  const hasRenderableData = cleanedData.length > 0;
  const hasPolygonShape = cleanedData.length >= 3;
  const renderData = useMemo(
    () =>
      hasRenderableData
        ? cleanedData
        : [
            { label: "", value: 0, max: 1 },
            { label: "", value: 0, max: 1 },
            { label: "", value: 0, max: 1 },
          ],
    [cleanedData, hasRenderableData],
  );

  const chartSize = SCREEN_WIDTH - chartPadding;
  const center = chartSize / 2;
  const radius = center - 36;
  const angleStep = (Math.PI * 2) / renderData.length;
  const chartMax = Math.max(...renderData.map((item) => item.max || item.value || 0), 1);

  const getPoint = useCallback((r: number, angle: number) => ({
    x: center + r * Math.cos(angle - Math.PI / 2),
    y: center + r * Math.sin(angle - Math.PI / 2),
  }), [center]);

  const gridPolygons = useMemo(() => {
    return GRID_LEVELS.map((level) =>
      renderData
        .map((_, i) => {
          const p = getPoint(radius * level, angleStep * i);
          return `${p.x},${p.y}`;
        })
        .join(" "),
    );
  }, [renderData, radius, angleStep, getPoint]);

  const axes = useMemo(() => {
    return renderData.map((_, i) => getPoint(radius, angleStep * i));
  }, [renderData, radius, angleStep, getPoint]);

  const dataPoints = useMemo(() => {
    return renderData
      .map((d, i) => {
        const p = getPoint(radius * Math.min(d.value / chartMax, 1), angleStep * i);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }, [renderData, radius, angleStep, getPoint, chartMax]);

  const labelConfigs = useMemo(() => {
    return renderData.map((d, i) => {
      const angle = angleStep * i;
      const p = getPoint(radius + LABEL_OFFSET, angle);

      const xDir = Math.cos(angle - Math.PI / 2);
      const yDir = Math.sin(angle - Math.PI / 2);

      let textAnchor: "start" | "middle" | "end" = "middle";
      if (xDir > 0.15) textAnchor = "start";
      else if (xDir < -0.15) textAnchor = "end";

      const dy = yDir < -0.6 ? -6 : yDir > 0.6 ? 10 : 2;

      return { ...d, p, textAnchor, dy, angle };
    });
  }, [renderData, radius, angleStep, getPoint]);

  return (
    <View style={[styles.container, style]}>
      <Text variant="semibold" size={14} color={colors.text.primary} style={styles.title}>
        {title}
      </Text>

      {hasRenderableData ? (
        <>
          <View style={styles.chartWrapper}>
            <Svg height={chartSize} width={chartSize}>
              <G>
                {gridPolygons.map((points, i) =>
                  hasPolygonShape ? (
                    <Polygon
                      key={`grid-${i}`}
                      points={points}
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="1"
                    />
                  ) : (
                    <Polyline
                      key={`grid-${i}`}
                      points={points}
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="1"
                    />
                  ),
                )}

                {axes.map((p, i) => (
                  <Line
                    key={`axis-${i}`}
                    x1={center}
                    y1={center}
                    x2={p.x}
                    y2={p.y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                ))}

                {hasPolygonShape ? (
                  <Polygon
                    points={dataPoints}
                    fill={`${colors.secondary}15`}
                    stroke={colors.secondary}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                ) : (
                  <Polyline
                    points={dataPoints}
                    fill="none"
                    stroke={colors.secondary}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}

                {cleanedData.map((d, i) => {
                  const p = getPoint(radius * Math.min(d.value / chartMax, 1), angleStep * i);
                  return (
                    <Circle
                      key={`point-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill="#FFFFFF"
                      stroke={colors.secondary}
                      strokeWidth="2"
                    />
                  );
                })}

                {labelConfigs.map((config, i) => (
                  <G key={`label-${i}`}>
                    <SvgText
                      x={config.p.x}
                      y={config.p.y + config.dy}
                      fill={colors.text.secondary}
                      fontSize="9"
                      fontFamily="Poppins_500Medium"
                      fontWeight="500"
                      textAnchor={config.textAnchor}
                    >
                      {config.label}
                    </SvgText>
                  </G>
                ))}
              </G>
            </Svg>
          </View>

          <View style={styles.legendContainer}>
            {cleanedData.map((d, i) => (
              <View key={i} style={styles.legendItem}>
                <Text variant="medium" size={10} color={colors.text.secondary}>
                  {d.label}
                </Text>
                <Text variant="semibold" size={10} color={colors.text.primary}>
                  {formatCompactCurrency(d.value, currencySymbol)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text variant="regular" size={13} color={colors.text.secondary} align="center">
            No salary components available yet.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  title: {
    marginBottom: 12,
    marginLeft: 4,
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    rowGap: 12,
  },
  legendItem: {
    width: "48%",
    alignItems: "flex-start",
  },
});
