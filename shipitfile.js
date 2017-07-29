const config = {
  default: {
    workspace: './tmp',
    deployTo: '/websites/poker-server',
    repositoryUrl: 'git@github.com:IFS49F/poker-server.git',
    keepReleases: 2,
    deleteOnRollback: false,
    key: '.ssh/deploy_key',
    shallowClone: true,
    rsync: ['-R'],
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
    servers: 'deploy@poker4.fun'
  }
};

module.exports = shipit => {
  require('shipit-deploy')(shipit);

  shipit.initConfig(config);

  shipit.on('deployed', () => {
    const pm2Json = 'pm2.json';
    shipit.remote(`
      cd ${shipit.config.deployTo}/current;
      yarn install --production;
      pm2 startOrGracefulReload ${pm2Json} --env ${shipit.environment}`
    );
  });
};
