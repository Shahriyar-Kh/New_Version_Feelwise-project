// DOM Elements
const video = document.getElementById("video");
const captureBtn = document.getElementById("captureBtn");
const uploadInput = document.getElementById("imageUpload");
const canvas = document.getElementById("canvas");
const imagePreview = document.getElementById("uploadedImage");
const emotionResult = document.getElementById("emotionResult");
const recommendationsContent = document.getElementById("recommendationsContent");
const dailyChallengeContent = document.getElementById("dailyChallengeContent");
const dailyTipContent = document.getElementById("dailyTipContent");
const progressChart = document.getElementById("progressChart");
const analyzeEmotionBtn = document.getElementById("analyzeEmotionBtn");

// Backend configuration
const API_BASE = "http://localhost:5000/api";
const token = localStorage.getItem("token");
let currentUserId = null;
let imageDataURL = "";
let chart;

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
    await initializeUserContext();
    updateChart();
    loadDailyTip();
    checkAuthenticationStatus();
});

// Initialize user context
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
                loadUserFacialAnalysisHistory();
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

// Initialize webcam
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(error => {
            console.error("Error accessing webcam:", error);
        });
}

// Capture from webcam
captureBtn.addEventListener("click", () => {
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    imageDataURL = canvas.toDataURL("image/png");
    imagePreview.src = imageDataURL;
    imagePreview.style.display = "block";
});

// Upload Image
uploadInput.addEventListener("change", () => {
    const file = uploadInput.files[0];
    if (!file || !file.type.startsWith("image/")) {
        alert("Please upload a valid image.");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        imageDataURL = reader.result;
        imagePreview.src = imageDataURL;
        imagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
});

// Analyze Emotion Button Click
analyzeEmotionBtn.addEventListener("click", () => {
    if (!imageDataURL) {
        alert("Please capture or upload an image first.");
        return;
    }
    sendImageForAnalysis(imageDataURL);
});

// Send Image to Backend for Analysis
async function sendImageForAnalysis(base64Image) {
    emotionResult.innerHTML = `
        <div class="placeholder-content">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Analyzing facial expression...</p>
        </div>
    `;

    try {
        // IMPORTANT: Use the correct endpoint through main-server.js
        const response = await fetch("http://localhost:5000/analyze-face", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ image: base64Image })
        });

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response not OK:', response.status, errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        // Parse response
        const data = await response.json();
        console.log('Received data:', data);

        // Check for errors in response
        if (data.error) {
            throw new Error(data.details || data.error || "Analysis failed");
        }

        // Verify we have emotion data
        if (!data.emotion) {
            throw new Error("No emotion data received from server");
        }

        // Format the results for consistent storage
        const formattedResults = formatFacialAnalysisResults(data, base64Image);
        
        // Display results
        displayFacialAnalysisResults(formattedResults);
        
        // Update UI components
        updateRecommendations(data.emotion);
        updateDailyChallenge(data.emotion);
        
        // Save to both local storage and backend
        await saveFacialAnalysisToHistory(formattedResults);
        await saveFacialAnalysisToBackend(formattedResults);
        
        // Update progress chart
        updateChart('daily');
        
        // Show assessment report option
        showAssessmentReportOption();
        
        // Record challenge completion
        await recordFacialAnalysisChallenge(data.emotion);

    } catch (error) {
        console.error("Facial analysis error:", error);
        
        // Show detailed error message
        emotionResult.innerHTML = `
            <div class="placeholder-content" style="color: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i>
                <p><strong>Error analyzing facial expression</strong></p>
                <p style="font-size: 0.9em; margin-top: 10px;">${error.message}</p>
                <p style="font-size: 0.85em; color: #666; margin-top: 5px;">
                    Please make sure:
                    <br>• The main server is running on port 5000
                    <br>• The facial analysis API is running on port 8002
                    <br>• Your image was captured/uploaded correctly
                </p>
            </div>
        `;
    }
}

// Also update the API_BASE constant at the top of the file:
// Change this:
// const API_BASE = "http://localhost:5000/analyze-face";




