console.log("Hello, World!");

// -----------------------------------------------------
// 0) Get references to important DOM elements
// -----------------------------------------------------
const form = document.getElementById("resource-form");
const resourceListEl = document.getElementById("resource-list");

// Feature 2 / 3 / 4 controls:
const searchInputEl = document.getElementById("search");
const filterStatusEl = document.getElementById("filter-status");
const sortOrderEl = document.getElementById("sort-order");

// -----------------------------------------------------
// Data + persistence
// -----------------------------------------------------
const STORAGE_KEY = "devResourceTrackerResources";

const resources = [];   // all resource objects live here
let nextId = 1;         // incremental unique id

// -----------------------------------------------------
// Load from localStorage on startup
// -----------------------------------------------------
loadResourcesFromStorage();
renderResources();

// -----------------------------------------------------
// Handle form submission (Save resource button)
// -----------------------------------------------------
form.addEventListener("submit", function (event) {
    event.preventDefault();   // Stop the page from reloading

    // -----------------------------------------------------
    // 1) Read / get values from the form inputs
    // -----------------------------------------------------
    const title = document.getElementById("title").value.trim();
    const type = document.getElementById("type").value;
    const link = document.getElementById("link").value.trim();
    const status = document.getElementById("status").value;
    const priority = document.getElementById("priority").value;
    const notes = document.getElementById("notes").value.trim();

    // -----------------------------------------------------
    // 2) Validation — required fields check
    // -----------------------------------------------------
    if (!title || !type) {
        alert("Please fill in the required fields: Title and Type.");
        return;  // stop the function here
    }

    // -----------------------------------------------------
    // 3) Create a new resource object
    // -----------------------------------------------------
    const newResource = {
        id: nextId++,           // unique incremental id
        title: title,
        type: type,
        link: link,
        status: status,
        priority: priority,
        notes: notes,
        createdAt: new Date().toISOString()   // save as ISO string for storage
    };

    // -----------------------------------------------------
    // 4) Store the new resource object in the array
    // -----------------------------------------------------
    resources.push(newResource);

    console.log("Resource added:", newResource);
    console.log("All resources:", resources);

    // Save to localStorage (Feature 6)
    saveResourcesToStorage();

    // -----------------------------------------------------
    // 5) Update the UI — re-render the list on the right
    // -----------------------------------------------------
    renderResources();

    // -----------------------------------------------------
    // 6) Reset the form for next input
    // -----------------------------------------------------
    form.reset();   // clears all fields
    document.getElementById("status").value = "planned";
    document.getElementById("priority").value = "medium";
});

// -----------------------------------------------------
// 2) Search: when user types in search box
// -----------------------------------------------------
searchInputEl.addEventListener("input", function () {
    // Just re-render; renderResources() will read current search value
    renderResources();
});

// -----------------------------------------------------
// 3) Filter by status: when dropdown changes
// -----------------------------------------------------
filterStatusEl.addEventListener("change", function () {
    renderResources();
});

// -----------------------------------------------------
// 4) Sort order: when dropdown changes
// -----------------------------------------------------
sortOrderEl.addEventListener("change", function () {
    renderResources();
});

