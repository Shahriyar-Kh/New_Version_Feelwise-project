// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDxAIu56jBu1MZdAYLfqg2tra9JvPgDqKU",
    authDomain: "feelwise-c8106.firebaseapp.com",
    projectId: "feelwise-c8106",
    storageBucket: "feelwise-c8106.firebasestorage.app",
    messagingSenderId: "655008171343",
    appId: "1:655008171343:web:8295fb002865ecc2c8f13a"
  };
  
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  const firstTimeContent = document.getElementById('first-time-content');
  const returningUserContent = document.getElementById('returning-user-content');
  const onboardingTour = document.getElementById('onboarding-tour');
  const tourNextBtn = document.getElementById('tour-next-btn');
  const tourSkipBtn = document.getElementById('tour-skip-btn');
  const profileForm = document.getElementById('profile-form');
  const trackMoodBtn = document.getElementById('track-mood-btn');
  const userNameSpan = document.getElementById('user-name');
  const badgesContainer = document.getElementById('badges-container');
  const progressBars = document.getElementById('progress-bars');
  const selfAwarenessProgress = document.getElementById('self-awareness-progress');
  const selfRegulationProgress = document.getElementById('self-regulation-progress');
  
  // User data
  let currentUser = null;
  
  // User authentication and profile setup
  document.addEventListener('DOMContentLoaded', function () {
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUser = user;
        checkUserData(user.uid);
      } else {
        window.location.href = 'login.html';
      }
    });
  });
  
  // Check if the user is first-time or returning
  function checkUserData(userId) {
    db.collection('users').doc(userId).get().then(doc => {
      if (doc.exists) {
        showReturningUserContent(doc.data());
      } else {
        showFirstTimeContent();
      }
    });
  }
  
  // Show first-time user form
  function showFirstTimeContent() {
    firstTimeContent.style.display = 'block';
    returningUserContent.style.display = 'none';
  
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const age = document.getElementById('age').value;
      const preferences = document.getElementById('preferences').value.split(',');
      const struggles = document.getElementById('struggles').value.split(',');
      const reminderTime = document.getElementById('reminderTime').value;
  
      const userDoc = {
        name,
        age,
        preferences,
        struggles,
        reminderTime,
        progress: { selfAwareness: 0, selfRegulation: 0 },
        badges: [],
        moodHistory: [],
        completedChallenges: [],
      };
  
      db.collection('users').doc(currentUser.uid).set(userDoc).then(() => {
        showReturningUserContent(userDoc);
      });
    });
  }
  
  // Show returning user content (dashboard)
  function showReturningUserContent(userData) {
    firstTimeContent.style.display = 'none';
    returningUserContent.style.display = 'block';
  
    userNameSpan.textContent = userData.name;
    loadBadges(userData);
    loadProgress(userData);
  }
  
  // Load badges
  function loadBadges(userData) {
    badgesContainer.innerHTML = '';
    const badges = userData.badges || [];
    badges.forEach(badge => {
      const badgeDiv = document.createElement('div');
      badgeDiv.classList.add('badge');
      badgeDiv.innerHTML = `<i class="fas fa-medal"></i><div>${badge}</div>`;
      badgesContainer.appendChild(badgeDiv);
    });
  }
  
  // Load progress
  function loadProgress(userData) {
    const progress = userData.progress || {};
    selfAwarenessProgress.style.width = `${progress.selfAwareness}%`;
    selfRegulationProgress.style.width = `${progress.selfRegulation}%`;
  }
  
  // Mood tracking functionality
  trackMoodBtn.addEventListener('click', function () {
    alert('Tracking mood...');
    // Add code to track mood here
  });
  