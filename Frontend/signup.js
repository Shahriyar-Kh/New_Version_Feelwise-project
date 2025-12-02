const API_BASE = "http://localhost:5000/api/auth";

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Signup clicked"); // debug

  const fullName = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const imageFile = document.getElementById("image")
    ? document.getElementById("image").files[0]
    : null;

  // Email validate
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) return alert("Invalid email format");

  try {
    // Check email exists
    const checkRes = await fetch(`${API_BASE}/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const checkData = await checkRes.json();
    if (checkData.exists) return alert("This email is already registered.");

    // FormData
    const form = new FormData();
    form.append("username", fullName);
    form.append("email", email);
    form.append("password", password);
    if (imageFile) form.append("image", imageFile);

    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      body: form,
    });
    const dataText = await res.text(); // raw response
    console.log("Raw response:", dataText);
    let data;
    try {
      data = JSON.parse(dataText);
    } catch {
      data = { error: dataText };
    }

    if (!res.ok) return alert(data.error || "Signup failed");

    alert("Signup successful! Please login.");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Signup error:", err);
    alert("An error occurred. Check console.");
  }
});