// Display facial analysis results
function displayFacialAnalysisResults(results) {
    let html = `<strong>Detected Emotion:</strong> ${results.emotion} (${results.confidence}% confidence)`;
    html += '<div class="emotion-breakdown">';
    html += `<p>Positive: ${results.emotionDistribution.positive.toFixed(1)}%</p>`;
    html += `<p>Negative: ${results.emotionDistribution.negative.toFixed(1)}%</p>`;
    html += `<p>Neutral: ${results.emotionDistribution.neutral.toFixed(1)}%</p>`;
    html += '</div>';
    emotionResult.innerHTML = html;
}

// Get quiz filename based on emotion
function getQuizFilename(emotion) {
    const normalizedEmotion = emotion.toLowerCase();
    
    // Map emotions to quiz files
    const emotionQuizMap = {
        'sad': 'sadQuiz.html',
        'sadness': 'sadQuiz.html',
        'angry': 'angryQuiz.html',
        'anger': 'angryQuiz.html',
        'joy': 'joyQuiz.html',
        'happiness': 'joyQuiz.html',
        'happy': 'joyQuiz.html',
        'surprise': 'surpriseQuiz.html',
        'surprised': 'surpriseQuiz.html',
        'love': 'loveQuiz.html',
        'fear': 'fearQuiz.html',
        'disgust': 'disgustQuiz.html'
    };
    
    return emotionQuizMap[normalizedEmotion] || null;
}

// Get challenge filename based on emotion
function getChallengeFilename(emotion) {
    const normalizedEmotion = emotion.toLowerCase();
    
    // Map emotions to challenge files
    const emotionChallengeMap = {
        'sad': 'sad.html',
        'sadness': 'sad.html',
        'angry': 'angry.html',
        'anger': 'angry.html',
        'joy': 'happy.html',
        'happiness': 'happy.html',
        'happy': 'happy.html',
        'surprise': 'surprise.html',
        'surprised': 'surprise.html',
        'love': 'love.html',
        'fear': 'fear.html',
        'disgust': 'disgust.html'
    };
    
    return emotionChallengeMap[normalizedEmotion] || null;
}

// Create clickable quiz link
function createQuizLink(emotion, linkText) {
    const quizFile = getQuizFilename(emotion);
    if (quizFile) {
        return `<a href="${quizFile}" style="color: #007bff; text-decoration: underline; cursor: pointer;">${linkText}</a>`;
    }
    return linkText;
}

// Create clickable challenge link
function createChallengeLink(emotion, linkText) {
    const challengeFile = getChallengeFilename(emotion);
    if (challengeFile) {
        return `<a href="${challengeFile}" style="color: #007bff; text-decoration: underline; cursor: pointer;">${linkText}</a>`;
    }
    return linkText;
}

// Update recommendations based on detected emotion
function updateRecommendations(emotion) {
    const normalizedEmotion = emotion.toLowerCase();
    
    const recMap = {
        joy: "Your joy is contagious! Consider sharing your happiness with others today.",
        happiness: "Your happiness is wonderful! Try to savor this moment and think about what brought you this joy.",
        sadness: "Be gentle with yourself. It's okay to feel sad sometimes. Consider talking to someone you trust.",
        sad: "Be gentle with yourself. It's okay to feel sad sometimes. Consider talking to someone you trust.",
        anger: "Try taking deep breaths to calm yourself. Physical activity can also help release angry energy.",
        angry: "Try taking deep breaths to calm yourself. Physical activity can also help release angry energy.",
        fear: "Ground yourself by focusing on your surroundings. Try the 5-4-3-2-1 technique.",
        surprise: "Embrace the unexpected! This could be an opportunity for growth or new experiences.",
        surprised: "Embrace the unexpected! This could be an opportunity for growth or new experiences.",
        disgust: "Try to identify what's causing this feeling and see if there are constructive ways to address it.",
        love: "Your loving emotions are beautiful! Share this positive energy with those around you.",
        neutral: "You appear calm and composed. This is a good time for reflection or planning."
    };
    
    const baseRecommendation = recMap[normalizedEmotion] || "Take a moment to check in with yourself and your feelings.";
    
    // Check if this emotion has a quiz available
    const quizFile = getQuizFilename(emotion);
    let fullRecommendation = `<p>${baseRecommendation}</p>`;
    
    if (quizFile) {
        const quizLink = createQuizLink(emotion, `Take the ${normalizedEmotion} quiz`);
        fullRecommendation += `<p>📋 <strong>Recommendation:</strong> ${quizLink} to better understand and manage your emotions.</p>`;
    }
    
    recommendationsContent.innerHTML = fullRecommendation;
}

