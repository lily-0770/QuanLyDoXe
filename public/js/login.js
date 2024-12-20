async function login(event) {
  event.preventDefault();
  console.log("Login attempt started");

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  console.log("Login credentials:", { username });

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    console.log("Login response:", response);

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("loggedInUser", username);
      console.log("Login successful, stored user:", username);
      window.location.href = "/index.html";
    } else {
      console.log("Login failed");
      alert("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Có lỗi xảy ra khi đăng nhập.");
  }
}

document.getElementById("loginForm").addEventListener("submit", login);
