import { Box, Button, Fieldset, Group, NumberInput, Select, Stack, Text, Textarea } from '@mantine/core';
import { Controller, type ControllerRenderProps, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import React, { useEffect } from 'react';

import Loading from '@/components/global/loading';
import ErrorAlert from '@/components/global/error-alert';
import { QUANTITY_DEFAULT_VALUE, QUANTITY_LABEL } from '@/modules/attribute/constant';
import { type Resource, type ResourceDetailAttribute } from '@/modules/resource/model';
import { useResourceDetailQuery } from '@/modules/resource/api/resource-detail';
import { type AddAllocationSchema, type OpenstackQuotaEntry } from '@/modules/allocation/form';
import { OPENSTACK_RESOURCE_TYPE_NAME } from '@/modules/openstack/constants';
import OpenstackAllocationFields from './openstack-fields';

type ResourceStepProps = {
	resources: Resource[];
	selectedResourceId: number | null;
	setSelectedResourceId: React.Dispatch<React.SetStateAction<number | null>>;
	isPending: boolean;
};

const ResourceStep = ({ resources, setSelectedResourceId, selectedResourceId, isPending }: ResourceStepProps) => {
	const form = useFormContext<AddAllocationSchema>();
	const { t } = useTranslation();

	const {
		data: resourceDetail,
		fetchStatus,
		isPending: isDetailPending,
		isError: isDetailError
	} = useResourceDetailQuery(selectedResourceId);

	const isOpenstackResource =
		resourceDetail?.resourceType?.name?.toLowerCase() === OPENSTACK_RESOURCE_TYPE_NAME.toLowerCase();

	useEffect(() => {
		if (!isOpenstackResource) {
			form.unregister('openstack');
			form.clearErrors('openstack');
			return;
		}

		const current = form.getValues('openstack');
		const defaultQuota: OpenstackQuotaEntry[] = [{ key: '', value: 0 }];

		if (!current) {
			form.setValue(
				'openstack',
				{
					domain: '',
					projectDescription: '',
					disableDate: null,
					mainTag: 'meta',
					customerKey: '',
					organizationKey: '',
					workplaceKey: '',
					quota: defaultQuota,
					additionalTags: []
				},
				{ shouldDirty: false, shouldValidate: false }
			);
			return;
		}

		if (!current.mainTag) {
			form.setValue('openstack.mainTag', 'meta', { shouldDirty: false, shouldValidate: false });
		}

		if (current.customerKey === 'meta') {
			form.setValue('openstack.customerKey', '', { shouldDirty: false, shouldValidate: false });
		}

		if (!current.quota || current.quota.length === 0) {
			form.setValue('openstack.quota', defaultQuota, { shouldDirty: false, shouldValidate: false });
		}
	}, [form, isOpenstackResource]);

	if (isDetailPending && fetchStatus === 'fetching') {
		return <Loading />;
	}

	if (isDetailError) {
		return <ErrorAlert />;
	}

	const quantityLabel = resourceDetail?.attributes.find(
		(attribute: ResourceDetailAttribute) => attribute.key === QUANTITY_LABEL
	)?.value;
	const quantityDefaultValue = resourceDetail?.attributes.find(
		(attribute: ResourceDetailAttribute) => attribute.key === QUANTITY_DEFAULT_VALUE
	)?.value;
	const attributes =
		resourceDetail?.attributes?.filter(
			(attribute: ResourceDetailAttribute) => !attribute.key.startsWith('quantity_')
		) ?? [];

	return (
		<Stack>
			<Box>
				<Controller<AddAllocationSchema>
					control={form.control}
					name="resourceId"
					defaultValue={selectedResourceId?.toString() ?? null}
					render={({ field }: { field: ControllerRenderProps<AddAllocationSchema, 'resourceId'> }) => (
						<Select
							name={field.name}
							value={field.value}
							label={t('components.resourceStepper.resource.resource.label')}
							withAsterisk
							data={resources.map((resource: Resource) => ({
								value: resource.id.toString(),
								label: resource.name
							}))}
							onChange={(value: string | null) => {
								if (!value) {
									setSelectedResourceId(null);
									field.onChange('');
									return;
								}
								setSelectedResourceId(Number(value));
								field.onChange(value);
							}}
							error={form.formState.errors.resourceId?.message as string}
						/>
					)}
				/>
				{attributes.length > 0 && (
					<Fieldset legend="Attributes" mt={10}>
						<Stack gap={3}>
							{attributes.map((attribute: ResourceDetailAttribute) => (
								<Group key={attribute.key} gap={3}>
									<Text fw="bold" size="sm">
										{attribute.key}:
									</Text>
									<Text size="sm">{attribute.value}</Text>
								</Group>
							))}
						</Stack>
					</Fieldset>
				)}
			</Box>
			<Textarea
				label={t('components.resourceStepper.resource.justification.label')}
				description={t('components.resourceStepper.resource.justification.description')}
				withAsterisk
				autosize
				minRows={10}
				{...form.register('justification')}
				error={form.formState.errors.justification?.message as string}
			/>
			{quantityLabel && quantityDefaultValue && (
				<Controller<AddAllocationSchema>
					control={form.control}
					name="quantity"
					defaultValue={isNaN(+quantityDefaultValue) ? null : +quantityDefaultValue}
					render={({ field }: { field: ControllerRenderProps<AddAllocationSchema, 'quantity'> }) => (
						<NumberInput
							name={field.name}
							label={quantityLabel}
							withAsterisk
							min={0}
							value={field.value}
							onChange={(value: string | number) => {
								const numericValue = typeof value === 'number' ? value : Number(value);
								field.onChange(Number.isNaN(numericValue) ? 0 : numericValue);
							}}
							error={form.formState.errors.quantity?.message as string}
						/>
					)}
				/>
			)}
			{isOpenstackResource && <OpenstackAllocationFields />}
			<Button type="submit" loading={isPending}>
				Request resource allocation
			</Button>
		</Stack>
	);
};

export default ResourceStep;
