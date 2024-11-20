const esbuild = require('esbuild');
const {
    PerspectiveEsbuildPlugin,
} = require('@finos/perspective-esbuild-plugin');

esbuild.build({
    entryPoints: ['src/app.js'],
    plugins: [PerspectiveEsbuildPlugin()],
    format: 'esm',
    bundle: true,
    minify: true,
    outfile: 'map/app.js',
    // beep on failure
}).catch(() =>{
    process.stdout.write('\u0007')
    process.exit(1)}
);
