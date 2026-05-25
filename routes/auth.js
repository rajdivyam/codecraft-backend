const router = require("express").Router();
const { User } = require("../models/User");
const bcrypt = require("bcrypt");
const Joi = require("joi");

router.post("/", async (req, res) => {
	try {
		const { error } = validate(req.body);
		if (error)
			return res.status(400).send({ message: error.details[0].message });

		const { identifier, password } = req.body;

		// Support login by email OR username
		const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
		const user = isEmail
			? await User.findOne({ email: identifier })
			: await User.findOne({ username: identifier.toLowerCase() });

		if (!user)
			return res.status(401).send({ message: "Invalid credentials. No account found." });

		// OAuth users (no real password) cannot use password login
		if (!user.password || user.password.startsWith("oauth-")) {
			return res.status(401).send({ message: "This account uses social login. Please sign in with Google or GitHub." });
		}

		const validPassword = await bcrypt.compare(password, user.password);
		if (!validPassword)
			return res.status(401).send({ message: "Invalid credentials. Please check and try again." });

		const token = user.generateAuthToken();
		res.status(200).send({ data: token, message: "Logged in successfully" });
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
	}
});

const validate = (data) => {
	const schema = Joi.object({
		identifier: Joi.string().required().label("Email or Username"),
		password: Joi.string().required().label("Password"),
	});
	return schema.validate(data);
};

module.exports = router;