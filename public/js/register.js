const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const usernameWarning = document.getElementById("usernameWarning");
const passwordWarning = document.getElementById("passwordWarning");
const form = document.getElementById("register-form");

// Kiểm tra username hợp lệ (5-20 ký tự, chỉ chữ và số)
function isValidUsername(username) {
  return /^[a-zA-Z0-9]{5,20}$/.test(username);
}

// Kiểm tra password hợp lệ (8-32 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt)
function isValidPassword(password) {
  const minLength = 8;
  const maxLength = 32;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    password.length <= maxLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
}

// Kiểm tra username khi nhập
usernameInput.addEventListener("input", function () {
  const value = this.value;

  // Xóa kí tự đặc biệt và dấu cách
  this.value = value.replace(/[^a-zA-Z0-9]/g, "");

  // Kiểm tra độ dài và hiển thị cảnh báo
  if (this.value.length > 20) {
    this.value = this.value.slice(0, 20);
    usernameWarning.textContent = "Tên đăng nhập không được quá 20 kí tự!";
    usernameWarning.style.display = "block";
  } else if (this.value.length < 5) {
    usernameWarning.textContent = "Tên đăng nhập phải có ít nhất 5 kí tự!";
    usernameWarning.style.display = "block";
  } else if (value !== this.value) {
    usernameWarning.textContent = "Tên đăng nhập chỉ được chứa chữ cái và số!";
    usernameWarning.style.display = "block";
  } else {
    usernameWarning.style.display = "none";
  }
});

// Kiểm tra password khi nhập
passwordInput.addEventListener("input", function () {
  if (!isValidPassword(this.value)) {
    passwordWarning.style.display = "block";
    if (this.value.length < 8) {
      passwordWarning.textContent = "Mật khẩu phải có ít nhất 8 kí tự!";
    } else if (this.value.length > 32) {
      passwordWarning.textContent = "Mật khẩu không được quá 32 kí tự!";
    } else {
      passwordWarning.textContent =
        "Mật khẩu phải chứa chữ hoa, chữ thường, số và kí tự đặc biệt!";
    }
  } else {
    passwordWarning.style.display = "none";
  }
});

// Xử lý submit form
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = usernameInput.value;
  const password = passwordInput.value;
  const messageDiv = document.getElementById("message");

  // Kiểm tra username và password hợp lệ
  if (!isValidUsername(username)) {
    messageDiv.style.color = "#ff4444";
    if (username.length > 20) {
      messageDiv.textContent = "Tên đăng nhập không được quá 20 kí tự";
    } else if (username.length < 5) {
      messageDiv.textContent = "Tên đăng nhập phải có ít nhất 5 kí tự";
    } else {
      messageDiv.textContent = "Tên đăng nhập chỉ được chứa chữ cái và số";
    }
    return;
  }

  if (!isValidPassword(password)) {
    messageDiv.style.color = "#ff4444";
    messageDiv.textContent =
      "Mật khẩu không đủ mạnh. Vui lòng đảm bảo mật khẩu có ít nhất 8 kí tự, bao gồm chữ hoa, chữ thường, số và kí tự đặc biệt!";
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
