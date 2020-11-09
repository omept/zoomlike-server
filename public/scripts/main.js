(() => {
    "use strict"

    let socket = utils.socket;
    let customlogger = utils.customlogger;
    // first check if the browser has permitted the user to use camera and audio
    let allowVideo = false;
    let allowAudio = false;

    // gset peer reference
    let peer = utils.peer();
    let ROOM_ID = utils.ROOM_ID;

    let myVideoStream;

    let muteToggle = $("#muteToggle");
    let videoToggle = $("#videoToggle");

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


    // stream pipper to video input. 😂 (pipper is funny, IMO *** IYAM)
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
            myVideoStream = stream; // set client stream
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
                customlogger("user-connected called", peerUserID);
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



    const main = async () => {
        if (allowVideo && allowAudio) {
            playVideoStream();
        } else {
            alert("To continue, allow permission for camera and microphone. ", playVideoStream());
        }
    }


    // mute or unmute action
    const muteUnmute = () => {
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

    muteToggle.bind("click", muteUnmute);

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

    videoToggle.bind("click", playStop);

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
