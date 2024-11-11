const express = require("express");
const mongoose = require("mongoose");
const requestRoutes = require("./routes/requestRoutes");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

// JWT Authentication Middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("Authorization Header:", authHeader); // Log the authorization header

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error("JWT Verification Error:", err);
        return res.sendStatus(403); // Forbidden
      }
      console.log("JWT verified successfully, user:", user); // Log decoded user
      req.user = user;
      next();
    });
  } else {
    console.error("Authorization header missing");
    res.sendStatus(401); // Unauthorized
  }
}

// Use routes with JWT authentication
app.use("/requests", authenticateJWT, requestRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ message: "Server Error" });
});

app.get("/", (req, res) => {
  res.send("Request Service running.");
});

module.exports = app;

// const PORT = process.env.PORT || 3002;
// app.listen(PORT, () => {
//   console.log(`Request Service running on port ${PORT}`);
// });
