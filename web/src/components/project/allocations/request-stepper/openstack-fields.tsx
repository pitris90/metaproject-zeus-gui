import { Button, Fieldset, Group, NumberInput, Select, Stack, TagsInput, Text, TextInput, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { Controller, type ControllerRenderProps, type FieldArrayWithId, useFieldArray, useFormContext } from 'react-hook-form';
import { useEffect, useMemo } from 'react';

import { type AddAllocationSchema, type OpenstackQuotaEntry } from '@/modules/allocation/form';
import { hasOpenstackOrganizationCatalog, openstackOrganizations } from '@/modules/openstack/organizations';

const OpenstackAllocationFields = () => {
	const form = useFormContext<AddAllocationSchema>();
	const organizationOptions = useMemo(
		() =>
			openstackOrganizations.map(organization => ({
				value: organization.key,
				label: `${organization.label} (${organization.key})`
			})),
		[]
	);
	const hasOrganizationOptions = hasOpenstackOrganizationCatalog && organizationOptions.length > 0;

	const openstackErrors = form.formState.errors.openstack;

	const { fields, append, remove } = useFieldArray<AddAllocationSchema, 'openstack.quota'>({
		control: form.control,
		name: 'openstack.quota'
	});

	useEffect(() => {
		if (fields.length === 0) {
			append({ key: '', value: 0 } as OpenstackQuotaEntry);
		}
	}, [append, fields.length]);

	return (
		<Fieldset legend="OpenStack configuration" mt="md">
			<Stack gap="md">
				<Text size="sm" c="dimmed">
					These values are used to generate the GitOps OpenStack YAML once the allocation is approved.
				</Text>
				<TextInput
					label="OpenStack domain"
					withAsterisk
					placeholder="e.g. einf..."
					{...form.register('openstack.domain')}
					error={openstackErrors?.domain?.message as string}
				/>
				<Textarea
					label="Project description"
					withAsterisk
					autosize
					minRows={4}
					{...form.register('openstack.projectDescription')}
					error={openstackErrors?.projectDescription?.message as string}
				/>
				<Controller<AddAllocationSchema>
					control={form.control}
					name="openstack.disableDate"
					render={(props: { field: ControllerRenderProps<AddAllocationSchema, 'openstack.disableDate'> }) => (
						<DateInput
							label="Disable date"
							description="Optional date when the OpenStack project should be disabled"
							value={props.field.value ?? null}
							onChange={props.field.onChange}
							clearable
							error={openstackErrors?.disableDate?.message as string}
						/>
					)}
				/>
				<Group grow>
					<TextInput
						label="Customer tag"
						withAsterisk
						{...form.register('openstack.customerKey')}
						error={openstackErrors?.customerKey?.message as string}
					/>
					{hasOrganizationOptions ? (
						<Controller<AddAllocationSchema>
							control={form.control}
							name="openstack.organizationKey"
							render={(props: { field: ControllerRenderProps<AddAllocationSchema, 'openstack.organizationKey'> }) => (
								<Select
									label="Organization"
									withAsterisk
									data={organizationOptions}
									searchable
									value={props.field.value ?? ''}
									onChange={(value: string | null) => props.field.onChange(value ?? '')}
									error={openstackErrors?.organizationKey?.message as string}
								/>
							)}
						/>
					) : (
						<TextInput
							label="Organization tag"
							withAsterisk
							placeholder="Enter organization key"
							{...form.register('openstack.organizationKey')}
							error={openstackErrors?.organizationKey?.message as string}
						/>
					)}
					<TextInput
						label="Workplace tag"
						withAsterisk
						{...form.register('openstack.workplaceKey')}
						error={openstackErrors?.workplaceKey?.message as string}
					/>
				</Group>
				<Text size="sm" c="dimmed">
					Customer, organization, workplace, and additional tags will be validated when the request is saved.
				</Text>
				<Controller<AddAllocationSchema>
					control={form.control}
					name="openstack.additionalTags"
					render={(props: { field: ControllerRenderProps<AddAllocationSchema, 'openstack.additionalTags'> }) => (
						<TagsInput
							label="Additional tags"
							description="Optional list of additional OpenStack tags"
							value={props.field.value ?? []}
							onChange={props.field.onChange}
							placeholder="Add tag"
							error={openstackErrors?.additionalTags?.message as string}
						/>
					)}
				/>
				<Fieldset legend="Quota definitions">
					<Stack gap="sm">
						{fields.map((item: FieldArrayWithId<AddAllocationSchema, 'openstack.quota'>, index: number) => (
							<Group key={item.id} align="flex-end">
								<TextInput
									label="Quota key"
									placeholder="e.g. cores"
									withAsterisk
									{...form.register(`openstack.quota.${index}.key` as const)}
									error={openstackErrors?.quota?.[index]?.key?.message as string}
								/>
								<Controller<AddAllocationSchema>
									control={form.control}
									name={`openstack.quota.${index}.value` as const}
									render={(props: { field: ControllerRenderProps<AddAllocationSchema, `openstack.quota.${number}.value`> }) => (
										<NumberInput
											label="Quota value"
											withAsterisk
											min={0}
											value={props.field.value ?? 0}
											onChange={value => {
												if (value === '' || value === null) {
													props.field.onChange(0);
													return;
												}
												const numericValue = typeof value === 'number' ? value : Number(value);
												props.field.onChange(Number.isNaN(numericValue) ? 0 : numericValue);
											}}
											error={openstackErrors?.quota?.[index]?.value?.message as string}
										/>
									)}
								/>
								<Button
									type="button"
									variant="subtle"
									size="xs"
									onClick={() => remove(index)}
									disabled={fields.length === 1}
								>
									Remove
								</Button>
							</Group>
						))}
						<Button
							type="button"
							variant="light"
							size="xs"
							onClick={() => append({ key: '', value: 0 } as OpenstackQuotaEntry)}
						>
							Add quota item
						</Button>
					</Stack>
				</Fieldset>
			</Stack>
		</Fieldset>
	);
};

export default OpenstackAllocationFields;
