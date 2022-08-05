const CoreObject = require('core-object');
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');
const request = require('request');

module.exports = CoreObject.extend({
  _plugin: null,

  init(options) {
    this._super.init && this._super.init.apply(this, arguments);
    this._plugin = options.plugin;
    this.context = options.context;
  },

  readConfig(key) {
    return this._plugin.readConfig(key);
  },

  log(text) {
    return this._plugin.log(text);
  },

  gitInfo() {
    const sha = execSync('git rev-parse HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trim();

    return { sha, branch };
  },

  notify() {
    const index = this.getIndexContent();
    const git = this.gitInfo();
    const signature = this.sign(index);
    const data = {
      app_name: this.readConfig('app'),
      branch: git.branch,
      sha: git.sha,
      signature: signature,
      html: index,
    };
    const plugin = this;

    // notify the backend
    return new Promise(function (resolve, reject) {
      const endpoint = plugin.readConfig('endpoint');
      const febEndpoint = endpoint.match(/\/front_end_builds\/builds$/)
        ? endpoint
        : endpoint + '/front_end_builds/builds';
      const requestOptions = {
        method: 'POST',
        uri: febEndpoint,
        form: data,
        ...plugin.readConfig('requestOptions'),
      };

      plugin.log('Notifying ' + endpoint + '...');

      request(requestOptions, function (error, response, body) {
        if (error) {
          plugin.log(
            'Unable to reach endpoint ' + endpoint + ': ' + error.message,
            { color: 'red' }
          );
          plugin.log(body, { color: 'red' });

          reject(error.message);
        } else {
          const code = response.statusCode;

          if (code.toString().charAt(0) === '4') {
            return reject('Rejected with code ' + code + '\n' + body);
          }

          plugin.log('Successfully deployed to front end builds server', {
            color: 'green',
          });

          resolve(body);
        }
      });
    });
  },

  sign(index) {
    const algo = 'RSA-SHA256';
    const keyFile = this.readConfig('privateKey');

    return crypto
      .createSign(algo)
      .update(index)
      .sign(fs.readFileSync(keyFile), 'base64');
  },

  getIndexContent() {
    const distDir = this.context.distDir;
    const index = distDir + '/index.html';

    return fs.readFileSync(index).toString();
  },
});
