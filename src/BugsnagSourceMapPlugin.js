import async from 'async';
import superagent from 'superagent';
import path from 'path';

const BUGSNAG_ENDPOINT = 'https://upload.bugsnag.com';

class BugsnagSourceMapPlugin {
  constructor({
    apiKey,
    publicPath,
    silent = false,
  }) {
    this.apiKey = apiKey;
    this.publicPath = publicPath;
    this.silent = silent;
  }

  apply(compiler) {
    if (compiler.options.devtool === false) {
      console.warn('WARN: sourcemap option is not defined. (from bugsnag-sourcemap-webpack-plugin)\n');
      return;
    }

    compiler.plugin('after-emit', (compilation) => {
      this.afterEmit(compilation);
    });
  }

  afterEmit(compilation) {
    const { assetsByChunkName } = compilation.getStats().toJson();
    const assets = this.constructor.getAssets(assetsByChunkName);
    this.uploadSourceMaps(assets, compilation);
  }

  static getAssets(assetsByChunkName) {
    return Object.keys(assetsByChunkName).map(asset => assetsByChunkName[asset]);
  }

  uploadSourceMaps(assets, compilation) {
    async.each(
      assets,
      (asset, callback) => {
        this.uploadSourceMap(asset[0], asset[1], compilation);
        callback();
      },
      (err) => {
        if (err && !this.silent) { throw err; }
      },
    );
  }

  uploadSourceMap(sourceFile, sourceMap, compilation) {
    const minifiedUrl = path.join(this.publicPath, sourceFile);
    const sourceMapPath = compilation.assets[sourceMap].existsAt;
    superagent.post(BUGSNAG_ENDPOINT)
              .field('apiKey', this.apiKey)
              .field('minifiedUrl', minifiedUrl)
              .attach('sourceMap', sourceMapPath)
              .end((err) => { if (err && !this.silent) { throw err; } });
  }
}

module.exports = BugsnagSourceMapPlugin;
