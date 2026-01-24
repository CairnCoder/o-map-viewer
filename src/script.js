//---------------- Comments ----------------
// Mostly ok. Items still needing to be refactored are: draw leg and measure distance. Everything also need to have suitable comments added. 




// ---------------- High level overview of the java script bellow ----------------

// First there is the image/map display framework.
// Then there are button event listeners that activate actions on the image/map display framework, sometimes aided by further framework.




// ---------------- General tools ----------------

/**
 * Alters visual appearance of the given toggle button when toggled.
 *
 * @returns {void}
 */
function toggleButtonAppearance(buttonId, desiredState = null) {
  // if no desired state given, invert whatever is present.
  if (desiredState == null) {
    desiredState = !getButtonToggleState(buttonId);
  }

  const toggleButton = document.getElementById(buttonId);
  if (desiredState) {
    // make active
    toggleButton.classList.remove('btn-secondary');
    toggleButton.classList.add('btn-primary');
  } else {
    // make inactive
    toggleButton.classList.remove('btn-primary');
    toggleButton.classList.add('btn-secondary');
  }
}

function getButtonToggleState(buttonId){
  const btn = document.getElementById(buttonId);
  return btn.classList.contains('btn-primary');
}

function keyToolActiveTest(exclude=null) {
  const list = new Set(['pickColorBtn', 'measure-btn', 'drawLegBtn']);
  list.delete(exclude);
  for (const item of list) {
    if (getButtonToggleState(item)) {
      return true;
    }
  }
  return false;
}




// ---------------- Core image/map display framework ----------------

// Initalise the OpenLayers diaplsy framework.
// Initalise a layer to hold the image.
// Initalise a variable to hold a master copy of the imported image file.
// Add event listeners to handle image import.
// The import process works as follows:
//     1. set image as source for global variable 'masterImage' and wait for completion (is an asynchronous process).
//     2. set global variable 'masterImageExtent'
//     3. Render masterImage on a new canvas.
//     4. Send the canvas to OpenLayers to display.




// Create image/map canvas
let map = new ol.Map({
  target: 'map',
  controls: [],
  layers: [],
  view: new ol.View({ center: [0, 0], zoom: 2 }),
  interactions: ol.interaction.defaults.defaults({
    pinchRotate: false, // disable default action and replace with bellow
  }).extend([
    new ol.interaction.PinchRotate({
      threshold: 0, // remove threshold/buffer before rotation begins
    })
  ]),
});
let imageLayer = new ol.layer.Image();
map.addLayer(imageLayer);

// Handle double click (prevent zoom)
map.getInteractions().forEach(function(interaction) {
  if (interaction instanceof ol.interaction.DoubleClickZoom) {
    map.removeInteraction(interaction);
  }
});

// Ensure correct sizing with flex layout, after page load.
// setTimeout(() => map.updateSize(), 100);       // Might be required but in testing it isn't.


// Global page variables
let masterImage = new Image();
let masterImageExtent = null;


/**
 * ##################################### TODO
 *
 * @returns {void}
 */
function renderFullImageOnCanvas() {
  //// Render image in hidden canvas.
  if (!masterImage){
    console.error("No original image.");
    return;
  }

  // Create new
  let imgCanvas = document.createElement('canvas');
  let imgCtx = imgCanvas.getContext('2d');

  // Match the canvas size to the image (clears canvas)
  imgCanvas.width = masterImage.width;
  imgCanvas.height = masterImage.height;

  // Draw the image into the canvas
  imgCtx.drawImage(masterImage, 0, 0);

  return {imgCanvas, imgCtx};
}

function sendCanvasToOpenLayers(canvas, extent) {
  //// Send rendered canvas to open layers.
  // (Using a new ImageStatic object is required, as property alteration isn't permitted.)
  const source = new ol.source.ImageStatic({
    url: canvas.toDataURL(),
    imageExtent: extent
  });
  imageLayer.setSource(source);
}

