/** A1-style cell-reference helpers, inlined so streaming code stays free of `xlsx`. */

const A = 'A'.charCodeAt(0);

export function decodeCol(letter: string): number {
    let n = 0;
    for (let i = 0; i < letter.length; i++) {
        const c = letter.charCodeAt(i);
        if (c < A || c > A + 25) break;
        n = n * 26 + (c - A + 1);
    }
    return n - 1;
}

export function encodeCol(index: number): string {
    let s = '';
    let n = index + 1;
    while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(A + r) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

/** Parse "AB12" → { col: 27, row: 11 } (0-indexed). */
export function parseCellRef(ref: string): { col: number; row: number } {
    let i = 0;
    while (i < ref.length) {
        const c = ref.charCodeAt(i);
        if (c < A || c > A + 25) break;
        i++;
    }
    const col = decodeCol(ref.slice(0, i));
    const row = Number(ref.slice(i)) - 1;
    return { col, row };
}
