import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, Flex, ThemeIcon, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
// import { useAuth } from 'react-oidc-context';

import Loading from '@/components/global/loading';

const Index: React.FC = () => {
	// TEMPORARILY DISABLED OIDC for exploration
	// const { signinRedirect, isAuthenticated, isLoading } = useAuth();
	const { t } = useTranslation();
	const navigate = useNavigate();

	useEffect(() => {
		// Set up mock authentication data for exploration
		localStorage.setItem('max_role', 'admin');
		localStorage.setItem('is_user_step_up', 'true');
		
		// Redirect directly to projects for exploration
		navigate('/project', { replace: true });
	}, [navigate]);

	// Always redirect to projects, but show loading while doing so
	return <Loading text="Redirecting to projects..." />;
};

export default Index;
