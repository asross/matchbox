
// [ ] Set background color with color picker
// [ ] Save image bounding rect

function download(imageURL, filename) {
    const element = document.createElement('a');
    element.setAttribute('href', imageURL);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function setupImageControls(fabImage, controls, title, canvas) {
    controls.html(`
        <h3>${title}</h3>

        <div class='control-line'>
            <strong>shift</strong>
            x: <input class='left' type='range' value='500' min='-200' max='1200' step='1'/>
            y: <input class='top' type='range' value='333' min='-200' max='866' step='1'/>
            <button class='reset-shift'>reset</button>
        </div>

        <div class='control-line'>
            <strong>scale</strong>
            x: <input class='scaleX' type='range' value='1' min='0.01' max='1' step='0.01'/>
            y: <input class='scaleY' type='range' value='1' min='0.01' max='1' step='0.01'/>
            <button class='reset-scale'>reset</button>
            <label>lock<input type='checkbox' checked class='lock'></label>
        </div>

        <div class='control-line'>
            <strong>skew&nbsp;</strong>
            x: <input class='skewX' type='range' value='0' min='-80' max='80' step='1'/>
            y: <input class='skewY' type='range' value='0' min='-80' max='80' step='1'/>
            <button class='reset-skew'>reset</button>
        </div>

        <div class='control-line'>
            <strong>angle</strong>
            <input class='angle' type='range' value='0' min='-360' max='360'/>
            <button class='reset-angle'>reset</button>
            <button class='flip'>flip</button>
        </div>
    `);
    const keys = ['scaleX','scaleY','left','top','skewX','skewY','angle'];
    const inputs = {};
    const inits = {};
    const resets = { 'reset-skew': ['skewX','skewY'], 'reset-scale': ['scaleX', 'scaleY'], 'reset-shift': ['left','top'], 'reset-angle': ['angle'] };

    for (let key of keys) {
        inits[key] = fabImage[key];
        inputs[key] = controls.find(`.${key}`)[0];
        inputs[key].value = inits[key];
    }

    for (let reset of Object.keys(resets)) {
        controls.find(`.${reset}`).click(() => {
            for (let key of resets[reset]) {
                fabImage.set(key, inits[key]);
                inputs[key].value = inits[key];
                canvas.requestRenderAll();
            }
        });
    }

    const flipControl = controls.find('.flip')[0];
    const lockControl = controls.find('.lock')[0];

    for (let key of ['left','top','skewX','skewY','angle']) {
        inputs[key].oninput = () => {
          fabImage.set(key, parseInt(inputs[key].value, 10)).setCoords();
          canvas.requestRenderAll();
        }
    }

    $(flipControl).click(() => {
        fabImage.set('flipX', !fabImage.flipX);
        canvas.requestRenderAll();
    });

    inputs['scaleX'].oninput = function() {
      if ($(lockControl).is(':checked')) {
          fabImage.scale(parseFloat(inputs['scaleX'].value)).setCoords();
          inputs['scaleY'].value = inputs['scaleX'].value;
      } else {
          fabImage.set('scaleX', parseFloat(inputs['scaleX'].value)).setCoords();
      }
      canvas.requestRenderAll();
    };

    inputs['scaleY'].oninput = function() {
      if ($(lockControl).is(':checked')) {
          fabImage.scale(parseFloat(inputs['scaleY'].value)).setCoords();
          inputs['scaleX'].value = inputs['scaleY'].value;
      } else {
          fabImage.set('scaleY', parseFloat(inputs['scaleY'].value)).setCoords();
      }
      canvas.requestRenderAll();
    };

    function updateControls() {
        for (let key of keys) {
            inputs[key].value = fabImage[key];
        }
    }

    canvas.on({
      'object:moving': updateControls,
      'object:scaling': updateControls,
      'object:resizing': updateControls,
      'object:rotating': updateControls,
      'object:skewing': updateControls
    });
}


$(document).ready(() => {
    const initWidth = parseFloat($('#c').attr('width'));
    const initHeight = parseFloat($('#c').attr('height'));
    const fullWidth = window.innerWidth;
    if (initWidth > fullWidth) {
        $('#c').attr('width', fullWidth * 0.95);
        $('#c').attr('height', fullWidth * 0.95 * (initHeight / initWidth));
    }

    const canvas = window.canvas = new fabric.Canvas('c');

    let atlasJson;
    let atlas;
    let slides;
    let atlasIndex = 0;
    let atlasImage;
    let slideIndex = 0;
    let slideImage;

    const fileReader = new FileReader();

    fileReader.onload = (e) => {
        slideImage.setSrc(e.target.result, () => {
            canvas.requestRenderAll();
        })
    };

    function resize(img, width) {
        const scaleX = width / img.width;
        const scaleY = img.scaleY * (scaleX / img.scaleX);
        img.set({ scaleX: scaleX, scaleY: scaleY });
        return img;
    }

    function atlasPath() {
        if (atlasIndex >= atlas.length) {
            atlasIndex = 0;
        } else if (atlasIndex < 0) {
            atlasIndex = atlas.length - 1;
        }
        const index = Math.floor(atlasIndex);
        return atlas[index];
    }

    function slideFile() {
        if (slideIndex >= slides.length) {
            slideIndex = 0;
        } else if (slideIndex < 0) {
            slideIndex = slides.length - 1;
        }
        return slides[slideIndex];
    }

    function atlasFilename() {
        return atlasPath().split('/').slice(-1)[0].split('.').slice(0,-1).join('.');
    }

    function slideFilename() {
        return slideFile().name.split('/').slice(-1)[0].split('.').slice(0,-1).join('.');
    }

    function combinedFilename() {
        if (slides) {
            return `${slideFilename()}_${atlasFilename()}.png`;
        } else {
            return `overlay_${atlasFilename()}.png`;
        }
    }

    function updateSlide() {
        if (slides) {
            fileReader.readAsDataURL(slideFile());
            $("#slide-title").html(`Current: slide #${slideIndex+1} of ${slides.length} <small>(${slideFilename()})</small>`);
        }
    }

    $('#download').click(() => {
        const w = canvas.width;
        const h = canvas.height;

        const w1 = atlasImage.width * atlasImage.scaleX;
        const w2 = slideImage.width * slideImage.scaleX;

        let biggest = (w1 > w2) ? atlasImage : slideImage;

        canvas.setDimensions({ width: w / biggest.scaleX, height: h / biggest.scaleY });
        canvas.setZoom(1.0 / biggest.scaleX);
        download(canvas.toDataURL('image/png'), combinedFilename());
        canvas.setDimensions({ width: w, height: h });
        canvas.setZoom(1.0);
    });

    fabric.Image.fromURL('/example-slide.jpg', (img) => {
        slideImage = img;
        canvas.add(resize(img,Math.min(800,0.85*canvas.width)));
        canvas.centerObject(img);
        setupImageControls(img,  $('#slide-controls'), "Slide Image Options", canvas);
    }, {
        originX: 'center',
        originY: 'center',
    });

    $.getJSON('atlases.json').then(json => {
        atlasJson = json;
        atlas = json.mouse.coronal;
        $("#atlas-title").html(`Current: ${atlasFilename()}`);

        fabric.Image.fromURL(atlasPath(), (img) => {
            atlasImage = img;
            canvas.add(resize(img,Math.min(800,0.85*canvas.width)));
            canvas.centerObject(img);
            setupImageControls(img, $('#atlas-controls'), "Atlas Image Options", canvas);
        }, {
            originX: 'center',
            originY: 'center',
        });

        $(canvas.wrapperEl).on('wheel', e => {
            const target = canvas.findTarget(e);
            const delta = e.originalEvent.wheelDelta / 120;

            if (target == atlasImage) {
                e.preventDefault();
                atlasIndex += delta;
                atlasImage.setSrc(atlasPath(), () => {
                    canvas.requestRenderAll();
                    $("#atlas-title").html(`Current: ${atlasFilename()}`);
                });
            };

        });
    });
    
    $('#slides').change((ev) => {
        slides = ev.currentTarget.files;
        $('#prev-slide').prop("disabled", false);
        $('#next-slide').prop("disabled", false);
        updateSlide();
    });

    $('#prev-slide').click(() => {
        slideIndex -= 1;
        updateSlide();
    });

    $('#next-slide').click(() => {
        slideIndex += 1;
        updateSlide();
    });

    $('#atlases').change((ev) => {
        const parts = $(ev.currentTarget).val().split('.');
        atlas = atlasJson[parts[0]][parts[1]];
        atlasIndex = 0;
        atlasImage.setSrc(atlasPath(), () => {
            canvas.requestRenderAll();
            $("#atlas-title").html(`Current: ${atlasFilename()}`);
        });
    });
});
