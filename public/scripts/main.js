(() => {
    "use strict"

    let socket = utils.socket;
    let customlogger = utils.customlogger;
    // first check if the browser has permitted the user to use camera and audio
    let allowVideo = false;
    let allowAudio = false;
    let previousCallStream = null;
    let myScreenSharingVideoStream = null;
    let sharedScreenPeerID;
    let currentlySharingScreen;

    // gset peer reference
    let peer = utils.peer();
    let ROOM_ID = utils.ROOM_ID;

    let myVideoStream;
    let answerStreamWith;

    let muteToggle = $("#muteToggle");
    let videoToggle = $("#videoToggle");
    let shareScreenToggle = $("#shareScreenToggle");

    // hold all calls
    let allCalls = {};



    //PREPARE VIEW:  define/create the video element to pipe the stream to.
    // get the box where we'll be adding the video element created
    const videoGrid = document.getElementById('video-grid');
    const ssVideoGrid = document.getElementById('screen-share');
    const mainVideoBlock = document.getElementsByClassName('main__videos')[0];
    const myVideo = document.createElement('video');
    const myScreenSharingVideo = document.createElement('video');


    // mic check 1 ** 2 ** 1 ** 2
    let micChecker = navigator.permissions.query({ name: 'microphone' })
        .then((permissionObj) => {
            if (permissionObj.state == "granted") {
                allowAudio = true;
            }
        })
        .catch((error) => {
            customlogger('Got microphone error :', error);
        });

    // cam check (can the people at the back see me ?? 😂)
    let camChecker = navigator.permissions.query({ name: 'camera' })
        .then((permissionObj) => {
            if (permissionObj.state == "granted") {
                allowVideo = true;
            }
        })
        .catch((error) => {
            customlogger('Got camera error :', error);
        });


    // display media options
    const gdmOptions = {
        video: {
            cursor: "always"
        },
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
        }
    }

    // start capture
    async function startCapture() {

        try {
            myScreenSharingVideoStream = await navigator.mediaDevices.getDisplayMedia(gdmOptions);
            myScreenSharingVideo.srcObject = myScreenSharingVideoStream;

        } catch (err) {
            console.error("Start Capture Error: " + err);
        }
    }

    // stoping capture
    const stopCapture = (evt) => {
        let tracks = myScreenSharingVideo.srcObject.getTracks();

        tracks.forEach(track => track.stop());
        myScreenSharingVideo.srcObject = null;
    }



    // stream pipper to video input. 😂 (pipper is funny, IMO *** IYAM)
    const addVideoStream = (video, stream, isScreenSharing = false) => {

        video.srcObject = stream;

        if (isScreenSharing) {
            ssVideoGrid.classList.add("visible");
            videoGrid.classList.add("smaller");
            mainVideoBlock.classList.add("has-share");
            // add to screen-share div
            ssVideoGrid.append(video);
        } else {
            videoGrid.append(video);
        }

        video.addEventListener('loadedmetadata', () => {
            video.play();
        });

        customlogger("add video stream");

    }



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
            myVideoStream = stream; // set client stream
            addVideoStream(myVideo, stream);

            // register event listener for calls
            // recieve call from peer id
            peer.on('call', (call) => {

                if (!currentlySharingScreen) {
                    answerStreamWith = stream;
                    customlogger("not currently sharing screen");
                } else {
                    answerStreamWith = myScreenSharingVideoStream;
                    customlogger("currently sharing screen");
                }


                var answerCall = call.answer(answerStreamWith);

                customlogger("peer answered call", { call, answerCall });
                //create video element to play stream
                const vid = document.createElement('video');
                call.on('stream', (userVideoStream) => {
                    // add stream to display
                    customlogger("stream event called for received call");

                    // use the confrence call view
                    if (!(call.peer in allCalls)) {
                        addVideoStream(vid, userVideoStream);
                        allCalls[call.peer] = call;
                    }

                });
            });

            // websocket listener
            socket.on('user-connected', (peerUserID) => {
                customlogger("user-connected called", peerUserID);
                connectToNewUser(peerUserID, stream);
            });



            // websocket listener
            socket.on('user-screen-share', (data) => {
                sharedScreenPeerID = data.peerUserId;
                customlogger("user- screen share called for peer ID", sharedScreenPeerID);
                callShareScreenPeer(sharedScreenPeerID, stream);
            });


        }).catch(e => customlogger(e));

    }


    const connectToNewUser = (peerUserID, stream) => {

        var call = peer.call(peerUserID, stream); // call the remote peer
        const vid = document.createElement('video');
        call.on('stream', (userVideoStream) => {
            customlogger("stream event has been received for the call made");
            addVideoStream(vid, userVideoStream); // add the stream to the screen
        });

    };

    const shareScreenToPeerInit = async () => {
        await startCapture();
        socket.emit('screen-share-init', { roomID: ROOM_ID, peerUserId: peer.id });
        currentlySharingScreen = true;
    };

    const callShareScreenPeer = (peerUserID, stream) => {
        customlogger("calling peerUserID ", peerUserID, " to receive shared screen ");
        var call = peer.call(peerUserID, stream);
        call.on('stream', (userVideoStream) => {
            customlogger("stream event has been received for the shared screen call.");
            addVideoStream(myScreenSharingVideo, userVideoStream, true);
        });

    };



    const main = async () => {
        if (allowVideo && allowAudio) {
            playVideoStream();
        } else {
            alert("To continue, allow permission for camera and microphone. ", playVideoStream());
        }
    }


    // mute or unmute action
    const muteUnmute = () => {
        if (currentlySharingScreen) {
            alert("You're currently sharing your screen.");
        } else {
            customlogger("myVideoStream audio track : ", myVideoStream.getAudioTracks());
            const enabled = myVideoStream.getAudioTracks()[0].enabled;
            if (enabled) {
                myVideoStream.getAudioTracks()[0].enabled = false;
                setUnmuteButton();
            } else {
                setMuteButton();
                myVideoStream.getAudioTracks()[0].enabled = true;
            }
        }

    }

    muteToggle.on("click", muteUnmute);


    // mute or unmute action
    const shareUnshareScreen = () => {

        // if screen is not being shared 
        if (!currentlySharingScreen) {

            // stop your first video stream and audio stream
            const aEnabled = myVideoStream.getAudioTracks()[0].enabled;
            const vEnabled = myVideoStream.getVideoTracks()[0].enabled;
            if (aEnabled) {
                myVideoStream.getAudioTracks()[0].enabled = false;
                setUnmuteButton();
            }

            if (vEnabled) {
                myVideoStream.getVideoTracks()[0].enabled = false;
                setPlayVideo()
            }

            // notify server about intent
            shareScreenToPeerInit()
            customlogger("init share sreen");


        } else {
            // if screen is being shared
            currentlySharingScreen = false;
            stopCapture();
            customlogger("cancel share sreen");
        }
    }

    shareScreenToggle.on("click", shareUnshareScreen);

    // video stop or play
    const playStop = () => {
        customlogger("myVideoStream video track : ", myVideoStream.getVideoTracks());
        let enabled = myVideoStream.getVideoTracks()[0].enabled;
        if (enabled) {
            myVideoStream.getVideoTracks()[0].enabled = false;
            setPlayVideo()
        } else {
            setStopVideo()
            myVideoStream.getVideoTracks()[0].enabled = true;
        }
    }

    videoToggle.on("click", playStop);

    const setMuteButton = () => {
        const html = `
      <i class="fa fa-microphone"></i>
      <span>Mute</span>
    `;
        $('.main__mute_toggle').html(html);
    }

    const setUnmuteButton = () => {
        const html = `
      <i class="unmute fa fa-microphone-slash"></i>
      <span>Unmute</span>
    `;
        $('.main__mute_toggle').html(html);
    }

    const setStopVideo = () => {
        const html = `
      <i class="fa fa-video-camera"></i>
      <span>Stop Video</span>
    `;
        $('.main__video_toggle').html(html);
    }

    const setPlayVideo = () => {
        const html = `
    <i class="stop fa fa-eye-slash"></i>
      <span>Play Video</span>
    `;
        $('.main__video_toggle').html(html);
    }


    // run permission checker before running main function
    Promise.all([camChecker, micChecker]).then(() => {
        main().catch(e => customlogger(e));
    });

})()
