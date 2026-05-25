const router = require("express").Router();
const passport = require("../config/passport");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ── Helpers ──────────────────────────────────────────────────────────────────
const sendTokenRedirect = (res, user) => {
  const token = user.generateAuthToken();
  // Redirect to frontend with token in query param — frontend stores it
  res.redirect(`${CLIENT_URL}/oauth/callback?token=${token}`);
};

// ── Google ─────────────────────────────────────────────────────────────────
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/signin?error=google_failed`, session: false }),
  (req, res) => sendTokenRedirect(res, req.user)
);

// ── GitHub ─────────────────────────────────────────────────────────────────
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));

router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: `${CLIENT_URL}/signin?error=github_failed`, session: false }),
  (req, res) => sendTokenRedirect(res, req.user)
);

module.exports = router;
