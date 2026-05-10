export const HandleTypes = {
    RED_INPUT: 'red-input',
    RED_OUTPUT: 'red-output',
    ORANGE_INPUT: 'orange-input',
    ORANGE_OUTPUT: 'orange-output',
    ORANGE_OUTPUT_2: 'orange-output-2',
    TURQUOISE_INPUT: 'turquoise-input',
    TURQUOISE_OUTPUT: 'turquoise-output',
    SAGE_INPUT: 'sage-input',
    SAGE_OUTPUT: 'sage-output',
} as const;

// Define connection rules. Allow certain inputs to accept only one or multiple sources.
export const CONNECTION_RULES: Record<string, { allowMultiple: boolean }> = {
    'red': { allowMultiple: true },
    'turquoise': { allowMultiple: true },
    'orange': { allowMultiple: false },
    'sage': { allowMultiple: false },
    // ... other types
};

export type HandleType = typeof HandleTypes[keyof typeof HandleTypes];