const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Solutions = new Schema({
	email: {
		type: String,
		required: true,
	},
	confirmEmail: {
		type: String,
		required: true,
	},
	solution: {
		type: String,
		required: true,
	},
	quesId: {
		type: String,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("Solutions", Solutions);