// Update daily challenge based on emotion
function updateDailyChallenge(emotion) {
    const normalizedEmotion = emotion.toLowerCase();
    
    const challengeMap = {
        joy: "Share your joy with at least three people today through a smile, compliment, or kind gesture.",
        happiness: "Write down three things that made you happy today and reflect on them.",
        sadness: "Practice self-compassion by doing something nurturing for yourself today.",
        sad: "Practice self-compassion by doing something nurturing for yourself today.",
        anger: "Channel your energy into something productive like exercise or cleaning.",
        angry: "Channel your energy into something productive like exercise or cleaning.",
        fear: "Take one small brave step toward something that challenges you today.",
        surprise: "Stay open to new experiences and opportunities that come your way today.",
        surprised: "Stay open to new experiences and opportunities that come your way today.",
        disgust: "Focus on finding something beautiful or positive in your environment today.",
        love: "Express your love and appreciation to someone important in your life today.",
        neutral: "Practice mindfulness by paying attention to your senses for 10 minutes today."
    };
    
    const baseChallenge = challengeMap[normalizedEmotion] || "Take time to reflect on your current emotional state and practice self-awareness.";
    
    // Check if this emotion has a challenge available
    const challengeFile = getChallengeFilename(emotion);
    let fullChallenge = `<p>${baseChallenge}</p>`;
    
    if (challengeFile) {
        const challengeLink = createChallengeLink(emotion, `Go to ${normalizedEmotion} challenge`);
        fullChallenge += `<p>🎯 <strong>Challenge:</strong> ${challengeLink} to explore specific activities and exercises for your current mood.</p>`;
    }
    
    dailyChallengeContent.innerHTML = fullChallenge;
}

