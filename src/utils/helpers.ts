export const generateId = (prefix: string): string => {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const formatDate = (date: Date): string => {
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

export const formatTime = (time: string): string => {
	// Format HH:mm as h:mm AM/PM
	const [hours, minutes] = time.split(":").map(Number);
	const ampm = hours >= 12 ? "PM" : "AM";
	const displayHours = hours % 12 || 12;
	return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

export const getDateWithoutTime = (date: Date): Date => {
	const newDate = new Date(date);
	newDate.setHours(0, 0, 0, 0);
	return newDate;
};

export const getDaysDifference = (date1: Date, date2: Date): number => {
	const oneDay = 24 * 60 * 60 * 1000;
	return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
};
