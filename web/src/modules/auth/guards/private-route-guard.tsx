import { Navigate, Outlet } from 'react-router-dom';
// import { useAuth } from 'react-oidc-context';

import Loading from '@/components/global/loading';

const PrivateRouteGuard = () => {
	// TEMPORARILY DISABLED OIDC for exploration
	// const { isAuthenticated, isLoading } = useAuth();

	// if (isLoading) {
	// 	return <Loading />;
	// }

	// if (!isAuthenticated) {
	// 	return <Navigate to="/" replace />;
	// }

	// Always allow access for exploration
	return <Outlet />;
};

export default PrivateRouteGuard;
