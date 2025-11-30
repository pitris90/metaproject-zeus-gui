import { Anchor, Box, Button, Divider, Flex, Group, Select, Stack, Text, Textarea, Title } from '@mantine/core';
import dayjs from 'dayjs';
import { DataTable } from 'mantine-datatable';
import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Controller, type ControllerRenderProps, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { HTTPError } from 'ky';

import { type AllocationDetail } from '@/modules/allocation/model';
import { getCurrentRole } from '@/modules/auth/methods/getCurrentRole';
import { Role } from '@/modules/user/role';
import { type ApproveAllocationSchema, approveAllocationSchema } from '@/modules/allocation/form';
import { useApproveAllocationMutation } from '@/modules/allocation/api/set-allocation-status';
import OpenstackAllocationInfo from './openstack-allocation-info';

type AllocationInfoProps = {
	allocation: AllocationDetail;
	isApprovePage: boolean;
	onSuccess?: () => void;
};

const AllocationInfo = ({ allocation, isApprovePage, onSuccess }: AllocationInfoProps) => {
	const role = getCurrentRole();
	const showAdminPage = role === Role.ADMIN && isApprovePage;
	const defaultStatus = useMemo<string>(() => (allocation.status === 'new' ? 'active' : allocation.status), [allocation.status]);
	const defaultStartDate = useMemo<Date | undefined>(
		() => (allocation.startDate ? new Date(allocation.startDate) : undefined),
		[allocation.startDate]
	);
	const defaultEndDate = useMemo<Date>(
		() => (allocation.endDate ? new Date(allocation.endDate) : dayjs().add(1, 'year').toDate()),
		[allocation.endDate]
	);

	const {
		control,
		register,
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
		getValues
	} = useForm<ApproveAllocationSchema>({
		resolver: zodResolver(approveAllocationSchema),
		defaultValues: {
			startDate: defaultStartDate,
			endDate: allocation.status === 'denied' ? undefined : defaultEndDate,
			status: defaultStatus,
			description: allocation.description ?? ''
		}
	});

	const status = watch('status');
	const { mutate, isPending } = useApproveAllocationMutation();
	const statusOptions = useMemo(
		() => [
			{ value: 'new', label: 'New' },
			{ value: 'active', label: 'Active' },
			{ value: 'expired', label: 'Expired' },
			{ value: 'denied', label: 'Denied' },
			{ value: 'revoked', label: 'Revoked' }
		],
		[]
	);

	useEffect(() => {
		if (status === 'denied') {
			setValue('endDate', undefined, { shouldDirty: true, shouldValidate: true });
			return;
		}

		const currentEndDate = getValues('endDate');
		if (!currentEndDate) {
			setValue('endDate', defaultEndDate, { shouldDirty: false, shouldValidate: false });
		}
	}, [status, setValue, getValues, defaultEndDate]);

	const showSuccessNotification = () => {
		notifications.show({ color: 'green', message: 'Allocation status updated.' });
	};

	const showErrorNotification = async (error: unknown) => {
		let message = 'Unable to update allocation status.';

		if (!(error instanceof HTTPError)) {
			notifications.show({ color: 'red', message });
			return;
		}

		const httpError = error as HTTPError;
		const response = httpError.response;
		try {
			const body = await response.clone().json();
			if (body && typeof body.message === 'string') {
				message = body.message;
			}
		} catch {
			try {
				const text = await response.text();
				if (text) {
					message = text;
				}
			} catch {
				// ignore secondary parsing issues
			}
		}

		notifications.show({ color: 'red', message });
	};

	const onApprove = (data: ApproveAllocationSchema) => {
		mutate(
			{
				...data,
				allocationId: allocation.id
			},
			{
				onSuccess: () => {
					showSuccessNotification();
					onSuccess?.();
				},
				onError: async (error: unknown) => {
					await showErrorNotification(error);
				}
			}
		);
	};

	const onDeny = () => {
		const description = getValues('description');
		mutate(
			{
				allocationId: allocation.id,
				status: 'denied',
				description
			},
			{
				onSuccess: () => {
					showSuccessNotification();
					onSuccess?.();
				},
				onError: async (error: unknown) => {
					await showErrorNotification(error);
				}
			}
		);
	};

	return (
		<form onSubmit={handleSubmit(onApprove)}>
			<Stack mt={15}>
				<Text c="dimmed" size="sm" hiddenFrom="sm">
					Last modified: {dayjs(allocation.updatedAt).format('DD.MM.YYYY')}
				</Text>
				<Stack gap={2}>
					<Group justify="space-between">
						<Group gap={10}>
							<Title order={4}>Resource:</Title>
							{!showAdminPage && (
								<Text size="lg">
									{allocation.resource.name} ({allocation.resource.type})
								</Text>
							)}
							{showAdminPage && (
								<Anchor component={Link} to={`/admin/resources/${allocation.resource.id}`}>
									{allocation.resource.name} ({allocation.resource.type})
								</Anchor>
							)}
						</Group>
						<Text c="dimmed" size="sm" visibleFrom="sm">
							Last modified: {dayjs(allocation.updatedAt).format('DD.MM.YYYY')}
						</Text>
					</Group>
					<Group my={5}>
						<Title order={4}>Quantity:</Title>
						<Text>{allocation.quantity}</Text>
					</Group>
					<Group my={5}>
						{!showAdminPage && (
							<>
								<Title order={4}>Start date:</Title>
								<Text>
									{allocation.startDate
										? dayjs(allocation.startDate).format('DD.MM.YYYY')
										: '-not defined-'}
								</Text>
							</>
						)}
						{showAdminPage && (
							<Controller<ApproveAllocationSchema>
								control={control}
								name="startDate"
								render={(props: { field: ControllerRenderProps<ApproveAllocationSchema, 'startDate'> }) => (
									<DateInput
										label="Start date"
										name={props.field.name}
										value={props.field.value ?? null}
										error={errors.startDate?.message}
										onChange={(value: Date | null) => {
											props.field.onChange(value ?? undefined);
										}}
										clearable
									/>
								)}
							/>
						)}
					</Group>
					<Group my={5}>
						{!showAdminPage && (
							<>
								<Title order={4}>End date:</Title>
								<Text>
									{allocation.endDate
										? dayjs(allocation.endDate).format('DD.MM.YYYY')
										: '-not defined-'}
								</Text>
							</>
						)}
						{showAdminPage && (
							<Controller<ApproveAllocationSchema>
								control={control}
								name="endDate"
								render={(props: { field: ControllerRenderProps<ApproveAllocationSchema, 'endDate'> }) => (
									<DateInput
										withAsterisk={status !== 'denied'}
										label="End date"
										name={props.field.name}
										error={errors.endDate?.message}
										value={props.field.value ?? null}
										disabled={status === 'denied'}
										clearable
										onChange={(value: Date | null) => {
											props.field.onChange(value ?? undefined);
										}}
									/>
								)}
							/>
						)}
					</Group>
					{showAdminPage && (
						<Group my={5}>
							<Controller<ApproveAllocationSchema>
								control={control}
								name="status"
								render={(props: { field: ControllerRenderProps<ApproveAllocationSchema, 'status'> }) => (
									<Select
										label="Status"
										name={props.field.name}
										error={errors.status?.message}
										value={props.field.value ?? ''}
										data={statusOptions}
										allowDeselect={false}
										onChange={(value: string | null) => {
											if (value) {
												props.field.onChange(value);
											}
										}}
									/>
								)}
							/>
						</Group>
					)}
				</Stack>
				<Divider />
				<Flex direction="column">
					<Box>
						<Text fw="bold">Justification:</Text>
						{allocation.justification}
					</Box>
					<Box mt={10}>
						<Text fw="bold">Description:</Text>
						{!showAdminPage && (
							<Text>{allocation.description ? allocation.description : '-not defined-'}</Text>
						)}
						{showAdminPage && (
							<Textarea
								placeholder="Provide optional description..."
								minRows={5}
								autosize
								{...register('description')}
							/>
						)}
					</Box>
				</Flex>
			</Stack>

			{allocation.openstack && (
				<OpenstackAllocationInfo
					data={allocation.openstack}
					history={allocation.openstackHistory}
					canModify={allocation.canModifyOpenstack}
					allocationId={allocation.id}
					isChangeable={allocation.isChangeable}
				/>
			)}

			<Stack mt={20}>
				<Title order={2}>Users in allocation</Title>
				<DataTable
					records={allocation.allocationUsers}
					textSelectionDisabled
					columns={[
						{
							accessor: 'id',
							title: 'ID',
							width: 70
						},
						{
							accessor: 'name',
							title: 'Name'
						},
						{
							accessor: 'email',
							title: 'E-mail'
						}
					]}
				/>
			</Stack>

			{showAdminPage && (
				<Group mt={15} justify="end">
					<Button type="submit" color="green" loading={isPending}>
						Approve
					</Button>
					<Button type="button" color="red" loading={isPending} onClick={onDeny}>
						Deny
					</Button>
				</Group>
			)}
		</form>
	);
};

export default AllocationInfo;
