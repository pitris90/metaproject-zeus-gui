/**
 * OpenStack request status
 */
export type OpenstackRequestStatus = 'pending' | 'approved' | 'denied';

/**
 * Merge request state from GitLab
 */
export type MergeRequestState = 'merged' | 'opened' | 'closed' | null;

/**
 * Single OpenStack allocation request
 */
export type OpenstackRequest = {
	id: number;
	status: OpenstackRequestStatus;
	domain: string;
	disableDate?: string | null;
	customerKey: string;
	organizationKey: string;
	workplaceKey: string;
	additionalTags?: string[];
	quota: Record<string, number>;
	flavors?: string[];
	networks?: {
		accessAsExternal?: string[];
		accessAsShared?: string[];
	};
	processed: boolean;
	processedAt: string | null;
	mergeRequestUrl: string | null;
	branchName: string | null;
	yamlPath: string | null;
	mergeRequestState: MergeRequestState;
	createdAt: string;
};

export type Allocation = {
	id: number;
	status: string;
	endDate: Date | null;
	resource: {
		name: string;
		type: string;
	};
	allocationUsers: {
		id: number;
		name: string;
		email: string;
	}[];

	openstack?: OpenstackRequest;
};

export type AllocationDetail = {
	/**
	 * Allocation id
	 */
	id: number;

	/**
	 * Allocation status
	 */
	status: string;

	/**
	 * Allocation start date
	 */
	startDate: string;

	/**
	 * Allocation end date
	 */
	endDate: string;

	project: {
		id: number;
		title: string;
	};

	/**
	 * Allocation resource
	 */
	resource: {
		/**
		 * Allocation resource id
		 */
		id: number;
		/**
		 * Allocation resource name
		 */
		name: string;

		/**
		 * Allocation resource type
		 */
		type: string;
	};

	/**
	 * Allocation justification
	 */
	justification: string;

	/**
	 * Allocation description
	 */
	description: string;

	/**
	 * Allocation quantity
	 */
	quantity: number | null;

	/**
	 * Allocation is locked
	 */
	isLocked: boolean;

	/**
	 * Resource is changeable
	 */
	isChangeable: boolean;

	updatedAt: string;

	allocationUsers: {
		id: number;
		name: string;
		email: string;
	}[];

	/**
	 * Latest OpenStack allocation request
	 */
	openstack?: OpenstackRequest;

	/**
	 * History of previous OpenStack requests (newest first)
	 */
	openstackHistory?: OpenstackRequest[];

	/**
	 * Whether user can submit a modification request
	 */
	canModifyOpenstack?: boolean;
};

export type AllocationAdmin = {
	id: number;
	project: {
		id: number;
		title: string;
		pi: {
			name: string;
		};
	};
	resource: {
		name: string;
		type: string;
	};
	status: string;
	endDate: string | null;
	openstack?: {
		id: number;
		requestStatus: OpenstackRequestStatus;
		domain: string | null;
		organizationKey: string | null;
		processed: boolean;
		mergeRequestUrl: string | null;
		mergeRequestState: MergeRequestState;
	};
	hasPendingModification?: boolean;
};