// Create image framework, load image from source, and initialise. Note, adding a file to img.src is an asynchronouse action, thus initialision must also be done asynchronously.
masterImage.onload = function () {
  masterImageExtent = [0, 0, masterImage.width, masterImage.height];

  // Render image on canvas.
  ({ imgCanvas, imgCtx } = renderFullImageOnCanvas());
  sendCanvasToOpenLayers(imgCanvas, masterImageExtent);

  // Reset view state
  map.getView().fit(masterImageExtent);
};

// Event listener: Import image.
// If a file has been selected, set as img source. Then automatically execute img.onload .
document.getElementById('imageImporter').addEventListener('change', function (e) {
  if (!e.target.files[0]) {
    console.error("No image selected.");
    return;
  }
  masterImage.src = URL.createObjectURL(e.target.files[0]);
  // Execute img.onload
});








// ---------------- Colour filter ----------------


// Using the colour of the pixel selected by the user and the threshold in the tool bar, make all pixels whose colour is outside the region of colour space transparent.
// This filtering is applied to the rendered image.
// To reset the colours, it replaces the rendered image with a backup image stored in a global variable.

// When the colour picker button is pressed, toggle map click listener bool state.
// On next map click:
//     1. Get picked pixel colour
//     2. Get threshold
//     3. Render master image on a new canvas.
//     4. Get pixel data from canvas.
//     5. Modify the pixel data using the picked pixel colour, threshold, and 'distance rule'.
//     6. Return new pixel data to canvas.
//     7. Push canvas to OpenLayers
//     8. Remove map click event listener
//     9. Untoggle colour picker button.

// When the reset image button is pressed:
//     1. Render master image on a new canvas.
//     2. Get pixel data from canvas.



// Event listener: Colour picker
// Image/map pixel selection and filter application.
document.getElementById('pickColorBtn').addEventListener('click', () => {
  // Ensure no other key tools are in use
  if (keyToolActiveTest(exclude='pickColorBtn')) { return; }

  toggleButtonAppearance('pickColorBtn');

  if (getButtonToggleState('pickColorBtn')) {
    // activate picking mode
    const toastElement = document.getElementById('infoToastPickColour');
    const toast = new bootstrap.Toast(toastElement, { delay: 10000 });
    toast.show();

    // Register map click event listener
    map.on('click', pickPixelAndFilterImage);

  } else {
    // Unregister map click event listener
    map.un('click', pickPixelAndFilterImage);
  }
});

//
  function colorDistance(c1, c2) {
    // Determine euclidean 'distance' between two colours in rgb colour space.
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

function pickPixelAndFilterImage(event) {
  // Get pixel colour
  const coordinate = event.coordinate;
  const extent = masterImageExtent;
  const x = Math.floor((coordinate[0] - extent[0]) / (extent[2] - extent[0]) * imgCanvas.width);
  const y = Math.floor((extent[3] - coordinate[1]) / (extent[3] - extent[1]) * imgCanvas.height);
  const pixel = imgCtx.getImageData(x, y, 1, 1).data;
  const pickedColor = { r: pixel[0], g: pixel[1], b: pixel[2] };

  // Get threshold
  const threshold = parseInt(document.getElementById('threshold').value, 10) || 0;

  // Render new image in canvas.
  ({ imgCanvas, imgCtx } = renderFullImageOnCanvas());

  // Pull data from canvas
  const imageData = imgCtx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);

  // Filter (isolate colours)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const pixelColour = {r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2]};
    const dist = colorDistance(pickedColor, pixelColour);
    if (dist > threshold) {
      imageData.data[i + 3] = 0;
    }
  }

  // Push data to canvas
  imgCtx.putImageData(imageData, 0, 0);

  // Update OpenLayers render with canvas
  sendCanvasToOpenLayers(imgCanvas, masterImageExtent);

  // Unregister map click event listener
  map.un('click', pickPixelAndFilterImage);

  // Return toggle button to non-pick state
  toggleButtonAppearance('pickColorBtn', desiredState=false);
}


