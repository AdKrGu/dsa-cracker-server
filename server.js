if (process.env.NODE_ENV !== "production") require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const Users = require("./Models/Users");
const Solutions = require("./Models/Solutions");
const PORT = process.env.PORT;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(morgan("tiny"));

const verifyToken = async (req, res, next) => {
	const { authorization } = req.headers;
	if (!authorization)
		return res.status(401).json({ error: "You Must be Logged In to Continue" });
	const token = authorization.replace("Bearer ", "");
	jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
		if (err)
			return res
				.status(401)
				.json({ error: "You Must be Logged In to Continue" });
		const id = payload;
		const fetchedUser = await Users.findById(id);
		try {
			req.user = fetchedUser;
			next();
		} catch (err) {
			res.status(400).json({ error: "Unable to Verify User." });
		}
	});
};

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
});

app.post("/upload", verifyToken, async (req, res) => {
	if (!req.body.confirmEmail || !req.body.solution || !req.body.quesId)
		return { error: "Please fill all the fields!" };

	const email = req.user.email;
	const { confirmEmail, solution, quesId } = req.body;

	const newSolution = new Solutions({ email, confirmEmail, solution, quesId });
	const submitSolution = await newSolution.save();
	try {
		if (submitSolution)
			return res.status(200).json({
				message:
					"Thanks for submitting solution! We will review your solution and get back to you via mail!",
			});
		else
			return res
				.status(400)
				.json({ message: "Error Submitting Solution. Please try again!" });
	} catch (err) {
		return res
			.status(400)
			.json({ message: "Error Submitting Solution! Please try again!" });
	}
});

app.post("/register", async (req, res) => {
	let { email, password } = req.body;
	if (!email || !password)
		return res.status(400).json({ error: "Please Fill All the Details!" });
	if (password.length < 6)
		return res
			.status(400)
			.json({ error: "Password must be 6 Characters long!" });

	password = await bcrypt.hash(password, 10);
	try {
		const mailformat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
		if (email.match(mailformat)) {
			const checkUser = await Users.findOne({ email });
			if (checkUser)
				return res.status(400).json({ error: "User Already Exists" });
			const saveUser = new Users({ email, password });
			const savedUser = await saveUser.save();
			try {
				if (savedUser.id) {
					const token = jwt.sign(saveUser.id, process.env.JWT_SECRET);
					res.status(200).json({ token });
				} else {
					res.status(400).json({ error: "Error Creating User. Try Again!" });
				}
			} catch (err) {
				res.status(400).json({ error: "Error Creating User. Try Again!" });
			}
		} else {
			res.status(400).json({ error: "Please fill a valid Email!" });
		}
	} catch (err) {
		res.status(400).json({ error: "Error Creating User. Try Again!" });
	}
});

app.post("/login", async (req, res) => {
	let { email, password } = req.body;
	if (!email || !password)
		return res.status(400).json({ error: "Please Fill All the Details!" });
	if (password.length < 6)
		return res
			.status(400)
			.json({ error: "Password must be 6 Characters long!" });

	const user = await Users.findOne({ email });
	try {
		if (!user)
			return res.status(400).json({ error: "Wrong Email or Password!" });

		isPasswordTrue = await bcrypt.compare(password, user.password);
		try {
			if (isPasswordTrue) {
				const token = jwt.sign(user.id, process.env.JWT_SECRET);
				return res.status(200).json({ token });
			} else return res.status(400).json({ error: "Wrong Email or Password!" });
		} catch (err) {
			res.status(400).json({ error: "Error Logging In! Please try Again!" });
		}
	} catch (err) {
		res.status(400).json({ error: "Error Logging In! Please try Again!" });
	}
});

app.get("/profile", verifyToken, async (req, res) => {
	if (verifyToken)
		return res.status(200).json({ checked: req.user.checked, message: "true" });
	else return res.status(400).json({ error: "false" });
});

app.patch("/check", verifyToken, async (req, res) => {
	const checkedQues = req.body.checkedQues;
	Users.findByIdAndUpdate(
		req.user.id,
		{
			$push: { checked: checkedQues },
		},
		{
			new: true,
		}
	).exec((err, result) => {
		if (err) return res.status(400).json({ error: "Error while checking!" });
		else
			return res.status(200).json({
				message: "Question Marked Completed!",
				result: result.checked,
			});
	});
});

app.patch("/uncheck", verifyToken, async (req, res) => {
	const checkedQues = req.body.checkedQues;
	Users.findByIdAndUpdate(
		req.user.id,
		{
			$pull: { checked: checkedQues },
		},
		{
			new: true,
		}
	).exec((err, result) => {
		if (err) return res.status(400).json({ error: "Error while unchecking!" });
		else
			return res
				.status(200)
				.json({ message: "Question Unmarked!", result: result.checked });
	});
});

app.patch("/unsubscribe", async (req, res) => {
	const { email, password } = req.body;

	const user = await Users.findOne({ email });
	try {
		if (!user)
			return res.status(400).json({ message: "Wrong Email or Password!" });

		isPasswordTrue = await bcrypt.compare(password, user.password);
		try {
			if (isPasswordTrue) {
				Users.findByIdAndUpdate(req.body.id, {
					$set: { subscribed: false },
				}).exec((err, result) => {
					if (err)
						return res
							.status(400)
							.json({ message: "Error while checking user!" });
					else
						return res.status(200).json({
							message: "We are depressed to see you go :(",
						});
				});
			} else
				return res.status(400).json({ message: "Wrong Email or Password!" });
		} catch (err) {
			res.status(400).json({ message: "Error while checking user!" });
		}
	} catch (err) {
		res.status(400).json({ message: "Error while checking user!" });
	}
});

app.listen(PORT);
