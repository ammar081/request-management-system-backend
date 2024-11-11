const express = require("express");
const httpProxy = require("http-proxy");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

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

const app = express();
app.set("trust proxy", 1); // Set trust proxy to handle rate limiting securely on Vercel
const apiProxy = httpProxy.createProxyServer();

// Define the URLs of each service
const AUTH_SERVICE = "https://auth-service-nine-tan.vercel.app";
const NOTIFICATION_SERVICE = "https://notification-service-cyan.vercel.app";
const REQUEST_SERVICE = "https://request-service-kappa.vercel.app";

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
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
    noSniff: true,
  })
);

// Define rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: "Too many requests from this IP, please try again after 15 minutes.",
  headers: true,
});

// Apply rate limiting
app.use(limiter);

// Route Google OAuth paths directly to AUTH_SERVICE
app.all("/auth/google", (req, res) => {
  apiProxy.web(req, res, { target: `${AUTH_SERVICE}/auth/google` }, (error) => {
    console.error("Error in /auth/google route:", error.message);
    res.status(500).json({ message: "Error in Google OAuth login route." });
  });
});

app.all("/auth/google/callback", (req, res) => {
  apiProxy.web(
    req,
    res,
    { target: `${AUTH_SERVICE}/auth/google/callback` },
    (error) => {
      console.error("Error in /auth/google/callback route:", error.message);
      res
        .status(500)
        .json({ message: "Error in Google OAuth callback route." });
    }
  );
});

// Remaining routes (for other services) in the API Gateway
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
    "https://request-managemnet-system.netlify.app";
  proxyRes.headers["Access-Control-Allow-Credentials"] = "true";
});

// Error handling for proxy errors
apiProxy.on("error", (err, req, res) => {
  console.error("Error in API Gateway:", err.message);
  res.status(500).send("Error in API Gateway: " + err.message);
});

// Health check route for API Gateway
app.get("/", (req, res) => {
  res.send("API Gateway is running.");
});

module.exports = app;