// Event listener: Restore image/map colours.
document.getElementById('resetImageBtn').addEventListener('click', () => {
  if (!masterImage) {
    console.error("No master image to restore with.")
    return;
  }

  // the follow comments are usefull to know, but not required here.

  // Save current view state
  // const view = map.getView();
  // const currentCenter = view.getCenter();
  // const currentZoom = view.getZoom();
  // const currentRotation = view.getRotation();

  ({ imgCanvas, imgCtx } = renderFullImageOnCanvas());
  sendCanvasToOpenLayers(imgCanvas, masterImageExtent);

  // Defer restoring view to ensure layer is fully replaced
  // setTimeout(() => {
  //   view.setCenter(currentCenter);
  //   view.setZoom(currentZoom);
  //   view.setRotation(currentRotation);
  // }, 0); // delay to next tick of JS event loop
});



//---------------- Distance measurement ----------------

// Setup framework to handle distance measurement.
let measureSource = new ol.source.Vector();

const lineColor = 'rgba(255,0,255,0.8)';  // your main line color
const borderColor = 'rgba(0,0,0,0.8)'; // black border color
const blackLineWidth = 4;
const colourLineWidth = 2.5;

const measureLayer = new ol.layer.Vector({
  source: measureSource,
  style: function(feature) {
    const color = feature.get('color') || lineColor; // use feature color or fallback
    return [
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: borderColor,
          width: blackLineWidth,
        }),
        image: new ol.style.Circle({
          radius: 7,
          fill: new ol.style.Fill({ color: borderColor }),
        }),
      }),
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: color,
          width: colourLineWidth,
        }),
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({ color: color }),
        }),
      }),
    ];
  },
});
measureLayer.setZIndex(10);
map.addLayer(measureLayer);

let drawInteraction = null;
let activeTooltip = null;
const tooltips = [];

function createTooltip() {
  const element = document.createElement('div');
  element.className = 'tooltip-measure';
  const overlay = new ol.Overlay({
    element: element,
    offset: [0, -15],
    positioning: 'bottom-center',
    stopEvent: false
  });
  map.addOverlay(overlay);
  return { element, overlay };
}

function getRandomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  const a = 0.8;
  return `rgba(${r},${g},${b},${a})`;
}

