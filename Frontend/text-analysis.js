document.addEventListener("DOMContentLoaded", function () {
  const analyzeBtn = document.getElementById("analyzeBtn");
  const userInput = document.getElementById("userInput");
  const emotionResult = document.getElementById("emotionResult");
  const recommendationsContent = document.getElementById(
    "recommendationsContent"
  );
  const dailyChallengeContent = document.getElementById(
    "dailyChallengeContent"
  );
  const dailyTipContent = document.getElementById("dailyTipContent");
  const timeFilters = document.querySelectorAll(".time-filter");
  let progressChart;

  // Backend API configuration
  const API_BASE = "http://localhost:5000/api";
  const token = localStorage.getItem("token");
  let currentUserId = null;

  initProgressChart();
  loadDailyTip();
  initializeUserContext();

  analyzeBtn.addEventListener("click", function () {
    const text = userInput.value.trim();
    if (text === "") {
      alert("Please enter some text to analyze");
      return;
    }
    analyzeText(text);
  });

  timeFilters.forEach((filter) => {
    filter.addEventListener("click", function () {
      timeFilters.forEach((f) => f.classList.remove("active"));
      this.classList.add("active");
      updateProgressChart(this.dataset.period);
    });
  });

  // Initialize user context for backend integration
  async function initializeUserContext() {
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          currentUserId = user.id || user._id;
          console.log("Current user ID:", currentUserId);
          loadUserAnalysisHistory();
        }
      } catch (error) {
        console.error("Error getting user context:", error);
        currentUserId = "guest";
      }
    } else {
      currentUserId = "guest";
    }
  }

  // Get user-specific localStorage key
  function getUserSpecificKey(baseKey) {
    return currentUserId ? `${baseKey}_${currentUserId}` : `${baseKey}_guest`;
  }

  async function analyzeText(text) {
    emotionResult.innerHTML = "<p>Analyzing your text...</p>";
    try {
      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json();
      if (data && data.emotion_distribution) {
        const formattedResults = formatAnalysisResults(data);
        displayAnalysisResults(formattedResults);
        updateRecommendations(data.emotion_distribution);
        updateDailyChallenge(data.emotion_distribution);

        // Save to both local storage and backend
        await saveAnalysisToHistory(formattedResults);
        await saveAnalysisToBackend(formattedResults);

        updateProgressChart("daily");

        // Show assessment report option
        showAssessmentReportOption();
      } else {
        throw new Error("Invalid data structure from server");
      }
    } catch (error) {
      console.error("Error:", error);
      emotionResult.innerHTML =
        '<p class="error">Failed to analyze text. Please try again.</p>';
    }
  }

  function formatAnalysisResults(data) {
    const emotions = data.emotion_distribution;
    const dominantEmotion = data.emotion;
    const positiveEmotions = ["joy", "love", "surprise"];
    const negativeEmotions = ["sadness", "anger", "fear"];

    let positivePercent = 0;
    let negativePercent = 0;
    let neutralPercent = 0;

    for (const [emotion, percent] of Object.entries(emotions)) {
      if (positiveEmotions.includes(emotion)) {
        positivePercent += percent;
      } else if (negativeEmotions.includes(emotion)) {
        negativePercent += percent;
      }
    }

    const total = positivePercent + negativePercent;
    neutralPercent = Math.max(0, 100 - total);

    return {
      text: userInput.value.trim(),
      emotions: {
        positive: positivePercent,
        negative: negativePercent,
        neutral: neutralPercent,
      },
      dominantEmotion: dominantEmotion,
      emotionDetails: emotions,
      timestamp: new Date().toISOString(),
      userId: currentUserId,
    };
  }

  function displayAnalysisResults(results) {
    let html = `<h3>Dominant Emotion: <span class="emotion-tag ${getEmotionClass(
      results.dominantEmotion
    )}">${results.dominantEmotion}</span></h3>`;
    html += '<div class="emotion-breakdown">';
    html += `<p>Positive: ${results.emotions.positive.toFixed(1)}%</p>`;
    html += `<p>Negative: ${results.emotions.negative.toFixed(1)}%</p>`;
    html += `<p>Neutral: ${results.emotions.neutral.toFixed(1)}%</p>`;
    html += "</div>";

    html += '<h4>Detailed Emotion Distribution:</h4><div class="emotion-tags">';
    for (const [emotion, percent] of Object.entries(results.emotionDetails)) {
      html += `<span class="emotion-tag ${getEmotionClass(
        emotion
      )}">${emotion} (${percent.toFixed(1)}%)</span>`;
    }
    html += "</div>";
    emotionResult.innerHTML = html;
  }

  function getEmotionClass(emotion) {
    const positiveEmotions = ["joy", "love", "surprise"];
    const negativeEmotions = ["sadness", "anger", "fear"];
    if (positiveEmotions.includes(emotion)) return "positive";
    if (negativeEmotions.includes(emotion)) return "negative";
    return "neutral";
  }

  // Helper function to get quiz page URL for recommendations
  function getQuizPageUrl(emotion) {
    const quizPages = {
      joy: "happyQuiz.html",
      love: "happyQuiz.html", // Use happy quiz or create loveQuiz.html
      surprise: "happyQuiz.html", // Use happy quiz or create surpriseQuiz.html
      sadness: "sadQuiz.html",
      anger: "angryQuiz.html", // You may need to create this page
      fear: "anxiousQuiz.html", // You may need to create this page
    };
    return quizPages[emotion] || "happyQuiz.html"; // Default to happyQuiz.html
  }

  // Helper function to get challenge page URL for daily challenges
  function getChallengePageUrl(emotion) {
    const challengePages = {
      joy: "happy.html",
      love: "happy.html", // Use happy page or create love.html
      surprise: "happy.html", // Use happy page or create surprise.html
      sadness: "sad.html",
      anger: "angry.html", // You may need to create this page
      fear: "anxious.html", // You may need to create this page
    };
    return challengePages[emotion] || "happy.html"; // Default to happy.html
  }

  // Helper function to get mood display name
  function getMoodDisplayName(emotion) {
    const moodNames = {
      joy: "Happy",
      love: "Happy", // Or "Love" if you have a specific love quiz/page
      surprise: "Happy", // Or "Surprise" if you have a specific surprise quiz/page
      sadness: "Sad",
      anger: "Angry",
      fear: "Anxious",
    };
    return moodNames[emotion] || "Happy";
  }

  function updateRecommendations(emotionDistribution) {
    let recommendations = [];
    const dominantEmotion = Object.entries(emotionDistribution).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    const moodDisplayName = getMoodDisplayName(dominantEmotion);
    const quizPageUrl = getQuizPageUrl(dominantEmotion);

    const recMap = {
      joy: [
        "Your joy is contagious! Consider sharing your happiness with others today.",
        "Capture this positive moment by journaling about what's making you happy.",
        "Use this positive energy to try something new or creative.",
        `Perform the daily ${moodDisplayName.toLowerCase()} quiz to boost your mood further.`
      ],
      love: [
        "Nurture your loving feelings - reach out to someone you care about.",
        "Practice self-love with a small act of kindness for yourself.",
        "Consider volunteering or helping others to spread your loving energy.",
        `Take the ${moodDisplayName.toLowerCase()} quiz to explore your positive emotions.`
      ],
      surprise: [
        "Embrace the unexpected! Try going with the flow today.",
        "Channel your surprise into curiosity - learn something new.",
        "Reflect on what surprised you and how it made you feel.",
        `Explore the ${moodDisplayName.toLowerCase()} quiz for more positive insights.`
      ],
      sadness: [
        "Be gentle with yourself. It's okay to feel sad sometimes.",
        "Consider talking to a trusted friend about how you're feeling.",
        "Engage in comforting activities like listening to soothing music or taking a warm bath.",
        `Take the ${moodDisplayName.toLowerCase()} quiz to help process your emotions.`
      ],
      anger: [
        "Try physical activity to release angry energy in a healthy way.",
        "Practice deep breathing (4-7-8 technique) to calm your nervous system.",
        "Identify the source of your anger and consider constructive ways to address it.",
        `Complete the ${moodDisplayName.toLowerCase()} quiz to help manage your emotions better.`
      ],
      fear: [
        "Ground yourself with the 5-4-3-2-1 technique: name 5 things you can see, 4 you can touch, etc.",
        "Write down your fears to help process them more objectively.",
        "Practice progressive muscle relaxation to reduce physical tension.",
        `Take the ${moodDisplayName.toLowerCase()} quiz to build confidence and reduce fear.`
      ],
    };

    recommendations.push(...(recMap[dominantEmotion] || []));

    const positiveTotal =
      (emotionDistribution.joy || 0) +
      (emotionDistribution.love || 0) +
      (emotionDistribution.surprise || 0);
    const negativeTotal =
      (emotionDistribution.sadness || 0) +
      (emotionDistribution.anger || 0) +
      (emotionDistribution.fear || 0);

    if (negativeTotal > 50) {
      recommendations.push(
        "Limit exposure to negative news or stressful media today.",
        "Prioritize self-care and don't hesitate to seek support if needed."
      );
    } else if (positiveTotal > 60) {
      recommendations.push(
        "Your positive outlook is a strength - consider how you might sustain it.",
        "Positive emotions broaden our thinking - take advantage by tackling creative projects."
      );
    }

    let html = "<ul>";
    recommendations.forEach((rec) => (html += `<li>${rec}</li>`));
    html += "</ul>";

    // Add the mood-specific quiz button for recommendations
    html += `
      <div style="margin-top: 15px; text-align: center;">
        <button 
          onclick="navigateToQuizPage('${dominantEmotion}')" 
          style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          "
          onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.4)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.3)';"
        >
          Take ${moodDisplayName} Quiz
        </button>
      </div>
    `;

    recommendationsContent.innerHTML = html;
  }

  function updateDailyChallenge(emotionDistribution) {
    const dominantEmotion = Object.entries(emotionDistribution).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    const moodDisplayName = getMoodDisplayName(dominantEmotion);
    const challengePageUrl = getChallengePageUrl(dominantEmotion);

    const challenges = {
      joy: [
        "Spread Joy",
        "Your challenge today is to intentionally share your joy with at least three people.",
        "Take the Happy Challenge to explore more ways to amplify your joy!"
      ],
      love: [
        "Express Love",
        "Express love in three different ways today - to yourself, someone close, and a stranger.",
        "Take the Happy Challenge to discover more loving activities!"
      ],
      surprise: [
        "Embrace Uncertainty",
        "Do something spontaneous or try something new today.",
        "Take the Happy Challenge for more delightful surprises!"
      ],
      sadness: [
        "Self-Compassion",
        "Treat yourself kindly—write a compassionate letter or rest.",
        "Take the Sad Challenge to work through your emotions constructively!"
      ],
      anger: [
        "Channel Energy",
        "Channel your anger into something constructive like cleaning or art.",
        "Take the Angry Challenge to learn healthy anger management techniques!"
      ],
      fear: [
        "Small Brave Step",
        "Take one small step toward something that scares you.",
        "Take the Anxious Challenge to build confidence and overcome fears!"
      ],
    };

    const [title, explanation, challengePrompt] = challenges[dominantEmotion] || [
      "Reflect",
      "Take time to reflect on your current emotional state.",
      "Take a mood-specific challenge to improve your wellbeing!"
    ];

    let html = `<h3>${title}</h3><p>${explanation}</p>`;
    html += `<p style="margin-top: 15px; font-style: italic; color: #666;">${challengePrompt}</p>`;
    
    // Add challenge button for daily challenges
    html += `
      <div style="margin-top: 15px; text-align: center;">
        <button 
          onclick="navigateToChallengePage('${dominantEmotion}')" 
          style="
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
            color: #333;
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 3px 12px rgba(255, 154, 158, 0.3);
          "
          onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 18px rgba(255, 154, 158, 0.4)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 12px rgba(255, 154, 158, 0.3)';"
        >
          Take the ${moodDisplayName} Challenge
        </button>
      </div>
    `;

    dailyChallengeContent.innerHTML = html;
  }

  // Navigation function for mood-specific quiz pages (for recommendations)
  function navigateToQuizPage(emotion) {
    const quizPageUrl = getQuizPageUrl(emotion);
    
    // Store the current emotion in sessionStorage for the quiz page to use
    sessionStorage.setItem('currentMoodFromAnalysis', emotion);
    sessionStorage.setItem('analysisTimestamp', new Date().toISOString());
    
    // Navigate to the appropriate quiz page
    window.location.href = quizPageUrl;
  }

  // Navigation function for mood-specific challenge pages (for daily challenges)
  function navigateToChallengePage(emotion) {
    const challengePageUrl = getChallengePageUrl(emotion);
    
    // Store the current emotion in sessionStorage for the challenge page to use
    sessionStorage.setItem('currentMoodFromAnalysis', emotion);
    sessionStorage.setItem('analysisTimestamp', new Date().toISOString());
    
    // Navigate to the appropriate challenge page
    window.location.href = challengePageUrl;
  }

  // Make the navigation functions globally available
  window.navigateToQuizPage = navigateToQuizPage;
  window.navigateToChallengePage = navigateToChallengePage;

  function loadDailyTip() {
    const tips = [
      "Practice the 4-7-8 breathing technique.",
      "Gratitude journaling for just 5 minutes a day can significantly improve your mood.",
      "Emotions are temporary - remind yourself 'This too shall pass'.",
      "Physical activity, even a short walk, can reduce stress.",
      "Prioritize 7-9 hours of quality sleep.",
      "Limit social media if it affects your mood.",
      "Naming emotions reduces their intensity.",
      "Time in nature reduces negative emotions.",
      "Helping others boosts your positive emotions.",
      "Mindful eating helps connect with emotional needs.",
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    dailyTipContent.innerHTML = `<p>${randomTip}</p>`;
  }

  function initProgressChart() {
    const ctx = document.getElementById("progressChart").getContext("2d");
    progressChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Positive", "Negative", "Neutral"],
        datasets: [
          {
            label: "Emotion Distribution",
            data: [30, 20, 50],
            backgroundColor: [
              "rgba(102, 187, 106, 0.7)",
              "rgba(239, 83, 80, 0.7)",
              "rgba(255, 202, 40, 0.7)",
            ],
            borderColor: [
              "rgba(102, 187, 106, 1)",
              "rgba(239, 83, 80, 1)",
              "rgba(255, 202, 40, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });
  }

  async function updateProgressChart(period) {
    try {
      let analyses = [];

      // Get user-specific analysis history
      if (token && currentUserId !== "guest") {
        try {
          const res = await fetch(
            `${API_BASE}/text-analysis/history/${period}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (res.ok) {
            analyses = await res.json();
          }
        } catch (error) {
          console.log("Failed to load from database, using localStorage");
        }
      }

      // Fallback to localStorage if database fails or user is guest
      if (analyses.length === 0) {
        const userHistoryKey = getUserSpecificKey("emotionHistory");
        const allAnalyses =
          JSON.parse(localStorage.getItem(userHistoryKey)) || [];

        // Filter by period
        const now = new Date();
        const filterDate = new Date();

        if (period === "daily") {
          filterDate.setDate(now.getDate() - 1);
        } else if (period === "weekly") {
          filterDate.setDate(now.getDate() - 7);
        } else {
          filterDate.setMonth(now.getMonth() - 1);
        }

        analyses = allAnalyses.filter(
          (analysis) => new Date(analysis.timestamp) >= filterDate
        );
      }

      // Calculate averages
      let totalPositive = 0,
        totalNegative = 0,
        totalNeutral = 0;

      if (analyses.length > 0) {
        analyses.forEach((analysis) => {
          totalPositive += analysis.emotions.positive || 0;
          totalNegative += analysis.emotions.negative || 0;
          totalNeutral += analysis.emotions.neutral || 0;
        });

        totalPositive = totalPositive / analyses.length;
        totalNegative = totalNegative / analyses.length;
        totalNeutral = totalNeutral / analyses.length;
      } else {
        // Default values if no data
        totalPositive = Math.floor(Math.random() * 30) + 30;
        totalNegative = Math.floor(Math.random() * 20) + 10;
        totalNeutral = 100 - totalPositive - totalNegative;
      }

      progressChart.data.datasets[0].data = [
        totalPositive,
        totalNegative,
        totalNeutral,
      ];
      progressChart.update();
    } catch (error) {
      console.error("Error updating progress chart:", error);
    }
  }

  // Save analysis to localStorage (user-specific)
  function saveAnalysisToHistory(result) {
    const userHistoryKey = getUserSpecificKey("emotionHistory");
    let history = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
    history.push(result);
    // Keep only last 50 entries
    if (history.length > 50) {
      history = history.slice(-50);
    }
    localStorage.setItem(userHistoryKey, JSON.stringify(history));
  }

  // Save analysis to backend
  async function saveAnalysisToBackend(result) {
    if (!token || currentUserId === "guest") {
      console.log("Guest user - analysis saved locally only");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/text-analysis/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: result.text,
          emotions: result.emotions,
          dominantEmotion: result.dominantEmotion,
          emotionDetails: result.emotionDetails,
          timestamp: result.timestamp,
        }),
      });

      if (response.ok) {
        console.log("Analysis saved to backend successfully");
      } else {
        console.error("Failed to save analysis to backend");
      }
    } catch (error) {
      console.error("Error saving to backend:", error);
    }
  }

  // Load user analysis history from backend
  async function loadUserAnalysisHistory() {
    if (!token || currentUserId === "guest") return;

    try {
      const response = await fetch(`${API_BASE}/text-analysis/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const history = await response.json();
        console.log(`Loaded ${history.length} analyses from backend`);
      }
    } catch (error) {
      console.error("Error loading analysis history:", error);
    }
  }

  // Show assessment report option after analysis
  function showAssessmentReportOption() {
    // Instead of adding a button, save the latest analysis for report page access
    sessionStorage.setItem("latestAnalysisCompleted", "true");
    sessionStorage.setItem("latestAnalysisTime", new Date().toISOString());

    // Show a subtle notification that report is available
    const notification = document.createElement("div");
    notification.className = "analysis-complete-notification";
    

    // Remove existing notification if present
    const existingNotification = document.querySelector(
      ".analysis-complete-notification"
    );
    if (existingNotification) {
      existingNotification.remove();
    }

    emotionResult.appendChild(notification);
  }

  // Generate comprehensive assessment report
  async function generateAssessmentReport() {
    try {
      let analysisHistory = [];

      // Get user-specific analysis history
      if (token && currentUserId !== "guest") {
        try {
          const res = await fetch(`${API_BASE}/text-analysis/history`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            analysisHistory = await res.json();
          }
        } catch (error) {
          console.log("Using localStorage data");
        }
      }

      // Fallback to localStorage
      if (analysisHistory.length === 0) {
        const userHistoryKey = getUserSpecificKey("emotionHistory");
        analysisHistory =
          JSON.parse(localStorage.getItem(userHistoryKey)) || [];
      }

      // Generate report
      const reportData = generateReportData(analysisHistory);
      displayAssessmentReport(reportData);
    } catch (error) {
      console.error("Error generating assessment report:", error);
      alert("Error generating report. Please try again.");
    }
  }

  // Generate report data from analysis history
  function generateReportData(history) {
    if (history.length === 0) {
      return {
        totalAnalyses: 0,
        timeRange: "No data available",
        emotionalTrends: {},
        averageEmotions: { positive: 0, negative: 0, neutral: 0 },
        insights: ["Complete more text analyses to generate insights"],
        recommendations: [
          "Start by analyzing your daily thoughts and feelings",
        ],
      };
    }

    const now = new Date();
    const oldestAnalysis = new Date(
      Math.min(...history.map((h) => new Date(h.timestamp)))
    );
    const daysDiff = Math.ceil((now - oldestAnalysis) / (1000 * 60 * 60 * 24));

    // Calculate trends
    const emotionalTrends = {};
    const totalEmotions = { positive: 0, negative: 0, neutral: 0 };

    history.forEach((analysis) => {
      const dominant = analysis.dominantEmotion;
      emotionalTrends[dominant] = (emotionalTrends[dominant] || 0) + 1;

      totalEmotions.positive += analysis.emotions.positive || 0;
      totalEmotions.negative += analysis.emotions.negative || 0;
      totalEmotions.neutral += analysis.emotions.neutral || 0;
    });

    const averageEmotions = {
      positive: totalEmotions.positive / history.length,
      negative: totalEmotions.negative / history.length,
      neutral: totalEmotions.neutral / history.length,
    };

    // Generate insights
    const insights = generateInsights(
      emotionalTrends,
      averageEmotions,
      history
    );
    const recommendations = generatePersonalizedRecommendations(
      emotionalTrends,
      averageEmotions
    );

    return {
      totalAnalyses: history.length,
      timeRange: `${daysDiff} days`,
      emotionalTrends,
      averageEmotions,
      insights,
      recommendations,
      recentAnalyses: history.slice(-5).reverse(),
    };
  }

  // Generate personalized insights
  function generateInsights(trends, averages, history) {
    const insights = [];

    // Most common emotion
    const mostCommon = Object.entries(trends).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );
    insights.push(
      `Your most frequent emotional state is ${mostCommon[0]} (${mostCommon[1]} times)`
    );

    // Emotional balance
    if (averages.positive > averages.negative) {
      insights.push(
        `You maintain a positive emotional outlook ${averages.positive.toFixed(
          1
        )}% of the time`
      );
    } else if (averages.negative > averages.positive) {
      insights.push(
        `Your emotional state shows ${averages.negative.toFixed(
          1
        )}% negative sentiment - consider focusing on self-care`
      );
    } else {
      insights.push("You maintain a balanced emotional state");
    }

    // Recent trend
    if (history.length >= 3) {
      const recent = history.slice(-3);
      const recentPositive =
        recent.reduce((sum, a) => sum + (a.emotions.positive || 0), 0) / 3;
      const overallPositive = averages.positive;

      if (recentPositive > overallPositive + 5) {
        insights.push(
          "Your recent emotional state shows improvement - keep it up!"
        );
      } else if (recentPositive < overallPositive - 5) {
        insights.push(
          "Your recent emotional state shows some challenges - consider additional support"
        );
      }
    }

    return insights;
  }

  // Generate personalized recommendations
  function generatePersonalizedRecommendations(trends, averages) {
    const recommendations = [];

    if (averages.negative > 40) {
      recommendations.push(
        "Consider practicing daily mindfulness meditation (10-15 minutes)"
      );
      recommendations.push(
        "Schedule regular check-ins with a trusted friend or counselor"
      );
      recommendations.push(
        "Engage in physical activity to improve mood naturally"
      );
    }

    if (averages.positive > 60) {
      recommendations.push(
        "Your positive outlook is a strength - consider mentoring others"
      );
      recommendations.push(
        "Use your positive energy to tackle challenging goals"
      );
    }

    // Specific emotion-based recommendations
    const dominantEmotion = Object.entries(trends).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    const emotionRecs = {
      sadness: [
        "Practice gratitude journaling",
        "Engage in creative activities",
        "Spend time in nature",
      ],
      anger: [
        "Try progressive muscle relaxation",
        "Practice assertive communication",
        "Consider anger management techniques",
      ],
      fear: [
        "Practice exposure therapy with small steps",
        "Learn grounding techniques",
        "Build a support network",
      ],
      joy: [
        "Share your joy with others",
        "Capture positive moments in a journal",
        "Plan enjoyable activities regularly",
      ],
      love: [
        "Express appreciation to loved ones",
        "Practice self-compassion",
        "Consider volunteer work",
      ],
      surprise: [
        "Embrace new experiences",
        "Stay curious and open-minded",
        "Reflect on unexpected positive outcomes",
      ],
    };

    if (emotionRecs[dominantEmotion]) {
      recommendations.push(...emotionRecs[dominantEmotion]);
    }

    return recommendations.slice(0, 6); // Limit to 6 recommendations
  }

  // Display comprehensive assessment report (for separate page)
  function displayAssessmentReport(reportData) {
    // This function is now designed to work with a separate assessment report page
    // The report data will be stored and accessed by the report page
    return reportData;
  }

  // Prepare report data for separate page access
  async function prepareReportForPage() {
    try {
      let analysisHistory = [];

      // Get user-specific analysis history
      if (token && currentUserId !== "guest") {
        try {
          const res = await fetch(`${API_BASE}/text-analysis/history`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            analysisHistory = await res.json();
          }
        } catch (error) {
          console.log("Using localStorage data");
        }
      }

      // Fallback to localStorage
      if (analysisHistory.length === 0) {
        const userHistoryKey = getUserSpecificKey("emotionHistory");
        analysisHistory =
          JSON.parse(localStorage.getItem(userHistoryKey)) || [];
      }

      // Generate and store report data
      const reportData = generateReportData(analysisHistory);
      const reportKey = getUserSpecificKey("assessmentReportData");
      sessionStorage.setItem(reportKey, JSON.stringify(reportData));

      return reportData;
    } catch (error) {
      console.error("Error preparing assessment report:", error);
      return null;
    }
  }

  // Record challenge completion for text analysis
  async function recordTextAnalysisChallenge(dominantEmotion) {
    try {
      if (!currentUserId) {
        await initializeUserContext();
      }

      let newCompletion = {
        mood: dominantEmotion.toLowerCase(),
        challenge: "text-analysis",
        time: new Date().toISOString(),
        userId: currentUserId,
        type: "text-analysis-challenge",
      };

      // If logged in, also save to database
      if (token && currentUserId !== "guest") {
        await fetch(`${API_BASE}/progress/complete-challenge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mood: dominantEmotion.toLowerCase(),
            challenge: "text-analysis",
            type: "text-analysis-challenge",
          }),
        });
      }

      // Save to user-specific localStorage
      const userChallengesKey = getUserSpecificKey("completedChallenges");
      let completions =
        JSON.parse(localStorage.getItem(userChallengesKey)) || [];
      completions.push(newCompletion);
      localStorage.setItem(userChallengesKey, JSON.stringify(completions));

      console.log(
        `Text analysis challenge recorded for user ${currentUserId}: ${dominantEmotion}`
      );
    } catch (error) {
      console.error("Error recording text analysis challenge:", error);
    }
  }

  // Get user progress summary
  async function getUserProgressSummary() {
    try {
      let analyses = [];

      if (token && currentUserId !== "guest") {
        try {
          const res = await fetch(`${API_BASE}/text-analysis/history`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            analyses = await res.json();
          }
        } catch (error) {
          console.log("Using localStorage data for progress summary");
        }
      }

      if (analyses.length === 0) {
        const userHistoryKey = getUserSpecificKey("emotionHistory");
        analyses = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
      }

      return {
        totalAnalyses: analyses.length,
        recentAnalyses: analyses.slice(-10).reverse(),
        emotionalTrends: analyses.reduce((trends, analysis) => {
          const emotion = analysis.dominantEmotion;
          trends[emotion] = (trends[emotion] || 0) + 1;
          return trends;
        }, {}),
        averageEmotions:
          analyses.length > 0
            ? {
                positive:
                  analyses.reduce(
                    (sum, a) => sum + (a.emotions.positive || 0),
                    0
                  ) / analyses.length,
                negative:
                  analyses.reduce(
                    (sum, a) => sum + (a.emotions.negative || 0),
                    0
                  ) / analyses.length,
                neutral:
                  analyses.reduce(
                    (sum, a) => sum + (a.emotions.neutral || 0),
                    0
                  ) / analyses.length,
              }
            : { positive: 0, negative: 0, neutral: 0 },
      };
    } catch (error) {
      console.error("Error getting user progress summary:", error);
      return {
        totalAnalyses: 0,
        recentAnalyses: [],
        emotionalTrends: {},
        averageEmotions: { positive: 0, negative: 0, neutral: 0 },
      };
    }
  }

  // Export analysis data for user
  async function exportUserAnalysisData() {
    try {
      const userHistoryKey = getUserSpecificKey("emotionHistory");
      const localData = JSON.parse(localStorage.getItem(userHistoryKey)) || [];

      let allData = localData;

      // If logged in, try to get backend data too
      if (token && currentUserId !== "guest") {
        try {
          const res = await fetch(`${API_BASE}/text-analysis/export`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const backendData = await res.json();
            // Merge and deduplicate data
            const combined = [...backendData, ...localData];
            allData = combined.filter(
              (item, index, self) =>
                index ===
                self.findIndex(
                  (t) => t.timestamp === item.timestamp && t.text === item.text
                )
            );
          }
        } catch (error) {
          console.log("Using local data only for export");
        }
      }

      // Create downloadable CSV
      if (allData.length === 0) {
        alert("No analysis data to export");
        return;
      }

      const csvContent = convertToCSV(allData);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `emotion_analysis_${currentUserId}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting analysis data:", error);
      alert("Error exporting data. Please try again.");
    }
  }

  // Convert analysis data to CSV format
  function convertToCSV(data) {
    const headers = [
      "Date",
      "Time",
      "Text",
      "Dominant Emotion",
      "Positive %",
      "Negative %",
      "Neutral %",
      "Joy %",
      "Love %",
      "Surprise %",
      "Sadness %",
      "Anger %",
      "Fear %",
    ];

    const rows = data.map((item) => {
      const date = new Date(item.timestamp);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        `"${item.text.replace(/"/g, '""')}"`, // Escape quotes in text
        // Add space and new
        
        item.dominantEmotion,
        item.emotions.positive.toFixed(2),
        item.emotions.negative.toFixed(2),
        item.emotions.neutral.toFixed(2),
        (item.emotionDetails.joy || 0).toFixed(2),
        (item.emotionDetails.love || 0).toFixed(2),
        (item.emotionDetails.surprise || 0).toFixed(2),
        (item.emotionDetails.sadness || 0).toFixed(2),
        (item.emotionDetails.anger || 0).toFixed(2),
        (item.emotionDetails.fear || 0).toFixed(2),
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  // Sync local data with backend
  async function syncAnalysisData() {
    if (!token || currentUserId === "guest") {
      console.log("Cannot sync - user not logged in");
      return;
    }

    try {
      const userHistoryKey = getUserSpecificKey("emotionHistory");
      const localData = JSON.parse(localStorage.getItem(userHistoryKey)) || [];

      if (localData.length === 0) {
        console.log("No local data to sync");
        return;
      }

      // Send local data to backend
      const response = await fetch(`${API_BASE}/text-analysis/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ analyses: localData }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Synced ${result.syncedCount} analyses to backend`);
      } else {
        console.error("Failed to sync data with backend");
      }
    } catch (error) {
      console.error("Error syncing analysis data:", error);
    }
  }

  // Delete analysis entry
  async function deleteAnalysis(timestamp) {
    try {
      // Remove from localStorage
      const userHistoryKey = getUserSpecificKey("emotionHistory");
      let localData = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
      localData = localData.filter((item) => item.timestamp !== timestamp);
      localStorage.setItem(userHistoryKey, JSON.stringify(localData));

      // Remove from backend if logged in
      if (token && currentUserId !== "guest") {
        await fetch(`${API_BASE}/text-analysis/delete`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ timestamp }),
        });
      }

      console.log("Analysis deleted successfully");
      updateProgressChart("daily"); // Refresh chart
    } catch (error) {
      console.error("Error deleting analysis:", error);
    }
  }

  // Get emotion color for styling
  function getEmotionColor(emotion) {
    const colors = {
      joy: "#66bb6a",
      love: "#ef5350",
      surprise: "#ffca28",
      sadness: "#42a5f5",
      anger: "#ff7043",
      fear: "#ab47bc",
    };
    return colors[emotion] || "#9e9e9e";
  }

  // Initialize authentication check
  function checkAuthenticationStatus() {
    if (token) {
      console.log("User is authenticated - syncing enabled");
      syncAnalysisData(); // Auto-sync on load
    } else {
      console.log("Guest user - local storage only");
    }
  }

  // Make functions available globally
  window.generateAssessmentReport = generateAssessmentReport;
  window.prepareReportForPage = prepareReportForPage;
  window.exportUserAnalysisData = exportUserAnalysisData;
  window.syncAnalysisData = syncAnalysisData;
  window.deleteAnalysis = deleteAnalysis;
  window.getUserProgressSummary = getUserProgressSummary;
  window.recordTextAnalysisChallenge = recordTextAnalysisChallenge;
  window.getCurrentUserId = () => currentUserId;
  window.getUserSpecificKey = getUserSpecificKey;
  window.generateReportData = generateReportData;

  // Auto-sync when user logs in/out
  window.addEventListener("storage", function (e) {
    if (e.key === "token") {
      location.reload(); // Reload to re-initialize with new auth status
    }
  });

  // Check auth status on load
  checkAuthenticationStatus();
});


 
    // Word count functionality - only shows when user types
    const userInput = document.getElementById('userInput');
    const wordCountEl = document.getElementById('wordCount');

    userInput.addEventListener('input', function() {
      const text = this.value.trim();
      const words = text.split(/\s+/).filter(word => word.length > 0);
      const wordCount = words.length;
      
      if (text.length > 0) {
        wordCountEl.style.display = 'block';
        wordCountEl.textContent = `${wordCount} word${wordCount !== 1 ? 's' : ''}`;
      } else {
        wordCountEl.style.display = 'none';
      }
    });
  