// Load daily tip
function loadDailyTip() {
    const tips = [
        "Facial expressions can influence how you feel - try smiling to boost your mood.",
        "Practice facial relaxation exercises to reduce tension and stress.",
        "Pay attention to your facial expressions throughout the day - they reflect your inner state.",
        "Use mirror work to practice positive facial expressions and self-compassion.",
        "Facial analysis can help you become more aware of your emotional patterns.",
        "Remember that all emotions are temporary - even difficult ones will pass.",
        "Your face is a window to your emotions - use this awareness for self-care.",
        "Connecting with others through facial expressions can improve relationships.",
        "Practice expressing emotions in healthy ways rather than suppressing them.",
        "Facial expressions are universal - they connect us all as humans."
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    dailyTipContent.innerHTML = `<p>${randomTip}</p>`;
}

// Emotional Progress Chart
function updateChart(period = 'daily') {
    loadFacialAnalysisHistory(period).then(analyses => {
        let avgPositive = 0, avgNegative = 0, avgNeutral = 0;
        
        if (analyses.length > 0) {
            analyses.forEach(analysis => {
                avgPositive += analysis.emotionDistribution.positive;
                avgNegative += analysis.emotionDistribution.negative;
                avgNeutral += analysis.emotionDistribution.neutral;
            });
            
            avgPositive /= analyses.length;
            avgNegative /= analyses.length;
            avgNeutral /= analyses.length;
        } else {
            // Default values
            avgPositive = Math.floor(Math.random() * 30) + 40;
            avgNegative = Math.floor(Math.random() * 20) + 15;
            avgNeutral = 100 - avgPositive - avgNegative;
        }

        const ctx = progressChart.getContext("2d");
        const chartData = {
            labels: ["Positive", "Negative", "Neutral"],
            datasets: [{
                label: "Facial Emotion Distribution",
                data: [avgPositive, avgNegative, avgNeutral],
                backgroundColor: [
                    "rgba(102, 187, 106, 0.7)",
                    "rgba(239, 83, 80, 0.7)",
                    "rgba(255, 202, 40, 0.7)"
                ],
                borderColor: [
                    "rgba(102, 187, 106, 1)",
                    "rgba(239, 83, 80, 1)",
                    "rgba(255, 202, 40, 1)"
                ],
                borderWidth: 2
            }]
        };

        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: "doughnut",
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    });
}

// FIXED: Remove imageData to prevent localStorage quota exceeded error
function formatFacialAnalysisResults(data, imageData) {
    // Map facial emotions to positive/negative/neutral categories
    const positiveEmotions = ['joy', 'happiness', 'surprise'];
    const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust'];
    
    const emotion = data.emotion.toLowerCase();
    let emotionDistribution = {
        positive: 0,
        negative: 0,
        neutral: 0
    };
    
    if (positiveEmotions.includes(emotion)) {
        emotionDistribution.positive = data.confidence || 75;
        emotionDistribution.neutral = (100 - emotionDistribution.positive) * 0.6;
        emotionDistribution.negative = 100 - emotionDistribution.positive - emotionDistribution.neutral;
    } else if (negativeEmotions.includes(emotion)) {
        emotionDistribution.negative = data.confidence || 75;
        emotionDistribution.neutral = (100 - emotionDistribution.negative) * 0.4;
        emotionDistribution.positive = 100 - emotionDistribution.negative - emotionDistribution.neutral;
    } else {
        emotionDistribution.neutral = data.confidence || 70;
        emotionDistribution.positive = (100 - emotionDistribution.neutral) * 0.6;
        emotionDistribution.negative = 100 - emotionDistribution.neutral - emotionDistribution.positive;
    }

    return {
        type: 'facial',
        emotion: data.emotion,
        confidence: data.confidence || 75,
        emotionDistribution: emotionDistribution,
        recommendation: data.recommendation,
        challenge: data.challenge,
        tip: data.tip,
        trend: data.trend,
        // DON'T STORE IMAGE DATA - it's too large for localStorage!
        // imageData: imageData,  // <-- REMOVED THIS LINE
        timestamp: new Date().toISOString(),
        userId: currentUserId
    };
}

// Also update saveFacialAnalysisToHistory to add error handling
function saveFacialAnalysisToHistory(result) {
    try {
        const userHistoryKey = getUserSpecificKey('facialAnalysisHistory');
        let history = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
        
        // Remove imageData if it somehow got included
        const resultToSave = { ...result };
        delete resultToSave.imageData;
        
        history.push(resultToSave);
        
        // Keep only last 50 entries
        if (history.length > 50) {
            history = history.slice(-50);
        }
        
        localStorage.setItem(userHistoryKey, JSON.stringify(history));
        console.log('Facial analysis saved to localStorage successfully');
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('localStorage quota exceeded. Clearing old data...');
            
            // Try to clear old data and save again
            try {
                const userHistoryKey = getUserSpecificKey('facialAnalysisHistory');
                let history = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
                
                // Keep only last 20 entries instead of 50
                history = history.slice(-20);
                
                const resultToSave = { ...result };
                delete resultToSave.imageData;
                history.push(resultToSave);
                
                localStorage.setItem(userHistoryKey, JSON.stringify(history));
                console.log('Saved after clearing old data');
            } catch (retryError) {
                console.error('Still cannot save to localStorage:', retryError);
                alert('Warning: Cannot save analysis history. Your localStorage is full. Some older data may be lost.');
            }
        } else {
            console.error('Error saving to localStorage:', error);
        }
    }
}

