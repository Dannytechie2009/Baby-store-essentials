const formData = new FormData();
formData.append("access_key", "51dd17e8-0eff-41e7-bb30-895c290070c0");
formData.append("name", "John Doe");
formData.append("email", "john@example.com");
formData.append("message", "Hello World!");

const response = await fetch("https://api.web3forms.com/submit", {
  method: "POST",
  body: formData
});