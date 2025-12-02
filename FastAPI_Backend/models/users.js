
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    image:    { type: String, default: "" }, // served from /uploads/...
    mood:     { type: String, default: "Neutral" },

    // if you want to mirror your old progress/badges structure, keep these:
    progress: {
      selfAwareness: { type: Number, default: 0 },
      selfRegulation: { type: Number, default: 0 },
      empathy: { type: Number, default: 0 },
      socialSkills: { type: Number, default: 0 },
      motivation: { type: Number, default: 0 }
    },
    badges: { type: [String], default: [] },
    moodHistory: { type: Array, default: [] },
    completedChallenges: { type: Array, default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("users", userSchema);
