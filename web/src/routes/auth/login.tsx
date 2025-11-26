// import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Loading from '@/components/global/loading';

const AuthLogin = () => {
	const [params] = useSearchParams();
	// TEMPORARILY DISABLED OIDC for exploration
	// const { isAuthenticated } = useAuth();
	const isAuthenticated = true; // Mock authentication for exploration
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuthenticated) {
			navigate('/project');
		}
	}, [isAuthenticated, navigate]);

	if (params.has('error')) {
		navigate('/');
	}

	return <Loading text="Logging in..." />;
};

export default AuthLogin;
