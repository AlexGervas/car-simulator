export default {
  // Format code with Prettier (auto-fix)
  '*.{ts,html,css,scss,json}': ['prettier --write'],
  
  // Check TypeScript and HTML files with ESLint (fail on errors, no auto-fix)
  '*.{ts,html}': ['eslint --max-warnings=0'],
};
