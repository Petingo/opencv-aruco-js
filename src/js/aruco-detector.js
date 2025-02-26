let video = null;
let stream = null;
let detector = null;
let overlayImage = null;
let overlayImageElement = null;
let camera_matrix;
let dist_coeffs;

// Parameters for AR overlay
let targetMarkerId = 0;
let imageScale = 1.0;
let anchorPoint = 'center';

async function initializeCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video = document.getElementById('videoInput');
        video.srcObject = stream;
        video.play();

        // Camera calibration parameters
        camera_matrix = new cv.Mat(3, 3, cv.CV_64F, [
            1000, 0, video.width/2,
            0, 1000, video.height/2,
            0, 0, 1
        ]);

        dist_coeffs = new cv.Mat(1, 5, cv.CV_64F, [0, 0, 0, 0, 0]);
        
        video.onloadedmetadata = () => {
            initializeDetector();
            processVideo();
        };
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
}

// ... rest of the detection code ... 