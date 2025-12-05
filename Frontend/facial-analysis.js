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
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user" 
        } 
    })
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
    
    // Show image quality tips
    showImageQualityTips();
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
        
        // Show image quality tips
        showImageQualityTips();
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

// Enhanced image preprocessing
function preprocessImage(base64Image) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions
            canvas.width = 640;
            canvas.height = 480;
            
            // Draw and resize
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Apply image enhancement
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const enhancedData = enhanceImageData(imageData);
            ctx.putImageData(enhancedData, 0, 0);
            
            // Convert to base64
            const processedImage = canvas.toDataURL('image/jpeg', 0.9);
            resolve(processedImage);
        };
        img.src = base64Image;
    });
}

function enhanceImageData(imageData) {
    const data = imageData.data;
    const contrast = 1.2;
    const brightness = 10;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness));
    }
    
    return imageData;
}

// Improved Send Image for Analysis
async function sendImageForAnalysis(base64Image) {
    emotionResult.innerHTML = `
        <div class="placeholder-content">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Analyzing facial expression with enhanced accuracy...</p>
        </div>
    `;

    try {
        // Preprocess image first
        const processedImage = await preprocessImage(base64Image);
        
        const response = await fetch("http://localhost:5000/analyze-face", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                image: processedImage,
                enhanced: true,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.details || data.error || "Analysis failed");
        }

        // Enhanced results formatting
        const formattedResults = {
            type: 'facial',
            emotion: data.emotion.charAt(0).toUpperCase() + data.emotion.slice(1),
            confidence: data.confidence || 75,
            emotionDistribution: data.emotion_distribution || {
                positive: data.emotion_scores?.happy || 30,
                negative: data.emotion_scores?.sad || data.emotion_scores?.angry || 30,
                neutral: data.emotion_scores?.neutral || 40
            },
            emotionScores: data.emotion_scores || {},
            recommendation: data.recommendation,
            challenge: data.challenge,
            tip: data.tip,
            trend: data.trend,
            timestamp: new Date().toISOString(),
            userId: currentUserId,
            enhanced: true
        };
        
        // Enhanced display with more details
        displayEnhancedFacialAnalysisResults(formattedResults);
        
        // Update UI components with better recommendations
        updateEnhancedRecommendations(formattedResults);
        updateEnhancedDailyChallenge(formattedResults);
        
        // Save to both local storage and backend
        await saveFacialAnalysisToHistory(formattedResults);
        await saveFacialAnalysisToBackend(formattedResults);
        
        // Update progress chart
        updateChart('daily');
        
        // Show assessment report option
        showAssessmentReportOption();
        
        // Record challenge completion
        await recordFacialAnalysisChallenge(formattedResults.emotion);

    } catch (error) {
        console.error("Facial analysis error:", error);
        
        // Fallback to basic analysis if enhanced fails
        await fallbackBasicAnalysis(base64Image);
    }
}

// Show image quality tips
function showImageQualityTips() {
    const tips = `
        <div class="quality-tips">
            <p><strong>For best accuracy:</strong></p>
            <ul>
                <li>✅ Ensure good lighting on your face</li>
                <li>✅ Look directly at the camera</li>
                <li>✅ Keep a neutral expression initially</li>
                <li>✅ Avoid shadows on your face</li>
            </ul>
        </div>
    `;
    
    // Remove existing tips
    const existingTips = document.querySelector('.quality-tips');
    if (existingTips) existingTips.remove();
    
    // Add tips after the preview section
    const previewSection = document.querySelector('.preview-section');
    const tipsDiv = document.createElement('div');
    tipsDiv.className = 'quality-tips';
    tipsDiv.innerHTML = tips;
    previewSection.appendChild(tipsDiv);
}