// Event listener: Measure distance button
document.getElementById('measure-btn').addEventListener('click', () => {
  // Ensure no other key tools are in use
  if (keyToolActiveTest(exclude='measure-btn')) { return; }

  if (drawInteraction) {
    map.removeInteraction(drawInteraction);
    drawInteraction = null;
    toggleButtonAppearance('measure-btn', drawInteraction);
    return;
  }

  const randomColor = getRandomColor();

  drawInteraction = new ol.interaction.Draw({
    source: measureSource,
    type: 'LineString',
    style: [
      // Black border (fixed)
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: borderColor,
          width: blackLineWidth,
        }),
        image: new ol.style.Circle({
          radius: 7,
          fill: new ol.style.Fill({ color: borderColor }),
        }),
      }),
      // Random colored line (thinner)
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: randomColor,
          width: colourLineWidth,
        }),
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({ color: randomColor }),
        }),
      }),
    ],
  });

  map.addInteraction(drawInteraction);
  toggleButtonAppearance('measure-btn', drawInteraction);

  const { element: tooltipElement, overlay: tooltipOverlay } = createTooltip();
  activeTooltip = tooltipOverlay;

  drawInteraction.on('drawstart', function (evt) {
    const sketch = evt.feature;

    const geom = sketch.getGeometry();
    geom.on('change', function (e) {
      const coords = e.target.getCoordinates();

      let length = 0;
      let cumulativeLengths = [0];
      for (let i = 0; i < coords.length - 1; i++) {
        const dx = coords[i + 1][0] - coords[i][0];
        const dy = coords[i + 1][1] - coords[i][1];
        length += Math.sqrt(dx * dx + dy * dy);
        cumulativeLengths.push(length);
      }

      tooltipElement.innerHTML = length.toFixed(1) + ' px';

      const halfLength = length / 2;

      let segmentIndex = 0;
      while (segmentIndex < cumulativeLengths.length - 1 && cumulativeLengths[segmentIndex + 1] < halfLength) {
        segmentIndex++;
      }

      const segmentStart = coords[segmentIndex];
      const segmentEnd = coords[segmentIndex + 1];
      const segmentStartLength = cumulativeLengths[segmentIndex];
      const segmentEndLength = cumulativeLengths[segmentIndex + 1];
      const segmentFraction = (halfLength - segmentStartLength) / (segmentEndLength - segmentStartLength);

      const midX = segmentStart[0] + segmentFraction * (segmentEnd[0] - segmentStart[0]);
      const midY = segmentStart[1] + segmentFraction * (segmentEnd[1] - segmentStart[1]);

      tooltipOverlay.setPositioning('bottom-center');
      tooltipOverlay.setOffset([0, -15]);
      tooltipOverlay.setPosition([midX, midY]);
    });
  });

  drawInteraction.on('drawend', function (evt) {
    const feature = evt.feature;
    feature.set('color', randomColor); // set the feature color property

    tooltips.push(activeTooltip);
    activeTooltip = null;

    map.removeInteraction(drawInteraction);
    drawInteraction = null;
    toggleButtonAppearance('measure-btn', drawInteraction);
  });
});

// Event listener: Clear measure lines button
document.getElementById('clear-btn').addEventListener('click', () => {
  // If drawing is in progress, finish it by simulating a double-click
  if (drawInteraction) {
    // This assumes drawInteraction is active and sketching is happening
    // We simulate an immediate finish by calling finishDrawing()
    try {
      drawInteraction.finishDrawing();
    } catch (e) {
      console.warn('No drawing in progress to finish:', e);
    }
    map.removeInteraction(drawInteraction);
    drawInteraction = null;
    toggleButtonAppearance('measure-btn', drawInteraction);
  }
  measureSource.clear();
  tooltips.forEach(tooltip => map.removeOverlay(tooltip));
  tooltips.length = 0; // clear array
});



//---------------- Draw leg tools ----------------

/// Framework for deg drawing:

// Initalise 'vectorSource' to hold leg vectors
const vectorSource = new ol.source.Vector({ wrapX: false });

// Create vector layer in OpenLayers & specify styling
const vectorLayer = new ol.layer.Vector({
  source: vectorSource,
  zIndex: 9,
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgba(163, 76, 196, 0.8)',
      width: 4,
    }),
    fill: new ol.style.Fill({
      color: 'rgba(0,0,0,0)',
    }),
  }),
});
map.addLayer(vectorLayer);

// Allow modification of leg vectors (e.g. circle size change and position change)
const modify = new ol.interaction.Modify({ source: vectorSource });
map.addInteraction(modify);

let draw = null;
let snap = null;
let circleFeatures = [];

