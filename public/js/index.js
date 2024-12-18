function showSection(section) {
  document.getElementById("bikeSection").classList.add("d-none");
  document.getElementById("motorbikeSection").classList.add("d-none");
  document.getElementById(section + "Section").classList.remove("d-none");
}

function openRegisterForm(spaceId, type) {
  console.log("Opening register form:", {
    spaceId,
    type,
  });

  document.getElementById("registerForm").classList.remove("d-none");
  document.getElementById("parkingId").value = spaceId;
  document.getElementById("vehicleType").value =
    type === "bike" ? "Xe đạp / Xe đạp điện" : "Xe máy / Xe máy điện";

  setTimeout(() => {
    document.getElementById("registerForm").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
}

function closeRegisterForm() {
  document.getElementById("registerForm").classList.add("d-none");
}

async function submitRegistration(event) {
  event.preventDefault();
  const parkingId = document.getElementById("parkingId").value;
  const vehicleType = document.getElementById("vehicleType").value;
  const licensePlate = document.getElementById("licensePlate").value;
  const studentClass = document.getElementById("studentClass").value;
  const username = localStorage.getItem("loggedInUser");

  try {
    // Kiểm tra xem người dùng đã đăng ký chỗ nào chưa
    const response = await fetch("/api/parking-records");
    const records = await response.json();
    const existingRegistration = records.find(
      (record) => record.username === username
    );

    if (existingRegistration) {
      alert("Bạn đã đăng ký một chỗ rồi. Không thể đăng ký thêm!");
      closeRegisterForm();
      return;
    }

    // Tiếp tục đăng ký nếu chưa có chỗ nào
    const registerResponse = await fetch("/api/parking-records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parkingId,
        vehicleType,
        licensePlate,
        studentClass,
        username,
      }),
    });

    const result = await registerResponse.json();
    if (registerResponse.ok) {
      alert(
        `Đăng ký thành công! Chỗ đỗ xe của bạn sẽ hết hạn vào ngày ${result.expiryDate}`
      );
      closeRegisterForm();
      updateParkingStatus();
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Đăng ký thất bại. Vui lòng thử lại.");
  }
}

function scrollToForm() {
  document
    .getElementById("registerForm")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

async function checkLoginStatus() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  console.log("Current logged in user:", loggedInUser);

  const authSection = document.getElementById("auth-section");
  const loginSection = document.getElementById("login-section");
  const userSection = document.getElementById("user-section");
  const logoutSection = document.getElementById("logout-section");
  const dashboardSection = document.getElementById("dashboard-section");

  if (loggedInUser) {
    // Người dùng đã đăng nhập
    authSection.classList.add("d-none");
    loginSection.classList.add("d-none");
    userSection.classList.remove("d-none");
    logoutSection.classList.remove("d-none");
    dashboardSection.classList.remove("d-none");

    document.getElementById(
      "username-display"
    ).textContent = `Xin chào, ${loggedInUser}`;
  } else {
    // Chưa đăng nhập
    authSection.classList.remove("d-none");
    loginSection.classList.remove("d-none");
    userSection.classList.add("d-none");
    logoutSection.classList.add("d-none");
    dashboardSection.classList.add("d-none");
  }
}

// Xử lý đăng xuất
document.getElementById("logout-link")?.addEventListener("click", function (e) {
  e.preventDefault();
  localStorage.removeItem("loggedInUser");
  updateRegisterButtonsVisibility();
  checkLoginStatus();
  window.location.reload();
});

// Tạo các chỗ đỗ xe khi trang đợc load
function generateParkingSpaces() {
  // Tạo chỗ đỗ xe đạp
  const bikeContainer = document.querySelector("#bikeSection .row");
  for (let spaceId = 1; spaceId <= 174; spaceId++) {
    const div = document.createElement("div");
    div.className = "col-md-4 mb-4";
    div.id = `bike-space-${spaceId}`;
    div.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Chỗ số: ${spaceId}</h5>
                    <p class="status-box status-available" id="bike-status-${spaceId}">Còn trống</p>
                    <button class="btn btn-primary w-100" onclick="openRegisterForm(${spaceId}, 'bike')">Đăng ký</button>
                </div>
            </div>
        `;
    bikeContainer.appendChild(div);
  }

  // Tạo chỗ đỗ xe máy
  const motorbikeContainer = document.querySelector("#motorbikeSection .row");
  for (let spaceId = 175; spaceId <= 930; spaceId++) {
    const div = document.createElement("div");
    div.className = "col-md-4 mb-4";
    div.id = `motorbike-space-${spaceId}`;
    div.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Chỗ số: ${spaceId}</h5>
                    <p class="status-box status-available" id="motorbike-status-${spaceId}">Còn trống</p>
                    <button class="btn btn-primary w-100" onclick="openRegisterForm(${spaceId}, 'motorbike')">Đăng ký</button>
                </div>
            </div>
        `;
    motorbikeContainer.appendChild(div);
  }
}

