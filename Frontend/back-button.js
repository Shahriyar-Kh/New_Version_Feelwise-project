
  function goBack() {
    if (document.referrer) {
      // If user came from another page, go back to that page
      window.history.back();
    } else {
      // If no referrer (e.g. user opened page directly), redirect to homepage or default page
      window.location.href = '/';  // change '/' to your default URL if needed
    }
  }