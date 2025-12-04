const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
require('dotenv').config();

const isWatch = process.argv.includes('--watch');

// Clean dist folder
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build configuration
const buildConfig = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  target: 'chrome88',
  format: 'iife',
};

// function to replace placeholders
function replaceEnvVariables(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace('__SUPABASE_URL__', process.env.SUPABASE_URL || '');
  content = content.replace('__SUPABASE_KEY__', process.env.SUPABASE_KEY || '');
  fs.writeFileSync(filePath, content);
}

// Build scripts
async function build() {
  try {
    console.log('🔨 Building extension...');

    // Build early content script (runs at document_start)
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/content-early.js'],
      outfile: 'dist/content-early.js',
    });

    // Build print override (injected into page context)
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/print-override.js'],
      outfile: 'dist/print-override.js',
    });

    // Build API interceptor helper (for content script)
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/api-interceptor.js'],
      outfile: 'dist/api-interceptor.js',
    });

    // Build in-page API interceptor (injected into page context)
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/inpage-api-interceptor.js'],
      outfile: 'dist/inpage-api-interceptor.js',
    });

    // Build item filter
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/item-filter.js'],
      outfile: 'dist/item-filter.js',
    });

    // Build packing list component (vanilla JS)
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/packing-list-component.js'],
      outfile: 'dist/packing-list-component.js',
    });

    // Build main content script (runs at document_idle)
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/main.js'],
      outfile: 'dist/content-main.js',
    });

    // Build background service worker
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/background/service-worker.js'],
      outfile: 'dist/service-worker.js',
    });

    // Replace placeholders with actual values
    replaceEnvVariables('dist/service-worker.js');

    // Build popup
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/popup/popup.js'],
      outfile: 'dist/popup.js',
    });

    // Copy static files
    const staticFiles = [
      { from: 'src/manifest.json', to: 'dist/manifest.json' },
      { from: 'src/popup/popup.html', to: 'dist/popup.html' },
      { from: 'src/popup/popup.css', to: 'dist/popup.css' },
      { from: 'src/styles/packing-list.css', to: 'dist/packing-list.css' },
    ];

    staticFiles.forEach(({ from, to }) => {
      if (fs.existsSync(from)) {
        fs.copyFileSync(from, to);
      }
    });

    console.log('✅ Build complete!');

    // Create zip file (only in production build)
    if (!isWatch) {
      await createZip();
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Create zip file for distribution
async function createZip() {
  return new Promise((resolve, reject) => {
    console.log('📦 Creating zip file...');
    
    const output = fs.createWriteStream('packing-list-extension.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✅ Zip created: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory('dist/', false);
    archive.finalize();
  });
}

// Watch mode
if (isWatch) {
  console.log('👀 Watch mode enabled. Press Ctrl+C to stop.');
  
  // Initial build
  build();
  
  // Watch for changes
  const watchPaths = ['src'];
  watchPaths.forEach((watchPath) => {
    fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
      console.log(`\n📝 File changed: ${filename}`);
      build();
    });
  });
} else {
  build();
}