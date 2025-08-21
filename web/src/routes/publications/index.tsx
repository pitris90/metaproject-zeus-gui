import { Box, Button, Group, NumberInput, Stack, TextInput, Title } from '@mantine/core';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { IconLibrary } from '@tabler/icons-react';

import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import { PUBLICATION_PAGE_SIZES } from '@/modules/publication/constants';
import { getSortQuery } from '@/modules/api/sorting/utils';
import { useAssignMyPublicationMutation, useDeleteMyPublicationMutation, useMyPublicationsQuery } from '@/modules/publication/my-queries';
import { createMyPublication } from '@/modules/publication/api/my-publications';
import { manualPublicationSchema, type ManualPublicationSchema } from '@/modules/publication/form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Publication } from '@/modules/publication/model';

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
    const addForm = useForm<ManualPublicationSchema>({ resolver: zodResolver(manualPublicationSchema) });
    const [doi, setDoi] = useState('');
    const openAddDoiModal = () => {
        setIsAddDoiModalOpen(true);
        setDoi('');
        modals.open({
            title: 'Add publication by DOI',
            centered: true,
            size: 'md',
            children: (
                <form
                    onSubmit={async e => {
                        e.preventDefault();
                        if (!doi.trim()) return;
                        await createMyPublication({ source: 'doi', uniqueId: doi.trim(), title: '', authors: '', year: 0, journal: '' });
                        notifications.show({ message: 'Publication added by DOI' });
                        setIsAddDoiModalOpen(false);
                        modals.closeAll();
                        await refetch();
                    }}
                >
                    <TextInput label="DOI" value={doi} onChange={e => setDoi(e.target.value)} required placeholder="10.1234/example.doi" />
                    <Group mt={15} justify="flex-end">
                        <Button variant="default" onClick={() => { setIsAddDoiModalOpen(false); modals.closeAll(); }}>Cancel</Button>
                        <Button type="submit">Add by DOI</Button>
                    </Group>
                </form>
            )
        });
    };
    const openAddModal = () => {
        setIsAddModalOpen(true);
        addForm.reset();
        modals.open({
            title: 'Add publication',
            centered: true,
            size: 'xl',
            children: (
                <form
                    onSubmit={addForm.handleSubmit(async values => {
                        await createMyPublication({ ...values, source: 'manual' });
                        notifications.show({ message: 'Publication added' });
                        setIsAddModalOpen(false);
                        modals.closeAll();
                        await refetch();
                    })}
                >
                    <TextInput label="Title" {...addForm.register('title')} error={addForm.formState.errors.title?.message} withAsterisk />
                    <TextInput label="Authors" {...addForm.register('authors')} error={addForm.formState.errors.authors?.message} withAsterisk />
                    <Controller
                        control={addForm.control}
                        name="year"
                        render={({ field }) => (
                            <NumberInput
                                label="Year"
                                min={0}
                                max={2200}
                                value={field.value}
                                onChange={field.onChange}
                                error={addForm.formState.errors.year?.message}
                                withAsterisk
                            />
                        )}
                    />
                    <TextInput label="Journal" {...addForm.register('journal')} error={addForm.formState.errors.journal?.message} withAsterisk />
                    <Group mt={15} justify="flex-end">
                        <Button variant="default" onClick={() => { setIsAddModalOpen(false); modals.closeAll(); }}>Cancel</Button>
                        <Button type="submit">Add publication</Button>
                    </Group>
                </form>
            )
        });
    };

    const assignToProject = (pub: Publication) => {
        if (!pub.id) return;
        setAssignProjectId(null);
        modals.open({
            title: 'Assign to project',
            centered: true,
            children: (
                <Stack>
                    <NumberInput
                        label="Project ID"
                        placeholder="Enter project ID"
                        min={1}
                        value={assignProjectId ?? undefined}
                        onChange={v => setAssignProjectId(typeof v === 'number' ? v : null)}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => modals.closeAll()}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                if (!assignProjectId) return;
                                await assignMutation.mutateAsync({ id: pub.id as number, projectId: assignProjectId });
                                notifications.show({ message: 'Assigned to project' });
                                modals.closeAll();
                            }}
                        >Assign</Button>
                    </Group>
                </Stack>
            )
        });
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
                onSortStatusChange={async (s) => { setSort(s as DataTableSortStatus<Publication>); await refetch(); }}
                columns={[
                    { accessor: 'title', title: 'Title' },
                    { accessor: 'authors', title: 'Authors' },
                    { accessor: 'journal', title: 'Journal' },
                    { accessor: 'year', title: 'Year', width: 120 },
                    {
                        accessor: 'actions', title: '', width: 220, textAlign: 'right',
                        render: (pub: Publication) => (
                            <Group gap={8} justify="flex-end">
                                <Button size="xs" variant="light" onClick={() => assignToProject(pub)}>Assign to project</Button>
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
