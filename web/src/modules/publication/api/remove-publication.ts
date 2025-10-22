import { Method } from '@/modules/api/model';
import { request } from '@/modules/api/request';

export type RemovePublicationRequest = {
	projectId: number;
	publicationId: number;
};

export const removePublication = async ({ projectId, publicationId }: RemovePublicationRequest) => {
	await request(`/projects/${projectId}/publications/${publicationId}`, {
		method: Method.DELETE
	});
};
