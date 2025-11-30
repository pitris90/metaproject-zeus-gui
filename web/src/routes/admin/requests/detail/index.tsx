import { Alert, Box, Button, Divider, Group, rem, Title, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { FormProvider, useForm } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

import { useProjectOutletContext } from '@/modules/auth/guards/project-detail-guard';
import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import ProjectInfo from '@/components/project/info';
import TextEditor from '@/components/global/text-editor';
import { useApproveProjectMutation, useRejectProjectMutation } from '@/modules/project/mutations';
import { type RejectProjectSchema, rejectProjectSchema } from '@/modules/project/form';
import CommentsTimeline from '@/components/project/comments-timeline';
import { getCurrentRole } from '@/modules/auth/methods/getCurrentRole';
import { Role } from '@/modules/user/role';

const ProjectRequestDetail = () => {
	const { t } = useTranslation();
	const { project, rejectedComments } = useProjectOutletContext();
	const currentRole = getCurrentRole();
	const prefix = currentRole === Role.ADMIN ? '/admin' : '/director';
	const navigate = useNavigate();

	const queryClient = useQueryClient();

	const { mutate: approve, isPending: isApprovePending } = useApproveProjectMutation();
	const { mutate: reject, isPending: isRejectPending } = useRejectProjectMutation();

	const form = useForm<RejectProjectSchema>({
		resolver: zodResolver(rejectProjectSchema)
	});

	const onRejectSubmit = (values: RejectProjectSchema) => {
		reject(
			{
				projectId: project.id,
				reason: values.reason
			},
			{
				onSuccess: () => {
					notifications.show({
						title: t('routes.ProjectRequestDetail.reject_notification.title'),
						message: t('routes.ProjectRequestDetail.reject_notification.message')
					});
					queryClient
						.invalidateQueries({
							queryKey: ['project']
						})
						.then(() => {
							navigate('/admin/requests');
						});
				},
				onError: () => {
					notifications.show({
						message: t('routes.ProjectRequestDetail.reject_notification.error'),
						color: 'red'
					});
				},
				onSettled: () => {
					modals.closeAll();
				}
			}
		);
	};

	const openApproveModal = () => {
		modals.openConfirmModal({
			title: t('routes.ProjectRequestDetail.approve_modal.title'),
			centered: true,
			children: t('routes.ProjectRequestDetail.approve_modal.content'),
			labels: {
				confirm: t('routes.ProjectRequestDetail.approve_modal.confirm_text'),
				cancel: t('routes.ProjectRequestDetail.approve_modal.cancel_text')
			},
			confirmProps: {
				color: 'green',
				loading: isApprovePending
			},
			onConfirm: () => {
				approve(project.id, {
					onSuccess: () => {
						notifications.show({
							title: t('routes.ProjectRequestDetail.approve_notification.title'),
							message: t('routes.ProjectRequestDetail.approve_notification.message'),
							color: 'green'
						});
						queryClient
							.invalidateQueries({
								queryKey: ['project']
							})
							.then(() => {
								navigate('/admin/requests');
							});
					},
					onError: () => {
						notifications.show({
							message: t('routes.ProjectRequestDetail.approve_notification.error'),
							color: 'red'
						});
					}
				});
			}
		});
	};

	const openRejectModal = () => {
		modals.open({
			title: t('routes.ProjectRequestDetail.reject_modal.title'),
			centered: true,
			size: 'xl',
			children: (
				<FormProvider {...form}>
					<form onSubmit={form.handleSubmit(onRejectSubmit)}>
						<TextEditor
							label={t('routes.ProjectRequestDetail.reject_modal.content.label')}
							description={t('routes.ProjectRequestDetail.reject_modal.content.description')}
							inputHtmlName="reason"
						/>
						<Group justify="flex-end" mt={10}>
							<Button variant="outline" color="gray" onClick={() => modals.closeAll()}>
								{t('routes.ProjectRequestDetail.reject_modal.cancel_text')}
							</Button>
							<Button type="submit" color="red.7" loading={isRejectPending}>
								{t('routes.ProjectRequestDetail.reject_modal.confirm_text')}
							</Button>
						</Group>
					</form>
				</FormProvider>
			)
		});
	};

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: t(`components.global.drawerList.links.${currentRole}.title`), href: prefix },
					{ title: t('routes.ProjectRequests.title'), href: `${prefix}/requests` },
					{ title: project.title, href: `/admin/requests/${project.id}` }
				]}
			/>
			<Group justify="space-between">
				<Title>
					{t('routes.ProjectRequestDetail.title_prefix')} {project.title}
				</Title>
				<Tooltip label={t('routes.ProjectRequestDetail.view_project_tooltip')}>
					<Button
						component={Link}
						to={`/project/${project.id}`}
						target="_blank"
						variant="subtle"
						rightSection={<IconChevronRight style={{ width: rem(14), height: rem(14) }} />}
					>
						{t('routes.ProjectRequestDetail.view_project')}
					</Button>
				</Tooltip>
			</Group>
			<ProjectInfo project={project} showFullDescription />
			<Divider my={20} />
			{rejectedComments.length > 0 && (
				<Box>
					<Title order={4}>{t('routes.ProjectRequestDetail.activity_title')}</Title>
					<CommentsTimeline rejectedComments={rejectedComments} />
				</Box>
			)}

			{currentRole === Role.DIRECTOR && (
				<Group justify="center">
					<Alert variant="subtle" color="yellow" icon={<IconInfoCircle />}>
						{t('routes.ProjectRequestDetail.director')}
					</Alert>
				</Group>
			)}
			<Group grow pt={20} pb={70}>
				<Button color="green" onClick={openApproveModal} disabled={currentRole === Role.DIRECTOR}>
					{t('routes.ProjectRequestDetail.approve_button')}
				</Button>
				<Button
					color="red.7"
					variant="outline"
					onClick={openRejectModal}
					disabled={currentRole === Role.DIRECTOR}
				>
					{t('routes.ProjectRequestDetail.reject_button')}
				</Button>
			</Group>
		</Box>
	);
};

export default ProjectRequestDetail;
