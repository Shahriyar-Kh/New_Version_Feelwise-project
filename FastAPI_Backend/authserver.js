require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const progressRoutes = require("./routes/progress"); // ADD THIS LINE
// Serve static files from Frontend directory
app.use(express.static(path.join(__dirname, '../Frontend')));

const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Middleware
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Add more specific CORS settings
app.use(
  cors({
    origin: true, // Allow all origins for testing
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes); // ADD THIS LINE

// Default route
app.get("/", (req, res) => res.send("✅ Auth server running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
