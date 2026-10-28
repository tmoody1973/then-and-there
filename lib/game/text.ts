// Display tidying for OCR text: rejoin words the typesetter broke across lines ("Cos- mopolitan").
export const tidy = (s: string) => s.replace(/(\p{L})-[ \t]*\n?[ \t]*(\p{L})/gu, (m, a, b) => (/\s/.test(m) ? a + b : m));
