const esbuild = require('esbuild');
const {
    PerspectiveEsbuildPlugin,
} = require('@finos/perspective-esbuild-plugin');

const cssModulesPlugin = require('esbuild-css-modules-plugin');

esbuild.build({
    entryPoints: ['src/app.js'],
    plugins: [PerspectiveEsbuildPlugin(), cssModulesPlugin({
        localIdentName: "[local]--[hash:8:md5:hex]",
    })],
    format: 'esm',
    bundle: true,
    minify: true,
    outfile: 'map/app.js'
    // beep on failure
}).catch(() =>{
    process.stdout.write('\u0007')
    process.exit(1)}
);
