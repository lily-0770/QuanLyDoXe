document.addEventListener("DOMContentLoaded", async function () {
  console.log("Dashboard loading...");

  const serverOk = await checkServerStatus();
  if (!serverOk) {
    alert(
      "Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối và refresh trang."
    );
    return;
  }

  if (await checkAuth()) {
    await loadParkingRecords();
    await loadAdminPanel();
    setupSearch();
  }
});

async function checkAuth() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  console.log("Checking auth for user:", loggedInUser);

  if (!loggedInUser) {
    console.log("No user found, redirecting to index");
    window.location.href = "/index.html";
    return false;
  }

  document.getElementById(
    "username-display"
  ).textContent = `Xin chào, ${loggedInUser}`;
  return true;
}

document.getElementById("logout-link").addEventListener("click", function (e) {
  e.preventDefault();
  localStorage.removeItem("loggedInUser");
  window.location.href = "/index.html";
});

async function loadParkingRecords() {
  try {
    if (!(await checkAuth())) return;

    console.log("Loading parking records...");
    const response = await fetch("/api/parking-records", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-User": localStorage.getItem("loggedInUser"),
      },
      credentials: "same-origin",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server response:", errorText);
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const records = await response.json();
    console.log("Received records:", records);
    await displayParkingRecords(records);
  } catch (error) {
    console.error("Error details:", error);
    alert(`Không thể tải dữ liệu đăng ký. Lỗi: ${error.message}`);
  }
}

async function checkIsAdmin() {
  try {
    const response = await fetch("/api/check-admin", {
      headers: {
        "X-User": localStorage.getItem("loggedInUser"),
      },
    });
    console.log("Admin check response:", response);

    if (!response.ok) {
      throw new Error("Không thể kiểm tra quyền admin");
    }

    const data = await response.json();
    console.log("Admin check data:", data);
    return data;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return { isAdmin: false, isSuperAdmin: false };
  }
}

async function displayParkingRecords(records) {
  const tbody = document.getElementById("parkingRecords");
  const loggedInUser = localStorage.getItem("loggedInUser");
  const { isAdmin, isSuperAdmin } = await checkIsAdmin();

  tbody.innerHTML = "";

  records.forEach((record) => {
    const tr = document.createElement("tr");
    const showCancelButton =
      (isAdmin || isSuperAdmin || record.username === loggedInUser) &&
      record.status !== "pending_cancellation" &&
      record.status !== "cancelled";

    const showApprovalButtons =
      (isAdmin || isSuperAdmin) && record.status === "pending_cancellation";

    tr.innerHTML = `
        <td>${record.parkingId}</td>
        <td>${record.vehicleType}</td>
        <td>${record.licensePlate}</td>
        <td>${record.studentClass}</td>
        <td>${new Date(record.registrationTime).toLocaleString()}</td>
        <td>${record.username}</td>
        <td>
            <span class="status-${record.status.toLowerCase()}">
                ${
                  record.status === "pending_cancellation"
                    ? "Đang chờ duyệt hủy"
                    : record.status === "cancelled"
                    ? "Đã hủy"
                    : record.status
                }
            </span>
            ${
              record.status === "pending_cancellation"
                ? `<br><small class="text-muted">Lý do: ${record.cancelReason}</small>`
                : ""
            }
        </td>
        <td>
            ${
              showCancelButton
                ? `
                <button class="btn btn-sm btn-danger btn-action"
                    onclick="cancelRegistration('${record.parkingId}', '${
                    record.vehicleType
                  }')">
                    ${isAdmin || isSuperAdmin ? "Hủy ngay" : "Yêu cầu hủy"}
                </button>
            `
                : ""
            }
            ${
              showApprovalButtons
                ? `
                <div class="btn-group">
                    <button class="btn btn-sm btn-success" onclick="approveCancelRequest('${record.parkingId}', true)">
                        Duyệt
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="approveCancelRequest('${record.parkingId}', false)">
                        Từ chối
                    </button>
                </div>
            `
                : ""
            }
        </td>
    `;
    tbody.appendChild(tr);
  });
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      const searchTerm = e.target.value.toLowerCase();
      const tbody = document.getElementById("parkingRecords");
      const rows = tbody.getElementsByTagName("tr");

      Array.from(rows).forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? "" : "none";
      });
    });
  }
}

