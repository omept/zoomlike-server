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


    // configure webrtc 
    let peer = new Peer(undefined, {
        path: '/peerjs',
        host: '/',
        port: '3030'
    });



    let micChecker = navigator.permissions.query({ name: 'microphone' })
        .then((permissionObj) => {
            if (permissionObj.state == "granted") {
                allowAudio = true;
            }
        })
        .catch((error) => {
            customlogger('Got microphone error :', error);
        });


    let camChecker = navigator.permissions.query({ name: 'camera' })
        .then((permissionObj) => {
            if (permissionObj.state == "granted") {
                allowVideo = true;
            }
        })
        .catch((error) => {
            customlogger('Got camera error :', error);
        });


    // stream pipper to video input. 😂
    const addVideoStream = (video, stream) => {
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            video.play();
        });
        videoGrid.append(video);
        customlogger("add video stream");

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
        browser().then((stream) => {
            customlogger("load permision for audio and video");
            addVideoStream(myVideo, stream);

            // register event listener for calls
            // recieve call from peer id
            peer.on('call', (call) => {
                var answerCall = call.answer(stream);

                customlogger("peer answered call", { answerCall });
                //create video element to play stream
                const vid = document.createElement('video');
                call.on('stream', (userVideoStream) => {
                    // add stream to display
                    customlogger("stream event called for received call");
                    addVideoStream(vid, userVideoStream);
                });
            });

            // websocket listener
            socket.on('user-connected', (peerUserID) => {
                customlogger("user-connected called");
                connectToNewUser(peerUserID, stream);
            })
        }).catch(e => customlogger(e));

    }

    const connectToNewUser = (peerUserID, stream) => {
        customlogger("called connectToNewUser to make call to peerUserID: ", peerUserID, " and listen to when a stream even is made on the call");
        customlogger({ peerUserID, stream });
        var call = peer.call(peerUserID, stream);
        const vid = document.createElement('video');
        call.on('stream', (userVideoStream) => {
            customlogger("stream event has been sent for the call made");
            addVideoStream(vid, userVideoStream);
        });

    };

    //webrtc listener for new peers
    peer.on('open', id => {
        customlogger("new peer opened");
        // notify server    
        socket.emit('join-room', { roomID: ROOM_ID, peerUserId: id });
    });



    const main = async () => {
        if (allowVideo && allowAudio) {
            playVideoStream();
        } else {
            alert("To continue, allow permission for camera and microphone. ", playVideoStream());
        }
    }


    // run permission checker before running main function
    Promise.all([camChecker, micChecker]).then(() => {
        main().catch(e => customlogger(e));
    });

    function customlogger(a, ...args) {
        //console.log(a, args.length ? args : "");
    }
})()
