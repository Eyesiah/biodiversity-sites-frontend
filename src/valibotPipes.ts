import * as v from 'valibot';

export const fuzzyPicklist = <T extends string[] | readonly string[]>(picklist: T) => {
    const lowercaseLookup = new Map(picklist.map(s => [s.toLowerCase(), s] as [string, T[number]]));

    return v.pipe(
        v.string(),
        v.trim(),
        v.transform(s => lowercaseLookup.get(s.toLowerCase()) ?? s),
        v.picklist(picklist),
    )
}

