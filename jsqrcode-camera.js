function QRCodeScanner(options) {
  const rootElement = options.element;
  const width = options.width;
  const height = options.height;
  const onScanSuccess = options.onScanSuccess;
  const onScanError = options.onScanError;
  const scanInterval = options.scanInterval || 100;
  let stream = undefined;
  let deviceId = undefined;
  let availableVideoInputs = undefined;

  function c(tagName, attributes, children) {
    const element = document.createElement(tagName);
    Object.assign(element, attributes);
    replaceChildren(element, children);
    return element;
  }

  function replaceChildren(parent, children) {
    parent.innerHTML = '';
    appendChildren(parent, children);
  }

  function appendChildren(parent, children) {
    (children || []).forEach(function(child) {
      if (typeof child === 'string') {
        child = document.createTextNode(child);
      }
      parent.appendChild(child);
    });
  }

  function activatePanel(panel) {
    panel.parentNode.childNodes.forEach(function(node) {
      node.style.display = panel === node ? 'block' : 'none';
    });

  }

  const loadingPanel = c('div', {
    className: 'loading panel'
  }, []);
  Object.assign(loadingPanel.style, {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  });

  const errorPanel = c('div', {
    className: 'error panel'
  }, []);
  Object.assign(errorPanel.style, {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  });

  const switchVideoInputButton = c('button', {
    className: 'switch button',
    onclick: handleSwitchVideoInputButtonClick
  });
  const controlsOverlayElement = c('div', {
    className: 'controls'
  }, [
    switchVideoInputButton
  ]);
  Object.assign(controlsOverlayElement.style, {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  });

  const videoElement = c('video', {
    autoplay: true
  });
  Object.assign(videoElement.style, {
    width: width + 'px',
    height: height + 'px'
  });

  const videoPanel = c('div', {
    className: 'video panel'
  }, [
    videoElement,
    controlsOverlayElement
  ]);
  Object.assign(videoPanel.style, {
    position: 'relative',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  });

  const URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  function initializeUserMedia() {
    if (!navigator.getUserMedia) {
      errorPanel.textContent = 'Camera not supported';
      activatePanel(errorPanel);
    }
    navigator.getUserMedia({
      video: {
        facingMode: 'environment',
        deviceId: deviceId
          ? { exact: deviceId }
          : undefined
      }
    }, handleUserMediaSuccess, handleUserMediaError);
  }

  function handleUserMediaSuccess(stream) {
    activatePanel(videoPanel);
    if (availableVideoInputs === undefined) {
      retrieveVideoInputs();
    }

    videoElement.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
    scheduleScan();
  }

  function retrieveVideoInputs() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      switchVideoInputButton.style.display = 'none';
    }
    navigator.mediaDevices.enumerateDevices()
      .then(function(devices) {
      availableVideoInputs = devices
        .filter(function(device) {
          return device.kind === 'videoinput';
        });
      switchVideoInputButton.style.display = availableVideoInputs.length < 2
        ? 'none'
        : 'block';
    });
  }

  function handleUserMediaError(error) {
    errorPanel.textContent = 'Error activating camera';
    activatePanel(errorPanel);
  }

  function handleSwitchVideoInputButtonClick() {
    let currentAvailableVideoInputIndex = -1;
    availableVideoInputs.forEach(function(videoinput, index) {
      if (videoinput.deviceId === deviceId) {
        currentAvailableVideoInputIndex = index;
      }
    });
    const newAvailableVideoInputIndex = (currentAvailableVideoInputIndex + 1) % availableVideoInputs.length;
    deviceId = availableVideoInputs[newAvailableVideoInputIndex].deviceId;
    initializeUserMedia();
  }

  // Scanning QR code from camera at set interval.
  // We reuse a premade canvas to copy the camera image to
  // and convert the canvas to an ObjectUrl to pass it to jsqrcode.
  var scanTimeout;
  const canvas = c('canvas', {
    width: width,
    height: height
  });
  const context = canvas.getContext('2d');
  function scheduleScan() {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scan, scanInterval);
  }

  function stopScan() {
    clearTimeout(scanTimeout);
    scanTimeout = undefined;
  }

  qrcode.callback = handleScanResult;

  function handleScanResult(result) {
    onScanSuccess(result);
  }

  function scan() {
    if (!videoElement.parentNode) {
      // Stop scanning when videoElement was detached.
      return;
    }
    context.drawImage(videoElement, 0, 0, width, height);
    
    // We set these two, so that jsqrcode won't
    // look for an qrcode element using getElementById.
    qrcode.canvas_qr2 = canvas;
    qrcode.qrcontext2 = context;
    try {
      qrcode.decode();
    } catch(e) {
      // jsqrcode throws an error each time an qrcode was not found.
      onScanError(e);
    }
    scheduleScan();
  }
  
  // Initialization of QRCodeScanner
  Object.assign(rootElement.style, {
    position: 'relative',
    width: width + 'px',
    height: height + 'px',
    backgroundColor: 'black'
  });
  appendChildren(rootElement, [
    errorPanel,
    loadingPanel,
    videoPanel
  ]);
  activatePanel(loadingPanel);
  initializeUserMedia();
  
  return {
    stop: stopScan
  }
}
