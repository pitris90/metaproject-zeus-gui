import { Accordion, Badge, Button, Card, Group, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck, IconClock, IconGitMerge, IconGitPullRequest, IconX, IconEdit } from '@tabler/icons-react';
import dayjs from 'dayjs';
import React, { useState } from 'react';

import { type AllocationDetail, type OpenstackRequest, type OpenstackRequestStatus, type MergeRequestState } from '@/modules/allocation/model';
import OpenstackModifyModal from './openstack-modify-modal';

type OpenstackAllocationInfoProps = {
	data: NonNullable<AllocationDetail['openstack']>;
	history?: OpenstackRequest[];
	canModify?: boolean;
	allocationId: number;
	isChangeable?: boolean;
	allocationStartDate?: string;
	allocationEndDate?: string;
};

/**
 * Default cores count when not specified in the OpenStack quota
 */
const DEFAULT_CORES_COUNT = 10;

/**
 * Extracts the cores count from the latest approved and merged OpenStack request.
 * Falls back to the current request's quota if no approved+merged request is found.
 * Returns DEFAULT_CORES_COUNT (10) if no cores quota is defined.
 */
const getCoresFromOpenstackRequest = (
	currentRequest?: OpenstackRequest,
	history?: OpenstackRequest[]
): number => {
	// First, try to find the latest approved and merged request
	const allRequests = [currentRequest, ...(history ?? [])].filter(
		(req): req is OpenstackRequest => req !== undefined
	);

	// Find the latest approved and merged request with cores defined
	const approvedAndMergedRequest = allRequests.find(
		(req) => req.status === 'approved' && req.mergeRequestState === 'merged'
	);

	// Get cores from the approved+merged request, or fallback to current request
	const requestToUse = approvedAndMergedRequest ?? currentRequest;
	const coresValue = requestToUse?.quota?.['cores'];

	if (typeof coresValue === 'number' && coresValue > 0) {
		return coresValue;
	}

	return DEFAULT_CORES_COUNT;
};

/**
 * Calculates the max CPU time for an OpenStack allocation.
 * Formula: walltime (hours) × cores count
 * Returns total CPU hours available.
 */
const calculateMaxCpuTime = (
	startDate?: string,
	endDate?: string,
	coresCount: number = DEFAULT_CORES_COUNT
): { cpuHours: number; walltimeHours: number; formatted: string } | null => {
	if (!startDate || !endDate) {
		return null;
	}

	const start = dayjs(startDate);
	const end = dayjs(endDate);

	if (!start.isValid() || !end.isValid()) {
		return null;
	}

	const diffMs = end.diff(start);
	if (diffMs < 0) {
		return null;
	}

	const walltimeHours = Math.floor(diffMs / (1000 * 60 * 60));
	const cpuHours = walltimeHours * coresCount;

	// Format walltime for display
	const days = Math.floor(walltimeHours / 24);
	const hours = walltimeHours % 24;

	let walltimeFormatted = '';
	if (days > 0) {
		walltimeFormatted += `${days} day${days !== 1 ? 's' : ''}`;
		if (hours > 0) {
			walltimeFormatted += ` ${hours} hour${hours !== 1 ? 's' : ''}`;
		}
	} else {
		walltimeFormatted = `${hours} hour${hours !== 1 ? 's' : ''}`;
	}

	return {
		cpuHours,
		walltimeHours,
		formatted: `${cpuHours.toLocaleString()} CPU hours (${walltimeFormatted} × ${coresCount} cores)`
	};
};

const formatDate = (value?: string | null): string => {
	if (!value) {
		return 'Not provided';
	}

	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format('DD.MM.YYYY') : value;
};

const getRequestStatusConfig = (status: OpenstackRequestStatus): { color: string; label: string } => {
	switch (status) {
		case 'approved':
			return { color: 'green', label: 'Approved' };
		case 'denied':
			return { color: 'red', label: 'Denied' };
		case 'pending':
		default:
			return { color: 'yellow', label: 'Pending' };
	}
};

