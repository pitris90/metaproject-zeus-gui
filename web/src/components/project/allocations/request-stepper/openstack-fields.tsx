import { Button, Fieldset, Group, MultiSelect, NumberInput, Select, SegmentedControl, Stack, TagsInput, Text, Textarea, TextInput, Tooltip } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { Controller, type ControllerRenderProps, type FieldArrayWithId, useFieldArray, useFormContext } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';

import { type AddAllocationSchema, type OpenstackQuotaEntry, type OpenstackNetworkEntry } from '@/modules/allocation/form';
import {
	getOpenstackWorkplacesByOrganization,
	mergeCustomerOptions,
	type OpenstackCatalogEntry,
	type OpenstackWorkplaceEntry
} from '@/modules/openstack/organizations';
import { useOpenstackCatalogQuery, type OpenstackFlavorEntry } from '@/modules/openstack/api/catalog';
import {
	getOpenstackDomainOptions,
	getOpenstackQuotaOptions,
	getOpenstackFlavorOptions,
	getOpenstackNetworkOptions,
	getFlavorDetails,
	syncOpenstackDomains,
	syncOpenstackQuotaKeys,
	syncOpenstackFlavors,
	syncOpenstackNetworks
} from '@/modules/openstack/constraints';

type SelectOption = {
	value: string;
	label: string;
};

