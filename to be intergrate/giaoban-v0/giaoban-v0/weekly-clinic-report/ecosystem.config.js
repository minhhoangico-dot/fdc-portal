module.exports = {
    apps: [
        {
            name: 'weekly-clinic-report',
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 9000 -H 0.0.0.0',
            cwd: 'g:\\cursor-anti\\giaoban-v0\\weekly-clinic-report',
            interpreter: 'node',
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production'
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '8G',
            node_args: '--max-old-space-size=8192'
        }
    ]
};
