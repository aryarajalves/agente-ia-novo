export const splitMessageByLinks = (text) => {
    if (!text) return [];
    const URL_REGEX = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(URL_REGEX);
    // parts: ['texto antes ', 'https://link', ' texto depois']
    return parts.map(p => p.trim()).filter(p => p.length > 0);
};

export const isUrl = (str) => /^https?:\/\//i.test((str || '').trim());
