'use strict';

const BasePlugin = require('ember-cli-deploy-plugin');
const passwdUser = require('passwd-user');
const FrontEndBuildsNotifier = require('./lib/front-end-builds-notifier');

module.exports = {
  name: require('./package').name,

  createDeployPlugin(options) {
    const homedir = passwdUser.sync(process.getuid()).homedir;
    const DeployPlugin = BasePlugin.extend({
      name: options.name,

      defaultConfig: {
        privateKey: homedir + '/.ssh/id_rsa',
        requestOptions: {},
      },

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
