(() => {
    "use strict"
    /* 
    PIPE the stream of our client's video and audio device to a html video element.
    */
    var socket = io('/');
    // first check if the browser has permitted the user to use camera and audio
    let allowVideo = false;
    let allowAudio = false;
    const ROOM_ID = document.getElementById('roomId').value;


    let micChecker = navigator.permissions.query({ name: 'microphone' })
        .then((permissionObj) => {
            if (permissionObj.state == "granted") {
                allowAudio = true;
            }
        })
        .catch((error) => {
            console.log('Got microphone error :', error);
        });


    let camChecker = navigator.permissions.query({ name: 'camera' })
        .then((permissionObj) => {
            if (permissionObj.state == "granted") {
                allowVideo = true;
            }
        })
        .catch((error) => {
            console.log('Got camera error :', error);
        });


    // stream pipper to video input. 😂
    const addVideoStream = (video, stream) => {
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            video.play();
        });
        videoGrid.append(video);

    }

    //PREPARE VIEW:  define/create the video element to pipe the stream to.
    // get the box where we'll be adding the video element created
    const videoGrid = document.getElementById('video-grid');
    const myVideo = document.createElement('video');
    myVideo.muted = true; // set the element to muted

    //  client media features
    const browser = () => {
        return navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
    }

    const playVideoStream = () => {
        browser().then(stream => {
            addVideoStream(myVideo, stream);
        }).catch(e => console.log(e));

        // notify server by emitting    
        socket.emit('join-room', { roomID: ROOM_ID });
    }

    const connectToNewUser = () => {
        console.log("new user");
    };

    socket.on('user-connected', () => {
        connectToNewUser();
    })

    const main = async () => {
        if (allowVideo && allowAudio) {
            playVideoStream();
        } else {
            alert("To continue, allow permission for camera and microphone. ", playVideoStream());
        }
    }


    Promise.all([camChecker, micChecker]).then(() => {
        main().catch(e => console.log(e));
    })

})()