// BONUS: Add a function to clear old localStorage data if needed
function clearOldFacialAnalysisData() {
    try {
        const userHistoryKey = getUserSpecificKey('facialAnalysisHistory');
        let history = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
        
        // Remove any entries with imageData (from old saves)
        history = history.map(item => {
            const cleaned = { ...item };
            delete cleaned.imageData;
            return cleaned;
        });
        
        // Keep only last 30 entries
        history = history.slice(-30);
        
        localStorage.setItem(userHistoryKey, JSON.stringify(history));
        console.log(`Cleaned localStorage. Kept ${history.length} entries.`);
        
        return history.length;
    } catch (error) {
        console.error('Error cleaning localStorage:', error);
        return 0;
    }
}

// Call this function on page load to clean up any old data with images
document.addEventListener("DOMContentLoaded", async () => {
    // Clean up old data first
    clearOldFacialAnalysisData();
    
    // Then initialize as normal
    await initializeUserContext();
    updateChart();
    loadDailyTip();
    checkAuthenticationStatus();
});


// Save facial analysis to backend
async function saveFacialAnalysisToBackend(result) {
    if (!token || currentUserId === "guest") {
        console.log("Guest user - facial analysis saved locally only");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/facial-analysis/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                emotion: result.emotion,
                confidence: result.confidence,
                emotionDistribution: result.emotionDistribution,
                recommendation: result.recommendation,
                challenge: result.challenge,
                tip: result.tip,
                timestamp: result.timestamp
            })
        });

        if (response.ok) {
            console.log("Facial analysis saved to backend successfully");
        } else {
            console.error("Failed to save facial analysis to backend");
        }
    } catch (error) {
        console.error("Error saving facial analysis to backend:", error);
    }
}

