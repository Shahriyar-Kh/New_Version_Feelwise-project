// routes/progress.js - FIXED VERSION
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const mongoose = require("mongoose");

// MongoDB Schemas for Progress Tracking

// Schema to track individual challenge completions
const ChallengeCompletionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mood: { type: String, required: true },
  challenge: { type: String, default: "default" },
  completedAt: { type: Date, default: Date.now },
});

// Schema for backward compatibility (saved challenges)
const ChallengeProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mood: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  saved: { type: Boolean, default: false },
  savedAt: { type: Date },
});

// Schema for assessments/quizzes
const AssessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mood: { type: String, required: true },
  takenAt: { type: Date, default: Date.now },
  type: { type: String, default: "assessment" }, // 'assessment' or 'quiz'
});

// Create models with error handling
let ChallengeCompletion, ChallengeProgress, Assessment;

try {
  ChallengeCompletion = mongoose.model("ChallengeCompletion");
} catch {
  ChallengeCompletion = mongoose.model("ChallengeCompletion", ChallengeCompletionSchema);
}

try {
  ChallengeProgress = mongoose.model("ChallengeProgress");
} catch {
  ChallengeProgress = mongoose.model("ChallengeProgress", ChallengeProgressSchema);
}

try {
  Assessment = mongoose.model("Assessment");
} catch {
  Assessment = mongoose.model("Assessment", AssessmentSchema);
}

console.log("Progress routes loaded. Models created successfully.");

// Test route - no auth required
router.get("/test", (req, res) => {
  console.log("Test route hit - progress routes are working");
  res.json({ message: "Progress routes are working!", timestamp: new Date() });
});

// Debug route - test auth middleware
router.get("/debug-user", auth, (req, res) => {
  console.log("Debug route - auth working. userId:", req.userId);
  res.json({
    userId: req.userId,
    userIdType: typeof req.userId,
    message: "Auth is working!",
    timestamp: new Date(),
  });
});

