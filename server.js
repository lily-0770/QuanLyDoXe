const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const nodemailer = require("nodemailer");
const schedule = require("node-schedule");

const app = express();
const parkingRecordsFile = "parking-records.json";
const ADMIN_EMAIL = "lkamod433@gmail.com"; // Thay bằng email của bạn

const PORT = process.env.PORT || 5000;
const SUPER_ADMIN = process.env.SUPER_ADMIN || "lily_0770";
let adminUsers = [];

// Đảm bảo file admin-users.json tồn tại
function ensureAdminFile() {
  if (!fs.existsSync("admin-users.json")) {
    fs.writeFileSync("admin-users.json", JSON.stringify([]), "utf8");
  }
  try {
    adminUsers = JSON.parse(fs.readFileSync("admin-users.json", "utf8"));
  } catch (error) {
    console.error("Error loading admin users:", error);
    adminUsers = [];
  }
}

// Gọi hàm khi khởi động server
ensureAdminFile();

// Thêm hàm ensureFileExists
function ensureFileExists(filename, defaultContent = "[]") {
  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, defaultContent, "utf8");
    console.log(`Created new file: ${filename}`);
  }
}

// Middleware
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.static("."));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Đăng ký người dùng
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = { username, password: hashedPassword };

    // Lưu vào file JSON
    const filePath = "users.json";
    let users = [];

    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      users = JSON.parse(fileData);
    }

    // Kiểm tra nếu username đã tồn tại
    if (users.find((user) => user.username === username)) {
      return res.status(400).json({ message: "Username already exists." });
    }

    users.push(userData);
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    res.json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  console.log("Received login request:", req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    console.log("Missing username or password");
    return res
      .status(400)
      .json({ message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu" });
  }

  try {
    const filePath = "users.json";
    console.log("Checking file:", filePath);

    if (!fs.existsSync(filePath)) {
      console.log("Users file not found");
      return res.status(400).json({ message: "Tài khoản không tồn tại" });
    }

    const fileData = fs.readFileSync(filePath, "utf-8");
    const users = JSON.parse(fileData);
    console.log("Found users:", users.length);

    const user = users.find((u) => u.username === username);
    if (!user) {
      console.log("User not found:", username);
      return res.status(400).json({ message: "Tài khoản không tồn tại" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    console.log("Password valid:", validPassword);

    if (!validPassword) {
      return res.status(400).json({ message: "Mật khẩu không chính xác" });
    }

    res.json({ message: "Đăng nhập thành công!" });
  } catch (error) {
    console.error("Detailed login error:", error);
    res.status(500).json({ message: error.message || "Lỗi server" });
  }
});

app.post("/api/parking-records", async (req, res) => {
  try {
    const { parkingId, vehicleType, licensePlate, studentClass, username } =
      req.body;
    const registrationDate = new Date();
    const lastDayOfMonth = new Date(
      registrationDate.getFullYear(),
      registrationDate.getMonth() + 1,
      0
    );

    const newRecord = {
      parkingId,
      vehicleType,
      licensePlate,
      studentClass,
      username,
      registrationTime: registrationDate.toISOString(),
      expiryDate: lastDayOfMonth.toISOString(),
      status: "active",
    };

    let records = [];
    try {
      records = JSON.parse(fs.readFileSync(parkingRecordsFile, "utf8"));
    } catch (error) {
      records = [];
    }

    if (records.some((record) => record.parkingId === parkingId)) {
      return res.status(400).json({ message: "Chỗ này đã có người đăng ký" });
    }

    if (records.some((record) => record.username === username)) {
      return res.status(400).json({ message: "Bạn đã đăng ký một chỗ rồi" });
    }

    records.push(newRecord);
    fs.writeFileSync(parkingRecordsFile, JSON.stringify(records, null, 2));

    res.json({
      message: "Đăng ký thành công",
      record: newRecord,
      expiryDate: lastDayOfMonth.toLocaleDateString("vi-VN"),
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

app.get("/api/parking-records", (req, res) => {
  try {
    const records = JSON.parse(fs.readFileSync(parkingRecordsFile, "utf8"));
    const currentDate = new Date();
    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();

    // Thêm thông tin về thời gian còn lại trong tháng cho mỗi đăng ký
    const recordsWithTimeLeft = records.map((record) => {
      const registrationDate = new Date(record.registrationTime);
      const daysLeft = lastDayOfMonth - currentDate.getDate();

      return {
        ...record,
        daysLeft,
        expiryDate: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          lastDayOfMonth
        ).toLocaleDateString("vi-VN"),
      };
    });

    res.json(recordsWithTimeLeft);
  } catch (error) {
    console.error("Error reading records:", error);
    res.status(500).json({ error: "Không thể đọc dữ liệu" });
  }
});

app.delete("/api/parking-records/:id", (req, res) => {
  try {
    const records = JSON.parse(fs.readFileSync(parkingRecordsFile, "utf8"));
    const updatedRecords = records.filter(
      (record) => record.parkingId !== req.params.id
    );
    fs.writeFileSync(
      parkingRecordsFile,
      JSON.stringify(updatedRecords, null, 2)
    );
    res.json({ success: true, message: "Registration cancelled successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Thêm route test để kiểm tra server
app.get("/test", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Cấu hình email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: ADMIN_EMAIL,
    pass: "thienkim123", // Mật khẩu ứng dụng từ Google
  },
});

// Hàm kiểm tra và reset đăng ký theo tháng
async function checkAndResetExpiredRecords() {
  try {
    const records = JSON.parse(fs.readFileSync(parkingRecordsFile, "utf8"));
    const currentDate = new Date();

    // Lọc ra các record chưa hết hạn
    const updatedRecords = records.filter((record) => {
      const registrationDate = new Date(record.registrationTime);

      // Kiểm tra xem đã sang tháng mới chưa
      return (
        registrationDate.getMonth() === currentDate.getMonth() &&
        registrationDate.getFullYear() === currentDate.getFullYear()
      );
    });

    // Nếu có record hết hạn thì cập nhật file
    if (records.length !== updatedRecords.length) {
      console.log(
        `Đã xóa ${
          records.length - updatedRecords.length
        } đăng ký hết hạn tháng trước`
      );
      fs.writeFileSync(
        parkingRecordsFile,
        JSON.stringify(updatedRecords, null, 2)
      );
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra đăng ký hết hạn:", error);
  }
}

// Lên lịch chạy vào 00:00:01 ngày đầu tiên của mỗi tháng
schedule.scheduleJob("1 0 0 1 * *", checkAndResetExpiredRecords);

// Chạy kiểm tra khi khởi động server
checkAndResetExpiredRecords();

// API gửi yêu cầu hủy (không gửi email)
app.post("/api/cancel-request", async (req, res) => {
  try {
    const { parkingId, username, licensePlate, studentClass, reason } =
      req.body;

    // Cập nhật trạng thái trong file
    const records = JSON.parse(fs.readFileSync(parkingRecordsFile, "utf8"));
    const updatedRecords = records.map((record) => {
      if (record.parkingId === parkingId) {
        return {
          ...record,
          status: "pending_cancellation",
          cancelReason: reason,
          cancelRequestTime: new Date().toISOString(),
        };
      }
      return record;
    });

    fs.writeFileSync(
      parkingRecordsFile,
      JSON.stringify(updatedRecords, null, 2)
    );

    res.json({ success: true, message: "Yêu cầu hủy đã được gửi" });
  } catch (error) {
    console.error("Error processing cancel request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API mới để admin duyệt yêu cầu hủy
app.post("/api/approve-cancel-request", async (req, res) => {
  try {
    const { parkingId, approved } = req.body;
    const requestUser = req.headers["x-user"];

    // Kiểm tra quyền admin
    const isSuperAdmin = requestUser === SUPER_ADMIN;
    const isAdmin = isSuperAdmin || adminUsers.includes(requestUser);

    if (!isAdmin) {
      return res.status(403).json({ error: "Không có quyền thực hiện" });
    }

    // Đảm bảo các file tồn tại
    ensureFileExists(parkingRecordsFile);
    ensureFileExists("parking-slots.json");

    // Đọc records
    const records = JSON.parse(fs.readFileSync(parkingRecordsFile, "utf8"));

    if (approved) {
      // Nếu duyệt -> xóa bản ghi
      const updatedRecords = records.filter(
        (record) => record.parkingId !== parkingId
      );
      fs.writeFileSync(
        parkingRecordsFile,
        JSON.stringify(updatedRecords, null, 2)
      );

      // Cập nhật parking-slots.json
      const slotsFile = "parking-slots.json";
      let slots = [];
      try {
        slots = JSON.parse(fs.readFileSync(slotsFile, "utf8"));
      } catch (error) {
        console.log("Creating new parking slots file");
        slots = Array.from({ length: 10 }, (_, i) => ({
          id: (i + 1).toString(),
          occupied: false,
        }));
      }

      const updatedSlots = slots.map((slot) => {
        if (slot.id === parkingId) {
          return { ...slot, occupied: false };
        }
        return slot;
      });
      fs.writeFileSync(slotsFile, JSON.stringify(updatedSlots, null, 2));
    } else {
      // Nếu từ chối -> đặt lại trạng thái active
      const updatedRecords = records.map((record) => {
        if (record.parkingId === parkingId) {
          return { ...record, status: "active" };
        }
        return record;
      });
      fs.writeFileSync(
        parkingRecordsFile,
        JSON.stringify(updatedRecords, null, 2)
      );
    }

    res.json({
      success: true,
      message: approved ? "Đã duyệt yêu cầu hủy" : "Đã từ chối yêu cầu hủy",
    });
  } catch (error) {
    console.error("Error approving cancel request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Thêm route để kiểm tra dữ liệu
app.get("/api/check-records", (req, res) => {
  try {
    ensureFileExists(parkingRecordsFile);
    const records = JSON.parse(fs.readFileSync(parkingRecordsFile, "utf8"));
    console.log("Current records:", records);
    res.json({
      count: records.length,
      records: records,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thêm route health check
app.get("/api/health-check", (req, res) => {
  res.json({ status: "ok" });
});

// Sửa lại API kiểm tra admin
app.get("/api/check-admin", (req, res) => {
  const username = req.headers["x-user"];
  console.log("Checking admin for user:", username);
  console.log("SUPER_ADMIN value:", SUPER_ADMIN);
  console.log("adminUsers list:", adminUsers);

  try {
    const isSuperAdmin = username === SUPER_ADMIN;
    const isAdmin = isSuperAdmin || adminUsers.includes(username);
    console.log("Check result:", { isAdmin, isSuperAdmin });

    res.json({
      isAdmin,
      isSuperAdmin,
    });
  } catch (error) {
    console.error("Error in check-admin:", error);
    res.status(500).json({ error: "Không thể kiểm tra quyền admin" });
  }
});

// Sửa lại API quản lý admin
app.post("/api/manage-admin", (req, res) => {
  const requestUser = req.headers["x-user"];
  if (requestUser !== SUPER_ADMIN) {
    return res.status(403).json({ error: "Không có quyền truy cập" });
  }

  const { action, username } = req.body;

  try {
    if (action === "add") {
      if (!adminUsers.includes(username)) {
        adminUsers.push(username);
        fs.writeFileSync("admin-users.json", JSON.stringify(adminUsers));
      }
    } else if (action === "remove") {
      const index = adminUsers.indexOf(username);
      if (index > -1) {
        adminUsers.splice(index, 1);
        fs.writeFileSync("admin-users.json", JSON.stringify(adminUsers));
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Không thể cập nhật danh sách admin" });
  }
});

// API lấy danh sách admin chỉ cho super admin
app.get("/api/admin-list", (req, res) => {
  const requestUser = req.headers["x-user"];
  if (requestUser !== SUPER_ADMIN) {
    return res.status(403).json({ error: "Không có quyền truy cập" });
  }

  try {
    res.json({ admins: adminUsers });
  } catch (error) {
    res.status(500).json({ error: "Không thể đọc danh sách admin" });
  }
});

// Thêm endpoint mới cho admin hủy đăng ký
app.post("/api/admin/cancel-registration", async (req, res) => {
  try {
    const { parkingId } = req.body;
    const requestUser = req.headers["x-user"];

    // Kiểm tra quyền admin
    const isSuperAdmin = requestUser === SUPER_ADMIN;
    const isAdmin = isSuperAdmin || adminUsers.includes(requestUser);

    if (!isAdmin) {
      return res.status(403).json({ error: "Không có quyền thực hiện" });
    }

    // Đọc và xóa bản ghi từ parking-records.json
    const records = JSON.parse(fs.readFileSync(parkingRecordsFile, "utf8"));
    const updatedRecords = records.filter(
      (record) => record.parkingId !== parkingId
    );
    fs.writeFileSync(
      parkingRecordsFile,
      JSON.stringify(updatedRecords, null, 2)
    );

    // Cập nhật parking-slots.json
    const slotsFile = "parking-slots.json";
    const slots = JSON.parse(fs.readFileSync(slotsFile, "utf8"));
    const updatedSlots = slots.map((slot) => {
      if (slot.id === parkingId) {
        return { ...slot, occupied: false };
      }
      return slot;
    });
    fs.writeFileSync(slotsFile, JSON.stringify(updatedSlots, null, 2));

    res.json({ success: true, message: "Đã xóa đăng ký thành công" });
  } catch (error) {
    console.error("Error cancelling registration:", error);
    res.status(500).json({ error: error.message });
  }
});

// Thêm API mới để lấy danh sách tất cả người dùng
app.get("/api/users", (req, res) => {
  const requestUser = req.headers["x-user"];
  if (requestUser !== SUPER_ADMIN) {
    return res.status(403).json({ error: "Không có quyền truy cập" });
  }

  try {
    const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
    const userList = users.map((user) => ({
      username: user.username,
      isAdmin: adminUsers.includes(user.username),
      isSuperAdmin: user.username === SUPER_ADMIN,
    }));
    res.json({ users: userList });
  } catch (error) {
    res.status(500).json({ error: "Không thể đọc danh sách người dùng" });
  }
});

// Sử dụng các biến này trong code
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
