const usernameInput = document.getElementById("username");
const usernameWarning = document.getElementById("usernameWarning");
const form = document.getElementById("register-form");

// Kiểm tra kí tự hợp lệ (chỉ cho phép chữ cái và số)
function isValidUsername(username) {
  return /^[a-zA-Z0-9]+$/.test(username);
}

usernameInput.addEventListener("input", function () {
  const value = this.value;

  // Xóa kí tự đặc biệt và dấu cách
  this.value = value.replace(/[^a-zA-Z0-9]/g, "");

  // Hiển thị cảnh báo nếu có kí tự không hợp lệ
  if (value !== this.value) {
    usernameWarning.style.display = "block";
  } else {
    usernameWarning.style.display = "none";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const messageDiv = document.getElementById("message");

  // Kiểm tra username hợp lệ trước khi gửi
  if (!isValidUsername(username)) {
    messageDiv.style.color = "#ff4444";
    messageDiv.textContent = "Tên đăng nhập chỉ được chứa chữ cái và số";
    return;
  }

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.style.color = "#4CAF50";
      messageDiv.textContent = "Đăng ký thành công!";
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 1500);
    } else {
      messageDiv.style.color = "#ff4444";
      messageDiv.textContent = data.message || "Đăng ký thất bại";
    }
  } catch (error) {
    messageDiv.style.color = "#ff4444";
    messageDiv.textContent = "Có lỗi xảy ra";
  }
});
