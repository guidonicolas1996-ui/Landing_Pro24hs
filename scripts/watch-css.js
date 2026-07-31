const fs = require('fs');
const path = require('path');
const { build } = require('./build-css.js');

const root = path.resolve(__dirname, '..');
const cssRoot = path.join(root, 'css');

const watchers = [];
let buildTimer = null;

function queueBuild() {
  if (buildTimer) {
    clearTimeout(buildTimer);
  }

  buildTimer = setTimeout(() => {
    console.log('Detected CSS change, regenerating...');
    build();
  }, 200);
}

function watchDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const watcher = fs.watch(dir, (eventType, filename) => {
    if (!filename) {
      return;
    }

    const name = String(filename).toLowerCase();
    if (name === 'styles.production.css' || name.endsWith('.map')) {
      return;
    }

    if (name.endsWith('.css') || name.endsWith('.scss')) {
      queueBuild();
    }
  });

  watchers.push(watcher);

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      watchDirectory(path.join(dir, entry.name));
    }
  }
}

console.log(`Watching CSS files in ${cssRoot}...`);
watchDirectory(cssRoot);
build();
console.log('Watching for CSS changes...');

process.on('SIGINT', () => {
  watchers.forEach((watcher) => watcher.close());
  process.exit(0);
});
