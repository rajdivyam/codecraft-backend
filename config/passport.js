const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const { User } = require("../models/User");

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ── Google Strategy ──────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/oauth/google/callback",
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails[0] ? profile.emails[0].value : "";
          let user = await User.findOne({ email });

          if (!user) {
            // Create a new user without a password (OAuth users don't need one)
            const nameParts = (profile.displayName || "").split(" ");
            user = new User({
              firstName: nameParts[0] || profile.name?.givenName || "User",
              lastName: nameParts.slice(1).join(" ") || profile.name?.familyName || "",
              email,
              password: "oauth-google-" + profile.id, // placeholder — won't be used for login
              profilePic: profile.photos?.[0]?.value || "",
              oauthProvider: "google",
              oauthId: profile.id,
            });
            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("[PASSPORT] Google Client ID or Secret is missing. Google OAuth disabled.");
}

// ── GitHub Strategy ──────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/api/oauth/github/callback",
        scope: ["user:email"],
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.local`;
          let user = await User.findOne({ email });

          if (!user) {
            const nameParts = (profile.displayName || profile.username || "").split(" ");
            user = new User({
              firstName: nameParts[0] || "User",
              lastName: nameParts.slice(1).join(" ") || "",
              email,
              password: "oauth-github-" + profile.id, // placeholder
              profilePic: profile.photos?.[0]?.value || "",
              username: profile.username || "",
              socialLinks: { github: profile.profileUrl || "" },
              oauthProvider: "github",
              oauthId: profile.id,
            });
            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("[PASSPORT] GitHub Client ID or Secret is missing. GitHub OAuth disabled.");
}

module.exports = passport;
