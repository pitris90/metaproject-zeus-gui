import {
	Button,
	Fieldset,
	Group,
	Modal,
	MultiSelect,
	NumberInput,
	SegmentedControl,
	Select,
	Stack,
	TagsInput,
	Text,
	Textarea,
	TextInput,
	Tooltip
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { zodResolver } from '@hookform/resolvers/zod';
import { HTTPError } from 'ky';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Controller, type ControllerRenderProps, type FieldArrayWithId, FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { type OpenstackRequest } from '@/modules/allocation/model';
import { useModifyOpenstackAllocationMutation } from '@/modules/allocation/api/modify-openstack-allocation';
import { useOpenstackCatalogQuery, type OpenstackFlavorEntry } from '@/modules/openstack/api/catalog';
import {
	getOpenstackWorkplacesByOrganization,
	mergeCustomerOptions,
	type OpenstackCatalogEntry,
	type OpenstackWorkplaceEntry
} from '@/modules/openstack/organizations';
import {
	getOpenstackQuotaOptions,
	getOpenstackFlavorOptions,
	getOpenstackNetworkOptions,
	syncOpenstackQuotaKeys,
	syncOpenstackFlavors,
	syncOpenstackNetworks,
	isSupportedOpenstackQuotaKey,
	isSupportedOpenstackFlavor,
	isSupportedOpenstackNetwork
} from '@/modules/openstack/constraints';

type SelectOption = {
	value: string;
	label: string;
};

type OpenstackModifyModalProps = {
	opened: boolean;
	onClose: () => void;
	allocationId: number;
	currentRequest: OpenstackRequest;
};

const openstackQuotaEntrySchema = z.object({
	key: z
		.string()
		.min(1)
		.superRefine((value: string, ctx: z.RefinementCtx) => {
			if (!isSupportedOpenstackQuotaKey(value)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Unsupported OpenStack quota key "${value}".`
				});
			}
		}),
	value: z
		.number()
		.min(1, { message: 'Quota value must be at least 1.' })
		.finite()
});

const openstackNetworkEntrySchema = z.object({
	name: z
		.string()
		.min(1)
		.superRefine((value: string, ctx: z.RefinementCtx) => {
			if (!isSupportedOpenstackNetwork(value)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Unsupported OpenStack network "${value}".`
				});
			}
		}),
	accessType: z.enum(['external', 'shared'])
});