// -----------------------------------------------------
// Render all resources inside the #resource-list element
//   - applies search
//   - applies status filter
//   - applies sorting
// -----------------------------------------------------
function renderResources() {

    // If there is nothing stored at all
    if (resources.length === 0) {
        resourceListEl.innerHTML = `
            <p class="empty-state">
                No resources yet. Add your first one using the form on the left.
            </p>
        `;
        return;
    }

    // -------------------------------------------------
    // A) Start from all resources
    // -------------------------------------------------
    let items = resources.slice();   // copy array so we can sort safely

    // -------------------------------------------------
    // B) Apply search filter
    // -------------------------------------------------
    const query = searchInputEl.value.trim().toLowerCase();

    if (query !== "") {
        items = items.filter(function (resource) {
            const inTitle = resource.title.toLowerCase().includes(query);
            const inType = resource.type.toLowerCase().includes(query);
            const inNotes = resource.notes
                ? resource.notes.toLowerCase().includes(query)
                : false;

            return inTitle || inType || inNotes;
        });
    }

    // -------------------------------------------------
    // C) Apply status filter
    // -------------------------------------------------
    const selectedStatus = filterStatusEl.value; // "all", "planned", "in-progress", "completed"

    if (selectedStatus !== "all") {
        items = items.filter(function (resource) {
            return resource.status === selectedStatus;
        });
    }

    // -------------------------------------------------
    // D) Apply sorting
    // -------------------------------------------------
    const selectedSort = sortOrderEl.value;  // "newest", "oldest", "priority"

    if (selectedSort === "newest") {
        items.sort(function (a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    } else if (selectedSort === "oldest") {
        items.sort(function (a, b) {
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    } else if (selectedSort === "priority") {
        const priorityRank = { high: 3, medium: 2, low: 1 };
        items.sort(function (a, b) {
            return priorityRank[b.priority] - priorityRank[a.priority];
        });
    }

    // -------------------------------------------------
    // E) Handle case where filters/search remove everything
    // -------------------------------------------------
    if (items.length === 0) {
        resourceListEl.innerHTML = `
            <p class="empty-state">
                No resources match your current search/filter.
            </p>
        `;
        return;
    }

    // -------------------------------------------------
    // F) Build HTML for each resource that passed filters
    // -------------------------------------------------
    let html = "";

    items.forEach(function (resource) {
        html += `
            <article class="resource-item">
                <header class="resource-item__header">
                    <h3 class="resource-item__title">${escapeHtml(resource.title)}</h3>
                    <span class="resource-item__type">${escapeHtml(resource.type)}</span>
                </header>

                <div class="resource-item__meta">
                    <span class="badge badge--status badge--status-${resource.status}">
                        ${formatStatus(resource.status)}
                    </span>
                    <span class="badge badge--priority badge--priority-${resource.priority}">
                        Priority: ${resource.priority}
                    </span>
                </div>

                <div class="resource-item__body">
                    ${resource.notes ? `<p>${escapeHtml(resource.notes)}</p>` : ""}

                    ${
                        resource.link
                            ? `<a href="${escapeAttribute(resource.link)}" target="_blank" rel="noopener noreferrer">
                                   Open resource
                               </a>`
                            : ""
                    }
                </div>

                <footer class="resource-item__actions">
                    <button 
                        class="btn btn-ghost resource-delete" 
                        data-id="${resource.id}">
                        Delete
                    </button>
                </footer>
            </article>
        `;
    });

    resourceListEl.innerHTML = html;
}

// -----------------------------------------------------
// 5) Helper: security – escape HTML special chars
// -----------------------------------------------------
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// Escape quotes inside attributes like href=""
function escapeAttribute(str) {
    return String(str).replace(/"/g, "&quot;");
}

// Nicely formatted status text
function formatStatus(status) {
    if (status === "planned") return "Planned";
    if (status === "in-progress") return "In progress";
    if (status === "completed") return "Completed";
    return status;
}

// -----------------------------------------------------
// 6) localStorage helpers (save + load)
// -----------------------------------------------------
function saveResourcesToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
    } catch (error) {
        console.error("Failed to save to localStorage:", error);
    }
}

function loadResourcesFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return; // nothing saved before
        }

        const saved = JSON.parse(raw);

        if (!Array.isArray(saved)) {
            return;
        }

        // Fill our resources array
        saved.forEach(function (item) {
            resources.push({
                ...item,
                // createdAt stays as string; we only parse it when we sort
            });
        });

        // Update nextId so we don't reuse IDs
        const maxId = resources.reduce(function (max, item) {
            return item.id > max ? item.id : max;
        }, 0);
        nextId = maxId + 1;

        console.log("Loaded resources from storage:", resources);
    } catch (error) {
        console.error("Failed to load from localStorage:", error);
    }
}

// -----------------------------------------------------
// 7) Handle clicks inside the resource list (Delete logic)
// -----------------------------------------------------
resourceListEl.addEventListener("click", function (event) {
    const clickedElement = event.target;

    // Only act if the user clicked on a delete button
    if (!clickedElement.classList.contains("resource-delete")) {
        return;  // click was on something else → ignore
    }

    // Read the resource id from data-id attribute on the button
    const idAsString = clickedElement.getAttribute("data-id");
    const id = Number(idAsString);   // convert "3" -> 3 (number)

    // Find index in array
    const index = resources.findIndex(function (resource) {
        return resource.id === id;
    });

    if (index === -1) {
        console.warn("Resource not found for id:", id);
        return;
    }

    // Remove from array
    resources.splice(index, 1);

    // Update storage
    saveResourcesToStorage();

    console.log("Resource deleted. Remaining resources:", resources);

    // Re-render list
    renderResources();
});
