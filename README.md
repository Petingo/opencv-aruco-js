# Opencv.js w/ ArUco support
A web app for testing opencv's ArUco functions + pre-compiled `opencv.js` that support ArUco.

## Building 
As the official pre-compiled `opencv.js` doesn't contain the ArUco functions, to use them, we need to build it ourselves.
The `opencv.js` in the `src` folder are built with the following command (copied from [here](https://github.com/opencv/opencv/issues/15913#issuecomment-756654306)), and the version is `4.12.0 (dev)`:

```
mkdir opencv_js_build
cd opencv_js_build
git clone https://github.com/opencv/opencv.git
git clone https://github.com/opencv/opencv_contrib.git
# Notice we don't change dir so that both repos are mounted in the container
docker run --rm --workdir /src -v $(pwd):/src emscripten/emsdk emcmake python3 opencv/platforms/js/build_js.py build_js  --cmake_option="-DOPENCV_EXTRA_MODULES_PATH=../opencv_contrib/modules"
```
The compiled `opecv.js` will be located at `./build_js/bin/opencv.js`

## Usage
Here's a minimal example to test if opencv can be properly loaded and used:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>OpenCV Aruco Test</title>
</head>

<body>
    <h1 id="opencv-status" style="color: red;">OpenCV is not loaded.</h2>
    <p id="buildInfo"></p>

    <script async src="opencv.js" onload="onOpenCvReady();" type="text/javascript"></script>
    <script type="text/javascript">
        async function onOpenCvReady() {
            // initially cv will be a Promise
            cv.then((cvInstance) => {
                // replace cv with the real object
                window.cv = cvInstance;

                // now cv is ready to be used, we can call it normally
                main();
            });
        }

        function main() {
            let statusLabel = document.getElementById('opencv-status');
            statusLabel.style.color = 'green';
            statusLabel.innerHTML = "OpenCV is ready."

            console.log(cv.getBuildInformation());
            document.getElementById('buildInfo').innerText = cv.getBuildInformation();
        }
    </script>
</body>
</html>
```

### ArUco
The [functions in aruco namespace](https://docs.opencv.org/4.x/d4/d17/namespacecv_1_1aruco.html) can be accessed through `cv.aruco_FunctionName`.
For example, `cv::aruco::ArucoDetector` in C++ would be `cv.aruco_ArucoDetector` in javascript.