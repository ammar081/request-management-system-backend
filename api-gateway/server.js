const express = require("express");
const httpProxy = require("http-proxy");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const jwt = require("jsonwebtoken");

const app = express();
const apiProxy = httpProxy.createProxyServer();

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (15 minutes)
  message: "Too many requests from this IP, please try again after 15 minutes.",
  headers: true, // Send X-RateLimit headers in responses
});

// Apply rate limiting to all requests
app.use(limiter);

// JWT authentication function
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("Authorization Header:", authHeader); // Log the auth header

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error("JWT Verification Error:", err); // Log verification error
        return res.sendStatus(403); // Forbidden
      }
      req.user = user;
      next();
    });
  } else {
    console.error("Authorization header missing"); // Log missing auth header
    res.sendStatus(401); // Unauthorized
  }
}

// Middleware
app.use(
  cors({
    origin: "https://request-managemnet-system.netlify.app",
    credentials: true, // Allow credentials (e.g., cookies) if needed
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://trusted.cdn.com"],
        connectSrc: ["'self'", "https://request-managemnet-system.netlify.app"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
    noSniff: true,
  })
);

// Define service URLs
const AUTH_SERVICE = "https://auth-service-nine-tan.vercel.app"; // Auth service
const NOTIFICATION_SERVICE = "https://notification-service-cyan.vercel.app"; // Notification service
const REQUEST_SERVICE = "https://request-service-kappa.vercel.app"; // Request service

// Proxy routing
app.all("/auth/*", (req, res) => {
  apiProxy.web(req, res, { target: AUTH_SERVICE }, (error) => {
    console.error("Auth Service error:", error.message);
    res.status(500).json({ message: "Auth Service is currently unavailable." });
  });
});

app.all("/notify/*", authenticateJWT, (req, res) => {
  apiProxy.web(req, res, { target: NOTIFICATION_SERVICE }, (error) => {
    console.error("Notification Service error:", error.message);
    res
      .status(500)
      .json({ message: "Notification Service is currently unavailable." });
  });
});

app.all("/requests/*", authenticateJWT, (req, res) => {
  apiProxy.web(req, res, { target: REQUEST_SERVICE }, (error) => {
    console.error("Request Service error:", error.message);
    res
      .status(500)
      .json({ message: "Request Service is currently unavailable." });
  });
});

apiProxy.on("proxyReq", (proxyReq, req, res) => {
  if (req.headers["authorization"]) {
    proxyReq.setHeader("Authorization", req.headers["authorization"]);
  }
  if (req.headers["cookie"]) {
    proxyReq.setHeader("cookie", req.headers["cookie"]);
  }
});

apiProxy.on("proxyRes", (proxyRes, req, res) => {
  proxyRes.headers["Access-Control-Allow-Origin"] =
    "https://request-managemnet-system.netlify.app"; // Update with the new frontend URL
  proxyRes.headers["Access-Control-Allow-Credentials"] = "true"; // Enable credentials if necessary
});

// Global error handling for proxy
apiProxy.on("error", (err, req, res) => {
  console.error("Error in API Gateway:", err.message);
  res.status(500).send("Error in API Gateway: " + err.message);
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
