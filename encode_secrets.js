
const mongoUri = "mongodb+srv://marathek321_db_user:Krushna.123@smartdine.65c2lrt.mongodb.net/POS?retryWrites=true&w=majority";
const jwtSecret = "mySuperSecretKey";
const fs = require('fs');
fs.writeFileSync('secrets_output.txt', "MONGO_URI_BASE64=" + Buffer.from(mongoUri).toString("base64") + "\n" + "JWT_SECRET_BASE64=" + Buffer.from(jwtSecret).toString("base64"));
