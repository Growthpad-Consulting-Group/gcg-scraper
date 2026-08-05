
/**
 * Helper to get nested value from object using dot notation (e.g. 'location.name')
 */
export const getNestedValue = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;
    if (!path.includes('.')) return obj[path];

    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};
