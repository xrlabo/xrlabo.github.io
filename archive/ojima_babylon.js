const debug = true;
const sora = Sora.connection("wss://sora.ikeilabsora.0am.jp/signaling", debug);
const options = {
    multistream : true,
    video : false,
    audio : true
};

let sendrecv = sora.sendrecv("twincam-right", null, options);

let mediaStream_id = null;

sendrecv.on("track", (event) => {
    console.log(event);
    const stream = event.streams[0];
    if (event.track.kind == "video") {
        document.querySelector('#remoteVideo').srcObject = stream;
        document.querySelector('#remoteVideo').autoplay = true;
        document.querySelector('#remoteVideo').muted = false;
        mediaStream_id = event.streams[0].id;
        getStats(sendrecv.pc, function(result) {
            // previewGetStatsResult(this.pc, result);
            console.log(result.video.latency + 'ms');
        }, 500);
    }
    if (event.track.kind == 'audio') {
        const audio = document.createElement('audio');
        audio.id = "audio-" + event.streams[0].id;
        audio.srcObject = event.streams[0];
        audio.controls = true;
        audio.autoplay = true;
        audio.style = "display: none;"
        document.getElementById('remote-videos').appendChild(audio);
    }
});

setInterval(observe_video, 10000);
function observe_video() {
    if (document.getElementById(`audio-${mediaStream_id}`)) {
        document.getElementById(`audio-${mediaStream_id}`).remove();
    }
}


// sendrecv.on("removetrack", (event) => {
//     if (event.target.id == mediaStream_id) {
//         document.querySelector(`#remoteVideo`).srcObject = null;
//         mediaStream_id = null;
//     }
// });


/////////////////////////////////////////////////////////////////////////


// canvas DOM 要素を取得する
let canvas = document.getElementById('renderCanvas');
// Initialize Babylon.js variables.
let	sceneToRender;
let xrHelper;
const createDefaultEngine = function (canvas) {
    return new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
    });
}

const engine = createDefaultEngine(canvas);

let camera;
let cameraFovDegree = 60;

let videoDome;
let videoDecrimentalLoop_intervalID = null;
let videoIncrimentalLoop_intervalID = null;
let changeVideoFlag = false;


//Create scene and create XR experience.
const createScene = async function() {
    //新しいシーンオブジェクトを作成する
    var scene = new BABYLON.Scene(engine);
    scene.ambientColor = new BABYLON.Color3(1, 1, 1);
    // scene.detachControl();

    //つねに原点を中心として回転するカメラを作成する
    camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", -Math.PI / 2, Math.PI / 2, 0, new BABYLON.Vector3(0, 0, 0), scene);
    // var camera = new BABYLON.ArcRotateCamera("camera", 0, 0, 0, new BABYLON.Vector3(0, 0, 0), scene);
    // const camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 0, 0), scene)
    // const camera = new BABYLON.FreeCamera('MainCamera', new BABYLON.Vector3(0, 0, -2), scene);
    // カメラの向きを座標0地点にする
    // camera.setTarget(new BABYLON.Vector3(0, 0, 1));
    // カメラの視野角を 95 度に設定
    const cameraFovRadian = 70 * (Math.PI / 180);
    camera.fov = cameraFovRadian;
    console.log(camera);

    // Camera の操作を canvas 上で可能にする
    camera.attachControl(canvas, true);
    camera.panningAxis._x = 0; //水平移動無し。
    camera.panningAxis._y = 0; //垂直移動無し。
    if (camera.inputs.attached.keyboard) {
        camera.inputs.attached.keyboard.detachControl();
    }
    if (camera.inputs.attached.pointers) {
        camera.inputs.attached.pointers.multiTouchPanAndZoom = false;
        camera.inputs.attached.pointers.multiTouchPanning = false;
        camera.inputs.attached.pointers.pinchInwards = false;
        camera.inputs.attached.pointers.pinchZoom = false;
        camera.inputs.attached.pointers.angularSensibilityX = 3000;
        camera.inputs.attached.pointers.angularSensibilityY = 3000;
    }
    if (camera.inputs.attached.mousewheel) {
        camera.inputs.attached.mousewheel.detachControl();
    }
    scene.onPointerObservable.add(e => {
        cameraFovDegree += e.event.wheelDelta * 2**(-5);
        camera.fov = cameraFovDegree * (Math.PI / 180);
    }, BABYLON.PointerEventTypes.POINTERWHEEL);
    if (camera.inputs.attached.gamepad) {
        camera.inputs.attached.gamepad.detachControl();
    }

    console.log(camera);


    videoDome = new BABYLON.VideoDome(
        'VideoDome',
        document.getElementById('remoteVideo'),
        {
            resolution: 64,
            // clickToPlay: true,
            autoPlay: true,
            // size: 100
            // useDirectMapping: false
        },
        scene
    );
    videoDome.setAbsolutePosition(new BABYLON.Vector3(0, 0, 0));
    videoDome.setDirection(new BABYLON.Vector3(0, 0, 0));

    let distance_past = 0, distance_current = 0;


    scene.registerBeforeRender(function () {
        if (camera.inputs.attached.pointers) {
            if (camera.inputs.attached.pointers._pointA && camera.inputs.attached.pointers._pointB)
            distance_current = (camera.inputs.attached.pointers._pointA.x - camera.inputs.attached.pointers._pointB.x)**2 + (camera.inputs.attached.pointers._pointA.y - camera.inputs.attached.pointers._pointB.y)**2;
            if (distance_current > distance_past) {
                cameraFovDegree = cameraFovDegree - 1;
            }
            if (distance_current < distance_past) {
                cameraFovDegree = cameraFovDegree + 1;
            }
            distance_past = distance_current;
            if (cameraFovDegree < 0) {
                cameraFovDegree = 1;
            }
            if (cameraFovDegree > 180) {
                cameraFovDegree = 179;
            }
            camera.fov = cameraFovDegree * (Math.PI / 180);
        }
    });


    // Create a default environment for the scene.
    var environment = scene.createDefaultEnvironment();
    // environment.ground.parent.position.y = 0;
    // environment.ground.position.y = 0


    // Initialize XR experience with default experience helper.
    xrHelper = await scene.createDefaultXRExperienceAsync({
        // floorMeshes: [environment.ground]
    });

    if (!xrHelper.baseExperience) {
        // XR support is unavailable.
        console.log('WebXR support is unavailable');
    }
    else {
        // XR support is available; proceed.

        // xrHelper.teleportation.rotationAngle = 0;

        xrHelper.teleportation.detach();

        xrHelper.input.xrCamera.setTarget(new BABYLON.Vector3(0, 0, 1));

        // xrHelper.teleportation.rotationEnabled = false;
        //
        xrHelper.baseExperience.onStateChangedObservable.add((state) => {
            if (camera.id == "ArcRotateCamera") {
                camera.alpha = -Math.PI / 2;
                camera.beta = Math.PI / 2;
            }
            if (camera.id == "UniversalCamera") {
                camera.position = new BABYLON.Vector3(0, 0, 0);
                camera.setTarget(new BABYLON.Vector3(0, 0, 1));
            }
            // xrHelper.input.xrCamera.setTarget(new BABYLON.Vector3(0, 0, 1));
            console.log(state);
        });

    }


    return scene;
}

