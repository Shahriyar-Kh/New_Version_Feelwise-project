function toggleFAQPanel() {
    const panel = document.getElementById('faq-panel');
    panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
  }
  

    // Function to handle slide-in effect on scroll
function initSlideInOnScroll(selector, threshold = 0.2) {
  const elements = document.querySelectorAll(selector);

  if (!elements.length) return; // Exit if no elements found

  const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
          if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observer.unobserve(entry.target); // Stop observing once visible
          }
      });
  }, { threshold });

  elements.forEach((el) => observer.observe(el));
}

// Initialize the function on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  initSlideInOnScroll(".slide-in"); // Apply to all elements with class 'slide-in'
});
function toggleFAQPanel() {
  const panel = document.getElementById('faq-panel');
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}
  


var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;

// 2. Create the player when API is ready
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '415',
    width: '800',
    videoId: '7CBfCW67xT8', // The video ID from YouTube
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// 3. Optional: Autoplay or other actions when player is ready
function onPlayerReady(event) {
  console.log("Player is ready");
  // Uncomment to autoplay:
  // event.target.playVideo();
}

// 4. Handle player state changes
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING) {
    console.log("Video is playing");
  } else if (event.data == YT.PlayerState.PAUSED) {
    console.log("Video is paused");
  } else if (event.data == YT.PlayerState.ENDED) {
    console.log("Video ended");
  }
}
