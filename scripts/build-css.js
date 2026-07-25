const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const input = path.join(root, 'css', 'styles.css');
const output = path.join(root, 'css', 'styles.production.css');

function isRemoteImport(importPath) {
  return importPath.startsWith('http://') || importPath.startsWith('https://') || importPath.startsWith('data:') || importPath.startsWith('//');
}

function isLocalImport(importPath) {
  return !isRemoteImport(importPath);
}

function rewriteCssUrls(content, filePath) {
  return content.replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi, (match, quote, urlPath) => {
    if (!isLocalImport(urlPath) || urlPath.startsWith('/') || urlPath.startsWith('#')) {
      return match;
    }
    const absoluteUrlPath = path.resolve(path.dirname(filePath), urlPath);
    const relativeToOutput = path.relative(path.dirname(output), absoluteUrlPath).replace(/\\/g, '/');
    const normalized = relativeToOutput.startsWith('.') ? relativeToOutput : `./${relativeToOutput}`;
    return `url(${quote}${normalized}${quote})`;
  });
}

function collectCssFiles(filePath, seen = new Set(), files = []) {
  const absolutePath = path.resolve(filePath);
  if (seen.has(absolutePath)) {
    return files;
  }
  seen.add(absolutePath);

  if (!fs.existsSync(absolutePath)) {
    return files;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const importRegex = /@import\s+(?:url\()?['"]([^'")]+)['"]\)?\s*;?/gi;
  const strippedContent = content.replace(importRegex, (match, importPath) => {
    return isLocalImport(importPath) ? '' : match;
  });
  const rewrittenContent = rewriteCssUrls(strippedContent, absolutePath);
  files.push({ path: absolutePath, content: rewrittenContent });

  const matches = content.matchAll(importRegex);
  for (const match of matches) {
    const importPath = match[1];
    if (!isLocalImport(importPath)) {
      continue;
    }
    const resolvedImport = path.resolve(path.dirname(absolutePath), importPath);
    if (fs.existsSync(resolvedImport)) {
      collectCssFiles(resolvedImport, seen, files);
    }
  }

  return files;
}

function minifyCss(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function build() {
  const files = collectCssFiles(input);
  const combined = files.map((item) => item.content).join('\n\n');
  const minified = minifyCss(combined);
  fs.writeFileSync(output, minified, 'utf8');
  console.log('CSS production generated');
}

build();
