document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Hiển thị thông báo lỗi từ server
      document.getElementById("loginError").textContent = data.message;
      document.getElementById("loginError").style.display = "block";
      return;
    }

    // Nếu đăng nhập thành công
    localStorage.setItem("loggedInUser", username);
    window.location.href = "/index.html";
  } catch (error) {
    console.error("Login error:", error);
    document.getElementById("loginError").textContent = "Lỗi kết nối server";
    document.getElementById("loginError").style.display = "block";
  }
});