const OpenstackAllocationFields = () => {
	const form = useFormContext<AddAllocationSchema>();
	const { data: catalog } = useOpenstackCatalogQuery();
	const [customerOptions, setCustomerOptions] = useState<SelectOption[]>([]);

	useEffect(() => {
		if (!catalog) {
			return;
		}

		syncOpenstackDomains(catalog.domains);
		syncOpenstackQuotaKeys(catalog.quotaKeys);
		syncOpenstackFlavors(catalog.flavors);
		syncOpenstackNetworks(catalog.networks);
	}, [catalog]);

	useEffect(() => {
		if (!catalog) {
			return;
		}

		setCustomerOptions((current: SelectOption[]) =>
			mergeCustomerOptions(
				current.map((option: SelectOption) => ({ key: option.value, label: option.label })),
				catalog.customers
			).map((entry: OpenstackCatalogEntry) => ({ value: entry.key, label: entry.label }))
		);
	}, [catalog]);

	const organizationOptions = useMemo<SelectOption[]>(() => {
		if (!catalog) {
			return [];
		}

		return catalog.organizations.map((organization: OpenstackCatalogEntry) => ({
			value: organization.key,
			label: organization.label
		}));
	}, [catalog]);

	const selectedOrganizationKey = form.watch('openstack.organizationKey') ?? '';
	const workplaceOptions = useMemo<SelectOption[]>(() => {
		if (!catalog || !selectedOrganizationKey) {
			return [];
		}

		return getOpenstackWorkplacesByOrganization(
			catalog.workplaces,
			selectedOrganizationKey
		).map((workplace: OpenstackWorkplaceEntry) => ({
			value: workplace.key,
			label: workplace.label
		}));
	}, [catalog, selectedOrganizationKey]);

	const hasOrganizationOptions = organizationOptions.length > 0;
	const hasCustomerOptions = customerOptions.length > 0;
	const hasWorkplaceOptions = workplaceOptions.length > 0;

	const domainOptions = useMemo<SelectOption[]>(() => {
		const domains = catalog?.domains ?? getOpenstackDomainOptions();
		return domains.map((domain: string) => ({ value: domain, label: domain }));
	}, [catalog]);

	const quotaOptions = useMemo<SelectOption[]>(() => {
		const quotaKeys = catalog?.quotaKeys ?? getOpenstackQuotaOptions();
		return quotaKeys.map((key: string) => ({ value: key, label: key }));
	}, [catalog]);

	// Flavor options with tooltip data for hover display
	const flavorOptions = useMemo(() => {
		const flavors = catalog?.flavors ?? getOpenstackFlavorOptions();
		return flavors.map((flavor: OpenstackFlavorEntry) => ({
			value: flavor.name,
			label: flavor.name,
			ram: flavor.ram,
			vcpus: flavor.vcpus
		}));
	}, [catalog]);

	// Network options
	const networkOptions = useMemo<SelectOption[]>(() => {
		const networks = catalog?.networks?.map((n) => n.name) ?? getOpenstackNetworkOptions();
		return networks.map((name: string) => ({ value: name, label: name }));
	}, [catalog]);

	const openstackErrors = form.formState.errors.openstack;

	const { fields, append, remove } = useFieldArray<AddAllocationSchema, 'openstack.quota'>({
		control: form.control,
		name: 'openstack.quota'
	});

	// Network entries field array
	const {
		fields: networkFields,
		append: appendNetwork,
		remove: removeNetwork
	} = useFieldArray<AddAllocationSchema, 'openstack.networks'>({
		control: form.control,
		name: 'openstack.networks'
	});

	const quotaEntries = form.watch('openstack.quota') ?? [];
	const networkEntries = form.watch('openstack.networks') ?? [];

	useEffect(() => {
		if (domainOptions.length === 1) {
			const currentDomain = form.getValues('openstack.domain');
			if (!currentDomain) {
				form.setValue('openstack.domain', domainOptions[0]?.value ?? '', {
					shouldDirty: false,
					shouldValidate: true
				});
			}
		}
	}, [domainOptions, form]);

	useEffect(() => {
		if (fields.length === 0) {
			append({ key: '', value: 0 } as OpenstackQuotaEntry);
		}
	}, [append, fields.length]);

	useEffect(() => {
		if (!selectedOrganizationKey) {
			form.setValue('openstack.workplaceKey', '', { shouldDirty: false, shouldValidate: false });
			return;
		}

		const currentWorkplace = form.getValues('openstack.workplaceKey');
		const isValidWorkplace = workplaceOptions.some(
			(option: SelectOption) => option.value === currentWorkplace
		);

		if (!isValidWorkplace) {
			form.setValue('openstack.workplaceKey', '', { shouldDirty: true, shouldValidate: false });
		}
	}, [form, selectedOrganizationKey, workplaceOptions]);

	return (
		<Fieldset legend="OpenStack configuration" mt="md">
			<Stack gap="md">
				<Text size="sm" c="dimmed">
					These values are used to generate the GitOps OpenStack YAML once the allocation is approved.
				</Text>
				<Controller<AddAllocationSchema>
					control={form.control}
					name="openstack.domain"
					render={(props: { field: ControllerRenderProps<AddAllocationSchema, 'openstack.domain'> }) => (
						<Select
							label="OpenStack domain"
							withAsterisk
							data={domainOptions}
							searchable
							allowDeselect={false}
							placeholder={domainOptions.length > 0 ? 'Select domain' : 'No domains available'}
							value={props.field.value ?? null}
							onChange={(value: string | null) => props.field.onChange(value ?? '')}
							error={openstackErrors?.domain?.message as string}
							nothingFoundMessage="No matching domain"
						/>
					)}
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
					{hasCustomerOptions ? (
						<Controller<AddAllocationSchema>
							control={form.control}
							name="openstack.customerKey"
							render={(props: { field: ControllerRenderProps<AddAllocationSchema, 'openstack.customerKey'> }) => (
								<Select
									label="Customer tag"
									withAsterisk
									data={customerOptions}
									searchable
									creatable
									value={props.field.value ?? ''}
									onChange={(value: string | null) => props.field.onChange(value ?? '')}
									onCreate={(query: string) => {
										const trimmed = query.trim();
										if (trimmed.length === 0) {
											return null;
										}

										const newOption: SelectOption = { value: trimmed, label: trimmed };
										setCustomerOptions((current: SelectOption[]) => {
											const exists = current.some((option: SelectOption) => option.value === trimmed);
											return exists ? current : [...current, newOption];
										});
										props.field.onChange(trimmed);
										return newOption;
									}}
									getCreateLabel={(query: string) => `Use "${query}"`}
									error={openstackErrors?.customerKey?.message as string}
								/>
							)}
						/>
					) : (
						<TextInput
							label="Customer tag"
							withAsterisk
							{...form.register('openstack.customerKey')}
							error={openstackErrors?.customerKey?.message as string}
						/>
					)}
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
									onChange={(value: string | null) => {
										const nextValue = value ?? '';
										props.field.onChange(nextValue);
										form.setValue('openstack.workplaceKey', '', { shouldDirty: true, shouldValidate: false });
									}}
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
					{hasWorkplaceOptions ? (
						<Controller<AddAllocationSchema>
							control={form.control}
							name="openstack.workplaceKey"
							render={(props: { field: ControllerRenderProps<AddAllocationSchema, 'openstack.workplaceKey'> }) => (
								<Select
									label="Workplace"
									withAsterisk
									data={workplaceOptions}
									searchable
									disabled={!selectedOrganizationKey}
									placeholder={selectedOrganizationKey ? undefined : 'Select organization first'}
									value={props.field.value ?? ''}
									onChange={(value: string | null) => props.field.onChange(value ?? '')}
									error={openstackErrors?.workplaceKey?.message as string}
								/>
							)}
						/>
					) : (
						<TextInput
							label="Workplace tag"
							withAsterisk
							placeholder={selectedOrganizationKey ? 'Enter workplace key' : 'Select organization first'}
							{...form.register('openstack.workplaceKey')}
							disabled={!selectedOrganizationKey}
							error={openstackErrors?.workplaceKey?.message as string}
						/>
					)}
				</Group>
				<Text size="sm" c="dimmed">
					Domain, customer, organization, workplace, and additional tags are validated before submission.
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
						<Text size="sm" c="dimmed">
							Only supported OpenStack quota keys can be selected.
						</Text>
						{fields.map((item: FieldArrayWithId<AddAllocationSchema, 'openstack.quota'>, index: number) => (
							<Group key={item.id} align="flex-end">
								<Controller<AddAllocationSchema>
									control={form.control}
									name={`openstack.quota.${index}.key` as const}
									render={(props: { field: ControllerRenderProps<AddAllocationSchema, `openstack.quota.${number}.key`> }) => {
										const currentKey = quotaEntries?.[index]?.key ?? '';
										const usedKeys = new Set(
											(quotaEntries ?? [])
												.map((entry: OpenstackQuotaEntry | undefined, entryIndex: number) =>
													entryIndex === index ? undefined : entry?.key
												)
												.filter((key: string | undefined): key is string => Boolean(key))
										);

										const availableOptions = quotaOptions.filter((option: SelectOption) =>
											option.value === currentKey || !usedKeys.has(option.value)
										);

										return (
											<Select
												label="Quota key"
												withAsterisk
												data={availableOptions}
												searchable
												allowDeselect={false}
												placeholder="Select quota key"
												value={props.field.value ?? null}
												onChange={(value: string | null) => props.field.onChange(value ?? '')}
												nothingFoundMessage="No matching quota key"
												error={openstackErrors?.quota?.[index]?.key?.message as string}
											/>
										);
									}}
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
											onChange={(value: string | number | null) => {
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
							disabled={quotaOptions.length > 0 && fields.length >= quotaOptions.length}
						>
							Add quota item
						</Button>
					</Stack>
				</Fieldset>
				<Fieldset legend="Flavors (optional)">
					<Stack gap="sm">
						<Text size="sm" c="dimmed">
							Select non-public flavors to assign to this project. Hover over a flavor to see its specifications.
						</Text>
						<Controller<AddAllocationSchema>
							control={form.control}
							name="openstack.flavors"
							render={(props: { field: ControllerRenderProps<AddAllocationSchema, 'openstack.flavors'> }) => (
								<MultiSelect
									label="Assigned flavors"
									data={flavorOptions.map((f) => ({
										value: f.value,
										label: f.label
									}))}
									searchable
									clearable
									placeholder="Select flavors to assign"
									value={props.field.value ?? []}
									onChange={props.field.onChange}
									nothingFoundMessage="No matching flavor"
									error={openstackErrors?.flavors?.message as string}
									renderOption={({ option }) => {
										const flavor = flavorOptions.find((f) => f.value === option.value);
										if (!flavor) {
											return <span>{option.label}</span>;
										}
										return (
											<Tooltip
												label={`RAM: ${flavor.ram} MB | vCPUs: ${flavor.vcpus}`}
												position="right"
												withArrow
											>
												<span style={{ width: '100%', display: 'block' }}>{option.label}</span>
											</Tooltip>
										);
									}}
								/>
							)}
						/>
					</Stack>
				</Fieldset>
				<Fieldset legend="Networks (optional)">
					<Stack gap="sm">
						<Text size="sm" c="dimmed">
							Add non-shared networks to assign to this project. Each network can be configured for External or Shared access.
							To assign the same network to both access types, add it twice.
						</Text>
						{networkFields.map((item: FieldArrayWithId<AddAllocationSchema, 'openstack.networks'>, index: number) => {
							const currentNetwork = networkEntries?.[index]?.name ?? '';
							const currentAccessType = networkEntries?.[index]?.accessType ?? 'external';

							// Get networks already used in the same access type (excluding current entry)
							const usedInSameAccessType = new Set(
								(networkEntries ?? [])
									.map((entry: OpenstackNetworkEntry | undefined, entryIndex: number) =>
										entryIndex === index || entry?.accessType !== currentAccessType
											? undefined
											: entry?.name
									)
									.filter((name: string | undefined): name is string => Boolean(name))
							);

							// Filter out networks already used in the same access type
							const availableNetworkOptions = networkOptions.filter((option: SelectOption) =>
								option.value === currentNetwork || !usedInSameAccessType.has(option.value)
							);

							// Check if the current network exists in the OTHER access type
							// If so, disable the toggle to prevent adding same network to both types
							const otherAccessType = currentAccessType === 'external' ? 'shared' : 'external';
							const existsInOtherAccessType = currentNetwork && (networkEntries ?? []).some(
								(entry: OpenstackNetworkEntry | undefined, entryIndex: number) =>
									entryIndex !== index &&
									entry?.name === currentNetwork &&
									entry?.accessType === otherAccessType
							);

							return (
								<Group key={item.id} align="flex-end">
									<Controller<AddAllocationSchema>
										control={form.control}
										name={`openstack.networks.${index}.name` as const}
										render={(props: { field: ControllerRenderProps<AddAllocationSchema, `openstack.networks.${number}.name`> }) => (
											<Select
												label="Network"
												withAsterisk
												data={availableNetworkOptions}
												searchable
												allowDeselect={false}
												placeholder="Select network"
												value={props.field.value ?? null}
												onChange={(value: string | null) => props.field.onChange(value ?? '')}
												nothingFoundMessage="No matching network"
												error={openstackErrors?.networks?.[index]?.name?.message as string}
												style={{ flex: 1 }}
											/>
										)}
									/>
									<Controller<AddAllocationSchema>
										control={form.control}
										name={`openstack.networks.${index}.accessType` as const}
										render={(props: { field: ControllerRenderProps<AddAllocationSchema, `openstack.networks.${number}.accessType`> }) => (
											<Stack gap={4}>
												<Text size="sm" fw={500}>Access type</Text>
												<Tooltip
													label={existsInOtherAccessType ? `This network is already assigned as ${otherAccessType}` : ''}
													disabled={!existsInOtherAccessType}
													withArrow
												>
													<SegmentedControl
														value={props.field.value ?? 'external'}
														onChange={props.field.onChange}
														disabled={existsInOtherAccessType}
														data={[
															{ value: 'external', label: 'External' },
															{ value: 'shared', label: 'Shared' }
														]}
													/>
												</Tooltip>
											</Stack>
										)}
									/>
									<Button
										type="button"
										variant="subtle"
										size="xs"
										onClick={() => removeNetwork(index)}
									>
										Remove
									</Button>
								</Group>
							);
						})}
						<Button
							type="button"
							variant="light"
							size="xs"
							onClick={() => appendNetwork({ name: '', accessType: 'external' } as OpenstackNetworkEntry)}
							disabled={networkOptions.length === 0}
						>
							Add network
						</Button>
						{openstackErrors?.networks?.message && (
							<Text size="sm" c="red">{openstackErrors.networks.message as string}</Text>
						)}
					</Stack>
				</Fieldset>
			</Stack>
		</Fieldset>
	);
};

export default OpenstackAllocationFields;