const getMergeRequestStateConfig = (state: MergeRequestState): { color: string; label: string; icon: React.ReactNode } | null => {
	switch (state) {
		case 'merged':
			return { color: 'green', label: 'Merged', icon: <IconGitMerge size={14} /> };
		case 'opened':
			return { color: 'blue', label: 'Open', icon: <IconGitPullRequest size={14} /> };
		case 'closed':
			return { color: 'red', label: 'Closed', icon: <IconX size={14} /> };
		default:
			return null;
	}
};

const OpenstackRequestDetails = ({ request }: { request: OpenstackRequest }) => {
	const quotaRows = Object.entries(request.quota ?? {})
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => (
			<Table.Tr key={key}>
				<Table.Td width={200}>{key}</Table.Td>
				<Table.Td>{value}</Table.Td>
			</Table.Tr>
		));

	const additionalTags = (request.additionalTags ?? []).filter((tag: string) => tag.trim().length > 0);
	const statusConfig = getRequestStatusConfig(request.status);
	const mrStateConfig = getMergeRequestStateConfig(request.mergeRequestState);

	return (
		<Stack gap="md">
			<Group gap="xs">
				<Badge color={statusConfig.color} variant="light">
					{statusConfig.label}
				</Badge>
				{mrStateConfig && (
					<Badge
						color={mrStateConfig.color}
						variant="light"
						leftSection={mrStateConfig.icon}
					>
						MR: {mrStateConfig.label}
					</Badge>
				)}
				{request.processed && (
					<Badge color="green" leftSection={<ThemeIcon color="green" size="sm" variant="light" radius="xl"><IconCheck size={14} /></ThemeIcon>}>
						Processed
					</Badge>
				)}
			</Group>
			<Stack gap={4}>
				<Text size="sm" c="dimmed">Domain</Text>
				<Text fw={500}>{request.domain}</Text>
			</Stack>
			<Group gap="xl" align="flex-start" wrap="wrap">
				<Stack gap={4}>
					<Text size="sm" c="dimmed">Customer</Text>
					<Text fw={500}>{request.customerKey}</Text>
				</Stack>
				<Stack gap={4}>
					<Text size="sm" c="dimmed">Organization</Text>
					<Text fw={500}>{request.organizationKey}</Text>
				</Stack>
				<Stack gap={4}>
					<Text size="sm" c="dimmed">Workplace</Text>
					<Text fw={500}>{request.workplaceKey}</Text>
				</Stack>
			</Group>
			<Stack gap={4}>
				<Text size="sm" c="dimmed">Disable date</Text>
				<Text fw={500}>{formatDate(request.disableDate)}</Text>
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
			{request.flavors && request.flavors.length > 0 && (
				<Stack gap={6}>
					<Text size="sm" c="dimmed">Requested flavors</Text>
					<Group gap="xs">
						{request.flavors.map((flavor: string) => (
							<Badge key={flavor} radius="sm" color="grape" variant="light">
								{flavor}
							</Badge>
						))}
					</Group>
				</Stack>
			)}
			{request.networks && (request.networks.accessAsExternal?.length || request.networks.accessAsShared?.length) ? (
				<Stack gap={6}>
					<Text size="sm" c="dimmed">Requested networks</Text>
					<Stack gap="xs">
						{(request.networks.accessAsExternal?.length ?? 0) > 0 && (
							<Group gap="xs">
								<Text size="xs" c="dimmed">External:</Text>
								{request.networks.accessAsExternal?.map((network: string) => (
									<Badge key={`ext-${network}`} radius="sm" color="cyan" variant="light">
										{network}
									</Badge>
								))}
							</Group>
						)}
						{(request.networks.accessAsShared?.length ?? 0) > 0 && (
							<Group gap="xs">
								<Text size="xs" c="dimmed">Shared:</Text>
								{request.networks.accessAsShared?.map((network: string) => (
									<Badge key={`shared-${network}`} radius="sm" color="teal" variant="light">
										{network}
									</Badge>
								))}
							</Group>
						)}
					</Stack>
				</Stack>
			) : null}
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
			<Text size="xs" c="dimmed">
				Created: {formatDate(request.createdAt)}
			</Text>
		</Stack>
	);
};

