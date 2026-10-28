(() => {
  const root = document.querySelector("[data-assistant]");
  if (!root) return;

  const toggle = root.querySelector("[data-assistant-toggle]");
  const panel = root.querySelector("[data-assistant-panel]");
  const form = root.querySelector("[data-assistant-form]");
  const input = root.querySelector("[data-assistant-input]");
  const messages = root.querySelector("[data-assistant-messages]");
  const submit = root.querySelector("[data-assistant-submit]");
  const csrf = root.querySelector('[name="_csrf"]')?.value || "";
  const conversation = [];

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
  }

  function addMessage(role, text) {
    const item = document.createElement("div");
    item.className = `assistant-message assistant-message-${role}`;
    item.textContent = text;
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
  }

  toggle.addEventListener("click", () => setOpen(panel.hidden));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    addMessage("user", message);
    conversation.push({ role: "user", content: message });
    input.value = "";
    input.disabled = true;
    submit.disabled = true;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation, _csrf: csrf }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reach the assistant.");

      addMessage("assistant", data.reply);
      conversation.push({ role: "assistant", content: data.reply });
    } catch (error) {
      addMessage("assistant", error.message || "Could not reach the assistant. Please call the clinic.");
      conversation.pop();
    } finally {
      input.disabled = false;
      submit.disabled = false;
      input.focus();
    }
  });
})();
