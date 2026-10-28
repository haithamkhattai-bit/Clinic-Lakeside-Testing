(() => {
  const form = document.querySelector("#booking-form");
  if (!form) return;

  const steps = [...form.querySelectorAll("[data-step]")];
  const progressSteps = [...document.querySelectorAll("[data-progress-step]")];
  const backButton = form.querySelector("[data-back]");
  const nextButton = form.querySelector("[data-next]");
  const confirmButton = form.querySelector("[data-confirm]");
  const doctorSelect = form.querySelector("#doctor");
  const dateInput = form.querySelector("#date");
  let currentStep = Number(form.dataset.startStep) || 0;

  function selectedSpecialty() {
    return form.querySelector('input[name="specialty"]:checked')?.value || "";
  }

  function syncDoctorOptions(resetSelection = false) {
    const specialty = selectedSpecialty();

    for (const option of doctorSelect.options) {
      if (!option.value) {
        option.hidden = false;
        option.disabled = false;
        continue;
      }

      const matchesSpecialty = option.dataset.specialty === specialty;
      option.hidden = !matchesSpecialty;
      option.disabled = !matchesSpecialty;
      if (!matchesSpecialty && option.selected) doctorSelect.value = "";
    }

    if (resetSelection) doctorSelect.value = "";
  }

  function updateSummary() {
    const specialty = selectedSpecialty();
    const selectedDoctor = doctorSelect.selectedOptions[0];
    const selectedTime = form.querySelector("#time").selectedOptions[0];
    const selectedDate = dateInput.value;
    const summary = {
      specialty: specialty || "Not selected",
      doctor: selectedDoctor?.value || "Not selected",
      date: selectedDate || "Not selected",
      time: selectedTime?.value ? ` · ${selectedTime.textContent}` : "",
      name: form.querySelector("#name").value.trim() || "Add your name",
      phone: form.querySelector("#phone").value.trim() || "Add your phone",
      email: form.querySelector("#email").value.trim() || "Add your email",
    };

    for (const [key, value] of Object.entries(summary)) {
      const target = form.querySelector(`[data-summary="${key}"]`);
      if (target) target.textContent = value;
    }
  }

  function updateStep() {
    steps.forEach((step, index) => {
      step.hidden = index !== currentStep;
    });
    progressSteps.forEach((step, index) => {
      step.classList.toggle("is-active", index === currentStep);
      step.classList.toggle("is-complete", index < currentStep);
      if (index === currentStep) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    confirmButton.hidden = currentStep !== steps.length - 1;
    updateSummary();
  }

  function validateCurrentStep() {
    const step = steps[currentStep];

    if (currentStep === 0 && !selectedSpecialty()) {
      form.querySelector('input[name="specialty"]').setCustomValidity("Choose a specialty to continue.");
    } else {
      form.querySelectorAll('input[name="specialty"]').forEach((input) => input.setCustomValidity(""));
    }

    if (currentStep === 2 && dateInput.value) {
      const [year, month, day] = dateInput.value.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      dateInput.setCustomValidity(
        date.getUTCDay() === 0 ? "The clinic is closed on Sundays. Choose another date." : "",
      );
    }

    const firstInvalid = [...step.querySelectorAll("input, select")].find(
      (field) => !field.checkValidity(),
    );
    if (!firstInvalid) return true;

    firstInvalid.reportValidity();
    firstInvalid.focus();
    return false;
  }

  form.querySelectorAll('input[name="specialty"]').forEach((input) => {
    input.addEventListener("change", () => {
      syncDoctorOptions(true);
      form.querySelectorAll(".specialty-option").forEach((option) => {
        option.classList.toggle("is-selected", option.contains(input) && input.checked);
      });
      updateSummary();
    });
  });

  dateInput.addEventListener("change", () => {
    dateInput.setCustomValidity("");
    updateSummary();
  });

  form.addEventListener("input", updateSummary);
  form.addEventListener("change", updateSummary);

  nextButton.addEventListener("click", () => {
    if (!validateCurrentStep()) return;
    currentStep = Math.min(currentStep + 1, steps.length - 1);
    updateStep();
  });

  backButton.addEventListener("click", () => {
    currentStep = Math.max(currentStep - 1, 0);
    updateStep();
  });

  form.addEventListener("submit", (event) => {
    if (!validateCurrentStep()) {
      event.preventDefault();
      return;
    }

    confirmButton.disabled = true;
    confirmButton.textContent = "Saving booking…";
  });

  syncDoctorOptions();
  form.querySelectorAll('input[name="specialty"]:checked').forEach((input) => {
    input.closest(".specialty-option").classList.add("is-selected");
  });
  updateStep();
})();
