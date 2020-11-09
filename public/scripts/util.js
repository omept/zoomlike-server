const utils = {
    socket: io('/'),
    ROOM_ID: document.getElementById('roomId').value,
    customlogger: (...args) => {
        console.log(...args);
    },
    peer: function () {
        // configure webrtc 
        let peer = new Peer(undefined, {
            path: '/peerjs',
            host: '/',
            port: '3030'
        })
        //webrtc listener for new peers
        peer.on('open', id => {
            this.customlogger("new peer opened", " peerID: ", id);
            // notify server    
            this.socket.emit('join-room', { roomID: this.ROOM_ID, peerUserId: id });
        });

        return peer;
    }
};
Object.freeze(utils); // make utils immutable
