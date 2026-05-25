require('dotenv').config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const passport = require("./config/passport");
const connection = require("./config/db");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const eventRoutes = require("./routes/events");
const executeRoutes = require("./routes/execute");
const profileRoutes = require("./routes/profile");
const oauthRoutes = require("./routes/oauth");
const otpRoutes = require("./routes/otp");
const passwordRoutes = require("./routes/password");

connection();

// CORS - allow all origins (safe for API with JWT auth)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("CodeCraft API is running...");
});

// Health check for Render
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session (required for passport)
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWTPRIVATEKEY,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/password", passwordRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}...`));
