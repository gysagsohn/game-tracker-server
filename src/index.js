const dotenv = require("dotenv");
dotenv.config();

const validateEnv = require("./config/validateEnv"); 
validateEnv(); 

const { app } = require("./server.js");
const { databaseConnect } = require("./config/database.js");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
	databaseConnect();
});