const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

async function databaseConnect() {
	const databaseURL = process.env.DATABASE_URL;

	try {
		await mongoose.connect(databaseURL);
		console.log("MongoDB connection successful");
	} catch (error) {
		console.error("MongoDB connection error:", error.message);
		process.exit(1);
	}
}

async function databaseClose() {
	await mongoose.connection.close();
	console.log("MongoDB disconnected");
}

async function databaseClear() {
	await mongoose.connection.db.dropDatabase();
	console.log("🧹 MongoDB database cleared");
}

module.exports = {
	databaseConnect,
	databaseClose,
	databaseClear
}
