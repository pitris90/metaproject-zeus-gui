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

	openstack?: {
		resourceType: string;
		domain: string;
		disableDate?: string | null;
		projectDescription: string;
		customerKey: string;
		organizationKey: string;
		workplaceKey: string;
		additionalTags?: string[];
		quota: Record<string, number>;
		processed: boolean;
		processedAt: string | null;
		mergeRequestUrl: string | null;
		branchName: string | null;
		yamlPath: string | null;
	};
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

	updatedAt: string;

	allocationUsers: {
		id: number;
		name: string;
		email: string;
	}[];
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
		domain: string | null;
		organizationKey: string | null;
		processed: boolean;
		mergeRequestUrl: string | null;
	};
};
