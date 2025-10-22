import { Box, Button, Group, Modal, NumberInput, Stack, TextInput, Title } from '@mantine/core';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { IconLibrary } from '@tabler/icons-react';
import { HTTPError } from 'ky';

import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import { PUBLICATION_PAGE_SIZES } from '@/modules/publication/constants';
import { getSortQuery } from '@/modules/api/sorting/utils';
import { useAssignMyPublicationMutation, useDeleteMyPublicationMutation, useMyPublicationsQuery } from '@/modules/publication/my-queries';
import { createMyPublication } from '@/modules/publication/api/my-publications';
import {
    manualPublicationSchema,
    searchByDoiSchema,
    type ManualPublicationSchema,
    type SearchByDoiSchema
} from '@/modules/publication/form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Publication } from '@/modules/publication/model';
import { searchByDoi } from '@/modules/publication/api/search-by-doi';

const MyPublicationsPage = () => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(PUBLICATION_PAGE_SIZES[0]);
    const [sort, setSort] = useState<DataTableSortStatus<Publication>>({ columnAccessor: 'id', direction: 'asc' });
    const sortQuery = useMemo(() => getSortQuery(sort.columnAccessor, sort.direction), [sort]);

    const { data, isPending, refetch } = useMyPublicationsQuery({ page, limit }, sortQuery);
    const assignMutation = useAssignMyPublicationMutation();
    const deleteMutation = useDeleteMyPublicationMutation();
    const queryClient = useQueryClient();
    const [assignProjectId, setAssignProjectId] = useState<number | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddDoiModalOpen, setIsAddDoiModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [publicationToAssign, setPublicationToAssign] = useState<Publication | null>(null);
    const addForm = useForm<ManualPublicationSchema>({ resolver: zodResolver(manualPublicationSchema) });
    const doiForm = useForm<SearchByDoiSchema>({ resolver: zodResolver(searchByDoiSchema), defaultValues: { doi: '' } });
    const [isDoiSubmitting, setIsDoiSubmitting] = useState(false);
    const isHttpError = (value: unknown): value is HTTPError => value instanceof HTTPError;

    const openAddDoiModal = () => {
        doiForm.reset({ doi: '' });
        setIsAddDoiModalOpen(true);
    };

    const closeAddDoiModal = () => {
        setIsAddDoiModalOpen(false);
        doiForm.reset({ doi: '' });
    };

    const handleAddDoiSubmit = doiForm.handleSubmit(async ({ doi }: SearchByDoiSchema) => {
        const trimmed = doi.trim();

        if (!trimmed) {
            doiForm.setError('doi', { type: 'custom', message: 'DOI is required' });
            return;
        }

        setIsDoiSubmitting(true);
        try {
            const publication = await searchByDoi(trimmed);

            if (!publication) {
                doiForm.setError('doi', { type: 'custom', message: 'Publication not found' });
                setIsDoiSubmitting(false);
                return;
            }

            await createMyPublication({
                source: 'doi',
                uniqueId: publication.uniqueId ?? trimmed,
                title: publication.title,
                authors: publication.authors,
                year: publication.year,
                journal: publication.journal
            });

            notifications.show({ message: 'Publication added by DOI' });
            closeAddDoiModal();
            await refetch();
        } catch (error) {
            notifications.show({ message: 'Error', color: 'red' });
        } finally {
            setIsDoiSubmitting(false);
        }
    });

    const openAddModal = () => {
        addForm.reset();
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        addForm.reset();
    };

    const handleAddManualSubmit = addForm.handleSubmit(async (values: ManualPublicationSchema) => {
        try {
            await createMyPublication({ ...values, source: 'manual' });
            notifications.show({ message: 'Publication added' });
            closeAddModal();
            await refetch();
        } catch (error) {
            notifications.show({ message: 'Error', color: 'red' });
        }
    });

    const openAssignModal = (pub: Publication) => {
        if (!pub.id) return;
        setPublicationToAssign(pub);
        setAssignProjectId(null);
        setIsAssignModalOpen(true);
    };

    const closeAssignModal = () => {
        setIsAssignModalOpen(false);
        setPublicationToAssign(null);
        setAssignProjectId(null);
    };

    const handleAssignSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!assignProjectId || !publicationToAssign?.id) {
            return;
        }

        try {
            const projectId = assignProjectId;
            await assignMutation.mutateAsync({ id: publicationToAssign.id, projectId });
            notifications.show({ message: 'Assigned to project' });
            closeAssignModal();
            if (projectId) {
                await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'publications'] });
            }
            await refetch();
        } catch (error: unknown) {
            if (isHttpError(error) && error.response.status === 404) {
                notifications.show({ message: 'You do not have access to update publications in that project.', color: 'yellow' });
                return;
            }

            notifications.show({ message: 'Error', color: 'red' });
        }
    };

    const deletePublication = (pub: Publication) => {
        if (!pub.id) return;
        modals.openConfirmModal({
            title: 'Delete publication?',
            children: 'This will permanently delete the publication and unassign it from any project.',
            confirmProps: { color: 'red' },
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            onConfirm: () => {
                deleteMutation.mutate(pub.id!, {
                    onSuccess: async () => {
                        notifications.show({ message: 'Publication deleted' });
                        await refetch();
                    },
                    onError: () => notifications.show({ message: 'Error', color: 'red' })
                });
            }
        });
    };

    return (
        <Box>
            <Modal opened={isAddModalOpen} onClose={closeAddModal} title="Add publication" centered size="xl">
                <form onSubmit={handleAddManualSubmit}>
                    <TextInput label="Title" {...addForm.register('title')} error={addForm.formState.errors.title?.message} withAsterisk />
                    <TextInput label="Authors" {...addForm.register('authors')} error={addForm.formState.errors.authors?.message} withAsterisk />
                    <Controller
                        control={addForm.control}
                        name="year"
                        render={({ field }: { field: { value: number | undefined; onChange: (value: number | string | null) => void } }) => (
                            <NumberInput
                                label="Year"
                                min={0}
                                max={2200}
                                value={field.value}
                                onChange={(value: string | number) => field.onChange(typeof value === 'number' ? value : null)}
                                error={addForm.formState.errors.year?.message}
                                withAsterisk
                            />
                        )}
                    />
                    <TextInput label="Journal" {...addForm.register('journal')} error={addForm.formState.errors.journal?.message} withAsterisk />
                    <Group mt={15} justify="flex-end">
                        <Button variant="default" type="button" onClick={closeAddModal}>Cancel</Button>
                        <Button type="submit" loading={addForm.formState.isSubmitting}>Add publication</Button>
                    </Group>
                </form>
            </Modal>

            <Modal opened={isAddDoiModalOpen} onClose={closeAddDoiModal} title="Add publication by DOI" centered size="md">
                <form onSubmit={handleAddDoiSubmit}>
                    <TextInput
                        label="DOI"
                        placeholder="10.1234/example.doi"
                        {...doiForm.register('doi')}
                        error={doiForm.formState.errors.doi?.message}
                        required
                    />
                    <Group mt={15} justify="flex-end">
                        <Button variant="default" type="button" onClick={closeAddDoiModal}>Cancel</Button>
                        <Button type="submit" loading={isDoiSubmitting}>Add by DOI</Button>
                    </Group>
                </form>
            </Modal>

            <Modal opened={isAssignModalOpen} onClose={closeAssignModal} title="Assign to project" centered>
                <form onSubmit={handleAssignSubmit}>
                    <Stack>
                        <NumberInput
                            label="Project ID"
                            placeholder="Enter project ID"
                            min={1}
                            value={assignProjectId ?? undefined}
                            onChange={(value: string | number) => setAssignProjectId(typeof value === 'number' ? value : null)}
                            disabled={assignMutation.isPending}
                        />
                        <Group justify="flex-end">
                            <Button variant="default" type="button" onClick={closeAssignModal}>Cancel</Button>
                            <Button type="submit" loading={assignMutation.isPending} disabled={!assignProjectId}>Assign</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <PageBreadcrumbs links={[{ title: 'Publications', href: '/publications' }]} />
            <Title order={3}><IconLibrary /> My publications</Title>
            <Group mt={10} mb={20}>
                <Button color="teal" onClick={openAddModal}>Add publication manually</Button>
                <Button color="blue" onClick={openAddDoiModal}>Add by DOI</Button>
            </Group>
            <DataTable
                height={500}
                withTableBorder
                fetching={isPending}
                records={data?.data ?? []}
                totalRecords={data?.metadata?.totalRecords}
                page={page}
                onPageChange={async (p: number) => { setPage(p); await refetch(); }}
                recordsPerPage={limit}
                recordsPerPageOptions={PUBLICATION_PAGE_SIZES}
                onRecordsPerPageChange={async (l: number) => { setLimit(l); await refetch(); }}
                sortStatus={sort}
                onSortStatusChange={async (s: DataTableSortStatus<Publication>) => { setSort(s); await refetch(); }}
                columns={[
                    { accessor: 'title', title: 'Title' },
                    { accessor: 'authors', title: 'Authors' },
                    { accessor: 'journal', title: 'Journal' },
                    { accessor: 'year', title: 'Year', width: 120 },
                    {
                        accessor: 'actions', title: '', width: 220, textAlign: 'right',
                        render: (pub: Publication) => (
                            <Group gap={8} justify="flex-end">
                                <Button size="xs" variant="light" onClick={() => openAssignModal(pub)}>Assign to project</Button>
                                <Button size="xs" color="red" variant="light" onClick={() => deletePublication(pub)}>Delete</Button>
                            </Group>
                        )
                    }
                ]}
            />
        </Box>
    );
};

export default MyPublicationsPage;
