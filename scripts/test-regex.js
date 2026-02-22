
const content = `
  const t = useTranslations("General.Departments");
`;
const USE_TRANSLATIONS_REGEX = /const\s+(\w+)\s*=\s*useTranslations\(\s*["']([^"']+)["']\s*\)/g;
const matches = [...content.matchAll(USE_TRANSLATIONS_REGEX)];
console.log(matches.length);
if (matches.length > 0) {
    console.log(matches[0][1], matches[0][2]);
}