function drawLineBetweenCirclesEdges() {
  if (circleFeatures.length !== 2) return;

  const [f1, f2] = circleFeatures;
  const c1 = f1.getGeometry();
  const c2 = f2.getGeometry();

  if (!(c1 instanceof ol.geom.Circle) || !(c2 instanceof ol.geom.Circle)) return;

  // Remove previous line
  vectorSource.getFeatures().forEach(feature => {
    if (feature.getGeometry().getType() === 'LineString') {
      vectorSource.removeFeature(feature);
    }
  });

  const center1 = c1.getCenter();
  const center2 = c2.getCenter();
  const radius1 = c1.getRadius();
  const radius2 = c2.getRadius();

  const dx = center2[0] - center1[0];
  const dy = center2[1] - center1[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;

  const ux = dx / dist;
  const uy = dy / dist;

  const start = [center1[0] + ux * radius1, center1[1] + uy * radius1];
  const end = [center2[0] - ux * radius2, center2[1] - uy * radius2];

  const line = new ol.geom.LineString([start, end]);
  const lineFeature = new ol.Feature({ geometry: line });
  vectorSource.addFeature(lineFeature);
}

function syncCircleRadii(changedFeature) {
  const changedGeometry = changedFeature.getGeometry();
  if (!(changedGeometry instanceof ol.geom.Circle)) return;
  const newRadius = changedGeometry.getRadius();
  circleFeatures.forEach(feature => {
    if (feature !== changedFeature) {
      const geom = feature.getGeometry();
      if (geom instanceof ol.geom.Circle) {
        geom.setRadius(newRadius);
        feature.setGeometry(geom); // Trigger redraw
      }
    }
  });
  drawLineBetweenCirclesEdges();
}


let modifyingFeature = null;
modify.on('modifystart', function (e) {
  modifyingFeature = e.features.item(0);
});
modify.on('modifyend', function () {
  modifyingFeature = null;
});
map.on('pointerdrag', function () {
  if (modifyingFeature) {
    syncCircleRadii(modifyingFeature);
  }
});

function removeDrawInteractions() {
  if (draw) {
    map.removeInteraction(draw);
    draw = null;
  }
  if (snap) {
    map.removeInteraction(snap);
    snap = null;
  }
}

function addDrawInteractions() {
  removeDrawInteractions();
  const fixedRadius = 30;

  draw = new ol.interaction.Draw({
    source: vectorSource,
    type: 'Circle',
    geometryFunction: (coords, geometry) => {
      if (!geometry) geometry = new ol.geom.Circle(coords[0], fixedRadius);
      else {
        geometry.setCenter(coords[0]);
        geometry.setRadius(fixedRadius);
      }
      return geometry;
    },
    maxPoints: 1,
  });

  draw.on('drawstart', function () {
    setTimeout(() => {
      draw.finishDrawing();
    }, 0);
  });

  draw.on('drawend', e => {
    const feature = e.feature;
    circleFeatures.push(feature);

    if (circleFeatures.length > 2) {
      // Remove extras
      const extras = circleFeatures.splice(2);
      extras.forEach(f => vectorSource.removeFeature(f));
    }

    if (circleFeatures.length === 2) {
      syncCircleRadii(feature);
      removeDrawInteractions();
      drawActive = false;
      toggleButtonAppearance('drawLegBtn', drawActive)
    }
  });

  snap = new ol.interaction.Snap({ source: vectorSource });

  map.addInteraction(draw);
  map.addInteraction(snap);
}

document.getElementById('drawLegBtn').addEventListener('click', () => {
  // Ensure no other key tools are in use
  if (keyToolActiveTest(exclude='drawLegBtn')) { return; }

  //
  toggleButtonAppearance('drawLegBtn');

  if (getButtonToggleState('drawLegBtn')) {
    // Remove previous circles and lines
    vectorSource.getFeatures().forEach(f => vectorSource.removeFeature(f));
    circleFeatures.length = 0;
    addDrawInteractions();    
  } else {
    removeDrawInteractions();
  }
});

// Event listener: Clear leg button
document.getElementById('clearLegBtn').addEventListener('click', () => {
  vectorSource.clear();
  circleFeatures.length = 0;
  removeDrawInteractions();
  toggleButtonAppearance('drawLegBtn', false);
  // Unhook event listeners ..................


});



//---------------- Background colour picker ----------------

// Event listener: Set background colour
document.getElementById('backgroundColorPicker').addEventListener('input', (e) => {
    const hex = e.target.value;
    document.getElementById('map').style.backgroundColor = hex;
});



//---------------- Rotation buttons ----------------

// Event listener: Rotate left button
document.getElementById('rotateLeftBtn').addEventListener('click', () => {
  const view = map.getView();
  view.setRotation(view.getRotation() - (Math.PI / 12)); // rotate 22.5° counterclockwise
});
// Event listener: Rotate right button
document.getElementById('rotateRightBtn').addEventListener('click', () => {
  const view = map.getView();
  view.setRotation(view.getRotation() + (Math.PI / 12)); // rotate 22.5° clockwise
});



//---------------- Zoom buttons ----------------

// Event listener: Zoom in button
document.getElementById('zoomInBtn').addEventListener('click', () => {
  const view = map.getView();
  view.setZoom(view.getZoom() + 1);
});
// Event listener: Zoom out button
document.getElementById('zoomOutBtn').addEventListener('click', () => {
  const view = map.getView();
  view.setZoom(view.getZoom() - 1);
});



//---------------- Reset view (position, rotation, zoom) ----------------

// Event listener: Reset image/map view (position, rotation, zoom)
document.getElementById('resetViewBtn').addEventListener('click', () => {
  const view = map.getView();

  // Animate return to default view.
  view.animate({
    rotation: 0,
    duration: 300
  }, () => {
    view.fit(masterImageExtent, { duration: 300 });
  });
});



//---------------- Fullscreen toggle ----------------

/**
 * Get the full screen tools of the browser.
 *
 * @returns {any}
 */
function getFullscreenElement(doc = document) {
  return doc.fullscreenElement
      || doc.webkitFullscreenElement
      || doc.mozFullScreenElement
      || doc.msFullscreenElement
      || null;
}

/**
 * Make full screen request to browser.
 *
 * @returns {void}
 */
async function requestFullscreen(container) {
  const fn =
    container.requestFullscreen ||
    container.webkitRequestFullscreen ||
    container.mozRequestFullScreen ||
    container.msRequestFullscreen;

  if (!fn) throw new Error("Fullscreen API not supported");

  // Some prefixed methods don't return a promise; normalize.
  const ret = fn.call(container);
  if (ret && typeof ret.then === "function") await ret;
}

/**
 * Make exit full screen request to browser.
 *
 * @returns {void}
 */
async function exitFullscreen(container=document) {
  const fn =
    container.exitFullscreen ||
    container.webkitExitFullscreen ||
    container.mozCancelFullScreen ||
    container.msExitFullscreen;

  if (!fn) throw new Error("Exit fullscreen not supported");

  const ret = fn.call(container);
  if (ret && typeof ret.then === "function") await ret;
}

// Event listener: Toggle full screen button.
document.getElementById("fullscreenToggle").addEventListener("click", async () => {
  const container = document.getElementById("appContainer");
  try {
    if (getFullscreenElement()) {
      await exitFullscreen();
    } else {
      await requestFullscreen(container);
    }
  } catch (e) {
    console.error("Fullscreen toggle failed:", e);
  }
});

// Event listener: Keep sync with externally controlled fullscreen changes.
["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"]
  .forEach(evt => document.addEventListener(evt, () => {
    const fs = !!getFullscreenElement();
    // update UI based on fs
}));



//---------------- Help button ----------------

// Event listener: Help button
document.getElementById('helpBtn').addEventListener('click', () => {
  const helpModal = new bootstrap.Modal(document.getElementById('helpModal'));
  helpModal.show();
});



//---------------- Other JS ----------------

// Event listener: Disable right-click everywhere
document.addEventListener('contextmenu', function (e) {
  e.preventDefault();
});

// Event listener: On first page load, show helper notification
document.addEventListener('DOMContentLoaded', () => {
  const toastEl = document.getElementById('infoToastStarterHelp');
  const toast = new bootstrap.Toast(toastEl, { delay: 30000 });
  toast.show();
});