// Enhanced results display
function displayEnhancedFacialAnalysisResults(results) {
    let html = `<div class="emotion-report-card">`;
    
    // Main emotion with confidence
    html += `
        <div class="main-emotion">
            <div class="emotion-icon">
                <i class="${getEmotionIcon(results.emotion)}"></i>
            </div>
            <div class="emotion-details">
                <h3>${results.emotion}</h3>
                <div class="confidence-meter">
                    <div class="confidence-fill" style="width: ${results.confidence}%"></div>
                    <span class="confidence-text">${results.confidence}% confidence</span>
                </div>
            </div>
        </div>
    `;
    
    // Detailed emotion breakdown
    if (results.emotionScores && Object.keys(results.emotionScores).length > 0) {
        html += `<div class="detailed-breakdown">`;
        html += `<h4>Detailed Analysis:</h4>`;
        
        const sortedEmotions = Object.entries(results.emotionScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        sortedEmotions.forEach(([emotion, score]) => {
            if (score > 5) {
                html += `
                    <div class="emotion-bar">
                        <span class="emotion-name">${emotion}</span>
                        <div class="bar-container">
                            <div class="bar" style="width: ${score}%"></div>
                            <span class="score">${score.toFixed(1)}%</span>
                        </div>
                    </div>
                `;
            }
        });
        
        html += `</div>`;
    }
    
    // Emotion distribution
    html += `
        <div class="distribution-summary">
            <div class="dist-item positive">
                <i class="fas fa-smile"></i>
                <span class="dist-value">${results.emotionDistribution.positive.toFixed(1)}% Positive</span>
            </div>
            <div class="dist-item negative">
                <i class="fas fa-frown"></i>
                <span class="dist-value">${results.emotionDistribution.negative.toFixed(1)}% Negative</span>
            </div>
            <div class="dist-item neutral">
                <i class="fas fa-meh"></i>
                <span class="dist-value">${results.emotionDistribution.neutral.toFixed(1)}% Neutral</span>
            </div>
        </div>
    `;
    
    html += `</div>`;
    emotionResult.innerHTML = html;
    
    // Add CSS for new styles
    addEnhancedStyles();
}

// Helper function to get emotion icons
function getEmotionIcon(emotion) {
    const iconMap = {
        'Happy': 'fas fa-smile-beam',
        'Sad': 'fas fa-sad-tear',
        'Angry': 'fas fa-angry',
        'Surprise': 'fas fa-surprise',
        'Fear': 'fas fa-fearful',
        'Disgust': 'fas fa-grimace',
        'Neutral': 'fas fa-meh'
    };
    return iconMap[emotion] || 'fas fa-smile';
}

// Enhanced recommendations
function updateEnhancedRecommendations(results) {
    const emotion = results.emotion.toLowerCase();
    
    const recMap = {
        happy: `Your ${results.confidence > 80 ? 'strong' : 'moderate'} happiness is wonderful! 
                ${results.confidence > 80 ? 'Consider spreading this positivity through acts of kindness.' : 
                  'Try to identify what specifically is bringing you joy today.'}`,
        sad: `Feeling sadness ${results.confidence > 70 ? 'is completely valid and natural.' : 'can be a signal to slow down.'}
              ${results.confidence > 80 ? 'This might be a good time for self-compassion and reaching out for support.' :
                'Try engaging in a comforting activity or talking to someone you trust.'}`,
        angry: `${results.confidence > 75 ? 'Strong feelings of anger detected. ' : ''}
                Physical movement like walking or stretching can help release this energy.`,
        surprise: `Surprise can lead to new perspectives! 
                   ${results.confidence > 70 ? 'Lean into this unexpected emotion.' : 'Take a moment to process what surprised you.'}`,
        fear: `${results.confidence > 65 ? 'Fear detected at significant levels. ' : ''}
                Grounding techniques (5-4-3-2-1 method) can help manage this feeling.`,
        disgust: `Disgust often protects our boundaries. 
                  ${results.confidence > 60 ? 'Consider if there are healthy boundaries to establish.' :
                    'Reflect on what might be triggering this response.'}`,
        neutral: `A calm, neutral state ${results.confidence > 80 ? 'indicates emotional balance.' : 'is perfectly normal.'}
                  This can be a good time for reflection or mindfulness.`
    };
    
    let baseRecommendation = recMap[emotion] || "Take a moment to check in with yourself and your feelings.";
    
    // Add confidence-based qualifier
    let confidenceNote = '';
    if (results.confidence > 85) {
        confidenceNote = "High confidence analysis suggests this emotion is clearly present.";
    } else if (results.confidence > 60) {
        confidenceNote = "Moderate confidence indicates this emotion is likely present, possibly mixed with others.";
    } else {
        confidenceNote = "Lower confidence suggests your emotional state may be complex or mixed.";
    }
    
    // Add quiz link if available
    const quizFile = getQuizFilename(emotion);
    let fullRecommendation = `
        <div class="enhanced-recommendation">
            <p><strong>Analysis Insight:</strong> ${baseRecommendation}</p>
            <p><small>${confidenceNote}</small></p>
    `;
    
    if (quizFile) {
        const quizLink = createQuizLink(emotion, `Take the ${emotion} exploration quiz`);
        fullRecommendation += `<p class="quiz-link">📋 <strong>Recommended:</strong> ${quizLink} to better understand this emotion.</p>`;
    }
    
    fullRecommendation += `</div>`;
    
    recommendationsContent.innerHTML = fullRecommendation;
}

// Enhanced daily challenge
function updateEnhancedDailyChallenge(results) {
    const emotion = results.emotion.toLowerCase();
    
    const challengeMap = {
        happy: `Share your happiness with someone through a specific compliment or act of kindness. 
                ${results.confidence > 85 ? 'Your strong positive energy can uplift others.' : ''}`,
        sad: `Practice self-compassion by doing one nurturing thing for yourself. 
              ${results.confidence > 75 ? 'Allow space for these feelings without judgment.' : ''}`,
        angry: `Channel this energy into a 10-minute physical activity (walking, stretching, cleaning).`,
        surprise: `Stay open to unexpected opportunities today and journal about any surprises.`,
        fear: `Identify one small fear you can face today, no matter how minor.`,
        disgust: `Focus on finding something beautiful or positive in your immediate environment.`,
        neutral: `Practice 5 minutes of mindfulness, focusing on your breath and bodily sensations.`
    };
    
    let baseChallenge = challengeMap[emotion] || "Take time to reflect on your current emotional state.";
    
    // Add emotional distribution context
    let distributionNote = '';
    if (results.emotionDistribution.positive > 60) {
        distributionNote = "Your predominantly positive emotional state can be leveraged for creative or social activities.";
    } else if (results.emotionDistribution.negative > 60) {
        distributionNote = "With more negative emotions present, gentle self-care is especially important today.";
    }
    
    let fullChallenge = `
        <div class="enhanced-challenge">
            <p><strong>Today's Emotional Challenge:</strong> ${baseChallenge}</p>
    `;
    
    if (distributionNote) {
        fullChallenge += `<p class="distribution-note">${distributionNote}</p>`;
    }
    
    // Add challenge link if available
    const challengeFile = getChallengeFilename(emotion);
    if (challengeFile) {
        const challengeLink = createChallengeLink(emotion, `Access detailed ${emotion} exercises`);
        fullChallenge += `<p class="challenge-link">🎯 <strong>Extended Practice:</strong> ${challengeLink}</p>`;
    }
    
    fullChallenge += `</div>`;
    
    dailyChallengeContent.innerHTML = fullChallenge;
}

// Fallback basic analysis
async function fallbackBasicAnalysis(base64Image) {
    try {
        // Simple fallback using basic DeepFace
        emotionResult.innerHTML = `
            <div class="placeholder-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Using basic analysis method...</p>
            </div>
        `;
        
        const response = await fetch("http://localhost:5000/analyze-face", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Image })
        });
        
        if (response.ok) {
            const data = await response.json();
            const formattedResults = formatFacialAnalysisResults(data, base64Image);
            displayFacialAnalysisResults(formattedResults);
            updateRecommendations(data.emotion);
            updateDailyChallenge(data.emotion);
        } else {
            throw new Error("Fallback analysis failed");
        }
    } catch (fallbackError) {
        emotionResult.innerHTML = `
            <div class="placeholder-content" style="color: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i>
                <p><strong>Analysis Unavailable</strong></p>
                <p>Please try:</p>
                <ul style="text-align: left; font-size: 0.9em;">
                    <li>Ensure good lighting on your face</li>
                    <li>Look directly at the camera</li>
                    <li>Use a clear, front-facing photo</li>
                    <li>Try uploading a different image</li>
                </ul>
            </div>
        `;
    }
}

