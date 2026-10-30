const navigation = document.querySelector("#navigation");
const menuButton = document.querySelector(".menu-toggle");
function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Открыть меню");
  navigation.classList.remove("is-open");
}
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(expanded));
  menuButton.setAttribute(
    "aria-label",
    expanded ? "Закрыть меню" : "Открыть меню",
  );
  navigation.classList.toggle("is-open", expanded);
});
navigation
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuButton.getAttribute("aria-expanded") === "true"
  ) {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!navigation.contains(event.target) && !menuButton.contains(event.target))
    closeMenu();
});
matchMedia("(min-width: 761px)").addEventListener("change", closeMenu);

const briefDialog = document.querySelector("#brief-dialog");
let briefFocusTarget = null;
briefDialog.addEventListener("close", () => {
  briefFocusTarget?.focus();
  briefFocusTarget = null;
});
const studioDialog = document.querySelector("#studio-dialog");
document.querySelectorAll("[data-studio]").forEach((button) => {
  button.addEventListener("click", () => studioDialog.showModal());
});
briefDialog.setAttribute("aria-labelledby", "brief-title");
briefDialog.querySelector("h2").id = "brief-title";
document.querySelectorAll("[data-brief]").forEach((button) =>
  button.addEventListener("click", () => {
    briefFocusTarget =
      navigation.contains(button) && menuButton.getClientRects().length
        ? menuButton
        : button;
    closeMenu();
    briefDialog.showModal();
  }),
);
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog
    .querySelector(".close-modal")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      dialog.close();
  });
});

const projects = [
  {
    title: "Тёплый свет",
    meta: "Москва · Квартира · 86 м² · 2025",
    image: "assets/interior.webp",
    description:
      "Пространство для медленных выходных и встреч с близкими. Мы объединили гостиную и обеденную зону, оставили свету максимум свободы и собрали палитру из оттенков льна, дуба и терракоты. Мягкие формы мебели уравновешивают строгую геометрию помещения.",
  },
  {
    title: "Тихое утро",
    meta: "Концепция · Загородный дом · 180 м² · 2026",
    image: "assets/dining.webp",
    description:
      "Дом для неспешных встреч и тихих утренних ритуалов. Центр пространства — обеденный стол из натурального дуба. Тёмные панели, мягкий свет и фактурная керамика создают ощущение тепла и защищённости.",
  },
  {
    title: "Линия покоя",
    meta: "Концепция · Апартаменты · 64 м² · 2026",
    image: "assets/bedroom.webp",
    description:
      "Спокойное пространство, где день начинается с мягкого света. Ореховые панели, льняные ткани и простые формы помогают освободить интерьер от визуального шума. В каждой детали — внимание к отдыху и вашему собственному ритму.",
  },
];
const projectDialog = document.querySelector("#project-dialog");
const projectFilters = document.querySelector(".project-filters");
document.querySelector(".filter-panel").hidden = false;
projectFilters.querySelectorAll("[data-filter]").forEach((filter) => {
  filter.addEventListener("click", () => {
    const category = filter.dataset.filter;
    let count = 0;
    document.querySelectorAll("[data-project]").forEach((card) => {
      card.hidden = category !== "all" && card.dataset.category !== category;
      if (!card.hidden) count += 1;
    });
    projectFilters.querySelectorAll("[data-filter]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button === filter));
    });
    document.querySelector("#project-count").textContent =
      `Показано проектов: ${count}.`;
  });
});
projectDialog.setAttribute("aria-labelledby", "project-modal-title");
document.querySelectorAll("[data-project]").forEach((button) =>
  button.addEventListener("click", () => {
    const project = projects[Number(button.dataset.project)];
    document.querySelector("#project-modal-title").textContent = project.title;
    document.querySelector("#project-modal-meta").textContent = project.meta;
    document.querySelector("#project-modal-description").textContent =
      project.description;
    const image = document.querySelector("#project-modal-image");
    image.src = project.image;
    image.alt = `Интерьер проекта «${project.title}»`;
    projectDialog.showModal();
  }),
);
document.querySelector("#project-to-brief").addEventListener("click", () => {
  projectDialog.close();
  briefDialog.showModal();
});
const privacyDialog = document.querySelector("#privacy-dialog");
privacyDialog.querySelector("h2").id = "privacy-title";
privacyDialog.setAttribute("aria-labelledby", "privacy-title");
document
  .querySelector("#privacy-button")
  .addEventListener("click", () => privacyDialog.showModal());

document.querySelector("#brief-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const nameInput = form.elements.namedItem("name");
  if (!nameInput.value.trim()) {
    nameInput.setCustomValidity("Пожалуйста, введите имя.");
    nameInput.reportValidity();
    return;
  }
  nameInput.setCustomValidity("");
  const data = new FormData(form);
  const text = `ТИШЕ — бриф для будущего интерьера\n\nИмя: ${String(data.get("name")).trim()}\nТип пространства: ${data.get("space")}\nПлощадь: ${data.get("area")} м²\n\nПожелания:\n${String(data.get("description")).trim() || "Пока не указаны"}\n\nСоздано на демонстрационном сайте ТИШЕ. Данные не отправлены на сервер.\n`;
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "tishe-interior-brief.txt";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector("#form-status").textContent =
    "Бриф готов — скачивание началось. Сохраните файл и поделитесь им с дизайнером.";
});
document
  .querySelector('input[name="name"]')
  .addEventListener("input", (event) => event.target.setCustomValidity(""));
document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector("#brief-form").addEventListener("input", () => {
  document.querySelector("#form-status").textContent = "";
});
