const video = document.getElementById('camera-stream');
const canvas = document.getElementById('filter-canvas');
const ctx = canvas.getContext('2d');
const filterSelect = document.getElementById('filter-select');
const captureBtn = document.getElementById('capture-btn');
const loadingText = document.getElementById('loading-text');

let currentFilter = 'none';

// --- 1. LOAD YOUR CUSTOM IMAGES ---
const heartImg = new Image();
heartImg.src = 'heart.png'; 

const birdImg = new Image();
birdImg.src = 'bird.png';

// --- 2. LOAD THE AI MODELS ---
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/')
]).then(startVideo);

// --- 3. TURN ON THE FRONT CAMERA ---
function startVideo() {
    loadingText.innerText = "Starting Camera...";
    // "facingMode: user" forces the front selfie camera on phones
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } } })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Camera error:", err);
            loadingText.innerText = "Error: Camera access denied.";
            loadingText.style.color = "red";
        });
}

// --- 4. THE AI FILTER ENGINE ---
video.addEventListener('play', () => {
    loadingText.innerText = "Ready!";
    loadingText.style.color = "#4caf50"; 
    filterSelect.disabled = false;
    captureBtn.disabled = false;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // Loop to draw the filters constantly
    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (resizedDetections.length > 0) {
            // Apply to all faces found
            resizedDetections.forEach(detection => {
                const face = detection.box;
                
                if (currentFilter === 'love') drawLoveStuck(face);
                if (currentFilter === 'dizzy') drawDizzy(face);
                if (currentFilter === 'twirl') drawTwirl(face);
            });
        }
    }, 50); 
});

filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
});

// --- 5. THE DRAWING FUNCTIONS ---
function drawLoveStuck(face) {
    if (heartImg.complete) {
        ctx.drawImage(heartImg, face.x, face.y - 40, 40, 40);
        ctx.drawImage(heartImg, face.x + (face.width / 2) - 20, face.y - 60, 50, 50);
        ctx.drawImage(heartImg, face.x + face.width - 40, face.y - 30, 35, 35);
    }
}

function drawDizzy(face) {
    if (birdImg.complete) {
        const time = Date.now() / 300; 
        const centerX = face.x + (face.width / 2);
        const centerY = face.y - 20;
        const radius = 60;

        for (let i = 0; i < 3; i++) {
            const angle = time + (i * ((Math.PI * 2) / 3));
            const birdX = centerX + Math.cos(angle) * radius - 20; 
            const birdY = centerY + Math.sin(angle) * (radius / 3) - 20;

            ctx.drawImage(birdImg, birdX, birdY, 40, 40);
        }
    }
}

function drawTwirl(face) {
    // 1. Give the face box a little extra padding so the swirl blends well
    const pad = 30; 
    const x = Math.max(0, face.x - pad);
    const y = Math.max(0, face.y - pad);
    const w = face.width + (pad * 2);
    const h = face.height + (pad * 2);

    // 2. Create a tiny, invisible temporary canvas just for the face
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    // 3. "Take a photo" of the user's face from the live video feed
    tempCtx.drawImage(video, x, y, w, h, 0, 0, w, h);

    // 4. Extract the raw pixel data from that photo
    const imgData = tempCtx.getImageData(0, 0, w, h);
    const pixels = imgData.data;
    
    // Create a copy of the pixels to hold our new swirled image
    const newPixels = new Uint8ClampedArray(pixels);

    // 5. The Twirl Math (Translating the OpenCV logic to JavaScript)
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) / 2;
    const twistAngle = 2.5; // Change this number to make the twirl stronger or weaker!

    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            const offsetX = j - centerX;
            const offsetY = i - centerY;
            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

            if (distance < radius) {
                // Calculate how much to twist this specific pixel
                const currentAngle = Math.atan2(offsetY, offsetX);
                const amountToTwist = twistAngle * ((radius - distance) / radius);
                const newAngle = currentAngle + amountToTwist;

                // Find where to grab the source color from
                let srcX = Math.round(centerX + distance * Math.cos(newAngle));
                let srcY = Math.round(centerY + distance * Math.sin(newAngle));

                // Keep it inside the box
                srcX = Math.max(0, Math.min(w - 1, srcX));
                srcY = Math.max(0, Math.min(h - 1, srcY));

                // JavaScript pixels are in a flat array [R, G, B, Alpha, R, G, B, Alpha...]
                const destIdx = (i * w + j) * 4;
                const srcIdx = (srcY * w + srcX) * 4;

                newPixels[destIdx] = pixels[srcIdx];         // Red
                newPixels[destIdx + 1] = pixels[srcIdx + 1]; // Green
                newPixels[destIdx + 2] = pixels[srcIdx + 2]; // Blue
                // We leave Alpha alone so it stays fully opaque
            }
        }
    }

    // 6. Put the swirled pixels back onto the temporary canvas
    imgData.data.set(newPixels);
    tempCtx.putImageData(imgData, 0, 0);

    // 7. Draw the final swirled face onto your main screen!
    ctx.drawImage(tempCanvas, x, y);
}

// --- 6. CAPTURE & DOWNLOAD ---
captureBtn.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Flip horizontally to match what the user sees on screen
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);

    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    const link = document.createElement('a');
    link.download = `Selfie_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});
