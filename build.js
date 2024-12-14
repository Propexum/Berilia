const esbuild = require('esbuild');
const fs = require('fs');
const {parse} = require('smol-toml');
const {
    PerspectiveEsbuildPlugin,
} = require('@finos/perspective-esbuild-plugin');

const cssModulesPlugin = require('esbuild-css-modules-plugin');

let config = '';
try {
    config = fs.readFileSync('config.toml', 'utf-8');
} catch (err) {
    console.warn("error reading config.toml, falling back to config_default.toml");
    config = fs.readFileSync('config_default.toml', 'utf-8');
}
const CONFIG = parse(config);

console.log("compiling with", CONFIG);
esbuild.build({
    entryPoints: ['src/app.js'],
    plugins: [PerspectiveEsbuildPlugin(), cssModulesPlugin({
        localIdentName: "[local]--[hash:8:md5:hex]",
    })],
    format: 'esm',
    bundle: true,
    minify: true,
    define: CONFIG,
    outfile: 'map/app.js'
    // beep on failure
}).catch(() =>{
    process.stdout.write('\u0007')
    process.exit(1)}
);