// Add enhanced CSS styles
function addEnhancedStyles() {
    if (document.getElementById('enhanced-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'enhanced-styles';
    style.textContent = `
        .emotion-report-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .main-emotion {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .emotion-icon {
            font-size: 2.5rem;
            color: #4a6fa5;
        }
        
        .emotion-details h3 {
            margin: 0;
            font-size: 1.5rem;
            color: #333;
        }
        
        .confidence-meter {
            width: 200px;
            height: 20px;
            background: #eee;
            border-radius: 10px;
            margin-top: 5px;
            overflow: hidden;
            position: relative;
        }
        
        .confidence-fill {
            height: 100%;
            background: linear-gradient(90deg, #66bb6a, #4caf50);
            border-radius: 10px;
            transition: width 0.5s ease;
        }
        
        .confidence-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 0.8rem;
            color: #333;
            font-weight: bold;
        }
        
        .detailed-breakdown {
            margin: 20px 0;
        }
        
        .detailed-breakdown h4 {
            margin-bottom: 10px;
            color: #555;
        }
        
        .emotion-bar {
            margin: 8px 0;
        }
        
        .emotion-name {
            display: inline-block;
            width: 100px;
            text-transform: capitalize;
        }
        
        .bar-container {
            display: inline-block;
            width: calc(100% - 120px);
            position: relative;
        }
        
        .bar {
            height: 20px;
            background: #4a6fa5;
            border-radius: 4px;
        }
        
        .bar .score {
            position: absolute;
            right: 5px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.8rem;
            color: #333;
        }
        
        .distribution-summary {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        
        .dist-item {
            text-align: center;
            padding: 10px;
            border-radius: 8px;
            flex: 1;
            margin: 0 5px;
        }
        
        .dist-item.positive {
            background: rgba(102, 187, 106, 0.1);
        }
        
        .dist-item.negative {
            background: rgba(239, 83, 80, 0.1);
        }
        
        .dist-item.neutral {
            background: rgba(255, 202, 40, 0.1);
        }
        
        .dist-item i {
            font-size: 1.2rem;
            margin-bottom: 5px;
            display: block;
        }
        
        .dist-value {
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .enhanced-recommendation, .enhanced-challenge {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
        }
        
        .quiz-link, .challenge-link {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed #ddd;
        }
        
        .distribution-note {
            font-style: italic;
            color: #666;
            font-size: 0.9rem;
        }
        
        .quality-tips {
            background: #e3f2fd;
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
            font-size: 0.9rem;
        }
        
        .quality-tips ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .quality-tips li {
            margin: 5px 0;
        }
    `;
    
    document.head.appendChild(style);
}

// Display facial analysis results (legacy function)
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

function formatFacialAnalysisResults(data, imageData) {
    const emotion = data.emotion.toLowerCase();
    
    let emotionDistribution = data.emotion_distribution || {
        positive: 0,
        negative: 0,
        neutral: 0
    };
    
    if (!data.emotion_distribution) {
        const positiveEmotions = ['happy', 'joy', 'surprise'];
        const negativeEmotions = ['sad', 'angry', 'fear', 'disgust'];
        
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
    }

    return {
        type: 'facial',
        emotion: data.emotion.charAt(0).toUpperCase() + data.emotion.slice(1),
        confidence: data.confidence || 75,
        emotionDistribution: emotionDistribution,
        emotionScores: data.emotion_scores || {},
        recommendation: data.recommendation,
        challenge: data.challenge,
        tip: data.tip,
        trend: data.trend,
        timestamp: new Date().toISOString(),
        userId: currentUserId,
        enhanced: !!data.enhanced
    };
}

function saveFacialAnalysisToHistory(result) {
    try {
        const userHistoryKey = getUserSpecificKey('facialAnalysisHistory');
        let history = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
        
        const resultToSave = { ...result };
        delete resultToSave.imageData;
        
        history.push(resultToSave);
        
        if (history.length > 50) {
            history = history.slice(-50);
        }
        
        localStorage.setItem(userHistoryKey, JSON.stringify(history));
        console.log('Facial analysis saved to localStorage successfully');
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('localStorage quota exceeded. Clearing old data...');
            
            try {
                const userHistoryKey = getUserSpecificKey('facialAnalysisHistory');
                let history = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
                
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

function clearOldFacialAnalysisData() {
    try {
        const userHistoryKey = getUserSpecificKey('facialAnalysisHistory');
        let history = JSON.parse(localStorage.getItem(userHistoryKey)) || [];
        
        history = history.map(item => {
            const cleaned = { ...item };
            delete cleaned.imageData;
            return cleaned;
        });
        
        history = history.slice(-30);
        
        localStorage.setItem(userHistoryKey, JSON.stringify(history));
        console.log(`Cleaned localStorage. Kept ${history.length} entries.`);
        
        return history.length;
    } catch (error) {
        console.error('Error cleaning localStorage:', error);
        return 0;
    }
}

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
                emotionScores: result.emotionScores,
                recommendation: result.recommendation,
                challenge: result.challenge,
                tip: result.tip,
                timestamp: result.timestamp,
                enhanced: result.enhanced || false
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