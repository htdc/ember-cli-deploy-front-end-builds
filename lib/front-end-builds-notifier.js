const CoreObject = require('core-object');
const fs = require('fs');

// crypto is globally available in Node.js 18, so at some stage we should consider
// accessing directly rather than the require syntax below.
// eslint-disable-next-line no-redeclare
const crypto = require('crypto');

const { execSync } = require('child_process');

// fetch is built into Node.js 18, so at some stage we should consider
// removing this dependency.
// eslint-disable-next-line no-redeclare
const fetch = require('node-fetch');

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

  async notify() {
    const plugin = this;
    const html = this.getIndexContent();
    const signature = this.sign(html);
    const { branch, sha } = this.gitInfo();
    const app_name = this.readConfig('app');
    const endpoint = plugin.readConfig('endpoint');
    const febEndpoint = endpoint.match(/\/front_end_builds\/builds$/)
      ? endpoint
      : endpoint + '/front_end_builds/builds';

    const formData = new URLSearchParams();
    formData.append('app_name', app_name);
    formData.append('branch', branch);
    formData.append('sha', sha);
    formData.append('signature', signature);
    formData.append('html', html);

    const requestOptions = {
      method: 'POST',
      body: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      ...plugin.readConfig('requestOptions'),
    };

    // notify the backend
    plugin.log('Notifying ' + endpoint + '...');

    let res;
    try {
      res = await fetch(febEndpoint, requestOptions);
    } catch (err) {
      plugin.log(
        'Unable to reach endpoint ' + febEndpoint + ': ' + err.message,
        { color: 'red' },
      );

      throw new Error(err.message);
    }

    const body = await res.text();
    if (res.ok) {
      plugin.log('Successfully deployed to front end builds server', {
        color: 'green',
      });

      return body;
    } else {
      throw new Error('Rejected with code ' + res.status + '\n' + body);
    }
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
