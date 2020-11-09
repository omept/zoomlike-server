(() => {
    "use strict"

    let socket = utils.socket; // retrieve socket
    const ROOM_ID = utils.ROOM_ID; // get client room id
    const customlogger = utils.customlogger; // get client room id

    // get reference to input key
    let msgBox = $("#chat_message");
    let chatWindow = $(".main__chat_window");

    // on every key pressed for the message, send the event to this function
    const checkAndSendMessage = (e) => {
        let message = msgBox.val();
        if (e.which == 13 && message.length > 0) {
            socket.emit('message', { message, ROOM_ID });
            msgBox.val("");
            $('ul').append(`<li class="message" id="sender"> <b>user</b> <br /> ${message} </li>`);
            chatWindow.scrollTop(chatWindow.prop("scrollHeight"));
        }
    }

    msgBox.bind("keydown", checkAndSendMessage); // event binding for keydown


    socket.on('new-message', (data) => {
        customlogger(data);
        $('ul').append(`<li class="message"> <b>user</b> <br /> ${data.message} </li>`);
    })

})()
