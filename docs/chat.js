const API_BASE = "https://sample-api-1-ryj7.onrender.com/chat";
const token = localStorage.getItem("access_token");

// ---------------- GET USER FROM TOKEN ----------------
function getCurrentUser() {
  if (!token) return null;
  const payload = JSON.parse(atob(token.split(".")[1]));
  const email = payload.email;
  return {
    id: payload.user_id || payload.sub,
    username: email.split("@")[0]
  };
}

const currentUser = getCurrentUser();
if (!currentUser) {
  alert("Not logged in");
}

// Header user
document.getElementById("myAvatar").textContent =
  currentUser.username[0].toUpperCase();
document.getElementById("myUsername").textContent =
  "@" + currentUser.username;

// ---------------- SEARCH USERS ----------------
const searchInput = document.getElementById("searchInput");
const chatList = document.getElementById("chatList");

searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim();
  if (!q) {
    chatList.innerHTML = "";
    return;
  }

  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const users = await res.json();
  chatList.innerHTML = "";

  users.forEach(user => {
    const username = user.email.split("@")[0];

    const div = document.createElement("div");
    div.className = "chat-item";
    div.onclick = () => {
      window.location.href = `chatuser.html?u=${username}`;
    };

    div.innerHTML = `
      <div class="avatar">${username[0].toUpperCase()}</div>
      <div class="chat-info">
        <h4>@${username}</h4>
        <p>${user.bio || "Hey there!"}</p>
      </div>
    `;

    chatList.appendChild(div);
  });
});
