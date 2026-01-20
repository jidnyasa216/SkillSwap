let isLogin = true;

function toggle() {
  isLogin = !isLogin;
  document.getElementById("title").innerText = isLogin ? "Login" : "Sign Up";
  document.querySelector("button").innerText = isLogin ? "Login" : "Sign Up";
}

function handleAuth() {
  const u = username.value;
  const p = password.value;

  if (!u || !p) return alert("Fill all fields");

  if (!isLogin) {
    localStorage.setItem(u, p);
    alert("Signup successful");
    toggle();
  } else {
    if (localStorage.getItem(u) === p) {
      localStorage.setItem("loggedInUser", u);
      window.location.href = "index.html";
    } else {
      alert("Invalid credentials");
    }
  }
}

