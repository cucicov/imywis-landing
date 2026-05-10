export type FontOption = {
    label: string;
    value: string;
    url?: string;
    format?: string;
};

const bundledFontModules = import.meta.glob('../assets/fonts/*.{otf,ttf,woff,woff2}', {
    eager: true,
    import: 'default',
    query: '?url',
}) as Record<string, string>;

const SYSTEM_FONT_OPTIONS: FontOption[] = [
    {label: 'Default', value: 'sans-serif'},
];

export const PROJECT_FONT_OPTIONS: FontOption[] = Object.entries(bundledFontModules)
    .map(([path, url]) => {
        const fileName = path.split('/').pop() ?? path;
        const label = formatFontLabel(fileName);
        const extension = getFileExtension(fileName);

        return {
            label,
            value: `${(fileName.replace(/\.[^.]+$/, ''))}`,
            url,
            format: getFontFormat(extension),
        };
    })
    .sort((left, right) => left.label.localeCompare(right.label));

export const TEXT_FONT_OPTIONS: FontOption[] = [
    ...SYSTEM_FONT_OPTIONS,
    ...PROJECT_FONT_OPTIONS,
];

let projectFontsLoadPromise: Promise<void> | null = null;

export const ensureProjectFontsLoaded = () => {
    if (projectFontsLoadPromise) {
        return projectFontsLoadPromise;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined' || PROJECT_FONT_OPTIONS.length === 0) {
        projectFontsLoadPromise = Promise.resolve();
        return projectFontsLoadPromise;
    }

    projectFontsLoadPromise = Promise.all(
        PROJECT_FONT_OPTIONS.map(async (option) => {
            if (!option.url) {
                return;
            }

            const source = option.format
                ? `url("${option.url}") format("${option.format}")`
                : `url("${option.url}")`;
            const fontFace = new FontFace(option.value, source);

            try {
                const loadedFontFace = await fontFace.load();
                document.fonts.add(loadedFontFace);
            } catch (error) {
                console.warn(`Failed to load font "${option.label}".`, error);
            }
        })
    ).then(() => undefined);

    return projectFontsLoadPromise;
};

function formatFontLabel(fileName: string) {
    const nameWithoutExtension = fileName.replace(/\.[^.]+$/, '');
    return nameWithoutExtension
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, character => character.toUpperCase());
}

function getFileExtension(fileName: string) {
    const extension = fileName.split('.').pop();
    return extension ? extension.toLowerCase() : '';
}

function getFontFormat(extension: string) {
    switch (extension) {
        case 'otf':
            return 'opentype';
        case 'ttf':
            return 'truetype';
        case 'woff':
            return 'woff';
        case 'woff2':
            return 'woff2';
        default:
            return undefined;
    }
}
