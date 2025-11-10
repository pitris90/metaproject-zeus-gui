import { Flex, Indicator, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

import classes from './select-card.module.css';

type SelectCardProps = {
	selected: boolean;
	onClick: () => void;
	size?: number;
	icon: unknown;
	label: string;
	description: string;
};

const SelectCard = ({ selected, onClick, size, label, description, icon }: SelectCardProps) => {
	const currentSize = size ?? 100;

	return (
		<Indicator inline size={16} position="bottom-center" disabled={!selected} label={<IconCheck />} zIndex={100}>
			<Flex
				component={UnstyledButton}
				data-selected={selected}
				w={currentSize}
				h={currentSize}
				justify="space-between"
				align="center"
				direction="column"
				className={classes.card}
				onClick={onClick}
				p={10}
			>
				<Stack justify="center" align="center" h="65%">
					{icon}
				</Stack>
				<Stack gap={0} align="center" h="35%">
					<Title order={4}>{label}</Title>
					<Text ta="center" size="sm">
						{description}
					</Text>
				</Stack>
			</Flex>
		</Indicator>
	);
};

export default SelectCard;
