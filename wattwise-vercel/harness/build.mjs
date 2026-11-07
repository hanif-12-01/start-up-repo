// Builds the Stage5G.14 synthetic browser harness (static HTML + JS + Tailwind CSS).
// Not part of the production build; run explicitly from wattwise-vercel.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const root = process.cwd();
// Generated artifacts live outside the repository (approved Temp directory) so
// no compiled bundle is ever tracked or linted as project source.
const outDir =
  process.env.WATTWISE_HARNESS_OUT ?? path.join(os.tmpdir(), 'wattwise-stage5g14-harness-dist');
await mkdir(outDir, { recursive: true });

const aliasNext = {
  name: 'harness-next-alias',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^next\/image$/ }, () => ({ path: path.join(root, 'harness', 'image-stub.tsx') }));
    pluginBuild.onResolve({ filter: /^@\/server\/auth\/client$/ }, () => ({
      path: path.join(root, 'harness', 'auth-stub.ts'),
    }));
    pluginBuild.onResolve({ filter: /^@\// }, (args) => ({
      path: path.join(root, 'src', args.path.slice(2)),
      namespace: 'srcfiles',
    }));
    pluginBuild.onLoad({ filter: /.*/, namespace: 'srcfiles' }, async (args) => {
      const candidates = [
        `${args.path}.ts`,
        `${args.path}.tsx`,
        args.path,
        path.join(args.path, 'index.ts'),
        path.join(args.path, 'index.tsx'),
      ];
      const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
      if (!found) throw new Error(`Cannot resolve harness import: ${args.path}`);
      return {
        contents: await readFile(found, 'utf8'),
        loader: found.endsWith('.tsx') ? 'tsx' : 'ts',
        resolveDir: path.dirname(found),
      };
    });
    pluginBuild.onResolve({ filter: /^next\/link$/ }, () => ({
      path: path.join(root, 'harness', 'link-stub.tsx'),
    }));
    pluginBuild.onResolve({ filter: /^next\/navigation$/ }, () => ({
      path: path.join(root, 'harness', 'next-stub.ts'),
    }));
  },
};

await build({
  entryPoints: [path.join(root, 'harness', 'entry.tsx')],
  bundle: true,
  outfile: path.join(outDir, 'harness.js'),
  format: 'iife',
  jsx: 'automatic',
  target: ['chrome110'],
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [aliasNext],
  logLevel: 'info',
});

const globals = await readFile(path.join(root, 'src', 'app', 'globals.css'), 'utf8');
const tokens = globals.replace(/^@import "tailwindcss";\s*/m, '');
const css = `@import "tailwindcss" source("../src") source("..");\n${tokens}`;
const result = await postcss([tailwind()]).process(css, {
  from: path.join(root, 'harness', 'harness.css'),
});
await writeFile(path.join(outDir, 'harness.css'), result.css);

await writeFile(
  path.join(outDir, 'index.html'),
  `<!doctype html>
<html lang="id" class="h-full">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>WattWise Stage5G.14 harness</title>
<link rel="stylesheet" href="./harness.css" />
</head>
<body class="min-h-full bg-[var(--background)]">
<div id="root"></div>
<script src="./harness.js"></script>
</body>
</html>
`
);

console.log('harness built at', outDir);