async function cancelRegistration(parkingId, vehicleType) {
  const { isAdmin, isSuperAdmin } = await checkIsAdmin();

  if (isAdmin || isSuperAdmin) {
    if (!confirm("Bạn có chắc muốn hủy đăng ký này không?")) return;

    try {
      const cancelResponse = await fetch("/api/admin/cancel-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User": localStorage.getItem("loggedInUser"),
        },
        body: JSON.stringify({
          parkingId,
        }),
      });

      const responseText = await cancelResponse.text();

      if (!cancelResponse.ok) {
        let errorMessage;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message;
        } catch (e) {
          errorMessage = responseText;
        }
        throw new Error(errorMessage || "Không thể hủy đăng ký");
      }

      alert("Đã hủy đăng ký thành công!");

      try {
        await loadParkingRecords();
        console.log("Đã tải lại dữ liệu sau khi hủy");
      } catch (reloadError) {
        console.error("Lỗi khi tải lại dữ liệu:", reloadError);
        window.location.reload();
      }

      return;
    } catch (error) {
      console.error("Error:", error);
      alert("Lỗi khi hủy đăng ký: " + error.message);
      return;
    }
  }

  const confirmDialog = document.createElement("div");
  confirmDialog.innerHTML = `
    <div class="modal fade" id="cancelModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Yêu cầu hủy đăng ký</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="cancelForm">
              <div class="mb-3">
                <label class="form-label">Lý do hủy:</label>
                <textarea class="form-control" id="cancelReason" required></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            <button type="button" class="btn btn-danger" id="submitCancel">Gửi yêu cầu</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(confirmDialog);

  const modal = new bootstrap.Modal(document.getElementById("cancelModal"));
  modal.show();

  document
    .getElementById("submitCancel")
    .addEventListener("click", async () => {
      const reason = document.getElementById("cancelReason").value;
      if (!reason) {
        alert("Vui lòng nhập lý do hủy");
        return;
      }

      try {
        const records = await fetch("/api/parking-records").then((r) =>
          r.json()
        );
        const record = records.find((r) => r.parkingId === parkingId);

        const response = await fetch("/api/cancel-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User": localStorage.getItem("loggedInUser"),
          },
          body: JSON.stringify({
            parkingId,
            username: record.username,
            licensePlate: record.licensePlate,
            studentClass: record.studentClass,
            reason,
            immediate: false,
          }),
        });

        if (!response.ok) throw new Error("Failed to send cancel request");

        modal.hide();
        alert("Yêu cầu hủy đã được gửi. Vui lòng chờ admin phê duyệt.");
        await loadParkingRecords();
      } catch (error) {
        console.error("Error:", error);
        alert("Không thể gửi yêu cầu hủy. Vui lòng thử lại sau.");
      }
    });
}

async function checkRecords() {
  try {
    const response = await fetch("/api/check-records");
    const data = await response.json();
    console.log("Records check:", data);
    return data;
  } catch (error) {
    console.error("Error checking records:", error);
    return null;
  }
}

async function checkServerStatus() {
  try {
    const response = await fetch("/api/health-check");
    return response.ok;
  } catch (error) {
    console.error("Server check failed:", error);
    return false;
  }
}

let adminModal;

async function loadAdminPanel() {
  const { isAdmin, isSuperAdmin } = await checkIsAdmin();
  console.log("Admin check result:", { isAdmin, isSuperAdmin });

  const adminPanelLink = document.getElementById("admin-panel-link");
  if (!adminPanelLink) {
    console.error("Admin panel link not found!");
    return;
  }

  if (isSuperAdmin) {
    console.log("User is super admin, showing panel");
    adminPanelLink.style.display = "block";

    const modalElement = document.getElementById("adminModal");
    if (!modalElement) {
      console.error("Admin modal element not found!");
      return;
    }

    adminModal = new bootstrap.Modal(modalElement);

    adminPanelLink.onclick = async (e) => {
      e.preventDefault();
      console.log("Admin panel clicked");
      try {
        await refreshAdminList();
        adminModal.show();
      } catch (error) {
        console.error("Error showing admin panel:", error);
        alert("Không thể mở bảng quản lý admin: " + error.message);
      }
    };
  } else {
    console.log("User is not super admin, hiding panel");
    adminPanelLink.style.display = "none";
  }
}

async function refreshAdminList() {
  try {
    const response = await fetch("/api/admin-list", {
      headers: {
        "X-User": localStorage.getItem("loggedInUser"),
      },
    });

    if (!response.ok) throw new Error("Không thể tải danh sách admin");

    const { admins } = await response.json();
    const adminList = document.getElementById("adminList");
    adminList.innerHTML = "";

    admins.forEach((admin) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        ${admin}
        ${
          admin !== "admin" && admin !== "admin123"
            ? `
          <button class="btn btn-sm btn-danger" onclick="removeAdmin('${admin}')">
            Xóa
          </button>
        `
            : ""
        }
      `;
      adminList.appendChild(li);
    });
  } catch (error) {
    console.error("Error loading admin list:", error);
  }
}

async function addAdmin() {
  const username = document.getElementById("modalAdminUsername").value.trim();
  if (!username) {
    alert("Vui lòng nhập tên người dùng!");
    return;
  }

  try {
    const response = await fetch("/api/manage-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User": localStorage.getItem("loggedInUser"),
      },
      body: JSON.stringify({ action: "add", username }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không thể thêm admin");
    }

    document.getElementById("modalAdminUsername").value = "";
    await refreshAdminList();
    alert("Đã thêm admin thành công!");
  } catch (error) {
    console.error("Error adding admin:", error);
    alert(error.message);
  }
}

async function removeAdmin(username) {
  if (!confirm(`Bạn có chắc muốn xóa quyền admin của ${username}?`)) return;

  try {
    const response = await fetch("/api/manage-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User": localStorage.getItem("loggedInUser"),
      },
      body: JSON.stringify({ action: "remove", username }),
    });

    if (!response.ok) throw new Error("Không thể xóa admin");

    await refreshAdminList();
    alert("Đã xóa admin thành công!");
  } catch (error) {
    alert("Lỗi khi xóa admin: " + error.message);
  }
}

async function approveCancelRequest(parkingId, approved) {
  try {
    const response = await fetch("/api/approve-cancel-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User": localStorage.getItem("loggedInUser"),
      },
      body: JSON.stringify({
        parkingId,
        approved,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    alert(approved ? "Đã duyệt yêu cầu hủy" : "Đã từ chối yêu cầu hủy");
    await loadParkingRecords();
  } catch (error) {
    console.error("Error:", error);
    alert("Lỗi khi xử lý yêu cầu: " + error.message);
  }
}

document.getElementById("exportButton").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/export-user-list", {
      headers: {
        "x-user": localStorage.getItem("loggedInUser"),
      },
    });

    if (response.ok) {
      // Tự động tải file Excel
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "danh-sach-nguoi-dung.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert("Không có quyền xuất dữ liệu");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Lỗi khi xuất dữ liệu");
  }
});
