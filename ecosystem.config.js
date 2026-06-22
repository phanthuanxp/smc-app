// PM2 process config — keeps the Next.js server running & restarts on crash/reboot.
// Usage on VPS:  pm2 start ecosystem.config.js  &&  pm2 save
module.exports = {
  apps: [
    {
      name: 'smc-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3020',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3020',
      },
      max_memory_restart: '512M',
    },
  ],
};
