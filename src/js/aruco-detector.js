let video = null;
let stream = null;
let detector = null;
let overlayImage = null;
let overlayImageElement = null;

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
        
        video.onloadedmetadata = () => {
            initializeDetector();
            processVideo();
        };
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
}

function initializeControls() {
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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        overlayImageElement = new Image();
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
    
    const FPS = 30;
    function process() {
        try {
            cap.read(src);
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
                        cv.line(src, p1, p2, color, 2);
                    }
                    
                    // Draw marker ID
                    let center = new cv.Point(
                        (corner.data32F[0] + corner.data32F[2] + corner.data32F[4] + corner.data32F[6]) / 4,
                        (corner.data32F[1] + corner.data32F[3] + corner.data32F[5] + corner.data32F[7]) / 4
                    );
                    cv.putText(
                        src,
                        ids.data32S[i].toString(),
                        center,
                        cv.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        color,
                        2
                    );

                    // Overlay image if marker ID matches
                    if (overlayImage && ids.data32S[i] === targetMarkerId) {
                        overlayImageOnMarker(src, corners, i);
                    }
                }
                
                document.getElementById('detectedIds').textContent = 
                    'Detected markers: ' + Array.from(ids.data32S);
            }
            
            cv.imshow('canvasOutput', src);
            
            requestAnimationFrame(process);
        } catch (err) {
            console.error('Error in process:', err);
        }
    }
    
    process();
}

function overlayImageOnMarker(src, corners, markerIndex) {
    // Get marker corners
    let markerCorners = corners.get(markerIndex);
    
    // Calculate source points based on anchor point
    let srcTri = new cv.Mat(4, 1, cv.CV_32FC2);
    let dstTri = new cv.Mat(4, 1, cv.CV_32FC2);
    
    // Set destination points (marker corners)
    dstTri.data32F[0] = markerCorners.data32F[0]; // Top-left x
    dstTri.data32F[1] = markerCorners.data32F[1]; // Top-left y
    dstTri.data32F[2] = markerCorners.data32F[2]; // Top-right x
    dstTri.data32F[3] = markerCorners.data32F[3]; // Top-right y
    dstTri.data32F[4] = markerCorners.data32F[4]; // Bottom-right x
    dstTri.data32F[5] = markerCorners.data32F[5]; // Bottom-right y
    dstTri.data32F[6] = markerCorners.data32F[6]; // Bottom-left x
    dstTri.data32F[7] = markerCorners.data32F[7]; // Bottom-left y
    
    // Set source points based on overlay image size and anchor point
    const width = overlayImage.cols * imageScale;
    const height = overlayImage.rows * imageScale;
    
    switch(anchorPoint) {
        case 'top-left':
            srcTri.data32F = [0,0, width,0, width,height, 0,height];
            break;
        case 'top-right':
            srcTri.data32F = [-width,0, 0,0, 0,height, -width,height];
            break;
        case 'bottom-left':
            srcTri.data32F = [0,-height, width,-height, width,0, 0,0];
            break;
        case 'bottom-right':
            srcTri.data32F = [-width,-height, 0,-height, 0,0, -width,0];
            break;
        default: // center
            srcTri.data32F = [-width/2,-height/2, width/2,-height/2, 
                             width/2,height/2, -width/2,height/2];
    }
    
    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    
    // Apply perspective transformation
    let overlayWarped = new cv.Mat();
    let dsize = new cv.Size(src.cols, src.rows);
    cv.warpPerspective(overlayImage, overlayWarped, M, dsize, 
                      cv.INTER_LINEAR, cv.BORDER_TRANSPARENT);
    
    // Blend images
    cv.addWeighted(src, 1, overlayWarped, 1, 0, src);
    
    // Cleanup
    srcTri.delete();
    dstTri.delete();
    M.delete();
    overlayWarped.delete();
} 