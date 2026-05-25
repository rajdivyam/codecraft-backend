const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, req.user._id + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Middleware to parse and verify the JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) return res.status(401).send({ message: "Access Denied. No token provided." });

  // Handle both "Bearer <token>" and just "<token>"
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY || process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).send({ message: "Invalid token." });
  }
};

// POST upload profile picture
router.post("/upload", authMiddleware, upload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded" });
    }
    
    // Create the URL for the uploaded file
    const fileUrl = `http://localhost:8080/uploads/${req.file.filename}`;
    
    // Update the user's profilePic field
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profilePic: fileUrl } },
      { new: true }
    ).select("-password");
    
    res.status(200).send({ 
       data: updatedUser,
       message: "Profile picture uploaded successfully",
       fileUrl
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// GET current user's profile
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Exclude password from the returned document
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    
    // Send back the user profile, including names and new profile fields
    res.status(200).send({ data: user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// PUT update current user's profile
router.put("/", authMiddleware, async (req, res) => {
  try {
    const { 
      firstName, lastName, bio, location, university, profilePic,
      mobileNumber, countryCode, educationYear, username,
      socialLinks, codingProfile,
      workExperience, skills, contests, milestones
    } = req.body;
    
    // Always initialize objects/arrays to avoid null reference updates
    const updateData = {
      bio: bio !== undefined ? bio : "",
      location: location !== undefined ? location : "",
      university: university !== undefined ? university : "",
      mobileNumber: mobileNumber !== undefined ? mobileNumber : "",
      countryCode: countryCode !== undefined ? countryCode : "+91",
      educationYear: educationYear !== undefined ? educationYear : "",
      
      socialLinks: socialLinks || {
        github: "", linkedin: "", twitter: "", resume: "", others: ""
      },
      
      codingProfile: codingProfile || {
        leetcode: "", hackerrank: "", codeforces: "", geeksforgeeks: "", others: ""
      },

      workExperience: Array.isArray(workExperience) ? workExperience : [],
      skills: Array.isArray(skills) ? skills : [],
      contests: Array.isArray(contests) ? contests : [],
      milestones: Array.isArray(milestones) ? milestones : []
    };
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    if (username !== undefined) updateData.username = username.toLowerCase().trim();
    
    // Find user and update
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true } // Return the updated document
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found" });
    }

    res.status(200).send({ 
      data: updatedUser, 
      message: "Profile updated successfully" 
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// GET check username availability
router.get("/check-username/:username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const clean = username.toLowerCase().trim();
    const existing = await User.findOne({ username: clean, _id: { $ne: req.user._id } });
    res.status(200).send({ available: !existing });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error" });
  }
});

module.exports = router;

