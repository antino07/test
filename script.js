// script.js
const video = document.getElementById('camera-stream');
const canvas = document.getElementById('photo-canvas');
const context = canvas.getContext('2d');
const captureBtn = document.getElementById('capture-btn');
const filterSelect = document.getElementById('filter-select');

// 1. Start the camera
navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        console.error("Camera access denied:", err);
        alert("Could not access the camera.");
    });

// 2. Update the live video preview when a new filter is selected
filterSelect.addEventListener('change', () => {
    video.style.filter = filterSelect.value;
});

// 3. Capture and Download
captureBtn.addEventListener('click', () => {
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply the chosen filter to the canvas context BEFORE drawing
    context.filter = filterSelect.value === "none" ? "none" : filterSelect.value;

    // Draw the picture onto the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Create and download the image
    const imageDataURL = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = imageDataURL;
    downloadLink.download = `Filtered_Snap_${new Date().getTime()}.png`; 
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});
