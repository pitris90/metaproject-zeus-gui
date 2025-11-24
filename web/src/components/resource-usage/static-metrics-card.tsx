import { Paper, Group, Stack, Text, Select } from '@mantine/core';
import { IconCpu, IconDatabase } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import { 
	formatMemoryValue, 
	autoSelectMemoryUnit, 
	MemoryUnit, 
	MEMORY_UNITS 
} from '@/modules/resource-usage/utils/unit-conversions';

interface StaticMetricsCardProps {
	totalVcpus: number;
	storageBytesAllocated: number;
	lastUpdated: string;
}

export const StaticMetricsCard = ({ totalVcpus, storageBytesAllocated, lastUpdated }: StaticMetricsCardProps) => {
	// Auto-select best unit based on storage size
	const autoStorageUnit = useMemo(() => 
		autoSelectMemoryUnit(storageBytesAllocated), 
		[storageBytesAllocated]
	);
	
	const [selectedStorageUnit, setSelectedStorageUnit] = useState<MemoryUnit>(autoStorageUnit);
	
	return (
		<Paper withBorder p="md" radius="md">
			<Stack gap="md">
				<Text fw={600}>Static Allocations</Text>
				
				<Group grow>
					<Paper withBorder p="sm" radius="sm" bg="gray.0">
						<Group gap="xs">
							<IconCpu size={20} />
							<Stack gap={0}>
								<Text size="xs" c="dimmed">vCPUs Allocated</Text>
								<Text fw={600} size="lg">
									{totalVcpus || 'N/A'}
								</Text>
							</Stack>
						</Group>
					</Paper>

				<Paper withBorder p="sm" radius="sm" bg="gray.0">
					<Group gap="xs">
						<IconDatabase size={20} />
						<Stack gap={0}>
							<Group gap="xs" align="baseline">
								<Text size="xs" c="dimmed">Storage Allocated</Text>
								{storageBytesAllocated > 0 && (
									<Select
										data={MEMORY_UNITS.map((u) => ({ value: u.value, label: u.value }))}
										value={selectedStorageUnit}
										onChange={(value) => setSelectedStorageUnit((value as MemoryUnit) || 'GiB')}
										size="xs"
										w={80}
										comboboxProps={{ withinPortal: true }}
									/>
								)}
							</Group>
							<Text fw={600} size="lg">
								{storageBytesAllocated > 0 
									? `${formatMemoryValue(storageBytesAllocated, selectedStorageUnit)} ${selectedStorageUnit}`
									: 'N/A'
								}
							</Text>
						</Stack>
					</Group>
				</Paper>
				</Group>

				<Text size="xs" c="dimmed" ta="right">
					Last updated: {new Date(lastUpdated).toLocaleString()}
				</Text>
			</Stack>
		</Paper>
	);
};

export default StaticMetricsCard;
