module.exports = {
    apps : [
        {
          name: "governance_server",
          script: "./index.js",
          watch: true,
          env: {
            "CONTRACT_ADDRESS":"ct_2Gszmrx2yXivgLy6znktwp2uZHzFE8MSGLtWDyPrdZXss8KSuJ",
            "NODE_URL":"http://localhost:3013/",
            "COMPILER_URL":"http://localhost:3080",
            "MIDDLEWARE_URL":"http://localhost:8000",
            "WEBSOCKET_URL":"ws://localhost:3020",
            "REDIS_URL":"redis://localhost:6379", 
            "KEEP_HOT_INTERVAL": "1800000"
          }
        }
    ]
  }