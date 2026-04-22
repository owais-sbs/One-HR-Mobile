import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Dimensions, ViewStyle } from "react-native";
import Svg, {
  Polygon,
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

export const CustomRadarChart: React.FC<CustomRadarChartProps> = ({
  title,
  data,
  style,
  chartPadding = 40,
  currencySymbol = "$",
}) => {
  const chartSize = SCREEN_WIDTH - chartPadding;
  const center = chartSize / 2;
  const radius = center - 36;
  const angleStep = (Math.PI * 2) / data.length;

  const getPoint = useCallback((r: number, angle: number) => ({
    x: center + r * Math.cos(angle - Math.PI / 2),
    y: center + r * Math.sin(angle - Math.PI / 2),
  }), [center]);

  const gridPolygons = useMemo(() => {
    return GRID_LEVELS.map((level) =>
      data
        .map((_, i) => {
          const p = getPoint(radius * level, angleStep * i);
          return `${p.x},${p.y}`;
        })
        .join(" "),
    );
  }, [data, radius, angleStep, getPoint]);

  const axes = useMemo(() => {
    return data.map((_, i) => getPoint(radius, angleStep * i));
  }, [data, radius, angleStep, getPoint]);

  const dataPoints = useMemo(() => {
    return data
      .map((d, i) => {
        const p = getPoint(radius * (d.value / d.max), angleStep * i);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }, [data, radius, angleStep, getPoint]);

  const labelConfigs = useMemo(() => {
    return data.map((d, i) => {
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
  }, [data, radius, angleStep, getPoint]);

  return (
    <View style={[styles.container, style]}>
      <Text variant="semibold" size={14} color={colors.text.primary} style={styles.title}>
        {title}
      </Text>

      <View style={styles.chartWrapper}>
        <Svg height={chartSize} width={chartSize}>
          <G>
            {gridPolygons.map((points, i) => (
              <Polygon
                key={`grid-${i}`}
                points={points}
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="1"
              />
            ))}

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

            <Polygon
              points={dataPoints}
              fill={`${colors.secondary}15`}
              stroke={colors.secondary}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {data.map((d, i) => {
              const p = getPoint(radius * (d.value / d.max), angleStep * i);
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
        {data.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <Text variant="medium" size={10} color={colors.text.secondary}>
              {d.label}
            </Text>
            <Text variant="semibold" size={10} color={colors.text.primary}>
              {currencySymbol}{d.value}
            </Text>
          </View>
        ))}
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
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  legendItem: {
    width: "18%",
    alignItems: "center",
  },
});
