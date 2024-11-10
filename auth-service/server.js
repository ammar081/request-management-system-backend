const express = require("express");
const passport = require("passport");
const session = require("express-session");
const mongoose = require("mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/User");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", userRoutes);

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3005/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists by googleId
        let user = await User.findOne({ googleId: profile.id });

        // Define the list of approver emails
        const approverEmails = ["hafiz.ammar33@gmail.com"];

        // Determine role based on the email address
        const role = approverEmails.includes(profile.emails[0].value)
          ? "Approver"
          : "Requester";

        // If the user does not exist, check by email and create if still not found
        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (!user) {
            // Create a new user if none exists with the email or googleId
            user = new User({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              role: role,
            });
            await user.save();
            console.log("New user created:", user);
          } else {
            // Update existing user's googleId if they logged in with the same email
            user.googleId = profile.id;
            await user.save();
            console.log("Updated user with Google ID:", user);
          }
        } else {
          console.log("User already exists:", user);
        }

        // Pass the user to Passport
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
const axios = require("axios");

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:8080",
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
        }, // Payload data
        process.env.JWT_SECRET, // Secret key from .env
        { expiresIn: "1h" } // Token expiration
      );

      // Notify the Notification Service about the login
      try {
        await axios.post("http://localhost:3001/send-login-notification", {
          email,
          name,
        });
      } catch (notificationError) {
        console.error("Failed to send login notification:", notificationError);
      }
      console.log("Logged in user:", req.user);

      // Send JWT token to frontend in URL
      res.redirect(`http://localhost:8080/?token=${encodeURIComponent(token)}`);
    } catch (error) {
      console.error("Error in Google OAuth callback:", error);
      res.redirect("http://localhost:8080?error=server_error");
    }
  }
);

// Logout Route
app.get("/auth/logout", async (req, res, next) => {
  if (req.user) {
    const email = req.user.email;
    const name = req.user.name;

    // Send logout notification before ending the session
    try {
      await axios.post("http://localhost:3001/send-logout-notification", {
        email,
        name,
      });
      console.log(`Logout notification sent to ${email}`);
    } catch (notificationError) {
      console.error("Failed to send logout notification:", notificationError);
    }
  }

  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy((error) => {
      if (error) {
        console.error("Error destroying session:", error);
      }
      res.json({ message: "Logged out successfully" });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
