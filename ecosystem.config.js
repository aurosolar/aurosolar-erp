// ecosystem.config.js — PM2 configuration
module.exports = {
  apps: [
    {
      name: 'aurosolar-erp',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/erp',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