const openstackModifySchema = z.object({
	projectDescription: z.string().min(5),
	disableDate: z
		.date()
		.nullable()
		.optional()
		.refine(
			(date: Date | null | undefined) => {
				if (!date) return true;
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				return date >= today;
			},
			{ message: 'Disable date must be today or in the future.' }
		),
	customerKey: z.string().min(1),
	organizationKey: z.string().min(1),
	workplaceKey: z.string().min(1),
	additionalTags: z
		.array(z.string().min(1).regex(/^[a-z0-9][a-z0-9_.:-]*$/i, 'Invalid OpenStack tag format.'))
		.optional(),
	quota: z
		.array(openstackQuotaEntrySchema)
		.min(1, { message: 'Provide at least one quota definition.' }),
	flavors: z
		.array(
			z.string().min(1).superRefine((value: string, ctx: z.RefinementCtx) => {
				if (!isSupportedOpenstackFlavor(value)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Unsupported OpenStack flavor "${value}".`
					});
				}
			})
		)
		.optional(),
	networks: z.array(openstackNetworkEntrySchema).optional()
}).superRefine((data, ctx: z.RefinementCtx) => {
	const quotaKeys = data.quota.map((entry) => entry.key);
	const quotaDuplicates = quotaKeys.filter((key: string, index: number) => quotaKeys.indexOf(key) !== index);
	if (quotaDuplicates.length > 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Duplicate OpenStack quota keys: ${Array.from(new Set(quotaDuplicates)).join(', ')}.`,
			path: ['quota']
		});
	}

	if (data.flavors && data.flavors.length > 0) {
		const flavorDuplicates = data.flavors.filter(
			(flavor: string, index: number) => data.flavors!.indexOf(flavor) !== index
		);
		if (flavorDuplicates.length > 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate OpenStack flavors: ${Array.from(new Set(flavorDuplicates)).join(', ')}.`,
				path: ['flavors']
			});
		}
	}

	if (data.networks && data.networks.length > 0) {
		const externalNetworks = data.networks
			.filter((n) => n.accessType === 'external')
			.map((n) => n.name);
		const sharedNetworks = data.networks
			.filter((n) => n.accessType === 'shared')
			.map((n) => n.name);

		const externalDuplicates = externalNetworks.filter(
			(name: string, index: number) => externalNetworks.indexOf(name) !== index
		);
		if (externalDuplicates.length > 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate networks in External access: ${Array.from(new Set(externalDuplicates)).join(', ')}.`,
				path: ['networks']
			});
		}

		const sharedDuplicates = sharedNetworks.filter(
			(name: string, index: number) => sharedNetworks.indexOf(name) !== index
		);
		if (sharedDuplicates.length > 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate networks in Shared access: ${Array.from(new Set(sharedDuplicates)).join(', ')}.`,
				path: ['networks']
			});
		}
	}
});

type OpenstackModifyFormData = z.infer<typeof openstackModifySchema>;
type QuotaEntry = z.infer<typeof openstackQuotaEntrySchema>;
type NetworkEntry = z.infer<typeof openstackNetworkEntrySchema>;

const OpenstackModifyModal = ({ opened, onClose, allocationId, currentRequest }: OpenstackModifyModalProps) => {
	const { data: catalog } = useOpenstackCatalogQuery();
	const { mutate, isPending } = useModifyOpenstackAllocationMutation();
	const [customerOptions, setCustomerOptions] = useState<SelectOption[]>([]);

	useEffect(() => {
		if (!catalog) {
			return;
		}

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

	// Convert current request data to form format
	const defaultQuota: QuotaEntry[] = useMemo(() => {
		return Object.entries(currentRequest.quota ?? {}).map(([key, value]) => ({
			key,
			value
		}));
	}, [currentRequest.quota]);

	const defaultNetworks: NetworkEntry[] = useMemo(() => {
		const networks: NetworkEntry[] = [];
		if (currentRequest.networks?.accessAsExternal) {
			for (const name of currentRequest.networks.accessAsExternal) {
				networks.push({ name, accessType: 'external' });
			}
		}
		if (currentRequest.networks?.accessAsShared) {
			for (const name of currentRequest.networks.accessAsShared) {
				networks.push({ name, accessType: 'shared' });
			}
		}
		return networks;
	}, [currentRequest.networks]);

	const form = useForm<OpenstackModifyFormData>({
		resolver: zodResolver(openstackModifySchema),
		defaultValues: {
			projectDescription: currentRequest.projectDescription,
			disableDate: currentRequest.disableDate ? new Date(currentRequest.disableDate) : null,
			customerKey: currentRequest.customerKey,
			organizationKey: currentRequest.organizationKey,
			workplaceKey: currentRequest.workplaceKey,
			additionalTags: currentRequest.additionalTags ?? [],
			quota: defaultQuota.length > 0 ? defaultQuota : [{ key: '', value: 0 }],
			flavors: currentRequest.flavors ?? [],
			networks: defaultNetworks
		}
	});

	// Reset form when modal opens with new data
	useEffect(() => {
		if (opened) {
			form.reset({
				projectDescription: currentRequest.projectDescription,
				disableDate: currentRequest.disableDate ? new Date(currentRequest.disableDate) : null,
				customerKey: currentRequest.customerKey,
				organizationKey: currentRequest.organizationKey,
				workplaceKey: currentRequest.workplaceKey,
				additionalTags: currentRequest.additionalTags ?? [],
				quota: defaultQuota.length > 0 ? defaultQuota : [{ key: '', value: 0 }],
				flavors: currentRequest.flavors ?? [],
				networks: defaultNetworks
			});
		}
	}, [opened, currentRequest, defaultQuota, defaultNetworks, form]);

	const organizationOptions = useMemo<SelectOption[]>(() => {
		if (!catalog) {
			return [];
		}
		return catalog.organizations.map((organization: OpenstackCatalogEntry) => ({
			value: organization.key,
			label: organization.label
		}));
	}, [catalog]);

	const selectedOrganizationKey = form.watch('organizationKey') ?? '';
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

	const quotaOptions = useMemo<SelectOption[]>(() => {
		const quotaKeys = catalog?.quotaKeys ?? getOpenstackQuotaOptions();
		return quotaKeys.map((key: string) => ({ value: key, label: key }));
	}, [catalog]);

	const flavorOptions = useMemo(() => {
		const flavors = catalog?.flavors ?? getOpenstackFlavorOptions();
		return flavors.map((flavor: OpenstackFlavorEntry) => ({
			value: flavor.name,
			label: flavor.name,
			ram: flavor.ram,
			vcpus: flavor.vcpus
		}));
	}, [catalog]);

	const networkOptions = useMemo<SelectOption[]>(() => {
		const networks = catalog?.networks?.map((n) => n.name) ?? getOpenstackNetworkOptions();
		return networks.map((name: string) => ({ value: name, label: name }));
	}, [catalog]);

	const { fields, append, remove } = useFieldArray<OpenstackModifyFormData, 'quota'>({
		control: form.control,
		name: 'quota'
	});

	const {
		fields: networkFields,
		append: appendNetwork,
		remove: removeNetwork
	} = useFieldArray<OpenstackModifyFormData, 'networks'>({
		control: form.control,
		name: 'networks'
	});

	const quotaEntries = form.watch('quota') ?? [];
	const networkEntries = form.watch('networks') ?? [];
	const errors = form.formState.errors;

	useEffect(() => {
		if (!selectedOrganizationKey) {
			form.setValue('workplaceKey', '', { shouldDirty: false, shouldValidate: false });
			return;
		}

		const currentWorkplace = form.getValues('workplaceKey');
		const isValidWorkplace = workplaceOptions.some(
			(option: SelectOption) => option.value === currentWorkplace
		);

		if (!isValidWorkplace) {
			form.setValue('workplaceKey', '', { shouldDirty: true, shouldValidate: false });
		}
	}, [form, selectedOrganizationKey, workplaceOptions]);

	const showSuccessNotification = () => {
		notifications.show({ color: 'green', message: 'Modification request submitted successfully.' });
	};

	const showErrorNotification = async (error: unknown) => {
		let message = 'Unable to submit modification request.';

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

	const onSubmit = (data: OpenstackModifyFormData) => {
		// Convert form data to API format
		const payload = {
			allocationId,
			projectDescription: data.projectDescription,
			disableDate: data.disableDate ? dayjs(data.disableDate).format('YYYY-MM-DD') : undefined,
			customerKey: data.customerKey,
			organizationKey: data.organizationKey,
			workplaceKey: data.workplaceKey,
			quota: Object.fromEntries(data.quota.map((entry) => [entry.key, entry.value])),
			additionalTags: data.additionalTags?.filter((tag) => tag.trim().length > 0),
			flavors: data.flavors?.filter((f) => f.trim().length > 0),
			networks: data.networks && data.networks.length > 0 ? {
				accessAsExternal: data.networks.filter((n) => n.accessType === 'external').map((n) => n.name),
				accessAsShared: data.networks.filter((n) => n.accessType === 'shared').map((n) => n.name)
			} : undefined
		};

		mutate(payload, {
			onSuccess: () => {
				showSuccessNotification();
				onClose();
			},
			onError: async (error: unknown) => {
				await showErrorNotification(error);
			}
		});
	};

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title="Request OpenStack Modification"
			size="xl"
			closeOnClickOutside={false}
		>
			<FormProvider {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<Stack gap="md">
						<Text size="sm" c="dimmed">
							Submit a modification request for your OpenStack allocation. The domain cannot be changed.
							The request will need to be approved by an administrator.
						</Text>

						<TextInput
							label="Domain"
							value={currentRequest.domain}
							disabled
							description="Domain cannot be modified"
						/>

						<Textarea
							label="Project description"
							withAsterisk
							autosize
							minRows={4}
							{...form.register('projectDescription')}
							error={errors.projectDescription?.message as string}
						/>

						<Controller<OpenstackModifyFormData>
							control={form.control}
							name="disableDate"
							render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, 'disableDate'> }) => (
								<DateInput
									label="Disable date"
									description="Optional date when the OpenStack project should be disabled"
									value={props.field.value ?? null}
									onChange={props.field.onChange}
									clearable
									error={errors.disableDate?.message as string}
								/>
							)}
						/>

						<Group grow>
							{hasCustomerOptions ? (
								<Controller<OpenstackModifyFormData>
									control={form.control}
									name="customerKey"
									render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, 'customerKey'> }) => (
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
											error={errors.customerKey?.message as string}
										/>
									)}
								/>
							) : (
								<TextInput
									label="Customer tag"
									withAsterisk
									{...form.register('customerKey')}
									error={errors.customerKey?.message as string}
								/>
							)}
							{hasOrganizationOptions ? (
								<Controller<OpenstackModifyFormData>
									control={form.control}
									name="organizationKey"
									render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, 'organizationKey'> }) => (
										<Select
											label="Organization"
											withAsterisk
											data={organizationOptions}
											searchable
											value={props.field.value ?? ''}
											onChange={(value: string | null) => {
												const nextValue = value ?? '';
												props.field.onChange(nextValue);
												form.setValue('workplaceKey', '', { shouldDirty: true, shouldValidate: false });
											}}
											error={errors.organizationKey?.message as string}
										/>
									)}
								/>
							) : (
								<TextInput
									label="Organization tag"
									withAsterisk
									placeholder="Enter organization key"
									{...form.register('organizationKey')}
									error={errors.organizationKey?.message as string}
								/>
							)}
							{hasWorkplaceOptions ? (
								<Controller<OpenstackModifyFormData>
									control={form.control}
									name="workplaceKey"
									render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, 'workplaceKey'> }) => (
										<Select
											label="Workplace"
											withAsterisk
											data={workplaceOptions}
											searchable
											disabled={!selectedOrganizationKey}
											placeholder={selectedOrganizationKey ? undefined : 'Select organization first'}
											value={props.field.value ?? ''}
											onChange={(value: string | null) => props.field.onChange(value ?? '')}
											error={errors.workplaceKey?.message as string}
										/>
									)}
								/>
							) : (
								<TextInput
									label="Workplace tag"
									withAsterisk
									placeholder={selectedOrganizationKey ? 'Enter workplace key' : 'Select organization first'}
									{...form.register('workplaceKey')}
									disabled={!selectedOrganizationKey}
									error={errors.workplaceKey?.message as string}
								/>
							)}
						</Group>

						<Controller<OpenstackModifyFormData>
							control={form.control}
							name="additionalTags"
							render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, 'additionalTags'> }) => (
								<TagsInput
									label="Additional tags"
									description="Optional list of additional OpenStack tags"
									value={props.field.value ?? []}
									onChange={props.field.onChange}
									placeholder="Add tag"
									error={errors.additionalTags?.message as string}
								/>
							)}
						/>

						<Fieldset legend="Quota definitions">
							<Stack gap="sm">
								<Text size="sm" c="dimmed">
									Only supported OpenStack quota keys can be selected.
								</Text>
								{fields.map((item: FieldArrayWithId<OpenstackModifyFormData, 'quota'>, index: number) => (
									<Group key={item.id} align="flex-end">
										<Controller<OpenstackModifyFormData>
											control={form.control}
											name={`quota.${index}.key` as const}
											render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, `quota.${number}.key`> }) => {
												const currentKey = quotaEntries?.[index]?.key ?? '';
												const usedKeys = new Set(
													(quotaEntries ?? [])
														.map((entry: QuotaEntry | undefined, entryIndex: number) =>
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
														error={errors.quota?.[index]?.key?.message as string}
													/>
												);
											}}
										/>
										<Controller<OpenstackModifyFormData>
											control={form.control}
											name={`quota.${index}.value` as const}
											render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, `quota.${number}.value`> }) => (
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
													error={errors.quota?.[index]?.value?.message as string}
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
									onClick={() => append({ key: '', value: 0 } as QuotaEntry)}
									disabled={quotaOptions.length > 0 && fields.length >= quotaOptions.length}
								>
									Add quota item
								</Button>
							</Stack>
						</Fieldset>

						<Fieldset legend="Flavors (optional)">
							<Stack gap="sm">
								<Text size="sm" c="dimmed">
									Select non-public flavors to assign to this project.
								</Text>
								<Controller<OpenstackModifyFormData>
									control={form.control}
									name="flavors"
									render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, 'flavors'> }) => (
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
											error={errors.flavors?.message as string}
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
									Add non-shared networks to assign to this project.
								</Text>
								{networkFields.map((item: FieldArrayWithId<OpenstackModifyFormData, 'networks'>, index: number) => {
									const currentNetwork = networkEntries?.[index]?.name ?? '';
									const currentAccessType = networkEntries?.[index]?.accessType ?? 'external';

									const usedInSameAccessType = new Set(
										(networkEntries ?? [])
											.map((entry: NetworkEntry | undefined, entryIndex: number) =>
												entryIndex === index || entry?.accessType !== currentAccessType
													? undefined
													: entry?.name
											)
											.filter((name: string | undefined): name is string => Boolean(name))
									);

									const availableNetworkOptions = networkOptions.filter((option: SelectOption) =>
										option.value === currentNetwork || !usedInSameAccessType.has(option.value)
									);

									const otherAccessType = currentAccessType === 'external' ? 'shared' : 'external';
									const existsInOtherAccessType = currentNetwork && (networkEntries ?? []).some(
										(entry: NetworkEntry | undefined, entryIndex: number) =>
											entryIndex !== index &&
											entry?.name === currentNetwork &&
											entry?.accessType === otherAccessType
									);

									return (
										<Group key={item.id} align="flex-end">
											<Controller<OpenstackModifyFormData>
												control={form.control}
												name={`networks.${index}.name` as const}
												render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, `networks.${number}.name`> }) => (
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
														error={errors.networks?.[index]?.name?.message as string}
														style={{ flex: 1 }}
													/>
												)}
											/>
											<Controller<OpenstackModifyFormData>
												control={form.control}
												name={`networks.${index}.accessType` as const}
												render={(props: { field: ControllerRenderProps<OpenstackModifyFormData, `networks.${number}.accessType`> }) => (
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
									onClick={() => appendNetwork({ name: '', accessType: 'external' } as NetworkEntry)}
									disabled={networkOptions.length === 0}
								>
									Add network
								</Button>
								{errors.networks?.message && (
									<Text size="sm" c="red">{errors.networks.message as string}</Text>
								)}
							</Stack>
						</Fieldset>

						<Group justify="flex-end" mt="md">
							<Button variant="default" onClick={onClose}>
								Cancel
							</Button>
							<Button type="submit" loading={isPending}>
								Submit Modification Request
							</Button>
						</Group>
					</Stack>
				</form>
			</FormProvider>
		</Modal>
	);
};

export default OpenstackModifyModal;
