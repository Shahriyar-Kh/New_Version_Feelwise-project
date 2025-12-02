// db.js
const mongoose = require("mongoose");
require("dotenv").config(); // make sure dotenv is loaded here too

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1); // exit process with failure
  }
};

module.exports = connectDB;
