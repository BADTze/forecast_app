function fetchData(url, callback) {
  fetch(url)
    .then((response) => response.json())
    .then((data) => callback(data))
    .catch((error) => console.error(`Error fetching ${url}:`, error));
}

function safeQuerySelector(id) {
  return document.getElementById(id) || null;
}

document.addEventListener("DOMContentLoaded", function () {
  
});
