const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/User");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const axios = require("axios");

const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

// CORS configuration for frontend
app.use(
  cors({
    origin: "https://request-managemnet-system.netlify.app",
    credentials: true,
  })
);

app.use(express.json());
app.use(passport.initialize());
app.use("/auth", userRoutes);

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        "https://api-gateway-three-roan.vercel.app/auth/google/callback", // API Gateway URL on Vercel
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        // Define the list of approver emails
        const approverEmails = ["hafiz.ammar33@gmail.com"];
        const role = approverEmails.includes(profile.emails[0].value)
          ? "Approver"
          : "Requester";

        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (!user) {
            user = new User({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              role: role,
            });
            await user.save();
            console.log("New user created:", user);
          } else {
            user.googleId = profile.id;
            await user.save();
            console.log("Updated user with Google ID:", user);
          }
        }
        done(null, user);
      } catch (error) {
        console.error("Error in Google OAuth strategy:", error);
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Login Route
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth Callback Route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://request-managemnet-system.netlify.app",
  }),
  async (req, res) => {
    try {
      const email = req.user.email;
      const name = req.user.name;

      // Generate JWT token
      const token = jwt.sign(
        {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Notify the Notification Service about the login
      try {
        await axios.post(
          "https://notification-service-cyan.vercel.app/send-login-notification",
          {
            email,
            name,
          }
        );
      } catch (notificationError) {
        console.error("Failed to send login notification:", notificationError);
      }
      console.log("Logged in user:", req.user);

      // Send JWT token to frontend in URL
      res.redirect(
        `https://request-managemnet-system.netlify.app/?token=${encodeURIComponent(
          token
        )}`
      );
    } catch (error) {
      console.error("Error in Google OAuth callback:", error);
      res.redirect(
        "https://request-managemnet-system.netlify.app?error=server_error"
      );
    }
  }
);

// Logout Route
app.get("/auth/logout", async (req, res) => {
  try {
    const { email, name } = req.user;

    await axios.post(
      "https://notification-service-cyan.vercel.app/send-logout-notification",
      {
        email,
        name,
      }
    );
    console.log(`Logout notification sent to ${email}`);
  } catch (notificationError) {
    console.error("Failed to send logout notification:", notificationError);
  }

  res.json({ message: "Logged out successfully" });
});

app.get("/", (req, res) => {
  res.send("Auth Service running.");
});

module.exports = app;
