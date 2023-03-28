let sourceId = null;

// override getDisplayMedia
navigator.mediaDevices.getDisplayMedia = async () => {
  // create MediaStream
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: sourceId,
        minWidth: 1280,
        maxWidth: 1280,
        minHeight: 720,
        maxHeight: 720,
      },
    },
  });

  return stream;
};

let virtualShareBtn = null;

const showBtn = (btn) => {
  btn.style.display = "flex";
};

const hideBtn = (btn) => {
  btn.style.display = "none";
};

const getScreenShareBtn = () => {
  const btns = document.querySelectorAll("[aria-label='Screen share']");
  if (btns.length > 1) {
    return Array.from(btns).filter((btn) => !btn.dataset.isVirtual)[0];
  } else if (btns.length === 1) {
    return btns[0];
  }
  return null;
};

const initShareBtn = () => {
  let screenShareBtn = null;
  if (window.game && window.game.spaceId) {
    screenShareBtn = getScreenShareBtn();
  }

  if (!screenShareBtn) {
    setTimeout(initShareBtn, 1000);
    return;
  }

  virtualShareBtn = screenShareBtn.cloneNode(true);
  virtualShareBtn.dataset.isVirtual = true;
  console.log(virtualShareBtn);

  screenShareBtn.parentNode.appendChild(virtualShareBtn);
  showBtn(virtualShareBtn);
  hideBtn(screenShareBtn);

  virtualShareBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sourceSelector();
  });

  screenShareBtn.addEventListener("click", (e) => {
    showBtn(virtualShareBtn);
    hideBtn(getScreenShareBtn());
  });

  //setTimeout(initShareBtn, 60 * 1000);
};

initShareBtn();

const findTargetByClass = (target, className) => {
  if (target && target.classList && target.classList.contains(className)) {
    return target;
  } else if (target.parentNode) {
    return findTargetByClass(target.parentNode, className);
  }
};

const sourceSelector = async () => {
  const sources = await window.myCustomGetDisplayMedia();
  const selector = buildSourceSelector(sources);
  document.body.appendChild(selector);
  const sourceEls = selector.querySelectorAll(".source");
  const screenShareBtn = getScreenShareBtn();
  for (const sourceEl of sourceEls) {
    sourceEl.addEventListener("click", (e) => {
      e.stopImmediatePropagation();
      const target = findTargetByClass(e.target, "source");
      const id = target.id;
      sourceId = id;
      selector.parentNode.removeChild(selector);
      
      screenShareBtn.click();
      showBtn(screenShareBtn);
      hideBtn(virtualShareBtn);
    });
  }
  const closeEl = selector.querySelector(".close");
  closeEl.addEventListener("click", (e) => {
    selector.parentNode.removeChild(selector);
  });
};

const buildSourceSelector = (sources) => {
  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.setAttribute("id", "snap-source-selector");

  const closeButton = document.createElement("div");
  closeButton.classList.add("close");
  closeButton.innerText = "✕";
  wrapper.appendChild(closeButton);

  // Create screen wrapper
  const screens = document.createElement("div");
  screens.classList.add("screens");
  const screensTitle = document.createElement("h4");
  screensTitle.innerText = "Screens";

  // Create window wrapper
  const windows = document.createElement("div");
  windows.classList.add("windows");
  const windowTitle = document.createElement("h4");
  windowTitle.innerText = "Windows";

  wrapper.appendChild(screensTitle);
  wrapper.appendChild(screens);
  wrapper.appendChild(windowTitle);
  wrapper.appendChild(windows);

  // Loop through sources
  const sourceEls = sources.map(createSourceEl);
  for (const source of sourceEls) {
    if (source.type === "screen") {
      screens.appendChild(source.el);
    } else {
      windows.appendChild(source.el);
    }
  }

  return wrapper;
};
const createSourceEl = (source) => {
  const wrapper = document.createElement("div");
  wrapper.classList.add("source");
  wrapper.setAttribute("id", source.id);

  const name = document.createElement("p");
  name.classList.add("name");
  name.innerText = source.name;

  wrapper.setAttribute(
    "style",
    "background-image: url(" + source.thumbnail_data + ")"
  );

  wrapper.append(name);
  return {
    type: source.id.indexOf("screen") === 0 ? "screen" : "window",
    el: wrapper,
  };
};

const addDevToggle = async () => {
  const devToolsButton = document.createElement("div");
  devToolsButton.setAttribute("id", "snap-dev-tools");
  devToolsButton.innerText = ">_";

  devToolsButton.addEventListener("click", () => {
    window.toggleDevTools();
  });

  document.body.appendChild(devToolsButton);
};

addDevToggle();