const OpenstackAllocationInfo = ({ data, history, canModify, allocationId, isChangeable, allocationStartDate, allocationEndDate }: OpenstackAllocationInfoProps) => {
	const [modifyModalOpened, setModifyModalOpened] = useState(false);

	const statusConfig = getRequestStatusConfig(data.status);
	const mrStateConfig = getMergeRequestStateConfig(data.mergeRequestState);
	const coresCount = getCoresFromOpenstackRequest(data, history);
	const maxCpuTime = calculateMaxCpuTime(allocationStartDate, allocationEndDate, coresCount);

	return (
		<>
			<Card withBorder radius="md" padding="md" mt="md">
				<Stack gap="md">
					<Group justify="space-between">
						<Title order={4}>OpenStack Details</Title>
						<Group gap="xs">
							<Badge color={statusConfig.color} variant="light">
								{statusConfig.label}
							</Badge>
							{mrStateConfig && (
								<Badge
									color={mrStateConfig.color}
									variant="light"
									leftSection={mrStateConfig.icon}
								>
									MR: {mrStateConfig.label}
								</Badge>
							)}
							{data.processed && (
								<Badge color="green" leftSection={<ThemeIcon color="green" size="sm" variant="light" radius="xl"><IconCheck size={14} /></ThemeIcon>}>
									Processed
								</Badge>
							)}
							{!data.processed && data.status === 'pending' && (
								<Badge color="yellow" leftSection={<ThemeIcon color="yellow" size="sm" variant="light" radius="xl"><IconClock size={14} /></ThemeIcon>}>
									Awaiting Approval
								</Badge>
							)}
						</Group>
					</Group>

					<OpenstackRequestDetails request={data} />

					{maxCpuTime && (
						<>
							<Stack gap={4}>
								<Text size="sm" c="dimmed">Max walltime</Text>
								<Text fw={500}>
									{maxCpuTime.walltimeHours.toLocaleString()} hours
									{(() => {
										const days = Math.floor(maxCpuTime.walltimeHours / 24);
										const hours = maxCpuTime.walltimeHours % 24;
										if (days > 0) {
											return ` (${days} day${days !== 1 ? 's' : ''}${hours > 0 ? ` ${hours} hour${hours !== 1 ? 's' : ''}` : ''})`;
										}
										return '';
									})()}
								</Text>
							</Stack>
							<Stack gap={4}>
								<Text size="sm" c="dimmed">Max CPU time</Text>
								<Text fw={500}>{maxCpuTime.cpuHours.toLocaleString()} CPU hours ({maxCpuTime.walltimeHours.toLocaleString()} hours × {coresCount} cores)</Text>
							</Stack>
						</>
					)}

					{canModify && isChangeable && (
						<Group justify="flex-end" mt="md">
							<Button
								leftSection={<IconEdit size={16} />}
								variant="light"
								color="blue"
								onClick={() => setModifyModalOpened(true)}
							>
								Request Modification
							</Button>
						</Group>
					)}
				</Stack>
			</Card>

			{history && history.length > 0 && (
				<Accordion mt="md" variant="contained">
					<Accordion.Item value="history">
						<Accordion.Control icon={<IconClock size={16} />}>
							Request History ({history.length} previous {history.length === 1 ? 'request' : 'requests'})
						</Accordion.Control>
						<Accordion.Panel>
							<Stack gap="lg">
								{history.map((request, index) => (
									<Card key={request.id} withBorder radius="sm" padding="sm">
										<Text size="sm" fw={500} mb="xs">
											Request #{request.id} - {formatDate(request.createdAt)}
										</Text>
										<OpenstackRequestDetails request={request} />
									</Card>
								))}
							</Stack>
						</Accordion.Panel>
					</Accordion.Item>
				</Accordion>
			)}

			<OpenstackModifyModal
				opened={modifyModalOpened}
				onClose={() => setModifyModalOpened(false)}
				allocationId={allocationId}
				currentRequest={data}
			/>
		</>
	);
};

export default OpenstackAllocationInfo;
