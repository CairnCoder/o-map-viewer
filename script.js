let map = new ol.Map({
      target: 'map',
      controls: [],
      layers: [],
      view: new ol.View({ center: [0, 0], zoom: 2 }),
    });

    setTimeout(() => map.updateSize(), 100); // Ensures correct sizing after flex layout

    let imageLayer = null;
    let originalImage = null;
    let imageExtent = null;
    let imgCanvas = document.createElement('canvas');
    let imgCtx = imgCanvas.getContext('2d');
    let pickingColor = false;

    function toggleButtonAppearance(buttonId, boolVariable) {
      const toggleButton = document.getElementById(buttonId);
      if (boolVariable) {
        toggleButton.classList.remove('btn-secondary');
        toggleButton.classList.add('btn-primary');
      } else {
        toggleButton.classList.remove('btn-primary');
        toggleButton.classList.add('btn-secondary');
      }
    }



    document.getElementById('imageUploader').addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = function () {
        originalImage = img;
        drawOriginalImage();
        imageExtent = [0, 0, img.width, img.height];
        updateLayer();
      };
      img.src = URL.createObjectURL(file);
    });

    function drawOriginalImage() {
      if (!originalImage) return;
      imgCanvas.width = originalImage.width;
      imgCanvas.height = originalImage.height;
      imgCtx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
      imgCtx.drawImage(originalImage, 0, 0);
    }

    function updateLayer(preserveView = false) {
      const url = imgCanvas.toDataURL();

      if (!imageLayer) {
        imageLayer = new ol.layer.Image({
          source: new ol.source.ImageStatic({
            url: url,
            imageExtent: imageExtent
          })
        });
        map.addLayer(imageLayer);

        if (!preserveView) {
          map.getView().fit(imageExtent);
        }

      } else {
        // Just replace the source image without touching the view
        const source = new ol.source.ImageStatic({
          url: url,
          imageExtent: imageExtent
        });
        imageLayer.setSource(source);
      }
    }


    // Handle colour picker
    document.getElementById('pickColorBtn').addEventListener('click', () => {
      pickingColor = !pickingColor; // toggle state

      if (pickingColor) {
        // activate picking mode
        const toastElement = document.getElementById('infoToastPickColour');
        const toast = new bootstrap.Toast(toastElement, { delay: 10000 });
        toast.show();
      }
      toggleButtonAppearance('pickColorBtn', pickingColor);
    });

    document.getElementById('resetImageBtn').addEventListener('click', () => {
      if (!originalImage) return;

      // Save current view state
      const view = map.getView();
      const currentCenter = view.getCenter();
      const currentZoom = view.getZoom();
      const currentRotation = view.getRotation();

      drawOriginalImage();
      updateLayer(true); // update without fitting
      toggleButtonAppearance('pickColorBtn', pickingColor);

      // Defer restoring view to ensure layer is fully replaced
      setTimeout(() => {
        view.setCenter(currentCenter);
        view.setZoom(currentZoom);
        view.setRotation(currentRotation);
      }, 0); // delay to next tick of JS event loop
    });



    map.on('click', function (evt) {
      if (!pickingColor || !imageExtent) return;
      pickingColor = false;
      toggleButtonAppearance('pickColorBtn', pickingColor);

      const coordinate = evt.coordinate;
      const extent = imageExtent;

      const x = Math.floor((coordinate[0] - extent[0]) / (extent[2] - extent[0]) * imgCanvas.width);
      const y = Math.floor((extent[3] - coordinate[1]) / (extent[3] - extent[1]) * imgCanvas.height);

      const pixel = imgCtx.getImageData(x, y, 1, 1).data;
      const pickedColor = { r: pixel[0], g: pixel[1], b: pixel[2] };

      const threshold = parseInt(document.getElementById('threshold').value, 10) || 0;
      applyTransparency(pickedColor, threshold);
    });

    function colorDistance(c1, c2) {
      const dr = c1.r - c2.r;
      const dg = c1.g - c2.g;
      const db = c1.b - c2.b;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    function applyTransparency(rgb, threshold) {
      const imageData = imgCtx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const dist = colorDistance(rgb, { r, g, b });
        if (dist > threshold) {
          data[i + 3] = 0;
        }
      }
      imgCtx.putImageData(imageData, 0, 0);
      updateLayer();
    }


    document.getElementById('pickBackgroundBtn').addEventListener('click', () => {
        document.getElementById('backgroundColorPicker').click();
    });

    document.getElementById('backgroundColorPicker').addEventListener('input', (e) => {
        const hex = e.target.value;
        document.getElementById('map').style.backgroundColor = hex;
    });

    document.getElementById('resetViewBtn').addEventListener('click', () => {
      if (!imageExtent) return;

      const view = map.getView();

      // Animate rotation to 0 first, THEN fit the view
      view.animate({
        rotation: 0,
        duration: 300
      }, () => {
        // After rotation is done, fit the extent
        view.fit(imageExtent, {
          duration: 300,
          //padding: [20, 20, 20, 20]
        });
      });
    });

    
    // Handle Zoom buttons
    document.getElementById('zoomInBtn').addEventListener('click', () => {
      const view = map.getView();
      view.setZoom(view.getZoom() + 1);
    });
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
      const view = map.getView();
      view.setZoom(view.getZoom() - 1);
    });


    // Handle Full screen button
    document.getElementById('fullscreenToggle').addEventListener('click', () => {
      const container = document.getElementById('appContainer');

      const isFullscreen = document.fullscreenElement ||
                          document.webkitFullscreenElement ||
                          document.mozFullScreenElement ||
                          document.msFullscreenElement;

      if (!isFullscreen) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          container.msRequestFullscreen();
        } else {
          console.warn("Fullscreen API is not supported.");
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        } else {
          console.warn("Exit fullscreen is not supported.");
        }
      }
    });



    // Handle rotate buttons
    document.getElementById('rotateLeftBtn').addEventListener('click', () => {
      const view = map.getView();
      view.setRotation(view.getRotation() - (Math.PI / 12)); // rotate 22.5° counterclockwise
    });

    document.getElementById('rotateRightBtn').addEventListener('click', () => {
      const view = map.getView();
      view.setRotation(view.getRotation() + (Math.PI / 12)); // rotate 22.5° clockwise
    });


    // Handle help button
    document.getElementById('helpBtn').addEventListener('click', () => {
      const helpModal = new bootstrap.Modal(document.getElementById('helpModal'));
      helpModal.show();
    });


    // Handle choose file button
    document.getElementById('uploadImageBtn').addEventListener('click', () => {
      document.getElementById('imageUploader').click();
    });


    // Disable right-click everywhere
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });


    // Handle measurement
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

    document.getElementById('measure-btn').addEventListener('click', () => {
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


    // Handle double click (prevent zoom)
    map.getInteractions().forEach(function(interaction) {
      if (interaction instanceof ol.interaction.DoubleClickZoom) {
        map.removeInteraction(interaction);
      }
    });


    // Handle starter helper notification
    document.addEventListener('DOMContentLoaded', () => {
      const toastEl = document.getElementById('infoToastStarterHelp');
      const toast = new bootstrap.Toast(toastEl, { delay: 30000 });
      toast.show();
    });



    // Handle Leg draw

    // Hold leg vectors 
    const vectorSource = new ol.source.Vector({ wrapX: false });

    // Create vector layer & specify styling
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

    // Allow modification of leg vectors (e.g. cicle size change and position shcange)
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

    let drawActive = false;

    document.getElementById('drawLegBtn').addEventListener('click', () => {
      if (drawActive) {
        removeDrawInteractions();
        drawActive = false;
        console.log('Drawing mode deactivated');
        toggleButtonAppearance('drawLegBtn', drawActive);
      } else {
        // Remove previous circles and lines
        vectorSource.getFeatures().forEach(f => vectorSource.removeFeature(f));
        circleFeatures.length = 0;

        addDrawInteractions();
        drawActive = true;
        console.log('Drawing mode activated');
        toggleButtonAppearance('drawLegBtn', drawActive);
      }
    });

    // Handle clear leg
    document.getElementById('clearLegBtn').addEventListener('click', () => {
      vectorSource.clear();
      circleFeatures.length = 0;
      removeDrawInteractions();
      drawActive = false;
      toggleButtonAppearance('drawLegBtn', drawActive);
    });