// Load facial analysis history
async function loadFacialAnalysisHistory(period = 'all') {
    let analyses = [];
    
    // Try backend first if logged in
    if (token && currentUserId !== "guest") {
        try {
            const res = await fetch(`${API_BASE}/facial-analysis/history/${period}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                analyses = await res.json();
            }
        } catch (error) {
            console.log("Failed to load facial analysis from database, using localStorage");
        }
    }

    // Fallback to localStorage
    if (analyses.length === 0) {
        const userHistoryKey = getUserSpecificKey('facialAnalysisHistory');
        const allAnalyses = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
        
        if (period !== 'all') {
            const now = new Date();
            const filterDate = new Date();
            
            if (period === 'daily') {
                filterDate.setDate(now.getDate() - 1);
            } else if (period === 'weekly') {
                filterDate.setDate(now.getDate() - 7);
            } else {
                filterDate.setMonth(now.getMonth() - 1);
            }
            
            analyses = allAnalyses.filter(analysis => 
                new Date(analysis.timestamp) >= filterDate
            );
        } else {
            analyses = allAnalyses;
        }
    }
    
    return analyses;
}

// Load user facial analysis history from backend
async function loadUserFacialAnalysisHistory() {
    if (!token || currentUserId === "guest") return;

    try {
        const response = await fetch(`${API_BASE}/facial-analysis/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const history = await response.json();
            console.log(`Loaded ${history.length} facial analyses from backend`);
        }
    } catch (error) {
        console.error("Error loading facial analysis history:", error);
    }
}

// Record facial analysis challenge completion
async function recordFacialAnalysisChallenge(emotion) {
    try {
        if (!currentUserId) {
            await initializeUserContext();
        }

        let newCompletion = {
            mood: emotion.toLowerCase(),
            challenge: 'facial-analysis',
            time: new Date().toISOString(),
            userId: currentUserId,
            type: 'facial-analysis-challenge'
        };

        // If logged in, save to database
        if (token && currentUserId !== "guest") {
            await fetch(`${API_BASE}/progress/complete-challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    mood: emotion.toLowerCase(),
                    challenge: 'facial-analysis',
                    type: 'facial-analysis-challenge'
                }),
            });
        }

        // Save to user-specific localStorage
        const userChallengesKey = getUserSpecificKey('completedChallenges');
        let completions = JSON.parse(localStorage.getItem(userChallengesKey)) || [];
        completions.push(newCompletion);
        localStorage.setItem(userChallengesKey, JSON.stringify(completions));

        console.log(`Facial analysis challenge recorded for user ${currentUserId}: ${emotion}`);
    } catch (error) {
        console.error('Error recording facial analysis challenge:', error);
    }
}

// Show assessment report option
function showAssessmentReportOption() {
    sessionStorage.setItem('latestFacialAnalysisCompleted', 'true');
    sessionStorage.setItem('latestFacialAnalysisTime', new Date().toISOString());
    
    const notification = document.createElement('div');
    notification.className = 'analysis-complete-notification';
    notification.style.cssText = `
        background: #e8f5e8;
        border: 1px solid #4caf50;
        color: #2e7d32;
        padding: 10px 15px;
        border-radius: 5px;
        margin-top: 15px;
        text-align: center;
        font-size: 14px;
    `;
    notification.innerHTML = `
        ✅ Facial analysis complete! <a href="full_assessment.html" style="color: #1976d2; text-decoration: underline;">View your comprehensive assessment report</a>
    `;

    const existingNotification = document.querySelector('.analysis-complete-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    emotionResult.appendChild(notification);
}

// Export facial analysis data
async function exportFacialAnalysisData() {
    try {
        const userHistoryKey = getUserSpecificKey('facialAnalysisHistory');
        const localData = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
        
        let allData = localData;
        
        if (token && currentUserId !== "guest") {
            try {
                const res = await fetch(`${API_BASE}/facial-analysis/export`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const backendData = await res.json();
                    const combined = [...backendData, ...localData];
                    allData = combined.filter((item, index, self) => 
                        index === self.findIndex(t => t.timestamp === item.timestamp)
                    );
                }
            } catch (error) {
                console.log("Using local data only for export");
            }
        }

        if (allData.length === 0) {
            alert('No facial analysis data to export');
            return;
        }

        const csvContent = convertFacialAnalysisToCSV(allData);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `facial_analysis_${currentUserId}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (error) {
        console.error('Error exporting facial analysis data:', error);
        alert('Error exporting data. Please try again.');
    }
}

// Convert facial analysis data to CSV
function convertFacialAnalysisToCSV(data) {
    const headers = ['Date', 'Time', 'Detected Emotion', 'Confidence %', 'Positive %', 'Negative %', 'Neutral %'];
    
    const rows = data.map(item => {
        const date = new Date(item.timestamp);
        return [
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            item.emotion,
            item.confidence.toFixed(2),
            item.emotionDistribution.positive.toFixed(2),
            item.emotionDistribution.negative.toFixed(2),
            item.emotionDistribution.neutral.toFixed(2)
        ].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
}

// Sync facial analysis data with backend
async function syncFacialAnalysisData() {
    if (!token || currentUserId === "guest") {
        console.log("Cannot sync - user not logged in");
        return;
    }

    try {
        const userHistoryKey = getUserSpecificKey('facialAnalysisHistory');
        const localData = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
        
        if (localData.length === 0) {
            console.log("No local facial analysis data to sync");
            return;
        }

        const response = await fetch(`${API_BASE}/facial-analysis/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ analyses: localData })
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`Synced ${result.syncedCount} facial analyses to backend`);
        } else {
            console.error("Failed to sync facial analysis data with backend");
        }
    } catch (error) {
        console.error("Error syncing facial analysis data:", error);
    }
}

// Check authentication status
function checkAuthenticationStatus() {
    if (token) {
        console.log("User is authenticated - facial analysis syncing enabled");
        syncFacialAnalysisData();
    } else {
        console.log("Guest user - facial analysis local storage only");
    }
}

// Make functions available globally
window.exportFacialAnalysisData = exportFacialAnalysisData;
window.syncFacialAnalysisData = syncFacialAnalysisData;
window.loadFacialAnalysisHistory = loadFacialAnalysisHistory;
window.getUserSpecificKey = getUserSpecificKey;

// Auto-sync when user logs in/out
window.addEventListener('storage', function(e) {
    if (e.key === 'token') {
        location.reload();
    }
});