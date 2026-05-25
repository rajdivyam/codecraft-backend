const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");

const userSchema = new mongoose.Schema({
	firstName: { 
		type: String, 
		required: true 
	},
	lastName: { 
		type: String, 
		required: true 
	},
	email: { 
		type: String, 
		required: true 
	},
	username: {
		type: String,
		default: "",
		lowercase: true,
		trim: true
	},
	password: { 
		type: String, 
		default: ""
	},
	oauthProvider: {
		type: String,
		default: ""
	},
	oauthId: {
		type: String,
		default: ""
	},
	bio: {
		type: String,
		default: ""
	},
	profilePic: {
		type: String,
		default: ""
	},
	location: {
		type: String,
		default: ""
	},
	university: {
		type: String,
		default: ""
	},
	socialLinks: {
		github: { type: String, default: "" },
		linkedin: { type: String, default: "" },
		twitter: { type: String, default: "" }, // X
		resume: { type: String, default: "" },
		others: { type: String, default: "" }
	},
	codingProfile: {
		leetcode: { type: String, default: "" },
		hackerrank: { type: String, default: "" },
		codeforces: { type: String, default: "" },
		geeksforgeeks: { type: String, default: "" },
		others: { type: String, default: "" }
	},
	mobileNumber: {
		type: String,
		default: ""
	},
	countryCode: {
		type: String,
		default: "+91"
	},
	educationYear: {
		type: String,
		default: ""
	},
	workExperience: [{
		company: { type: String, default: "" },
		mode: { type: String, default: "" },
		role: { type: String, default: "" },
		duration: { type: String, default: "" },
		description: { type: String, default: "" }
	}],
	skills: [{
		type: String
	}],
	contests: [{
		rank: { type: String, default: "" },
		totalParticipants: { type: String, default: "" },
		platform: { type: String, default: "" },
		url: { type: String, default: "" }
	}],
	milestones: [{
		title: { type: String, default: "" },
		description: { type: String, default: "" },
		date: { type: String, default: "" },
		type: { type: String, default: "other", enum: ["award", "certification", "project", "other"] }
	}],
	resetPasswordToken: { type: String, default: "" },
	resetPasswordExpires: { type: Date }
});

userSchema.methods.generateAuthToken = function () {
	const token = jwt.sign({ _id: this._id }, process.env.JWTPRIVATEKEY, {
		expiresIn: "7d",
	});
	return token;
};

const User = mongoose.model("user", userSchema);

const validate = (data) => {
	const schema = Joi.object({
		firstName: Joi.string().required().label("First Name"),
		lastName: Joi.string().required().label("Last Name"),
		email: Joi.string().email().required().label("Email"),
		password: passwordComplexity().required().label("Password"),
	});
	return schema.validate(data);
};

module.exports = { User, validate };