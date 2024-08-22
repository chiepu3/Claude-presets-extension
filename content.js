// content.js
(function () {
  let presetSidebar;
  let usedTags = new Set();
  let allPresets = [];

  function initializeSidebar(force = false) {
    const mainElement = document.querySelector("main");
    if (!mainElement) return;

    console.log("initializeSidebar");

    mainElement.classList.add("claude-main-shifted");

    const parentElement = mainElement.parentElement;
    parentElement.style.display = "flex";
    parentElement.style.flexDirection = "row";

    presetSidebar = document.createElement("div");
    presetSidebar.id = "preset-sidebar";
    presetSidebar.style.display = "none";
    presetSidebar.classList.add(
      "from-bg-300/70",
      "to-bg-400/70",
      "border-r-0.5",
      "border-border-300",
      "bg-gradient-to-b",
      "backdrop-blur",
      "bottom-0",
      "top-0"
    );
    parentElement.appendChild(presetSidebar);

    createSidebarContent();
    loadPresets();

    if (force) {
      document.getElementById("preset-sidebar").style.display = "block";
    }

    //1秒後に、今回作った要素が追加されたことを確認し、存在しなければ再度作成する
    setTimeout(() => {
      const presetSidebar = document.getElementById("preset-sidebar");
      if (!presetSidebar) {
        initializeSidebar();
      } else {
        //display: none; から display: block; に変更
        document.getElementById("preset-sidebar").style.display = "block";
      }
    }, 1000);
  }

  function updateSidebarVisibility() {
    const isNewConversationPage = window.location.pathname === "/new";
    console.log("now URL: ", window.location.pathname);
    const sidebarElement = document.getElementById("preset-sidebar");

    if (isNewConversationPage) {
      console.log("show sidebar");
      //bodyにクラスをつける
      document.body.classList.add("claude-main-shifted");

      //存在しなければ、再度作成する
      const presetSidebar = document.getElementById("preset-sidebar");
      if (!presetSidebar) {
        initializeSidebar(true);
      } else {
        //display: none; から display: block; に変更
        document.getElementById("preset-sidebar").style.display = "block";
      }
    } else {
      //bodyからクラスを削除する

      document.body.classList.remove("claude-main-shifted");
    }
  }

  function createSidebarContent() {
    presetSidebar.innerHTML = `
        <h2>プリセット</h2>
        <div id="filter-controls">
          <select id="tag-filter">
            <option value="">全てのタグ</option>
          </select>
          <input type="text" id="search-filter" placeholder="検索...">
        </div>
        <button id="add-preset">+ 新規プリセット</button>

        <ul id="preset-list"></ul>
      `;

    document
      .getElementById("add-preset")
      .addEventListener("click", showAddPresetPopup);
    document
      .getElementById("tag-filter")
      .addEventListener("change", applyFilters);
    document
      .getElementById("search-filter")
      .addEventListener("input", applyFilters);
  }

  function loadPresets() {
    chrome.storage.sync.get("presets", function (data) {
      allPresets = data.presets || [];
      updateTagFilter();
      displayPresets(allPresets);
    });
  }

  function updateTagFilter() {
    const tagFilter = document.getElementById("tag-filter");
    usedTags.clear();
    allPresets.forEach((preset) => usedTags.add(preset.genre));

    const currentValue = tagFilter.value;
    tagFilter.innerHTML = '<option value="">全てのタグ</option>';
    Array.from(usedTags)
      .sort()
      .forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
      });
    tagFilter.value = currentValue;
  }

  function applyFilters() {
    const tagFilter = document.getElementById("tag-filter").value;
    const searchFilter = document
      .getElementById("search-filter")
      .value.toLowerCase();

    const filteredPresets = allPresets.filter((preset) => {
      const matchesTag = !tagFilter || preset.genre === tagFilter;
      const matchesSearch =
        preset.name.toLowerCase().includes(searchFilter) ||
        preset.text.toLowerCase().includes(searchFilter) ||
        preset.genre.toLowerCase().includes(searchFilter);
      return matchesTag && matchesSearch;
    });

    displayPresets(filteredPresets);
  }

  function displayPresets(presets) {
    const presetList = document.getElementById("preset-list");
    presetList.innerHTML = "";

    presets.forEach((preset, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
          <div class="preset-item">
            <span class="preset-name">${preset.name}</span>
            <span class="preset-tag">${preset.genre}</span>
            <div class="preset-actions">
              <button class="use-preset" data-index="${index}">使用</button>
              <div>
                <button class="edit-preset" data-index="${index}">編集</button>
                <button class="delete-preset" data-index="${index}">削除</button>
              </div>
            </div>
          </div>
        `;
      presetList.appendChild(li);
    });

    addPresetEventListeners();
  }

  function addPresetEventListeners() {
    document.querySelectorAll(".use-preset").forEach((button) => {
      button.addEventListener("click", usePreset);
    });

    document.querySelectorAll(".edit-preset").forEach((button) => {
      button.addEventListener("click", editPreset);
    });

    document.querySelectorAll(".delete-preset").forEach((button) => {
      button.addEventListener("click", deletePreset);
    });
  }

  function showAddPresetPopup() {
    const popup = document.createElement("div");
    popup.id = "add-preset-popup";
    popup.innerHTML = `
        <h2>新規プリセット</h2>
        <input type="text" id="preset-name" placeholder="プリセット名">
        <textarea id="preset-text" placeholder="プリセットのテキスト"></textarea>
        <input type="text" id="preset-genre" placeholder="ジャンル（タグ）" list="tag-suggestions">
        <datalist id="tag-suggestions">
          ${Array.from(usedTags)
            .map((tag) => `<option value="${tag}">`)
            .join("")}
        </datalist>
        <div class="popup-actions">
          <button id="save-preset">保存</button>
          <button id="cancel-preset">キャンセル</button>
        </div>
      `;
    document.body.appendChild(popup);

    document
      .getElementById("save-preset")
      .addEventListener("click", saveNewPreset);
    document
      .getElementById("cancel-preset")
      .addEventListener("click", () => popup.remove());
  }

  function saveNewPreset() {
    const name = document.getElementById("preset-name").value;
    const text = document.getElementById("preset-text").value;
    const genre = document.getElementById("preset-genre").value;

    if (name && text) {
      allPresets.push({
        name: name,
        text: text,
        createdAt: new Date().toISOString(),
        genre: genre,
      });
      chrome.storage.sync.set({ presets: allPresets }, () => {
        updateTagFilter();
        applyFilters();
        document.getElementById("add-preset-popup").remove();
      });
    }
  }

  function usePreset(e) {
    const index = e.target.dataset.index;
    const preset = allPresets[index];
    const inputArea = document.querySelector(".ProseMirror");
    if (inputArea) {
      inputArea.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = preset.text;
      inputArea.appendChild(p);
      inputArea.dispatchEvent(new Event("input", { bubbles: true }));
      inputArea.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(inputArea);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function editPreset(e) {
    const index = e.target.dataset.index;
    const preset = allPresets[index];
    showEditPresetPopup(preset, index);
  }

  function showEditPresetPopup(preset, index) {
    const popup = document.createElement("div");
    popup.id = "edit-preset-popup";
    popup.innerHTML = `
        <h2>プリセットを編集</h2>
        <input type="text" id="edit-preset-name" value="${preset.name}">
        <textarea id="edit-preset-text">${preset.text}</textarea>
        <input type="text" id="edit-preset-genre" value="${
          preset.genre
        }" list="tag-suggestions">
        <datalist id="tag-suggestions">
          ${Array.from(usedTags)
            .map((tag) => `<option value="${tag}">`)
            .join("")}
        </datalist>
        <div class="popup-actions">
          <button id="update-preset">更新</button>
          <button id="cancel-edit">キャンセル</button>
        </div>
      `;
    document.body.appendChild(popup);

    document
      .getElementById("update-preset")
      .addEventListener("click", () => updatePreset(index));
    document
      .getElementById("cancel-edit")
      .addEventListener("click", () => popup.remove());
  }

  function updatePreset(index) {
    const name = document.getElementById("edit-preset-name").value;
    const text = document.getElementById("edit-preset-text").value;
    const genre = document.getElementById("edit-preset-genre").value;

    if (name && text) {
      allPresets[index] = {
        ...allPresets[index],
        name: name,
        text: text,
        genre: genre,
      };
      chrome.storage.sync.set({ presets: allPresets }, () => {
        updateTagFilter();
        applyFilters();
        document.getElementById("edit-preset-popup").remove();
      });
    }
  }

  function deletePreset(e) {
    const index = e.target.dataset.index;
    if (confirm("このプリセットを削除しますか？")) {
      allPresets.splice(index, 1);
      chrome.storage.sync.set({ presets: allPresets }, () => {
        updateTagFilter();
        applyFilters();
      });
    }
  }

  // MutationObserver to detect when the main element is added to the DOM
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === "childList") {
        const mainElement = document.querySelector("main");
        if (mainElement) {
          initializeSidebar();
          observer.disconnect();
          break;
        }
      }
    }
  });

  // Function to handle URL changes
  function handleUrlChange() {
    updateSidebarVisibility();
  }

  // Set up URL change detection
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      handleUrlChange();
    }
  }).observe(document, { subtree: true, childList: true });

  // Initial setup
  observer.observe(document.body, { childList: true, subtree: true });
  handleUrlChange();
})();
