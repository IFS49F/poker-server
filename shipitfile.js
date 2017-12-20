const config = {
  default: {
    workspace: './tmp',
    deployTo: '/websites/poker-server',
    repositoryUrl: 'git@github.com:IFS49F/poker-server.git',
    keepReleases: 2,
    deleteOnRollback: false,
    shallowClone: true,
    rsync: ['--delete'],
    ignores: [
      '.gitkeep',
      '.git',
      '.gitignore',
      'README.md',
      'shipitfile.js',
      'node_modules',
      'tmp'
    ]
  },
  production: {
    servers: [{
      user: 'deploy',
      host: 'poker4.fun',
      port: process.env.SSH_PORT || 22
    }]
  }
};

module.exports = shipit => {
  require('shipit-deploy')(shipit);

  shipit.initConfig(config);

  shipit.on('deployed', () => {
    shipit.remoteCopy('./pm2.json', `${shipit.config.deployTo}/current`).then(() => shipit.start('restart'));
  });

  shipit.task('restart', () => {
    const pm2Json = 'pm2.json';
    shipit.remote(`
      cd ${shipit.config.deployTo}/current;
      yarn install --production;
      pm2 startOrGracefulReload ${pm2Json} --env ${shipit.environment}`
    );
  });
};
