const nav = document.querySelector(".nav");
const menuButton = document.querySelector(".menu-button");
const themeToggle = document.querySelector(".theme-toggle");

// Mobile menu
menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", open);
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

// Dark mode
function setTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}

setTheme(localStorage.getItem("theme") || "light");

themeToggle.addEventListener("click", () => {
  const theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("theme", theme);
  setTheme(theme);
});

// Events
const list = document.getElementById("event-list");
let EVENTS = [];

function formatDate(event) {
  const date = new Date(`${event.date}T${event.time}`);
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) + ", " + event.time;
}

function downloadCalendarEvent(event) {
  const start = new Date(`${event.date}T${event.time}`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const formatICSDate = (date) => {
    const pad = (value) => String(value).padStart(2, "0");

    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
  };

  const escapeICS = (value) =>
    String(value)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Campus Landing//Events//EN",
    "BEGIN:VEVENT",
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `LOCATION:${escapeICS(event.place)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function renderEvents(type) {
  const now = new Date();
  list.replaceChildren();

  EVENTS
    .filter((e) => type === "All" || e.type === type)
    .forEach((e) => {
      const past = new Date(`${e.date}T${e.time}`) < now;

      const item = document.createElement("li");
      item.className = past ? "past" : "";

      const title = document.createElement("h3");
      title.textContent = e.title;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${formatDate(e)} · ${e.place} · ${e.type}`;

      const description = document.createElement("p");
      description.textContent = e.description;

      const calendarButton = document.createElement("button");
      calendarButton.type = "button";
      calendarButton.textContent = "Add to calendar";
      calendarButton.addEventListener("click", () => {
        downloadCalendarEvent(e);
      });

      item.append(title, meta, description, calendarButton);
      list.appendChild(item);
    });
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    renderEvents(button.dataset.type);
  });
});

fetch("events.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Failed to load events");
    }
    return response.json();
  })
  .then((events) => {
    EVENTS = events;
    renderEvents(document.querySelector(".filter.active").dataset.type);
    updateCountdown();
  })
  .catch(() => {
    list.innerHTML = "<li>Events could not be loaded right now.</li>";
  });

setInterval(updateCountdown, 60000);

//function to find the next event in countdown
function nextEvent(){
  return EVENTS.find(event => new Date(`${event.date}T${event.time}`) > new Date()) || null;
}

// Countdown to the next event
function updateCountdown() {
  const now = new Date();
  const next = EVENTS
      .map((event) => ({
        event,
        date: new Date(`${event.date}T${event.time}`)
      }))
      .filter(({ date }) => date > now)
      .sort((a, b) => a.date - b.date)[0];

  if (!next) {
    document.getElementById("countdown").textContent = "No upcoming events";
    return;
  }

  const ms = next.date - now;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);

  document.getElementById("countdown").textContent =
    `${next.event.title} in ${days} days, ${hours} hours`;
}
