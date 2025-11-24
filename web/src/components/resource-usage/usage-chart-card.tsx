import { Paper, Stack, Group, Text, Badge, useMantineTheme, Select } from '@mantine/core';
import { useMemo, useState } from 'react';
import { ResourceUsageSeriesPoint } from '@/modules/resource-usage/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
	TimeUnit,
	MemoryUnit,
	TIME_UNITS,
	MEMORY_UNITS,
	convertTimeValue,
	convertMemoryValue,
	formatTimeValue,
	formatMemoryValue,
	autoSelectTimeUnit,
	autoSelectMemoryUnit
} from '@/modules/resource-usage/utils/unit-conversions';

type UnitType = 'time' | 'memory' | 'percentage' | 'none';

interface ChartMetric {
	key: keyof ResourceUsageSeriesPoint;
	label: string;
	color?: string;
	formatter?: (value: number) => string;
	unitType?: UnitType;
}

interface UsageChartCardProps {
	title: string;
	description?: string;
	series: ResourceUsageSeriesPoint[];
	metrics: ChartMetric[];
	unitType?: UnitType;
}

const DEFAULT_COLORS = ['#3d97f5', '#f59f00'];

const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
	new Intl.NumberFormat(undefined, options).format(value);

export const UsageChartCard = ({ title, description, series, metrics, unitType = 'none' }: UsageChartCardProps) => {
	const theme = useMantineTheme();

	// Auto-select best unit based on latest value
	const latestPoint = useMemo(() => series.at(-1), [series]);
	const autoTimeUnit = useMemo(() => {
		if (!latestPoint || unitType !== 'time') return 's';
		const maxValue = Math.max(
			...metrics.map((m) => Number(latestPoint[m.key]) || 0)
		);
		return autoSelectTimeUnit(maxValue);
	}, [latestPoint, metrics, unitType]);

	const autoMemoryUnit = useMemo(() => {
		if (!latestPoint || unitType !== 'memory') return 'GiB';
		const maxValue = Math.max(
			...metrics.map((m) => Number(latestPoint[m.key]) || 0)
		);
		return autoSelectMemoryUnit(maxValue);
	}, [latestPoint, metrics, unitType]);

	const [selectedTimeUnit, setSelectedTimeUnit] = useState<TimeUnit>(autoTimeUnit);
	const [selectedMemoryUnit, setSelectedMemoryUnit] = useState<MemoryUnit>(autoMemoryUnit);

	// Convert values based on selected unit
	const convertValue = (value: number): number => {
		if (unitType === 'time') return convertTimeValue(value, selectedTimeUnit);
		if (unitType === 'memory') return convertMemoryValue(value, selectedMemoryUnit);
		return value;
	};

	const formatValue = (value: number): string => {
		if (unitType === 'time') return formatTimeValue(value, selectedTimeUnit);
		if (unitType === 'memory') return formatMemoryValue(value, selectedMemoryUnit);
		if (unitType === 'percentage') return `${value.toFixed(2)}%`;
		return formatNumber(value);
	};

	const getUnitLabel = (): string => {
		if (unitType === 'time') return selectedTimeUnit;
		if (unitType === 'memory') return selectedMemoryUnit;
		if (unitType === 'percentage') return '%';
		return '';
	};

	const preparedMetrics = metrics.map((metric, index) => ({
		...metric,
		color: metric.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
		unitType: metric.unitType ?? unitType
	}));

	// Aggregate data by timestamp to handle duplicates
	const aggregatedSeries = useMemo(() => {
		const grouped = series.reduce((acc, point) => {
			const timestamp = new Date(point.timestamp).toISOString().split('T')[0];
			if (!acc[timestamp]) {
				acc[timestamp] = [];
			}
			acc[timestamp].push(point);
			return acc;
		}, {} as Record<string, ResourceUsageSeriesPoint[]>);

		return Object.entries(grouped).map(([timestamp, points]) => {
			const aggregated: any = { timestamp: new Date(timestamp).toISOString() };
			
			metrics.forEach(metric => {
				const sum = points.reduce((sum, p) => sum + Number(p[metric.key] || 0), 0);
				aggregated[metric.key] = sum;
			});

			return aggregated as ResourceUsageSeriesPoint;
		}).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
	}, [series, metrics]);

	const currentLatestPoint = aggregatedSeries.at(-1);
	const isSinglePoint = aggregatedSeries.length === 1;

	// Convert series data based on selected unit
	const convertedSeries = useMemo(() => {
		return aggregatedSeries.map((point) => {
			const converted: any = { ...point };
			metrics.forEach((metric) => {
				converted[metric.key] = convertValue(Number(point[metric.key]) || 0);
			});
			return converted;
		});
	}, [aggregatedSeries, metrics, selectedTimeUnit, selectedMemoryUnit, unitType]);

	return (
		<Paper withBorder p="md" radius="md">
			<Stack gap="xs">
				<Group justify="space-between">
					<div>
						<Text fw={600}>{title}</Text>
						{description && (
							<Text size="sm" c="dimmed">
								{description}
							</Text>
						)}
					</div>
					<Group gap="xs">
						{unitType === 'time' && (
							<Select
								data={TIME_UNITS.map((u) => ({ value: u.value, label: u.label }))}
								value={selectedTimeUnit}
								onChange={(value) => setSelectedTimeUnit((value as TimeUnit) || 's')}
								size="xs"
								w={100}
							/>
						)}
						{unitType === 'memory' && (
							<Select
								data={MEMORY_UNITS.map((u) => ({ value: u.value, label: u.label }))}
								value={selectedMemoryUnit}
								onChange={(value) => setSelectedMemoryUnit((value as MemoryUnit) || 'GiB')}
								size="xs"
								w={100}
							/>
						)}
						{currentLatestPoint && (
							<Text size="sm" c="dimmed">
								Updated {new Date(currentLatestPoint.timestamp).toLocaleDateString()}
							</Text>
						)}
					</Group>
				</Group>
				
				<div style={{ width: '100%', height: 250 }}>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={convertedSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.gray[3]} />
							<XAxis 
								dataKey="timestamp" 
								tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
								tick={{ fontSize: 12, fill: theme.colors.gray[6] }}
								axisLine={false}
								tickLine={false}
								minTickGap={30}
							/>
							<YAxis 
								tickFormatter={(val) => formatNumber(val, { notation: 'compact' })}
								tick={{ fontSize: 12, fill: theme.colors.gray[6] }}
								axisLine={false}
								tickLine={false}
								width={40}
							/>
							<Tooltip 
								labelFormatter={(label) => new Date(label).toLocaleString()}
								formatter={(value: number, name: string, props) => {
									const metric = preparedMetrics.find(m => m.key === props.dataKey);
									if (metric && metric.formatter) {
										return [metric.formatter(value), metric.label];
									}
									return [formatNumber(value), name];
								}}
								contentStyle={{ 
									borderRadius: theme.radius.sm, 
									border: `1px solid ${theme.colors.gray[3]}`,
									backgroundColor: 'rgba(255, 255, 255, 0.95)',
									boxShadow: theme.shadows.sm
								}}
							/>
							{preparedMetrics.map((metric) => (
								<Area
									key={metric.key as string}
									type="monotone"
									dataKey={metric.key as string}
									name={metric.label}
									stroke={metric.color}
									fill={metric.color}
									fillOpacity={0.1}
									strokeWidth={2}
									activeDot={{ r: 6, strokeWidth: 0 }}
								/>
							))}
						</AreaChart>
					</ResponsiveContainer>
				</div>

				<Group gap="xs" wrap="wrap">
					{preparedMetrics.map((metric) => {
						const rawValue = currentLatestPoint ? Number(currentLatestPoint[metric.key]) || 0 : 0;
						const displayValue = formatValue(rawValue);
						const unitLabel = getUnitLabel();
						return (
							<Badge key={metric.key as string} color={metric.color} variant="light">
								{metric.label}: {displayValue} {unitLabel}
							</Badge>
						);
					})}
				</Group>
			</Stack>
		</Paper>
	);
};

export default UsageChartCard;