// Create scene.
scene = createScene();
scene.then(function (returnedScene) {
    sceneToRender = returnedScene;
});
engine.runRenderLoop(function () {
    if (sceneToRender) {
        sceneToRender.render();
    }
});
// engine.runRenderLoop(function () {
// 	scene.render();
// });


// Handle browser resize.
window.addEventListener('resize', function () {
    engine.resize();
});

let localStream;

function connect_clicked() {
    if (videoDecrimentalLoop_intervalID) {
        clearInterval(videoDecrimentalLoop_intervalID);
    }
    if (videoIncrimentalLoop_intervalID) {
        clearInterval(videoIncrimentalLoop_intervalID);
    }
    videoDecrimentalLoop_intervalID = setInterval(videoDecrimentalLoop, 1000.0/10.0);
}

function videoDecrimentalLoop() {
    if (videoDome.material._alpha > 0) {
        videoDome.material._alpha = videoDome.material._alpha - 0.2;
    }
    else {
        videoDome.material._alpha = 0;
        clearInterval(videoDecrimentalLoop_intervalID);
        videoDecrimentalLoop_intervalID = null;
        sendrecv.channelId = document.getElementById('channel_id_input').value;
        navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((stream) => {
            localStream = stream;
            localStream.getAudioTracks()[0].enabled = false;
            console.log(stream);
            sendrecv.connect(stream);
        })
        .catch((e) => {
             console.error(e);
        });
        videoIncrimentalLoop_intervalID = setInterval(videoIncrimentalLoop, 1000/10.0);
    }
}

function videoIncrimentalLoop() {
    if (videoDome.material._alpha < 0.2) {
        videoDome.material._alpha = videoDome.material._alpha + 0.1
    }
    else if (videoDome.material._alpha < 1) {
        videoDome.material._alpha = videoDome.material._alpha + 0.1
    }
    else {
        videoDome.material._alpha = 1;
        clearInterval(videoIncrimentalLoop_intervalID);
        videoIncrimentalLoop_intervalID = null;
    }
}



function mic_on_off_clicked() {
    if (document.getElementsByName('mic_on_off')[0].checked) {
        localStream.getAudioTracks()[0].enabled = true;
    }
    else {
        localStream.getAudioTracks()[0].enabled = false;
    }
}

connect_clicked();
