let video = null;
let stream = null;
let detector = null;
let overlayImage = null;
let overlayImageElement = null;

// Parameters for AR overlay
let targetMarkerId = 0;
let imageScale = 1.0;
let anchorPoint = 'center';

// Add new variable
let overlayEnabled = false;

async function initializeCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video = document.getElementById('videoInput');
        video.srcObject = stream;
        video.play();
        
        video.onloadedmetadata = () => {
            initializeDetector();
            processVideo();
        };
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
}

function initializeControls() {
    // Load default cat image
    overlayImageElement = new Image();
    overlayImageElement.onload = () => {
        overlayImage = cv.imread(overlayImageElement);
    };
    overlayImageElement.src = 'assets/cat_ar.png';

    // Add toggle control
    document.getElementById('overlayEnabled').addEventListener('change', (e) => {
        overlayEnabled = e.target.checked;
    });

    document.getElementById('dictionary').addEventListener('change', initializeDetector);
    document.getElementById('adaptiveThreshConstant').addEventListener('change', initializeDetector);
    document.getElementById('minMarkerPerimeterRate').addEventListener('change', initializeDetector);
    document.getElementById('polygonalApproxAccuracyRate').addEventListener('change', initializeDetector);
    
    document.getElementById('minRepDistance').addEventListener('change', initializeDetector);
    document.getElementById('errorCorrectionRate').addEventListener('change', initializeDetector);
    document.getElementById('checkAllOrders').addEventListener('change', initializeDetector);
    
    document.getElementById('markerId').addEventListener('change', (e) => {
        targetMarkerId = Number(e.target.value);
    });
    
    document.getElementById('imageScale').addEventListener('change', (e) => {
        imageScale = Number(e.target.value);
    });
    
    document.getElementById('anchorPoint').addEventListener('change', (e) => {
        anchorPoint = e.target.value;
    });
    
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
}

function initializeDetector() {
    // Create detector parameters
    let detectorParams = new cv.aruco_DetectorParameters();
    detectorParams.adaptiveThreshConstant = Number(document.getElementById('adaptiveThreshConstant').value);
    detectorParams.minMarkerPerimeterRate = Number(document.getElementById('minMarkerPerimeterRate').value);
    detectorParams.polygonalApproxAccuracyRate = Number(document.getElementById('polygonalApproxAccuracyRate').value);
    
    // Create refine parameters
    let refineParams = new cv.aruco_RefineParameters(10, 3, true);
    refineParams.minRepDistance = Number(document.getElementById('minRepDistance').value);
    refineParams.errorCorrectionRate = Number(document.getElementById('errorCorrectionRate').value);
    refineParams.checkAllOrders = document.getElementById('checkAllOrders').checked;
    
    // Create dictionary
    let dictionary = getDictionary();
    detector = new cv.aruco_ArucoDetector(dictionary, detectorParams, refineParams);
}

