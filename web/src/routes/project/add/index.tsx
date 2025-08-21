import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Title } from '@mantine/core';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifications } from '@mantine/notifications';

import { useAddProjectMutation } from '@/modules/project/mutations';
import { ApiClientError } from '@/modules/api/model';
import { HTTPError } from 'ky';
import { requestProjectSchema, type RequestProjectSchema } from '@/modules/project/form';
import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import RequestForm from '@/components/project/request-form';

const AddProject: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { mutate, isPending } = useAddProjectMutation();
	const form = useForm<RequestProjectSchema>({
		resolver: zodResolver(requestProjectSchema)
	});

	const onSubmit = (values: RequestProjectSchema) => {
		mutate(values, {
			onSuccess: projectId => {
				if (!projectId) {
					navigate('/project');
				}

				notifications.show({
					title: 'Project request created.',
					message: 'You can now wait for the project to be approved by the admin.'
				});
				navigate(`/project/${projectId}`);
			},
			onError: async error => {
				// Conflict (duplicate title)
				if (
					(error instanceof ApiClientError && error.response.status === 409) ||
					(error instanceof HTTPError && error.response.status === 409)
				) {
					notifications.show({
						title: 'Project with this title already exists.',
						message: 'Please choose a different title.',
						color: 'red'
					});
					form.setError('title', { type: 'custom', message: 'Project with this title already exists.' });
					return;
				}

				// Validation errors from backend
				if (error instanceof HTTPError && error.response.status === 400) {
					try {
						const data = await error.response.json();
						// Expect common shapes
						// 1) { errors: { field: 'message', ... } }
						if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
							Object.entries<string>(data.errors).forEach(([field, message]) => {
								if (field in (form.getValues() as Record<string, unknown>)) {
									form.setError(field as keyof RequestProjectSchema, { type: 'server', message });
								}
							});
							return;
						}
						// 2) { errors: [{ field|name, message }, ...] }
						if (Array.isArray(data?.errors)) {
							data.errors.forEach((e: any) => {
								const field = e?.field ?? e?.name;
								const message = e?.message;
								if (field && message && field in (form.getValues() as Record<string, unknown>)) {
									form.setError(field as keyof RequestProjectSchema, { type: 'server', message });
								}
							});
							return;
						}
						// 3) { fieldErrors | violations: [{ field|name, message }] }
						const list = data?.fieldErrors ?? data?.violations;
						if (Array.isArray(list)) {
							list.forEach((e: any) => {
								const field = e?.field ?? e?.name;
								const message = e?.message;
								if (field && message && field in (form.getValues() as Record<string, unknown>)) {
									form.setError(field as keyof RequestProjectSchema, { type: 'server', message });
								}
							});
							return;
						}
						if (data?.message) {
							notifications.show({ title: 'Failed to create project.', message: data.message, color: 'red' });
							return;
						}
					} catch (_) {
						// fallthrough to generic error
					}
				}

				notifications.show({
					title: 'Failed to create project.',
					message: 'Please try again later.',
					color: 'red'
				});
			}
		});
	};

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: 'Projects', href: '/project' },
					{ title: 'Add project', href: `/project/add` }
				]}
			/>
			<Flex mt={20} direction="column" align="center">
				<Title order={1}>{t('routes.AddProject.title')}</Title>
				<Box w="80%" py={20}>
					<FormProvider {...form}>
						<RequestForm
							onSubmit={onSubmit}
							loading={isPending}
							submitText={t('routes.AddProject.form.submit')}
						/>
					</FormProvider>
				</Box>
			</Flex>
		</Box>
	);
};

export default AddProject;
