// Time unit conversions
export type TimeUnit = 's' | 'min' | 'h' | 'd';

export interface TimeUnitOption {
	value: TimeUnit;
	label: string;
}

export const TIME_UNITS: TimeUnitOption[] = [
	{ value: 's', label: 'Seconds' },
	{ value: 'min', label: 'Minutes' },
	{ value: 'h', label: 'Hours' },
	{ value: 'd', label: 'Days' }
];

export function convertTimeValue(seconds: number, unit: TimeUnit): number {
	switch (unit) {
		case 's':
			return seconds;
		case 'min':
			return seconds / 60;
		case 'h':
			return seconds / 3600;
		case 'd':
			return seconds / 86400;
		default:
			return seconds;
	}
}

export function formatTimeValue(seconds: number, unit: TimeUnit): string {
	const value = convertTimeValue(seconds, unit);
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0
	}).format(value);
}

// Memory unit conversions
export type MemoryUnit = 'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB';

export interface MemoryUnitOption {
	value: MemoryUnit;
	label: string;
}

export const MEMORY_UNITS: MemoryUnitOption[] = [
	{ value: 'B', label: 'Bytes' },
	{ value: 'KiB', label: 'KiB' },
	{ value: 'MiB', label: 'MiB' },
	{ value: 'GiB', label: 'GiB' },
	{ value: 'TiB', label: 'TiB' }
];

export function convertMemoryValue(bytes: number, unit: MemoryUnit): number {
	switch (unit) {
		case 'B':
			return bytes;
		case 'KiB':
			return bytes / 1024;
		case 'MiB':
			return bytes / (1024 * 1024);
		case 'GiB':
			return bytes / (1024 * 1024 * 1024);
		case 'TiB':
			return bytes / (1024 * 1024 * 1024 * 1024);
		default:
			return bytes;
	}
}

export function formatMemoryValue(bytes: number, unit: MemoryUnit): string {
	const value = convertMemoryValue(bytes, unit);
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0
	}).format(value);
}

// Auto-select best unit based on value magnitude
export function autoSelectTimeUnit(seconds: number): TimeUnit {
	if (seconds < 60) return 's';
	if (seconds < 3600) return 'min';
	if (seconds < 86400) return 'h';
	return 'd';
}

export function autoSelectMemoryUnit(bytes: number): MemoryUnit {
	if (bytes < 1024) return 'B';
	if (bytes < 1024 * 1024) return 'KiB';
	if (bytes < 1024 * 1024 * 1024) return 'MiB';
	if (bytes < 1024 * 1024 * 1024 * 1024) return 'GiB';
	return 'TiB';
}