function getDictionary() {
    const dictValue = document.getElementById('dictionary').value;
    return cv.getPredefinedDictionary(cv[dictValue]);
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) {
        // If file selection is cancelled, revert to cat image
        overlayImageElement.src = 'assets/cat_ar.png';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        overlayImageElement = new Image();
        overlayImageElement.onerror = () => {
            // If image loading fails, revert to cat image
            overlayImageElement.src = 'assets/cat_ar.png';
        };
        overlayImageElement.onload = () => {
            overlayImage = cv.imread(overlayImageElement);
        };
        overlayImageElement.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function processVideo() {
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let cap = new cv.VideoCapture(video);
    let corners = new cv.MatVector();
    let ids = new cv.Mat();
    let dst = new cv.Mat();  // Add output matrix
    
    const FPS = 30;
    function process() {
        try {
            cap.read(src);
            src.copyTo(dst);  // Make a copy of the source frame
            detector.detectMarkers(src, corners, ids);
            
            // Draw detected markers
            if (ids.rows > 0) {
                // Draw markers manually
                for (let i = 0; i < corners.size(); i++) {
                    let corner = corners.get(i);
                    let color = new cv.Scalar(0, 255, 0, 255); // Green color
                    
                    // Draw the marker border
                    for (let j = 0; j < 4; j++) {
                        let p1 = new cv.Point(
                            corner.data32F[j * 2],
                            corner.data32F[j * 2 + 1]
                        );
                        let p2 = new cv.Point(
                            corner.data32F[((j + 1) % 4) * 2],
                            corner.data32F[((j + 1) % 4) * 2 + 1]
                        );
                        cv.line(dst, p1, p2, color, 2);  // Draw on dst instead of src
                    }
                    
                    // Draw marker ID
                    let center = new cv.Point(
                        (corner.data32F[0] + corner.data32F[2] + corner.data32F[4] + corner.data32F[6]) / 4,
                        (corner.data32F[1] + corner.data32F[3] + corner.data32F[5] + corner.data32F[7]) / 4
                    );
                    cv.putText(
                        dst,  // Draw on dst instead of src
                        ids.data32S[i].toString(),
                        center,
                        cv.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        color,
                        2
                    );

                    // Only overlay if enabled
                    if (overlayEnabled && overlayImage && ids.data32S[i] === targetMarkerId) {
                        overlayImageOnMarker(dst, corners, i);
                    }
                }
                
                document.getElementById('detectedIds').textContent = 
                    'Detected markers: ' + Array.from(ids.data32S);
            }
            
            cv.imshow('canvasOutput', dst);  // Show dst instead of src
            
            requestAnimationFrame(process);
        } catch (err) {
            console.error('Error in process:', err);
        }
    }
    
    process();
}

function overlayImageOnMarker(dst, corners, markerIndex) {
    // Get marker corners
    let markerCorners = corners.get(markerIndex);
    
    // Set destination points (marker corners)
    let dstPoints = [];
    for (let i = 0; i < 4; i++) {
        dstPoints.push(markerCorners.data32F[i * 2]); // x
        dstPoints.push(markerCorners.data32F[i * 2 + 1]); // y
    }
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, dstPoints);
    
    // Calculate source points based on overlay image size and anchor point
    const scale = 1 / imageScale;  // Invert scale
    const width = overlayImage.cols * scale;
    const height = overlayImage.rows * scale;
    
    let srcPoints;
    switch(anchorPoint) {
        case 'top-left':
            srcPoints = [
                0, 0,           // Top-left
                width, 0,       // Top-right
                width, height,  // Bottom-right
                0, height       // Bottom-left
            ];
            break;
        case 'top-right':
            srcPoints = [
                -width, 0,      // Top-left
                0, 0,           // Top-right
                0, height,      // Bottom-right
                -width, height  // Bottom-left
            ];
            break;
        case 'bottom-left':
            srcPoints = [
                0, -height,     // Top-left
                width, -height, // Top-right
                width, 0,       // Bottom-right
                0, 0           // Bottom-left
            ];
            break;
        case 'bottom-right':
            srcPoints = [
                -width, -height, // Top-left
                0, -height,      // Top-right
                0, 0,           // Bottom-right
                -width, 0       // Bottom-left
            ];
            break;
        default: // center
            srcPoints = [
                -width/2, -height/2,  // Top-left
                width/2, -height/2,   // Top-right
                width/2, height/2,    // Bottom-right
                -width/2, height/2    // Bottom-left
            ];
    }
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, srcPoints);
    
    // Get perspective transform
    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    
    // Create a warped version of the overlay image
    let overlayWarped = new cv.Mat();
    let dsize = new cv.Size(dst.cols, dst.rows);
    cv.warpPerspective(overlayImage, overlayWarped, M, dsize, 
                      cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(0,0,0,0));
    
    // Create a mask from the alpha channel
    let mask = new cv.Mat();
    let maskChannels = new cv.MatVector();
    cv.split(overlayWarped, maskChannels);
    mask = maskChannels.get(3);
    
    // Apply the overlay where the mask is non-zero
    overlayWarped.copyTo(dst, mask);
    
    // Cleanup
    srcTri.delete();
    dstTri.delete();
    M.delete();
    overlayWarped.delete();
    mask.delete();
    for (let i = 0; i < maskChannels.size(); i++) {
        maskChannels.get(i).delete();
    }
    maskChannels.delete();
} 