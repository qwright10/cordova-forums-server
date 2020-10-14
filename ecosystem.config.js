// @ts-ignore
module.exports = {
    apps: [
        {
            name: 'cordova-forums',
            script: './build/index.js',
            args: ['--color'],
            node_args: '-r dotenv/config --inspect --trace-warnings',
        },
    ],

    deploy: {
        production: {
            ref: 'origin/master',
            repo: 'https://github.com/qwright10/cordova-forums-server.git',
            path: 'DESTINATION_PATH',
            'pre-deploy-local': '',
            'post-deploy':
                'yarn install && pm2 reload ecosystem.config.js --env production',
            'pre-setup': '',
        },
    },
};