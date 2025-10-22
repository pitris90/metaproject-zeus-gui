import { Badge, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { type Publication } from '@/modules/publication/model';

type PublicationCardProps = {
	publication: Publication;
};

const PublicationCard = ({ publication }: PublicationCardProps) => {
	const { t } = useTranslation();

	return (
		<Stack gap={0}>
			<Group gap={5}>
				<Text mb={0} fw="bold">
					Title:
				</Text>
				<Text>{publication.title}</Text>
				{publication.isOwner && (
					<Badge color="teal" size="sm" variant="light">
						{t('components.project.publications.index.mine_badge', { defaultValue: 'Mine' })}
					</Badge>
				)}
			</Group>
			<Group gap={5}>
				<Text mb={0} fw="bold">
					Authors:
				</Text>
				<Text>{publication.authors}</Text>
			</Group>
			<Group gap={5}>
				<Text mb={0} fw="bold">
					Journal:
				</Text>
				<Text>{publication.journal}</Text>
			</Group>
		</Stack>
	);
};

export default PublicationCard;
