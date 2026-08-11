import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { colors, spacing, typography } from '@/constants/design-tokens';
import { formatCurrencyCompact } from '@/lib/format';
import type { TrendPoint } from '@/hooks/use-expense-dashboard';

const CHART_HEIGHT = 150;
const LABEL_GUTTER = 18;
const BAR_GAP = 6;
/** Show every Nth month label — 12 labels never fit on a phone. */
const LABEL_EVERY = 3;

interface MonthlyTrendChartProps {
  data: TrendPoint[];
}

/**
 * Rolling 12-month spend (PRD EXP-4). Drawn with react-native-svg rather than a
 * charting library — see docs/TRD.md Section 2 for why this deviates.
 */
export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const [width, setWidth] = useState(0);

  const max = Math.max(...data.map((point) => point.amount), 0);
  const barWidth = data.length > 0 ? Math.max(1, width / data.length - BAR_GAP) : 0;
  const plotHeight = CHART_HEIGHT - LABEL_GUTTER;

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>Peak {formatCurrencyCompact(max)}</Text>
      </View>

      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <Line x1={0} y1={plotHeight} x2={width} y2={plotHeight} stroke={colors.border} strokeWidth={1} />

          {data.map((point, index) => {
            // Zero-spend months render as a 2px stub so the gap stays legible.
            const barHeight = max > 0 ? Math.max(2, (point.amount / max) * (plotHeight - 8)) : 2;
            const x = index * (barWidth + BAR_GAP) + BAR_GAP / 2;
            const isLast = index === data.length - 1;

            return (
              <Rect
                key={point.key}
                x={x}
                y={plotHeight - barHeight}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill={isLast ? colors.primary : '#A6C8FF'}
              />
            );
          })}

          {data.map((point, index) =>
            index % LABEL_EVERY === 0 || index === data.length - 1 ? (
              <SvgText
                key={`label-${point.key}`}
                x={index * (barWidth + BAR_GAP) + BAR_GAP / 2 + barWidth / 2}
                y={CHART_HEIGHT - 4}
                fontSize={10}
                fill={colors.textSecondary}
                textAnchor="middle">
                {point.label}
              </SvgText>
            ) : null
          )}
        </Svg>
      ) : (
        <View style={{ height: CHART_HEIGHT }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  scaleLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
