const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { generateMessage, generatelocationMessage } = require('./utility/message');
const { isRealString } = require('./utility/isRealString');
const { Users } = require('./utility/users');

// console.log(path.join(__dirname+"/../public"));
let app = express();
let server = http.createServer(app);
let io = socketIO(server);//give us the access to the socket.io library
const port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname + "/../public"))); //to serve public folder
let users = new Users();

io.on("connection", (socket) => { //listen to the inbult event connection 
    // console.log("A new user connected");

    socket.on('createMessage', (message, callback) => {
        // console.log("createMessage : ", message)
        // console.log(message);
        if (!message.text) {
            callback();
        }
        else {
            let user = users.getUser(socket.id);
            if (user && isRealString(message.text))
                io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
            callback();
        }

    })

    socket.on('createlocationMessage', (chords) => {
        let user = users.getUser(socket.id);
        if(user)
        io.to(user.room).emit('newlocationMessage', generatelocationMessage(user.name, chords.lat, chords.lng))
    })

    socket.on('join', (params, callback) => {
        if (!isRealString(params.name) || !isRealString(params.room))
            return callback("Please Enter the details properly");
        // console.log(socket.id);
        socket.join(params.room);
        users.removeUser(socket.id); //if that user is already in another chat room then he will be kicked out of the other rooms
        users.addUser(socket.id, params.name, params.room);

        io.to(params.room).emit('updateUsersList', users.getUserList(params.room));
        socket.emit('newMessage', generateMessage("Admin", "Welcome to the " + params.room + " Chat room !!"));

        socket.broadcast.to(params.room).emit('newMessage', generateMessage("Admin", params.name + " has Joined the " + params.room + " Chat room")); //??Ye sabke rooms me jaa raha hai

        callback();
    })

    socket.on('disconnect', () => {
        let user = users.removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('updateUsersList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Admin', user.name + " has Left the " + user.room + " Chat room"));
        }
        // console.log("User was disconnected");
    })
})


server.listen(port, () => {
    console.log("Server Connected to " + port);
})