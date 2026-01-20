function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "auth.html";
}

function toggleChat() {
  const box = document.getElementById("chatBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function sendMessage() {
  const input = document.getElementById("chatInput");
  const messages = document.getElementById("chatMessages");

  if (!input.value) return;

  messages.innerHTML += `<div>You: ${input.value}</div>`;
  input.value = "";
}
