document
  .getElementById("register-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      document.getElementById("message").textContent = result.message;

      if (response.ok) {
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }
    } catch (error) {
      console.error("Error:", error);
      document.getElementById("message").textContent =
        "An error occurred during registration";
    }
  });
