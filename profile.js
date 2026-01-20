profileForm.addEventListener("submit", e => {
  e.preventDefault();

  const data = {
    name: name.value,
    email: email.value,
    skills: skills.value,
    learning: learning.value
  };

  localStorage.setItem("profile", JSON.stringify(data));
  alert("Profile saved");
});
