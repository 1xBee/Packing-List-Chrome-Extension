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

    // Build content scripts
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/print-override.js'],
      outfile: 'dist/print-override.js',
    });

    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/main.js'],
      outfile: 'dist/content-main.js',
    });

    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/api-interceptor.js'],
      outfile: 'dist/api-interceptor.js',
    });

    // Build in-page interceptor (runs in page context via injected script)
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/content/inpage-api-interceptor.js'],
      outfile: 'dist/inpage-api-interceptor.js',
    });

    // Build background service worker
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/background/service-worker.js'],
      outfile: 'dist/service-worker.js',
    });

    // After building service-worker, replace env variables
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

    // Build React component
    await esbuild.build({
      ...buildConfig,
      entryPoints: ['src/components/PackingList.jsx'],
      outfile: 'dist/packing-list-component.js',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      external: ['react', 'react-dom'],
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

    // Copy React dependencies (from node_modules)
    const reactPath = 'node_modules/react/umd/react.production.min.js';
    const reactDomPath = 'node_modules/react-dom/umd/react-dom.production.min.js';
    
    if (fs.existsSync(reactPath)) {
      fs.copyFileSync(reactPath, 'dist/react.min.js');
    }
    if (fs.existsSync(reactDomPath)) {
      fs.copyFileSync(reactDomPath, 'dist/react-dom.min.js');
    }

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