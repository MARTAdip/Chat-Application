const express = require('express');
const app = express();
const http = require('http');
const WebSocketServer = require('websocket').server;
const WebSocketServerPort = 5000;



var history = [];
var clients = [];

// helper functions for escaping input strigs
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&alt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

//Array with some colors
var colors = ['red', 'green', 'blue', 'magenta', 'purple', 'yellow'];
//..in random order
colors.sort(function(a,b) {return Math.random() > 0.5; })

var httpServer = http.createServer(app)
httpServer.listen(WebSocketServerPort, () => {
    console.log(`Listening on port ${WebSocketServerPort}`)
})

//Specify where the static content is
app.use(express.static('./public'))
app.use('/public', express.static(__dirname + '/public'));

var wsServer = new WebSocketServer({  httpServer })


app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html')
    console.log("get route")

});   



wsServer.on('request', function(request) {
    console.log((new Date()) + "Connection from origin " + request.origin + '.')

    var connection = request.accept(null, request.origin);
    // we need to know client index to remove them on 'close' event
    var index = clients.push(connection) -1;
    var userName = false;
    var userColor = false;
        
    console.log((new Date()) + "Connection accepted. ")
        
    // send back chat history
    if(history.length > 0) {
        connection.sendUTF(JSON.stringify({ type: 'history', data: history}))
    }
        
    console.log('socket')
    connection.on('message', function(message){
        if(message.type === 'utf8') { // accept only text
            if(userName === false) { // first message sent by user is their name
                // remember user name
                userName = htmlEntities(message.utf8Data);
                // get random color and send it back to the user
                userColor = colors.shift();
                connection.sendUTF(JSON.stringify({ type: 'color', data: userColor}));
                console.log((new Date()) + "User is known as; " + userName + ' with ' + userColor + ' color.');
    
            } else { // log and broadcast the msgm
                console.log((new Date()) + "Received Message from: " + userName + message.utf8Data )
    
                // keep history of all sent msg
                var obj = {
                    time: (new Date()).getTime(),
                    text: htmlEntities(message.utf8Data),
                    author: userName,
                    color: userColor
                };
                history.push(obj);
                history = history.slice(-100);
    
                //broadcast msg to all connected clients
                var json = JSON.stringify({ type: 'message', data: obj});
                for(var i=0; i < clients.length; i++) {
                    clients[i].sendUTF(json);
                }
            }
    
        }
    });
    // user disconnected
    connection.on('close', function(connection){
        if(userName !== false && userColor !== false) {
            console.log((new Date()) + "Peer " + connection.remoteAddress + " disconnected.");
            // remove user from the list of connected clients
            clients.splice(index, 1);
            // push back user's color to be reused by another user
            colors.push(userColor);

        }
    })


});
