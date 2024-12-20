'use strict';

const BasePlugin = require('ember-cli-deploy-plugin');
const os = require('os');
const FrontEndBuildsNotifier = require('./lib/front-end-builds-notifier');

module.exports = {
  name: require('./package').name,

  createDeployPlugin(options) {
    const homedir = os.homedir();
    const DeployPlugin = BasePlugin.extend({
      name: options.name,

      // eslint-disable-next-line ember/avoid-leaking-state-in-ember-objects
      defaultConfig: {
        privateKey: homedir + '/.ssh/id_rsa',
        requestOptions: {},
      },

      // eslint-disable-next-line ember/avoid-leaking-state-in-ember-objects
      requiredConfig: ['app', 'endpoint'],

      didUpload(context) {
        const notifier = new FrontEndBuildsNotifier({
          plugin: this,
          context,
        });

        return notifier.notify();
      },
    });

    return new DeployPlugin();
  },
};
