// Small, dependency-free progressive enhancement: copy the short URL.
// Everything else on this page works fine with JS disabled (it's a
// plain HTML form), which is intentional — this app degrades gracefully.
document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.getElementById("copyBtn");
  if (!copyBtn) return;

  copyBtn.addEventListener("click", async () => {
    const url = copyBtn.dataset.url;
    try {
      await navigator.clipboard.writeText(url);
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 1500);
    } catch (err) {
      console.error("Clipboard write failed:", err);
    }
  });
});
