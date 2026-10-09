let timer = 0;

export function showToast(message: string, isError = false): void {
  let toast = document.querySelector(".toast");
  if (toast === null) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    toast?.classList.remove("show");
  }, 1800);
}
