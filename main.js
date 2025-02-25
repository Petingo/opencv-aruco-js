async function onOpenCvReady() {
    // initially cv will be a Promise
    document.getElementById('checker').innerHTML = "OpenCV is ready."
    cv.then((cvInstance) => {
        window.cv = cvInstance;
        main();
    });
}

function detectArucoMarkers(image, dictionary, detectParameters, refineParameters) {
    let corners = new cv.MatVector();
    let ids = new cv.Mat();
    let detector = new cv.aruco_ArucoDetector(dictionary, detectParameters, refineParameters);
    detector.detectMarkers(image, corners, ids);
    return { corners, ids };
}

function wait(time) {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}

function main(){
    let video = document.getElementById("videoInput"); // video is the id of video tag
    let canvasOutput = document.getElementById("canvasOutput"); // canvasFrame is the id of <canvas>

    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
    let cap = new cv.VideoCapture(video);
    const FPS = 30;
    let streaming = true;

    function processVideo() {
        try {
            if (!streaming) {
                // clean and stop.
                src.delete();
                dst.delete();
                return;
            }
            let begin = Date.now();
            // start processing.
            cap.read(src);
            
            let dictionary = cv.getPredefinedDictionary(cv.DICT_ARUCO_MIP_36h12);
            let arucoDetectorParams = new cv.aruco_DetectorParameters();
            let arucoRefineParams = new cv.aruco_RefineParameters(10.0, 3.0, true);
            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

            let { corners, ids } = detectArucoMarkers(src, dictionary, arucoDetectorParams, arucoRefineParams);
            document.getElementById('detectedIds').innerHTML = "Detected IDs: " + ids.data32S.join(', ');

            
            cv.imshow('canvasOutput', dst);
            // schedule the next one.
            let delay = 1000/FPS - (Date.now() - begin);
            setTimeout(processVideo, delay);
        } catch (err) {
            console.log(err);
            // utils.printError(err);
        }

    };

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(function(stream) {
            video.srcObject = stream;
            video.play();
            setTimeout(processVideo(), 0);
        })
        .catch(function(err) {
            console.log("An error occurred! " + err);
        });
    
}

// document.getElementsByTagName("body")[0].onload = () => {
//     cv['onRuntimeInitialized']=()=>{ console.log(cv.getBuildInformation()); };
// }