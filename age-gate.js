(() => {
  const STORAGE_KEY = "cbl_age_verified_21";
  const gate = document.getElementById("cbl-age-gate");
  if (!gate) return;

  const unlockPage = () => {
    document.documentElement.classList.remove("cbl-age-locked");
    document.body.classList.remove("cbl-age-locked");
  };

  if (sessionStorage.getItem(STORAGE_KEY) === "yes") {
    gate.remove();
    unlockPage();
    return;
  }

  document.documentElement.classList.add("cbl-age-locked");
  document.body.classList.add("cbl-age-locked");
  gate.hidden = false;

  const yesButton = document.getElementById("cbl-age-yes");
  const noButton = document.getElementById("cbl-age-no");

  yesButton?.addEventListener("click", () => {
    sessionStorage.setItem(STORAGE_KEY, "yes");
    gate.remove();
    unlockPage();
  });

  noButton?.addEventListener("click", () => {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.replace("about:blank");
  });

  window.setTimeout(() => yesButton?.focus(), 0);
})();
