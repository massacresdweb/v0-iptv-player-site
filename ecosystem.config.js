module.exports = {
  apps: [
    {
      name: "masstv",
      script: "npm",
      args: "start",
      cwd: "/var/www/v0-iptv-player-site",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NODE_OPTIONS: "--max-old-space-size=4096",
      },
      error_file: "/root/.pm2/logs/masstv-error.log",
      out_file: "/root/.pm2/logs/masstv-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
}
