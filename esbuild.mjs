import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const watch = process.argv.includes('--watch');

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  outfile: 'public/app.js',
  sourcemap: false,
  define: { '__APP_VERSION__': JSON.stringify(pkg.version) },
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(options);
  console.log('Built public/app.js');
}
