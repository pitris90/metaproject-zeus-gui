import { Anchor, Badge, Card, Group, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck, IconGitBranch, IconInfoCircle, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';

import { type AllocationDetail } from '@/modules/allocation/model';

type OpenstackAllocationInfoProps = {
	data: NonNullable<AllocationDetail['openstack']>;
};

const formatDate = (value?: string | null): string => {
	if (!value) {
		return 'Not provided';
	}

	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format('DD.MM.YYYY') : value;
};

const OpenstackAllocationInfo = ({ data }: OpenstackAllocationInfoProps) => {
	const quotaRows = Object.entries(data.quota ?? {})
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => (
			<Table.Tr key={key}>
				<Table.Td width={200}>{key}</Table.Td>
				<Table.Td>{value}</Table.Td>
			</Table.Tr>
		));

	const additionalTags = (data.additionalTags ?? []).filter((tag: string) => tag.trim().length > 0);
	const processedColor = data.processed ? 'green' : 'red';
	const processedLabel = data.processed ? 'Processed' : 'Pending';

	return (
		<Card withBorder radius="md" padding="md">
			<Stack gap="md">
				<Group justify="space-between">
					<Title order={4}>OpenStack Details</Title>
					<Badge color={processedColor} leftSection={<ThemeIcon color={processedColor} size="sm" variant="light" radius="xl">{data.processed ? <IconCheck size={14} /> : <IconInfoCircle size={14} />}</ThemeIcon>}>
						{processedLabel}
					</Badge>
				</Group>
				<Stack gap={4}>
					<Text size="sm" c="dimmed">Domain</Text>
					<Text fw={500}>{data.domain}</Text>
				</Stack>
				<Stack gap={4}>
					<Text size="sm" c="dimmed">Resource type</Text>
					<Text fw={500}>{data.resourceType}</Text>
				</Stack>
				<Group gap="xl" align="flex-start" wrap="wrap">
					<Stack gap={4}>
						<Text size="sm" c="dimmed">Customer</Text>
						<Text fw={500}>{data.customerKey}</Text>
					</Stack>
					<Stack gap={4}>
						<Text size="sm" c="dimmed">Organization</Text>
						<Text fw={500}>{data.organizationKey}</Text>
					</Stack>
					<Stack gap={4}>
						<Text size="sm" c="dimmed">Workplace</Text>
						<Text fw={500}>{data.workplaceKey}</Text>
					</Stack>
				</Group>
				<Stack gap={4}>
					<Text size="sm" c="dimmed">Disable date</Text>
					<Text fw={500}>{formatDate(data.disableDate)}</Text>
				</Stack>
				<Stack gap={4}>
					<Text size="sm" c="dimmed">Project description</Text>
					<Text>{data.projectDescription}</Text>
				</Stack>
				<Stack gap={6}>
					<Text size="sm" c="dimmed">Additional tags</Text>
					{additionalTags.length > 0 ? (
						<Group gap="xs">
							{additionalTags.map((tag: string) => (
								<Badge key={tag} radius="sm" color="blue" variant="light">
									{tag}
								</Badge>
							))}
						</Group>
					) : (
						<Text c="dimmed">No additional tags</Text>
					)}
				</Stack>
				<Stack gap={6}>
					<Group gap="sm" align="center">
						<Title order={5} m={0}>
							Quota definitions
						</Title>
						{quotaRows.length === 0 && <Badge color="red" variant="light">Missing</Badge>}
					</Group>
					{quotaRows.length > 0 ? (
						<Table striped withRowBorders={false} highlightOnHover>
							<Table.Tbody>{quotaRows}</Table.Tbody>
						</Table>
					) : (
						<Text c="dimmed">No quotas provided.</Text>
					)}
				</Stack>
				<Group gap="md" align="center">
					<ThemeIcon color={data.branchName ? 'green' : 'gray'} variant="light">
						{data.branchName ? <IconGitBranch size={16} /> : <IconX size={16} />}
					</ThemeIcon>
					<Stack gap={0}>
						<Text size="sm" c="dimmed">
							Merge request
						</Text>
						{data.mergeRequestUrl ? (
							<Anchor href={data.mergeRequestUrl} target="_blank" rel="noreferrer">
								Open merge request
							</Anchor>
						) : (
							<Text>No merge request created yet.</Text>
						)}
					</Stack>
				</Group>
				{data.branchName && (
					<Text size="sm">Branch: {data.branchName}</Text>
				)}
				{data.yamlPath && (
					<Text size="sm">YAML path: {data.yamlPath}</Text>
				)}
				{data.processedAt && (
					<Text size="sm" c="dimmed">
						Processed at: {formatDate(data.processedAt)}
					</Text>
				)}
			</Stack>
		</Card>
	);
};

export default OpenstackAllocationInfo;
