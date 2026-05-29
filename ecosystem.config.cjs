module.exports = {
  apps: [
    {
      name: "hws-production",
      script: "dist/server.cjs",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_file: ".env",
      watch: false,
      max_memory_restart: "500M",
      error_file: "logs/hws-error.log",
      out_file: "logs/hws-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      time: true,
      kill_timeout: 10000,
      listen_timeout: 15000,
      shutdown_with_message: true,
    },
  ],
};
