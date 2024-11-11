const express = require("express");
const httpProxy = require("http-proxy");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const jwt = require("jsonwebtoken");

const app = express();
app.set("trust proxy", 1); // Set trust proxy for Vercel handling
const apiProxy = httpProxy.createProxyServer();

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes.",
});

app.use(limiter);

// JWT authentication middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403); // Forbidden
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401); // Unauthorized
  }
}

// Middleware
app.use(
  cors({
    origin: "https://request-managemnet-system.netlify.app",
    credentials: true,
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
  })
);

// Service URLs
const AUTH_SERVICE = "https://auth-service-nine-tan.vercel.app";
const NOTIFICATION_SERVICE = "https://notification-service-cyan.vercel.app";
const REQUEST_SERVICE = "https://request-service-kappa.vercel.app";

// Google OAuth routes to AUTH_SERVICE
app.all("/auth/google", (req, res) => {
  apiProxy.web(
    req,
    res,
    { target: AUTH_SERVICE, changeOrigin: true },
    (error) => {
      console.error("Error in /auth/google route:", error.message);
      res
        .status(500)
        .json({ message: "Auth Service is currently unavailable." });
    }
  );
});

app.all("/auth/google/callback", (req, res) => {
  apiProxy.web(
    req,
    res,
    { target: AUTH_SERVICE, changeOrigin: true },
    (error) => {
      console.error("Error in /auth/google/callback route:", error.message);
      res
        .status(500)
        .json({ message: "Auth Service is currently unavailable." });
    }
  );
});

// Other protected routes
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

// Proxy headers
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
    "https://request-managemnet-system.netlify.app";
  proxyRes.headers["Access-Control-Allow-Credentials"] = "true";
});

// Global error handling for proxy
apiProxy.on("error", (err, req, res) => {
  console.error("Error in API Gateway:", err.message);
  res.status(500).send("Error in API Gateway: " + err.message);
});

app.get("/", (req, res) => {
  res.send("API Gateway is running.");
});

module.exports = app;
