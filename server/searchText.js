const LATIN_EQUIVALENTS = { ø: 'o', ł: 'l', đ: 'd', ð: 'd', æ: 'ae', œ: 'oe', ß: 'ss', ı: 'i', þ: 'th' };

function foldSearchText(value) {
  return String(value ?? '').normalize('NFD')
    // Strip Latin accents only; Thai vowels and tone marks must stay intact.
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .toLowerCase().replace(/[øłđðæœßıþ]/g, letter => LATIN_EQUIVALENTS[letter]).trim();
}

module.exports = { foldSearchText };