// Thêm event listener cho sự kiện parkingStatusChanged
window.addEventListener("parkingStatusChanged", () => {
  updateParkingStatus();
});

// Cập nhật hàm updateParkingStatus
async function updateParkingStatus() {
  try {
    const currentUser = localStorage.getItem("loggedInUser");
    const response = await fetch("/api/parking-records");
    const records = await response.json();

    // Kiểm tra xem người dùng hiện tại đã đăng ký chỗ nào chưa
    const userRegistration = records.find(
      (record) => record.username === currentUser
    );

    // Reset tất cả các chỗ về trạng thái mặc định
    document.querySelectorAll(".status-box").forEach((box) => {
      box.textContent = "Còn trống";
      box.className = "status-box status-available";
    });

    // Cập nhật trạng thái các nút đăng ký
    document
      .querySelectorAll("button[onclick*='openRegisterForm']")
      .forEach((button) => {
        if (userRegistration) {
          button.disabled = true;
          button.textContent = "Không khả dụng";
          button.className = "btn btn-secondary w-100";
          button.onclick = null; // Xóa event onclick
        } else {
          button.disabled = false;
          button.textContent = "Đăng ký";
          button.className = "btn btn-primary w-100";
        }
      });

    // Cập nhật hiển thị cho các chỗ đã đăng ký
    records.forEach((record) => {
      const type =
        record.vehicleType === "Xe đạp / Xe đạp điện" ? "bike" : "motorbike";
      const statusBox = document.getElementById(
        `${type}-status-${record.parkingId}`
      );
      const card = document.querySelector(`#${type}-space-${record.parkingId}`);
      const button = card?.querySelector("button");

      if (statusBox && button) {
        if (record.username === currentUser) {
          // Chỗ của người dùng hiện tại
          statusBox.textContent = `Chỗ của bạn (còn ${record.daysLeft} ngày - hết hạn ${record.expiryDate})`;
          statusBox.className = "status-box my-registration";
          card.className = "card my-registration";
          button.disabled = false;
          button.textContent = "Đã đăng ký";
          button.className = "btn btn-success w-100";
        } else {
          // Chỗ của người khác
          statusBox.textContent = "Đã có người đăng ký";
          statusBox.className = "status-box status-occupied";
          card.className = "card occupied";
          button.disabled = true;
          button.textContent = "Không khả dụng";
          button.className = "btn btn-secondary w-100";
        }
      }
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

// Cập nhật DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  updateRegisterButtonsVisibility();
  checkLoginStatus();
  generateParkingSpaces();
  updateParkingStatus();
});

// Thêm event listener cho khi focus li trang
window.addEventListener("focus", updateParkingStatus);

// Thêm function kiểm tra đăng nhập khi trang load
document.addEventListener("DOMContentLoaded", function () {
  console.log("Page loaded, checking initial state");
  // Cập nhật biến toàn cục
  loggedInUser = localStorage.getItem("loggedInUser");

  console.log("Initial login check:", {
    loggedInUser,
    loginSection: document.getElementById("login-section"),
    userSection: document.getElementById("user-section"),
    logoutSection: document.getElementById("logout-section"),
  });

  // Cập nhật UI dựa trên trạng thái đăng nhập
  if (loggedInUser) {
    document.getElementById("login-section").classList.add("d-none");
    document.getElementById("user-section").classList.remove("d-none");
    document.getElementById("logout-section").classList.remove("d-none");
    document.getElementById(
      "username-display"
    ).textContent = `Xin chào, ${loggedInUser}`;
  } else {
    document.getElementById("login-section").classList.remove("d-none");
    document.getElementById("user-section").classList.add("d-none");
    document.getElementById("logout-section").classList.add("d-none");
  }
});

// Thêm logs để debug
console.log("Checking localStorage:", {
  loggedInUser: localStorage.getItem("loggedInUser"),
  allKeys: Object.keys(localStorage),
});

// Gọi function khi trang load
document.addEventListener("DOMContentLoaded", function () {
  updateRegisterButtonsVisibility();
  checkLoginStatus();
});

// Thêm function để ẩn/hiện nút đăng ký
function updateRegisterButtonsVisibility() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  const registerButtons = document.querySelectorAll(
    'button[onclick*="openRegisterForm"]'
  );

  registerButtons.forEach((button) => {
    if (!loggedInUser) {
      button.style.display = "none"; // Ẩn nút khi chưa đăng nhập
    } else {
      button.style.display = "block"; // Hiện nút khi đã đăng nhập
    }
  });
}
