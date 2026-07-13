(() => {
  const root = globalThis.ChatExportAi;
  const STYLE_ID = "ceai-floating-export-style";
  const ROOT_ID = "ceai-floating-export";
  const FORMAT_LABELS = {
    txt: "TXT",
    pdf: "PDF",
    mht: "MHT",
    html: "HTML",
    md: "MD",
    docx: "DOCX",
    xlsx: "XLSX",
    png: "PNG"
  };
  const ALL_FORMATS = ["txt", "pdf", "mht", "html", "md", "docx", "xlsx", "png"];

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${ROOT_ID} {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2147483647;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  color: #0f172a;
}
#${ROOT_ID}[hidden] { display: none !important; }
#${ROOT_ID}.is-dragging { user-select: none; }
#${ROOT_ID} .ceai-floating-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 44px;
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  background: #2563eb;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  cursor: grab;
  box-shadow: 0 16px 36px rgba(37, 99, 235, 0.3);
}
#${ROOT_ID}.is-dragging .ceai-floating-fab { cursor: grabbing; }
#${ROOT_ID} .ceai-floating-fab:disabled,
#${ROOT_ID} .ceai-floating-export:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}
#${ROOT_ID} .ceai-floating-panel {
  position: absolute;
  right: 0;
  bottom: 54px;
  width: 272px;
  box-sizing: border-box;
  padding: 14px;
  border: 1px solid #dbe5f2;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
  display: none;
}
#${ROOT_ID}.is-open .ceai-floating-panel { display: block; }
#${ROOT_ID} .ceai-floating-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 800;
}
#${ROOT_ID} .ceai-floating-formats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
#${ROOT_ID} .ceai-floating-format {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border: 1px solid #dbe5f2;
  border-radius: 10px;
  background: #f8fafc;
  color: #334155;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
#${ROOT_ID} .ceai-floating-format input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
#${ROOT_ID} .ceai-floating-format.is-selected {
  border-color: #2563eb;
  background: #dbeafe;
  color: #1e3a8a;
}
#${ROOT_ID} .ceai-floating-export {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 38px;
  border: 0;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}
#${ROOT_ID} .ceai-floating-format span {
  pointer-events: none;
}
`;
    document.documentElement.appendChild(style);
  }

  function clampPosition(left, top, node) {
    const rect = node.getBoundingClientRect();
    const width = rect.width || 56;
    const height = rect.height || 56;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop)
    };
  }

  function createFloatingExportUi({ onExport, onInteraction }) {
    ensureStyles();
    const rootNode = document.createElement("div");
    rootNode.id = ROOT_ID;
    rootNode.hidden = true;
    rootNode.innerHTML = `
      <button class="ceai-floating-fab" type="button" title="ExportAI">ExportAI</button>
      <div class="ceai-floating-panel" role="dialog" aria-label="ExportAI formats">
        <div class="ceai-floating-title">Export formats</div>
        <div class="ceai-floating-formats"></div>
        <button class="ceai-floating-export" type="button">Export</button>
      </div>
    `;
    document.body.appendChild(rootNode);

    const fab = rootNode.querySelector(".ceai-floating-fab");
    const formatsNode = rootNode.querySelector(".ceai-floating-formats");
    const exportButton = rootNode.querySelector(".ceai-floating-export");
    let enabled = true;
    let selectedFormats = ["html", "txt"];
    let dragStart = null;
    let suppressNextClick = false;

    function updateFormatClasses() {
      formatsNode.querySelectorAll(".ceai-floating-format").forEach((label) => {
        label.classList.toggle("is-selected", Boolean(label.querySelector("input")?.checked));
      });
    }

    function renderFormats() {
      const selected = new Set(selectedFormats);
      formatsNode.innerHTML = ALL_FORMATS.map((format) => {
        const checked = selected.has(format) ? " checked" : "";
        return `<label class="ceai-floating-format"><input type="checkbox" value="${format}"${checked}><span>${FORMAT_LABELS[format]}</span></label>`;
      }).join("");
      updateFormatClasses();
    }

    function currentFormats() {
      return Array.from(formatsNode.querySelectorAll("input:checked")).map((input) => input.value);
    }

    function setPosition(position) {
      if (!position || typeof position !== "object") return;
      const left = Number(position.left);
      const top = Number(position.top);
      if (!Number.isFinite(left) || !Number.isFinite(top)) return;
      const clamped = clampPosition(left, top, rootNode);
      rootNode.style.left = `${clamped.left}px`;
      rootNode.style.top = `${clamped.top}px`;
      rootNode.style.right = "auto";
      rootNode.style.bottom = "auto";
    }

    function beginDrag(event) {
      if (event.button !== 0 || !enabled) return;
      dragStart = {
        x: event.clientX,
        y: event.clientY,
        left: rootNode.getBoundingClientRect().left,
        top: rootNode.getBoundingClientRect().top,
        moved: false
      };
      rootNode.classList.add("is-dragging");
      if (typeof onInteraction === "function") onInteraction();
      event.preventDefault();
    }

    function moveDrag(event) {
      if (!dragStart) return;
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragStart.moved = true;
      const clamped = clampPosition(dragStart.left + dx, dragStart.top + dy, rootNode);
      rootNode.style.left = `${clamped.left}px`;
      rootNode.style.top = `${clamped.top}px`;
      rootNode.style.right = "auto";
      rootNode.style.bottom = "auto";
    }

    async function endDrag() {
      if (!dragStart) return;
      const moved = dragStart.moved;
      dragStart = null;
      suppressNextClick = moved;
      rootNode.classList.remove("is-dragging");
      if (moved && root.storage?.saveSettings) {
        await root.storage.saveSettings({
          integrationPosition: {
            left: rootNode.getBoundingClientRect().left,
            top: rootNode.getBoundingClientRect().top
          }
        }).catch(() => null);
      }
    }

    fab.addEventListener("pointerdown", beginDrag);
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
    fab.addEventListener("click", () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      if (!enabled) return;
      rootNode.classList.toggle("is-open");
    });
    formatsNode.addEventListener("change", async () => {
      selectedFormats = currentFormats();
      updateFormatClasses();
      await root.storage?.saveSettings?.({ integrationSelectedFormats: selectedFormats }).catch(() => null);
    });
    exportButton.addEventListener("click", async () => {
      const formats = currentFormats();
      if (!formats.length || !enabled) return;
      exportButton.disabled = true;
      exportButton.textContent = "Exporting...";
      try {
        await Promise.resolve(onExport(root.constants.EXPORT_FORMATS.MULTI, formats));
        rootNode.classList.remove("is-open");
      } finally {
        exportButton.disabled = false;
        exportButton.textContent = "Export";
      }
    });

    renderFormats();

    return {
      mount() { return true; },
      setVisible(value) { rootNode.hidden = !value; },
      setEnabled(value) {
        enabled = Boolean(value);
        fab.disabled = !enabled;
        exportButton.disabled = !enabled;
      },
      setLoading(value) { exportButton.disabled = Boolean(value); },
      setTheme() {},
      setProvider() {},
      isMenuOpen() { return rootNode.classList.contains("is-open"); },
      hasVisibleFormats() { return true; },
      setVisibleFormats() {},
      setFormatOrder() {},
      setFormatStates() {},
      setSelectedFormats(formats) {
        selectedFormats = Array.isArray(formats) && formats.length ? formats : selectedFormats;
        renderFormats();
      },
      setPosition,
      destroy() {
        window.removeEventListener("pointermove", moveDrag);
        window.removeEventListener("pointerup", endDrag);
        rootNode.remove();
      }
    };
  }

  root.contentUi = { createFloatingExportUi };
})();
