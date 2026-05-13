const video = document.getElementById('camera-stream');
const canvas = document.getElementById('filter-canvas');
const ctx = canvas.getContext('2d');
const filterSelect = document.getElementById('filter-select');
const captureBtn = document.getElementById('capture-btn');
const loadingText = document.getElementById('loading-text');

let currentFilter = 'none';

// --- NEW: LOAD YOUR CUSTOM IMAGES ---
// Make sure you have heart.png and bird.png saved in the same folder!
const heartImg = new Image();
heartImg.src = 'heart.png'; 

const birdImg = new Image();
birdImg.src = 'bird.png';

// --- 1. LOAD THE AI MODELS ---
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/')
]).then(startVideo);

// --- 2. START THE CAMERA ---
function startVideo() {
    loadingText.innerText = "Starting Camera...";
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

// --- 3. THE AI FILTER ENGINE ---
video.addEventListener('play', () => {
    loadingText.innerText = "Ready!";
    loadingText.style.color = "#4caf50"; 
    filterSelect.disabled = false;
    captureBtn.disabled = false;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- NEW: LOOP THROUGH EVERY FACE FOUND ---
        if (resizedDetections.length > 0) {
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

// --- 4. THE DRAWING FUNCTIONS ---
function drawLoveStuck(face) {
    // Check if the image has loaded, then draw it floating above the head
    if (heartImg.complete) {
        // Draw 3 hearts at different positions above the bounding box
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
            const birdX = centerX + Math.cos(angle) * radius - 20; // -20 to center the image
            const birdY = centerY + Math.sin(angle) * (radius / 3) - 20;

            ctx.drawImage(birdImg, birdX, birdY, 40, 40);
        }
    }
}

function drawTwirl(face) {
    const centerX = face.x + (face.width / 2);
    const centerY = face.y + (face.height / 2);
    
    ctx.font = "100px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🌀", centerX, centerY + 35);
    ctx.textAlign = "start"; 
}

// --- 5. CAPTURE & DOWNLOAD ---
captureBtn.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);

    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    const link = document.createElement('a');
    link.download = `Filtered_Selfie_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});
