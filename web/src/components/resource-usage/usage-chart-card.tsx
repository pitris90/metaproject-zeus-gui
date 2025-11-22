import { Paper, Stack, Group, Text, Badge, useMantineTheme } from '@mantine/core';
import { useMemo } from 'react';
import { ResourceUsageSeriesPoint } from '@/modules/resource-usage/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartMetric {
	key: keyof ResourceUsageSeriesPoint;
	label: string;
	color?: string;
	formatter?: (value: number) => string;
}

interface UsageChartCardProps {
	title: string;
	description?: string;
	series: ResourceUsageSeriesPoint[];
	metrics: ChartMetric[];
}

const DEFAULT_COLORS = ['#3d97f5', '#f59f00'];

const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
	new Intl.NumberFormat(undefined, options).format(value);

export const UsageChartCard = ({ title, description, series, metrics }: UsageChartCardProps) => {
	const theme = useMantineTheme();
	const preparedMetrics = metrics.map((metric, index) => ({
		...metric,
		color: metric.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
	}));

	const latestPoint = series.at(-1);

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
					{latestPoint && (
						<Text size="sm" c="dimmed">
							Updated {new Date(latestPoint.timestamp).toLocaleDateString()}
						</Text>
					)}
				</Group>
				
				<div style={{ width: '100%', height: 250 }}>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
						const value = latestPoint ? Number(latestPoint[metric.key]) || 0 : 0;
						const formatter = metric.formatter ?? ((n: number) => formatNumber(n));
						return (
							<Badge key={metric.key as string} color={metric.color} variant="light">
								{metric.label}: {formatter(value)}
							</Badge>
						);
					})}
				</Group>
			</Stack>
		</Paper>
	);
};

export default UsageChartCard;
