document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const startBtn = document.getElementById('startRecordingBtn');
    const stopBtn = document.getElementById('stopRecordingBtn');
    const transcriptDisplay = document.getElementById('transcriptDisplay');
    const emotionResult = document.getElementById('emotionResult');
    const recommendationsContent = document.getElementById('recommendationsContent');
    const dailyChallengeContent = document.getElementById('dailyChallengeContent');
    const dailyTipContent = document.getElementById('dailyTipContent');
    const timeFilters = document.querySelectorAll('.time-filter');
    let progressChart;
    
    // Audio recording variables
    let recognition;
    let mediaRecorder;
    let audioChunks = [];
    let finalTranscript = "";
    let isAnalyzing = false;
    let audioStream = null;
    
    // Initialize on page load
    initProgressChart();
    loadDailyTip();
    initSpeechRecognition();
    
    // Event listeners
    startBtn.addEventListener('click', function(event) {
        event.preventDefault();
        startRecording();
    });
    
    stopBtn.addEventListener('click', function(event) {
        event.preventDefault();
        stopRecording();
    });
    
    timeFilters.forEach(filter => {
        filter.addEventListener('click', function() {
            timeFilters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            updateProgressChart(this.dataset.period);
        });
    });
    
    // Initialize speech recognition
    function initSpeechRecognition() {
        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error("Speech recognition not supported in this browser");
            startBtn.disabled = true;
            startBtn.textContent = "Speech API Not Supported";
            return;
        }
        
        // Use standard API if available, otherwise webkit prefix
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            transcriptDisplay.innerHTML = finalTranscript + '<span style="color:#777">' + interimTranscript + '</span>';
        };
    
        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            transcriptDisplay.innerHTML += `<br><span style="color:red">Speech recognition error: ${event.error}</span>`;
            if (!isAnalyzing) {
                resetUI();
            }
        };
        
        recognition.onend = () => {
            console.log("[JS] Speech recognition ended");
        };
        
        console.log("[JS] Speech recognition initialized");
    }
    
    // Start recording function
    async function startRecording() {
        console.log("[JS] Start recording initiated");
        try {
            finalTranscript = "";
            transcriptDisplay.innerHTML = "Listening...";
            startBtn.disabled = true;
            stopBtn.disabled = false;
            emotionResult.innerHTML = "";
            
            // Start media recording
            audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    sampleSize: 16
                } 
            });
            
            // Set up media recorder with WebM format (backend expects this)
            const options = { 
                mimeType: 'audio/webm; codecs=opus',
                audioBitsPerSecond: 128000
            };
            
            mediaRecorder = new MediaRecorder(audioStream, options);
            audioChunks = [];
    
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
    
            mediaRecorder.onstop = async () => {
                console.log("[JS] Media recorder stopped, preparing to send data");
            };
    
            mediaRecorder.start(100); // Collect data every 100ms
            console.log("[JS] Media recorder started");
    
            // Start speech recognition
            if (recognition) {
                recognition.start();
                console.log("[JS] Speech recognition started");
            }
        } catch (error) {
            console.error("Error starting recording:", error);
            transcriptDisplay.innerHTML = "Error accessing microphone: " + error.message;
            resetUI();
        }
    }
    
    // Stop recording function
    async function stopRecording() {
        console.log("[JS] Stop recording initiated");
        
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            console.log("[JS] Media recorder is inactive, returning");
            resetUI();
            return;
        }
        
        isAnalyzing = true;
        stopBtn.disabled = true;
        transcriptDisplay.innerHTML += "<br>Processing...";
    
        try {
            // Stop media recorder
            mediaRecorder.stop();
            console.log("[JS] Media recorder stopped");
            
            // Stop speech recognition
            if (recognition) {
                recognition.stop();
                console.log("[JS] Speech recognition stopped");
            }
            
            // Stop audio stream
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
                audioStream = null;
            }
            
            // Wait for data to be available
            await new Promise(resolve => {
                if (mediaRecorder.state === 'inactive') {
                    resolve();
                } else {
                    mediaRecorder.onstop = resolve;
                }
            });
            
            // Check if we have audio data
            if (audioChunks.length === 0) {
                throw new Error("No audio data recorded");
            }
            
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            console.log("[JS] Audio blob created, size:", audioBlob.size);
            
            if (audioBlob.size < 1000) { // Minimum 1KB of audio data
                throw new Error("Audio recording is too short");
            }
            
            const audioBase64 = await blobToBase64(audioBlob);
            console.log("[JS] Audio blob converted to base64, length:", audioBase64.length);
            
            if (audioBase64) {
                console.log("[JS] Calling analyzeSpeech function");
                await analyzeSpeech(finalTranscript, audioBase64);
            }
        } catch (error) {
            console.error("Error stopping recording:", error);
            transcriptDisplay.innerHTML += `<br><span style="color:red">Error: ${error.message}</span>`;
            resetUI();
        }
    }
    
    // Analyze speech function - FIXED to use main server URL
    async function analyzeSpeech(transcript, audioBase64) {
        console.log("=> analyzeSpeech() starting", { transcript: transcript || "(none)", audioLength: audioBase64?.length });

        // ✅ FIXED: Use main server endpoint instead of direct FastAPI
        const url = "http://localhost:5000/analyze-speech";
        const payload = { transcript: transcript || "", audio: audioBase64 };

        try {
            console.log("Sending POST to", url, "payload.audio length:", (audioBase64 || "").length);

            const response = await fetch(url, {
                method: "POST",
                mode: "cors",
                headers: { 
                    "Content-Type": "application/json",
                    "X-Request-Id": Math.random().toString(36).substring(2, 10)
                },
                body: JSON.stringify(payload),
            });

            console.log("Fetch completed. status:", response.status, response.statusText);
            console.log("Response headers:", Array.from(response.headers.entries()));

            const raw = await response.text();
            console.log("Raw response text (first 2000 chars):", raw ? raw.slice(0, 2000) : "<empty>");

            if (!response.ok) {
                console.error("Server returned non-OK:", response.status, raw);
                transcriptDisplay.innerHTML += `<br><span style="color:red">Server error: ${response.status}</span>`;
                resetUI();
                return;
            }

            let data;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch (parseErr) {
                console.error("Failed to parse JSON from backend:", parseErr, "raw:", raw);
                transcriptDisplay.innerHTML += `<br><span style="color:red">Invalid server JSON. Check console.</span>`;
                resetUI();
                return;
            }

            console.log("Parsed JSON result:", data);

            try {
                displayAnalysisResults(data);
            } catch (err) {
                console.error("displayAnalysisResults failed:", err);
                transcriptDisplay.innerHTML += `<br><span style="color:red">UI update failed: ${err.message || err}</span>`;
            }

            try { updateRecommendations(data.emotion); } catch (e) { console.warn("updateRecommendations error:", e); }
            try { updateDailyChallenge(data.emotion); } catch (e) { console.warn("updateDailyChallenge error:", e); }
            try { updateProgressChart('daily'); } catch (e) { console.warn("updateProgressChart error:", e); }

        } catch (err) {
            console.error("Analysis failed (fetch/processing):", err);
            const short = (err && err.message) ? err.message : String(err);
            transcriptDisplay.innerHTML += `<br><span style="color:red">Analysis failed: ${short}</span>`;
        } finally {
            resetUI();
            console.log("=> analyzeSpeech() finished");
        }
    }

    // Display analysis results
    function displayAnalysisResults(data) {
        console.log("displayAnalysisResults called with:", data);
        if (!data || typeof data !== 'object') {
            throw new Error("displayAnalysisResults: invalid data");
        }

        const rawEmotion = (data.emotion || data.raw_label || "neutral").toString();
        const emotion = rawEmotion.toLowerCase();
        const safeEmotionLabel = emotion.charAt(0).toUpperCase() + emotion.slice(1);
        const recommendation = data.recommendation || "No recommendation provided";

        // Show detected emotion & recommendation
        if (emotionResult) {
            emotionResult.innerHTML = `
                <h3>Detected Emotion: <span class="emotion-tag ${getEmotionClass(emotion)}">${safeEmotionLabel}</span></h3>
                <p><strong>Recommendation:</strong> ${recommendation}</p>
            `;
        }

        // Show backend daily challenge if provided
        if (data.daily_challenge && dailyChallengeContent) {
            dailyChallengeContent.innerHTML = `<p>${data.daily_challenge}</p>`;
        }

        // Show backend daily tip if provided
        if (data.daily_tip && dailyTipContent) {
            dailyTipContent.innerHTML = `<p>${data.daily_tip}</p>`;
        }

        // Clear "Processing..." message
        transcriptDisplay.innerHTML += "<br><span style='color:green'>Analysis complete ✓</span>";
    }
    
    // Get emotion class for styling
    function getEmotionClass(emotion) {
        const positiveEmotions = ['happiness', 'joy', 'surprise', 'love'];
        const negativeEmotions = ['anger', 'angry', 'disgust', 'fear', 'sadness', 'sad'];
        return positiveEmotions.includes(emotion) ? 'positive' :
               negativeEmotions.includes(emotion) ? 'negative' : 'neutral';
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
            'happy': 'happyQuiz.html',
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
            'joy': 'joy.html',
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
            return `<href="${challengeFile}" style="color: #28a745; text-decoration: underline; cursor: pointer;">${linkText}</a>`;
        }
        return linkText;
    }
    
    // Update recommendations with quiz links
    function updateRecommendations(emotion) {
        console.log("[JS] updateRecommendations called with emotion:", emotion);
        const normalizedEmotion = emotion.toLowerCase();
        
        const recommendations = {
            anger: "Try deep breathing exercises to calm down.",
            angry: "Try deep breathing exercises to calm down.",
            disgust: "Reflect on what's bothering you.",
            fear: "Practice grounding techniques.",
            happiness: "Share your positive energy!",
            joy: "Share your positive energy!",
            happy: "Share your positive energy!",
            neutral: "Try expressing more emotions.",
            sadness: "Reach out to a friend for support.",
            sad: "Reach out to a friend for support.",
            surprise: "Embrace the unexpected moments!",
            surprised: "Embrace the unexpected moments!",
            love: "Spread the love and positivity around you!"
        };
        
        const baseRecommendation = recommendations[normalizedEmotion] || "Take time to reflect on your emotions.";
        
        const quizFile = getQuizFilename(emotion);
        let fullRecommendation = `<p>${baseRecommendation}</p>`;
        
        if (quizFile) {
            const quizLink = createQuizLink(emotion, `Take the ${normalizedEmotion} quiz`);
            fullRecommendation += `<p><strong>Recommendation:</strong> ${quizLink} to better understand and manage your emotions.</p>`;
        }
        
        recommendationsContent.innerHTML = fullRecommendation;
    }
    
    // Update daily challenge with challenge links
    function updateDailyChallenge(emotion) {
        console.log("[JS] updateDailyChallenge called with emotion:", emotion);
        const normalizedEmotion = emotion.toLowerCase();
        
        const challenges = {
            anger: "Identify three things you're grateful for today.",
            angry: "Identify three things you're grateful for today.",
            disgust: "Find one positive aspect in a difficult situation.",
            fear: "Face one small fear today with courage.",
            happiness: "Compliment three people and spread joy.",
            joy: "Compliment three people and spread joy.",
            happy: "Compliment three people and spread joy.",
            neutral: "Try a new activity to spark some emotion.",
            sadness: "Do one kind thing for yourself today.",
            sad: "Do one kind thing for yourself today.",
            surprise: "Try something completely new and unexpected.",
            surprised: "Try something completely new and unexpected.",
            love: "Express your love to someone important to you."
        };
        
        const baseChallenge = challenges[normalizedEmotion] || "Reflect deeply on your current emotional state.";
        
        const challengeFile = getChallengeFilename(emotion);
        let fullChallenge = `<p>${baseChallenge}</p>`;
        
        if (challengeFile) {
            const challengeLink = createChallengeLink(emotion, `Take the ${normalizedEmotion} challenge`);
            fullChallenge += `<p><strong>Challenge:</strong> ${challengeLink} to explore your emotions deeper and gain insights.</p>`;
        }
        
        dailyChallengeContent.innerHTML = fullChallenge;
    }
    
    // Load daily tip
    function loadDailyTip() {
        const tips = [
            "Speak slowly and clearly to help regulate your emotions.",
            "Practice speaking with different emotional tones to become more aware of your voice.",
            "Record yourself speaking and listen back to better understand your vocal emotions.",
            "Deep breathing before speaking can help modulate your emotional tone.",
            "Pay attention to your pitch - higher pitches often indicate excitement or stress.",
            "Notice your speaking rate - faster speech may indicate anxiety or excitement.",
            "Practice mindful speaking by being aware of each word you say.",
            "Try humming to help regulate your vocal emotions.",
            "Vocal warm-ups can help you express emotions more clearly.",
            "Record positive affirmations in your own voice to boost your mood."
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        dailyTipContent.innerHTML = `<p>${randomTip}</p>`;
        console.log("[JS] Daily tip loaded");
    }
    
    // Initialize progress chart
    function initProgressChart() {
        const ctx = document.getElementById('progressChart').getContext('2d');
        progressChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Positive', 'Negative', 'Neutral'],
                datasets: [{
                    label: 'Emotion Distribution',
                    data: [30, 20, 50],
                    backgroundColor: [
                        'rgba(102, 187, 106, 0.7)',
                        'rgba(239, 83, 80, 0.7)',
                        'rgba(255, 202, 40, 0.7)'
                    ],
                    borderColor: [
                        'rgba(102, 187, 106, 1)',
                        'rgba(239, 83, 80, 1)',
                        'rgba(255, 202, 40, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        console.log("[JS] Progress chart initialized");
    }
    
    // Update progress chart
    function updateProgressChart(period) {
        console.log("[JS] updateProgressChart called with period:", period);
        let positive, negative, neutral;
        if (period === 'daily') {
            positive = Math.floor(Math.random() * 30) + 50;
            negative = Math.floor(Math.random() * 20) + 10;
            neutral = 100 - positive - negative;
        } else if (period === 'weekly') {
            positive = Math.floor(Math.random() * 40) + 30;
            negative = Math.floor(Math.random() * 30) + 15;
            neutral = 100 - positive - negative;
        } else { // monthly
            positive = Math.floor(Math.random() * 50) + 20;
            negative = Math.floor(Math.random() * 40) + 10;
            neutral = 100 - positive - negative;
        }
    
        progressChart.data.datasets[0].data = [positive, negative, neutral];
        progressChart.update();
        console.log("[JS] Progress chart updated for:", period);
    }
    
    // Convert blob to base64
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    // Reset UI
    function resetUI() {
        isAnalyzing = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        audioChunks = [];
        console.log("[JS] UI reset");
    }
});

// Enhanced Live Server reload prevention
(function preventLiveServerReload() {
    console.log("Preventing Live Server auto-reload...");
    
    // Override window.location.reload
    const originalReload = window.location.reload;
    window.location.reload = function() {
        console.log("Blocked window.location.reload() to prevent Live Server interference");
        return false;
    };
    
    // Block Live Server WebSocket
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        // Block Live Server WebSocket connections
        if (url && (url.includes('livereload') || url.includes('ws://127.0.0.1') || url.includes('ws://localhost'))) {
            console.log("Blocked Live Server WebSocket connection:", url);
            return {
                addEventListener: () => {},
                removeEventListener: () => {},
                send: () => {},
                close: () => {},
                readyState: 3 // CLOSED
            };
        }
        
        // Allow other WebSocket connections
        const ws = protocols ? new originalWebSocket(url, protocols) : new originalWebSocket(url);
        
        // Block reload messages on any WebSocket
        ws.addEventListener('message', function(event) {
            if (event.data && (event.data === 'reload' || event.data.includes('reload'))) {
                console.log("Blocked Live Server reload message:", event.data);
                event.stopImmediatePropagation();
                return false;
            }
        });
        
        return ws;
    };
    
    // Block beforeunload events that might be triggered by Live Server
    window.addEventListener('beforeunload', function(event) {
        console.log("Blocked beforeunload event");
        event.preventDefault();
        return false;
    });
    
    // Override any automatic page refresh attempts
    if (window.setTimeout) {
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay, ...args) {
            // Check if this might be a Live Server refresh attempt
            if (typeof callback === 'function' && 
                (callback.toString().includes('reload') || 
                 callback.toString().includes('location'))) {
                console.log("Blocked suspicious setTimeout that might cause reload");
                return null;
            }
            return originalSetTimeout(callback, delay, ...args);
        };
    }
    
    console.log("Live Server reload prevention measures activated");
})();