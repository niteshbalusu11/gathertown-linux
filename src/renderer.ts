/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

// Type definitions
interface DisplayMediaSource {
  id: string;
  name: string;
  thumbnail_data: string;
}

declare global {
  interface Window {
    electron: {
      myCustomGetDisplayMedia: () => Promise<DisplayMediaSource[]>;
      toggleDevTools: () => Promise<void>;
    };
    game?: {
      spaceId: string;
    };
  }

  interface MediaTrackConstraints {
    mandatory?: {
      chromeMediaSource?: string;
      chromeMediaSourceId?: string;
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
    };
  }
}

console.log('👋 This message is being logged by "renderer.ts", included via Vite');

let sourceId: string | null = null;

// override getDisplayMedia
navigator.mediaDevices.getDisplayMedia = async (): Promise<MediaStream> => {
  try {
    // create MediaStream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        mandatory: {
          chromeMediaSource: 'desktop'
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId || undefined,
        },
        width: { max: 2880 },
        height: { max: 2880 },
        cursor: "always"
      } as MediaTrackConstraints
    });

    return stream;
  } catch (error) {
    console.error('Error getting display media:', error);
    // If first attempt fails, try without audio
    try {
      const streamWithoutAudio = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId || undefined,
          },
          width: { max: 2880 },
          height: { max: 2880 },
          cursor: "always"
        } as MediaTrackConstraints
      });
      return streamWithoutAudio;
    } catch (retryError) {
      console.error('Error getting display media (retry):', retryError);
      throw retryError;
    }
  }
};

const showBtn = (btn: HTMLElement): void => {
  btn.style.display = "flex";
};

const hideBtn = (btn: HTMLElement): void => {
  btn.style.display = "none";
};

const getScreenShareBtn = (): HTMLElement | null => {
  const btns = document.querySelectorAll<HTMLElement>("[aria-label='Screen share']");
  if (btns.length > 1) {
    return Array.from(btns).filter((btn) => !btn.dataset.isVirtual)[0];
  } else if (btns.length === 1) {
    return btns[0];
  }
  return null;
};

const getVirtualBtn = (): HTMLElement | null => {
  const btns = document.querySelectorAll<HTMLElement>("[aria-label='Screen share']");
  if (btns.length > 1) {
    return Array.from(btns).filter((btn) => btn.dataset.isVirtual)[0];
  }
  return null;
};

const setupBtns = (): HTMLElement | null => {
  const screenShareBtn = getScreenShareBtn();
  const virtualBtn = getVirtualBtn();
  
  if (!screenShareBtn) return null;
  
  if (virtualBtn) {
    return virtualBtn;
  }
  
  const virtualShareBtn = screenShareBtn.cloneNode(true) as HTMLElement;
  virtualShareBtn.dataset.isVirtual = "true";
  virtualShareBtn.title = "Virtual";

  screenShareBtn.title = "Original";
  screenShareBtn.parentNode?.appendChild(virtualShareBtn);
  showBtn(virtualShareBtn);
  hideBtn(screenShareBtn);

  virtualShareBtn.addEventListener("click", (e) => {
    e.preventDefault();
    void sourceSelector();
  });

  screenShareBtn.addEventListener("click", () => {
    setTimeout(() => {
      setupBtns();
      showBtn(screenShareBtn);
      hideBtn(virtualShareBtn);
    }, 500);
  });

  return virtualShareBtn;
};

const initShareBtn = (): void => {
  let screenShareBtn: HTMLElement | null = null;
  if (window.game?.spaceId) {
    screenShareBtn = getScreenShareBtn();
  }

  if (!screenShareBtn) {
    setTimeout(initShareBtn, 1000);
    return;
  }

  setupBtns();
};

initShareBtn();

const findTargetByClass = (target: HTMLElement | null, className: string): HTMLElement | null => {
  if (!target) return null;
  if (target.classList && target.classList.contains(className)) {
    return target;
  } else if (target.parentNode instanceof HTMLElement) {
    return findTargetByClass(target.parentNode, className);
  }
  return null;
};

const sourceSelector = async (): Promise<void> => {
  const sources = await window.electron.myCustomGetDisplayMedia();
  const selector = buildSourceSelector(sources);
  document.body.appendChild(selector);
  
  const sourceEls = selector.querySelectorAll<HTMLElement>(".source");
  for (const sourceEl of sourceEls) {
    sourceEl.addEventListener("click", (e) => {
      e.stopImmediatePropagation();
      const target = findTargetByClass(e.target as HTMLElement, "source");
      if (!target) return;
      
      const id = target.id;
      sourceId = id;

      const screenShareBtn = getScreenShareBtn();
      if (!screenShareBtn) return;

      // click this so that it's active
      screenShareBtn.click();

      setTimeout(() => {
        const screenBtn = getScreenShareBtn();
        const virtualBtn = getVirtualBtn();
        if (screenBtn) showBtn(screenBtn);
        if (virtualBtn) hideBtn(virtualBtn);
      }, 500);

      // Remove the selector
      selector.parentNode?.removeChild(selector);
    });
  }

  const closeEl = selector.querySelector<HTMLElement>(".close");
  if (closeEl) {
    closeEl.addEventListener("click", () => {
      selector.parentNode?.removeChild(selector);
    });
  }
};

const buildSourceSelector = (sources: DisplayMediaSource[]): HTMLElement => {
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

interface SourceElement {
  type: "screen" | "window";
  el: HTMLElement;
}

const createSourceEl = (source: DisplayMediaSource): SourceElement => {
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

const addDevToggle = async (): Promise<void> => {
  const devToolsButton = document.createElement("div");
  devToolsButton.setAttribute("id", "snap-dev-tools");
  devToolsButton.innerText = ">_";

  devToolsButton.addEventListener("click", () => {
    void window.electron.toggleDevTools();
  });

  document.body.appendChild(devToolsButton);
};

void addDevToggle();