// POST /api/progress/complete-challenge - Record each challenge completion
router.post("/complete-challenge", auth, async (req, res) => {
  try {
    const { mood, challenge } = req.body;
    console.log("=== CHALLENGE COMPLETION DEBUG ===");
    console.log("Request body:", req.body);
    console.log("User ID from auth:", req.userId);
    console.log("User ID type:", typeof req.userId);
    console.log("Mood:", mood, "Challenge:", challenge);

    if (!mood) {
      console.log("ERROR: Mood is required");
      return res.status(400).json({ error: "Mood is required" });
    }

    // Convert userId to ObjectId if it's a string
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
      console.log("Converted userId to ObjectId:", userObjectId);
    } catch (error) {
      console.log("ERROR: Invalid userId format:", req.userId);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Create a new completion record (allows multiple completions)
    const completionData = {
      userId: userObjectId,
      mood: mood.toLowerCase(),
      challenge: challenge || "default",
    };

    console.log("Creating completion with data:", completionData);

    const completion = new ChallengeCompletion(completionData);
    console.log("Completion object created:", completion);

    const savedCompletion = await completion.save();
    console.log("✅ New completion saved successfully:", savedCompletion);

    // Also update or create the progress record for backward compatibility
    console.log("Updating progress record...");
    const progress = await ChallengeProgress.findOneAndUpdate(
      { userId: userObjectId, mood: mood.toLowerCase() },
      {
        completed: true,
        completedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    console.log("✅ Progress record updated:", progress);

    console.log("=== CHALLENGE COMPLETION SUCCESS ===");
    res.json({
      success: true,
      completion: savedCompletion,
      progress: progress,
      message: "Challenge completion recorded successfully",
    });
  } catch (error) {
    console.log("=== CHALLENGE COMPLETION ERROR ===");
    console.error("Error recording challenge completion:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    res.status(500).json({
      error: "Failed to record challenge completion",
      details: error.message,
      errorType: error.name,
    });
  }
});

// DELETE /api/progress/clear-challenges - FIXED: Moved outside and using router
router.delete('/clear-challenges', auth, async (req, res) => {
  try {
    console.log("Clearing challenge completions for user:", req.userId);
    
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Clear user's challenge completions from database
    const result = await ChallengeCompletion.deleteMany({ userId: userObjectId });
    console.log(`Deleted ${result.deletedCount} challenge completions`);
    
    res.json({ 
      message: 'Challenge completions cleared successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error("Error clearing challenge completions:", error);
    res.status(500).json({ error: 'Failed to clear challenge completions' });
  }
});

// DELETE /api/progress/clear-assessments - FIXED: Moved outside and using router
router.delete('/clear-assessments', auth, async (req, res) => {
  try {
    console.log("Clearing assessments for user:", req.userId);
    
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Clear user's assessments from database
    const result = await Assessment.deleteMany({ userId: userObjectId });
    console.log(`Deleted ${result.deletedCount} assessments`);
    
    res.json({ 
      message: 'Assessments cleared successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error("Error clearing assessments:", error);
    res.status(500).json({ error: 'Failed to clear assessments' });
  }
});

// GET /api/progress/all-challenge-completions - Get all individual completions
router.get("/all-challenge-completions", auth, async (req, res) => {
  try {
    console.log("=== FETCHING ALL COMPLETIONS DEBUG ===");
    console.log("User ID:", req.userId);

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
      console.log("Converted userId to ObjectId:", userObjectId);
    } catch (error) {
      console.log("ERROR: Invalid userId format:", req.userId);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const completions = await ChallengeCompletion.find({
      userId: userObjectId,
    }).sort({ completedAt: -1 });

    console.log(`✅ Found ${completions.length} completions for user:`, req.userId);
    if (completions.length > 0) {
      console.log("Sample completions:", completions.slice(0, 3));
    }

    res.json(completions);
  } catch (error) {
    console.log("=== FETCH COMPLETIONS ERROR ===");
    console.error("Error fetching all completions:", error);
    console.error("Error details:", error.stack);
    res.status(500).json({
      error: "Failed to fetch challenge completions",
      details: error.message,
    });
  }
});

// GET /api/progress/challenges - Get user's challenge progress (summary)
router.get("/challenges", auth, async (req, res) => {
  try {
    console.log("=== FETCHING CHALLENGE SUMMARY DEBUG ===");
    console.log("User ID:", req.userId);

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Get completion counts for each mood
    const completionCounts = await ChallengeCompletion.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: "$mood",
          count: { $sum: 1 },
          lastCompleted: { $max: "$completedAt" },
        },
      },
    ]);

    console.log("Aggregation result:", completionCounts);

    // Format the response to match the expected structure
    const challenges = completionCounts.map((item) => ({
      mood: item._id,
      completed: item.count > 0,
      completedAt: item.lastCompleted,
      completionCount: item.count,
    }));

    console.log("✅ Formatted challenges summary:", challenges);
    res.json(challenges);
  } catch (error) {
    console.log("=== FETCH CHALLENGES ERROR ===");
    console.error("Error fetching challenges:", error);
    res.status(500).json({ error: "Failed to fetch challenge progress" });
  }
});

// GET /api/progress/saved-challenges - Get user's saved challenges
router.get("/saved-challenges", auth, async (req, res) => {
  try {
    console.log("Fetching saved challenges for user:", req.userId);

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const savedChallenges = await ChallengeProgress.find({
      userId: userObjectId,
      saved: true,
    }).sort({ savedAt: -1 });

    console.log("Found saved challenges:", savedChallenges);
    res.json(savedChallenges);
  } catch (error) {
    console.error("Error fetching saved challenges:", error);
    res.status(500).json({ error: "Failed to fetch saved challenges" });
  }
});

// GET /api/progress/assessments - Get user's assessment history
router.get("/assessments", auth, async (req, res) => {
  try {
    console.log("Fetching assessments for user:", req.userId);

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const assessments = await Assessment.find({ userId: userObjectId }).sort({
      takenAt: -1,
    });

    console.log("Found assessments:", assessments);
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
});

// POST /api/progress/save-challenge - Save a completed challenge
router.post("/save-challenge", auth, async (req, res) => {
  try {
    const { mood } = req.body;
    console.log("Saving challenge for user:", req.userId, "mood:", mood);

    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const challenge = await ChallengeProgress.findOneAndUpdate(
      {
        userId: userObjectId,
        mood: mood.toLowerCase(),
        completed: true,
      },
      {
        saved: true,
        savedAt: new Date(),
      },
      { new: true }
    );

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found or not completed" });
    }

    console.log("Challenge saved successfully:", challenge);
    res.json(challenge);
  } catch (error) {
    console.error("Error saving challenge:", error);
    res.status(500).json({ error: "Failed to save challenge" });
  }
});

// POST /api/progress/assessment - Add new assessment/quiz
router.post("/assessment", auth, async (req, res) => {
  try {
    const { mood, type } = req.body;
    console.log("Saving assessment for user:", req.userId, "mood:", mood, "type:", type);

    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const assessment = new Assessment({
      userId: userObjectId,
      mood: mood.toLowerCase(),
      type: type || "assessment",
    });

    await assessment.save();
    console.log("Assessment saved successfully:", assessment);
    res.json(assessment);
  } catch (error) {
    console.error("Error saving assessment:", error);
    res.status(500).json({ error: "Failed to save assessment" });
  }
});

// DELETE /api/progress/clear-all - Clear all user progress
router.delete("/clear-all", auth, async (req, res) => {
  try {
    console.log("Clearing all progress for user:", req.userId);

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const [completionsResult, progressResult, assessmentsResult] = await Promise.all([
      ChallengeCompletion.deleteMany({ userId: userObjectId }),
      ChallengeProgress.deleteMany({ userId: userObjectId }),
      Assessment.deleteMany({ userId: userObjectId })
    ]);

    console.log("All progress cleared successfully for user:", req.userId);
    console.log(`Deleted: ${completionsResult.deletedCount} completions, ${progressResult.deletedCount} progress records, ${assessmentsResult.deletedCount} assessments`);
    
    res.json({ 
      message: "All progress cleared successfully",
      deletedCounts: {
        completions: completionsResult.deletedCount,
        progress: progressResult.deletedCount,
        assessments: assessmentsResult.deletedCount
      }
    });
  } catch (error) {
    console.error("Error clearing progress:", error);
    res.status(500).json({ error: "Failed to clear progress" });
  }
});

// GET /api/progress/stats - Get user statistics
router.get("/stats", auth, async (req, res) => {
  try {
    console.log("Fetching stats for user:", req.userId);

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const [totalCompletions, uniqueMoods, weeklyCompletions, totalAssessments] = await Promise.all([
      ChallengeCompletion.countDocuments({ userId: userObjectId }),
      ChallengeCompletion.distinct("mood", { userId: userObjectId }),
      ChallengeCompletion.countDocuments({
        userId: userObjectId,
        completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      Assessment.countDocuments({ userId: userObjectId }),
    ]);

    const stats = {
      totalCompletions,
      uniqueMoods: uniqueMoods.length,
      weeklyCompletions,
      totalAssessments,
    };

    console.log("Stats for user:", req.userId, stats);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

module.exports = router;