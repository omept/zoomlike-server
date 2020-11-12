(() => {
    "use strict"

    let socket = utils.socket;
    let customlogger = utils.customlogger;
    // first check if the browser has permitted the user to use camera and audio
    let allowVideo = false;
    let allowAudio = false;
    let myScreenSharingVideoStream;
    let sharedScreenPeerID; // holds the peer id of the client that trigered a screen share call. the stream will come from the peer id
    let currentlySharingScreen;

    // gset peer reference
    let peer = utils.peer();
    let ROOM_ID = utils.ROOM_ID;

    let myVideoStream; // client video stream
    let answerStream; // client stream for answering calls

    let muteToggle = $("#muteToggle");
    let videoToggle = $("#videoToggle");
    let shareScreenToggle = $("#shareScreenToggle");

    // hold all calls
    let allCalls = {};



    //PREPARE VIEW:  define/create the video element to pipe streams to.
    // get the box where we'll be adding the video element created
    const videoGrid = document.getElementById('video-grid');
    const ssVideoGrid = document.getElementById('screen-share');
    const mainVideoBlock = document.getElementsByClassName('main__videos')[0];
    const myVideo = document.createElement('video');
    const myScreenSharingVideo = document.createElement('video');

    /**  Check for cient permissions */
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
    /**  Check for cient permissions */

    // display media options for sharing screen
    const gdmOptions = {
        video: {
            cursor: "always"
        },
        audio: {
            echoCancellation: true,
            noiseSuppression: true, // not required
            sampleRate: 44100 // not required
        }
    }

    // start capture for screen sharing
    const startCapture = async () => {
        try {
            myScreenSharingVideoStream = await navigator.mediaDevices.getDisplayMedia(gdmOptions);
            myScreenSharingVideo.srcObject = myScreenSharingVideoStream;
        } catch (err) {
            console.error("Start Capture Error: " + err);
        }
    }

    // stoping capture for screen sharing
    const stopCapture = (evt) => {
        let tracks = myScreenSharingVideo.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        myScreenSharingVideo.srcObject = null;
    }



    // add a stream to video input.
    const addVideoStream = (video, stream, isScreenSharing = false) => {

        video.srcObject = stream;

        // if the add requests is for a screen sharing action, prepare the view for the client
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



    //  client media features for calls
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
            addVideoStream(myVideo, stream); // add the stream to display, like a mirrow

            // listen for call event to client peer ID
            peer.on('call', (call) => {

                // determine the stream to use for the call by checking if this client is currently sharing screen
                if (!currentlySharingScreen) {
                    answerStream = stream;
                    customlogger("not currently sharing screen");
                } else {
                    answerStream = myScreenSharingVideoStream;
                    customlogger("currently sharing screen");
                }


                call.answer(answerStream); // answer a call with the stream

                customlogger("peer answered call", { call });
                //create video element to play stream
                const vid = document.createElement('video');
                call.on('stream', (userVideoStream) => {
                    // add stream to display
                    customlogger("stream event called for received call");

                    // add the call stream to your view if the peer has not been previously added
                    if (!(call.peer in allCalls)) {
                        addVideoStream(vid, userVideoStream);
                        allCalls[call.peer] = call;
                    }

                });
            });

            // websocket listener for when a user-connected event is sent
            socket.on('user-connected', (peerUserID) => {
                customlogger("user-connected called", peerUserID);
                connectToNewUser(peerUserID, stream); // connect to user peer
            });



            // websocket listener for when a user-screen-share event is sent
            socket.on('user-screen-share', (data) => {
                sharedScreenPeerID = data.peerUserId;
                customlogger("user screen share called for peer ID", sharedScreenPeerID);
                callShareScreenPeer(sharedScreenPeerID, stream);
            });


        }).catch(e => customlogger(e));

    }


    const connectToNewUser = (peerUserID, stream) => {

        // add the call stream to your view if the peer has not been previously added
        if (!(peerUserID in allCalls)) {

            var call = peer.call(peerUserID, stream); // call the remote peer
            const vid = document.createElement('video');
            call.on('stream', (userVideoStream) => {
                customlogger("stream event has been received for the call made");
                addVideoStream(vid, userVideoStream); // add the stream to the screen
            });

            call.oniceconnectionstatechange = function () {
                if (pc.iceConnectionState == 'disconnected') {
                    console.log('Disconnected ', call.peer);
                }
            }

            allCalls[call.peer] = call;
        }
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


    /** Screen Share CONTROLS */

    // share or unshare screen action
    const shareUnshareScreen = () => {
        // get mirrow audio and video track
        const aEnabled = myVideoStream.getAudioTracks()[0].enabled;
        const vEnabled = myVideoStream.getVideoTracks()[0].enabled;

        // if screen is not being shared 
        if (!currentlySharingScreen) {

            // stop video stream and audio stream of mirror
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
            // start  video stream and audio stream of mirror
            if (!aEnabled) {
                myVideoStream.getAudioTracks()[0].enabled = true;
                setMuteButton();
            }

            if (!vEnabled) {
                myVideoStream.getVideoTracks()[0].enabled = true;
                setStopVideo()
            }

            customlogger("cancel share sreen and continues video conferencing");
        }
    }

    shareScreenToggle.on("click", shareUnshareScreen);
    /** End Screen Share CONTROLS */


    /** Video Call CONTROLS */
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


    // video stop or play
    const playStop = () => {
        if (currentlySharingScreen) {
            alert("You're currently sharing your screen.");
        } else {
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
    }

    videoToggle.on("click", playStop);

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

    /** End Video Call CONTROLS */
    // run permission checker before running main function
    Promise.all([camChecker, micChecker]).then(() => {
        main().catch(e => customlogger(e));
    });

})()
