const english = navigator.language.toLowerCase().startsWith("en");
if (english) {
  document.documentElement.lang = "en";
  document.title = "Offline | PagaTo'";
  document.querySelectorAll("[data-en]").forEach(element => { element.textContent = element.dataset.en; });
}
document.getElementById("retry").addEventListener("click", () => {
  // This public document intentionally runs without Next.js or any authenticated app bundle.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (location.pathname === "/pwa/offline.html") location.assign("/dashboard");
  else location.reload();
});
window.addEventListener("online", () => {
  document.getElementById("connection").textContent = english ? "Your device is connected. You can try again." : "Tu dispositivo está conectado. Puedes volver a intentarlo.";
});
window.addEventListener("offline", () => { document.getElementById("connection").textContent = ""; });
