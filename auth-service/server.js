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

// CORS configuration for production frontend
app.use(
  cors({
    origin: "https://request-managemnet-system.netlify.app",
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
      secure: true, // Set to true to ensure cookies are only sent over HTTPS
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
      callbackURL:
        "https://api-gateway-three-roan.vercel.app/auth/google/callback", // Update to API Gateway URL on Vercel
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        // Define the list of approver emails
        const approverEmails = ["hafiz.ammar33@gmail.com"];
        const role = approverEmails.includes(profile.emails[0].value)
          ? "Approver"
          : "Requester";

        // Check by email if googleId doesn't exist, and create or update user
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
        } else {
          console.log("User already exists:", user);
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
app.get("/auth/logout", async (req, res, next) => {
  if (req.user) {
    const email = req.user.email;
    const name = req.user.name;

    // Send logout notification before ending the session
    try {
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
