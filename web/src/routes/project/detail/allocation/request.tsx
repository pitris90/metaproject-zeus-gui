import { useTranslation } from 'react-i18next';
import { Box, Button, Group, Stack, Stepper, Text, Title } from '@mantine/core';
import React, { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

import { useProjectOutletContext } from '@/modules/auth/guards/project-detail-guard';
import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import ResourceTypeStep from '@/components/project/allocations/request-stepper/resource-type';
import ResourceStep from '@/components/project/allocations/request-stepper/resource';
import Loading from '@/components/global/loading';
import ErrorAlert from '@/components/global/error-alert';
import { addAllocationSchema, type AddAllocationSchema } from '@/modules/allocation/form';
import {
	AllocationRequestPayload,
	useRequestAllocationMutation
} from '@/modules/allocation/api/request-allocation';
import { useResourceListQuery } from '@/modules/resource/api/resources';
import { OPENSTACK_RESOURCE_TYPE_NAME } from '@/modules/openstack/constants';
import { type Resource } from '@/modules/resource/model';

const MAX_STEPS = 2;

const AllocationRequest = () => {
	const { project } = useProjectOutletContext();
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const form = useForm<AddAllocationSchema>({
		resolver: zodResolver(addAllocationSchema),
		defaultValues: {
			openstack: undefined
		}
	});

	const [active, setActive] = useState(0);
	const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set([]));
	const [resourceType, setResourceType] = useState<number | null>(null);
	const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);

	const { mutate, isPending: isFormPending } = useRequestAllocationMutation();
	const { data: resources, isPending, isError } = useResourceListQuery(project.id);

	const nextStep = () => setActive((current: number) => (current < MAX_STEPS ? current + 1 : current));
	const prevStep = () => setActive((current: number) => (current > 0 ? current - 1 : current));

	// Safely get resources as an array
	const resourcesArray = useMemo(() => {
		if (Array.isArray(resources)) {
			return resources;
		}
		return [];
	}, [resources]);

	const filteredResources = useMemo(
		() => resourcesArray.filter((resource: Resource) => resource.resourceType.id === resourceType),
		[resourcesArray, resourceType]
	);

	if (isPending) {
		return <Loading />;
	}

	if (isError) {
		return <ErrorAlert />;
	}

	const onSubmit = (data: AddAllocationSchema) => {
		const selectedResource = resourcesArray.find((resource: Resource) => resource.id === Number(data.resourceId));
		const isOpenstackResourceSelected =
			selectedResource?.resourceType?.name?.toLowerCase() === OPENSTACK_RESOURCE_TYPE_NAME.toLowerCase();

		const requestBody: AllocationRequestPayload = {
			justification: data.justification,
			resourceId: data.resourceId,
			quantity: data.quantity ?? 1
		};

		if (isOpenstackResourceSelected && data.openstack) {
			const quota = data.openstack.quota.reduce<Record<string, number>>((acc, entry: { key: string; value: number }) => {
				const key = entry.key.trim();
				if (key.length > 0) {
					acc[key] = entry.value;
				}
				return acc;
			}, {});
			const customerKey = data.openstack.customerKey.trim();
			const organizationKey = data.openstack.organizationKey.trim();
			const workplaceKey = data.openstack.workplaceKey.trim();

			// Transform network entries from form format to API format
			const networks = data.openstack.networks?.reduce<{ accessAsExternal: string[]; accessAsShared: string[] }>(
				(acc, entry) => {
					if (entry.accessType === 'external') {
						acc.accessAsExternal.push(entry.name);
					} else {
						acc.accessAsShared.push(entry.name);
					}
					return acc;
				},
				{ accessAsExternal: [], accessAsShared: [] }
			);

			requestBody.openstack = {
				domain: data.openstack.domain.trim(),
				disableDate: data.openstack.disableDate
					? dayjs(data.openstack.disableDate).format('YYYY-MM-DD')
					: undefined,
				customerKey,
				organizationKey,
				workplaceKey,
				quota,
				additionalTags: data.openstack.additionalTags
					?.map((tag: string) => tag.trim())
					.filter((tag: string) => tag.length > 0),
				flavors: data.openstack.flavors?.filter((f: string) => f.trim().length > 0),
				networks: networks && (networks.accessAsExternal.length > 0 || networks.accessAsShared.length > 0)
					? networks
					: undefined
			};
		}

		if (!isOpenstackResourceSelected) {
			delete requestBody.openstack;
		}

		mutate(
			{
				projectId: project.id,
				...requestBody
			},
			{
				onSuccess: () => {
					// Invalidate resource queries to ensure fresh data for future allocation requests
					queryClient.invalidateQueries({ queryKey: ['resource'] });
					queryClient.invalidateQueries({ queryKey: ['resource-type'] });
					// Invalidate allocation requests list for admin view
					queryClient.invalidateQueries({ queryKey: ['allocations'] });
					queryClient
						.refetchQueries({
							queryKey: ['project', project.id]
						})
						.then(() => {
							notifications.show({
								color: 'green',
								message: t('routes.AllocationRequest.notifications.success')
							});
							navigate(`/project/${project.id}`);
						});
				},
				onError: () => {
					notifications.show({
						color: 'red',
						message: t('routes.AllocationRequest.notifications.error')
					});
				}
			}
		);
	};

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: 'Projects', href: '/project' },
					{ title: project.title, href: `/project/${project.id}` },
					{ title: 'Request allocation', href: `/project/${project.id}/allocation` }
				]}
			/>
			<Stack align="center" gap={3} justify="center">
				<Title>{t('routes.AllocationRequest.title')}</Title>
				<Text>{t('routes.AllocationRequest.information')}</Text>
			</Stack>

			<Box my={20}>
				<FormProvider {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<Stepper active={active} onStepClick={setActive}>
							<Stepper.Step
								label={t('routes.AllocationRequest.form.step1.title')}
								description={t('routes.AllocationRequest.form.step1.description')}
							>
								<ResourceTypeStep
									resourceTypeId={resourceType}
									setResourceType={setResourceType}
									setComplete={() => setDoneSteps(new Set([...doneSteps, 0]))}
								/>
							</Stepper.Step>
							<Stepper.Step
								allowStepSelect={doneSteps.has(0)}
								label={t('routes.AllocationRequest.form.step2.title')}
								description={t('routes.AllocationRequest.form.step2.description')}
							>
								<ResourceStep
									resources={filteredResources}
									selectedResourceId={selectedResourceId}
									setSelectedResourceId={setSelectedResourceId}
									isPending={isFormPending}
								/>
							</Stepper.Step>
						</Stepper>
					</form>
				</FormProvider>

				{active < MAX_STEPS - 1 && (
					<Group justify="center" mt="xl">
						{active > 0 && (
							<Button variant="default" onClick={prevStep}>
								{t('routes.AllocationRequest.form.buttons.back')}
							</Button>
						)}
						<Button disabled={!doneSteps.has(active)} onClick={nextStep}>
							{t('routes.AllocationRequest.form.buttons.next')}
						</Button>
					</Group>
				)}
			</Box>
		</Box>
	);
};

export default AllocationRequest;
