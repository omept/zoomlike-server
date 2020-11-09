(() => {
    "use strict"

    let socket = utils.socket; // retrieve socket
    const ROOM_ID = utils.ROOM_ID; // get client room id

    // get reference to input key
    let msgBox = $("#chat_message");

    // on every key pressed for the message, send the event to this function
    const checkAndSendMessage = (e) => {
        let message = msgBox.val();
        if (e.which == 13 && message.length > 0) {
            socket.emit('message', { message, ROOM_ID });
            msgBox.val("");
        }
    }

    msgBox.bind("keydown", checkAndSendMessage); // event binding for keydown


})()
