import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import React, { useState } from 'react';
import { Box } from '@mantine/core';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import NotFound from '@/components/global/not-found';
import Loading from '@/components/global/loading';
import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import ResourceForm from '@/components/resource/resource-form';
import { addResourceSchema, type AddResourceSchema } from '@/modules/allocation/form';
import { type Attribute } from '@/modules/attribute/model';
import { useEditResourceMutation } from '@/modules/resource/api/edit-resource';
import { useResourceDetailQuery } from '@/modules/resource/api/resource-detail';

const ResourceEditPage = () => {
	const { t } = useTranslation();
	const { id } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const idNum = id && !isNaN(+id) ? +id : null;
	const { data, isPending, isError } = useResourceDetailQuery(idNum);
	const { mutate, isPending: isMutationPending } = useEditResourceMutation();
	const [attributes, setAttributes] = useState<Attribute[]>([]);

	const form = useForm<AddResourceSchema>({
		resolver: zodResolver(addResourceSchema)
	});

	if (!idNum) {
		return <NotFound />;
	}

	if (isPending) {
		return <Loading />;
	}

	if (isError || !data) {
		return <NotFound />;
	}

	const onSubmit = (formData: AddResourceSchema) => {
		const editData = {
			...formData,
			id: idNum!
		};
		mutate(editData, {
			onSuccess: () => {
				notifications.show({
					message: t('routes.ResourceEditPage.notifications.success'),
					color: 'green'
				});
				queryClient
					.refetchQueries({
						queryKey: ['resource', idNum]
					})
					.then(() => {
						navigate(`/admin/resources/${idNum}`);
					});
			},
			onError: () => {
				notifications.show({
					message: t('routes.ResourceEditPage.notifications.error'),
					color: 'red'
				});
			}
		});
	};

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: t('components.global.drawerList.links.admin.title'), href: '/admin' },
					{ title: t('components.global.drawerList.links.admin.link.resources'), href: '/admin/resources' },
					{ title: data.name, href: `/admin/resources/${id}` },
					{ title: t('routes.ResourceEditPage.title'), href: `/admin/resources/${id}/edit` }
				]}
			/>
			<h1>{t('routes.ResourceEditPage.title')}</h1>
			<Box mt={15}>
				<FormProvider {...form}>
					<ResourceForm
						defaultValues={data}
						isPending={isPending || isMutationPending}
						setAttributes={setAttributes}
						attributes={attributes}
						onSubmit={onSubmit}
					/>
				</FormProvider>
			</Box>
		</Box>
	);
};

export default ResourceEditPage;
