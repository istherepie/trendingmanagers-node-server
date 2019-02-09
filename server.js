const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const redis = require('redis');
const rclient = redis.createClient(); // this creates a new client

rclient.on('connect', function() {
    console.log('Redis client connected');
});

rclient.on('error', function (err) {
    console.log('Something went wrong ' + err);
});

function broadcast(wss, payload) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

function generatePayload(name, votes) {
    const payload = {
        type: "update",
        name: name,
        votes: votes
    }

    return JSON.stringify(payload)
}

function parse(message) {
    return JSON.parse(message);
}

const prefix = "managers::"

wss.on('connection', event => {

    rclient.keys(prefix + "*", (error, data) => {
        if (error) {
            throw Error("DOH!")
        }
        data.forEach(manager => {
            rclient.get(manager, (error, result) => {


                const name = manager.split("::")[1]
                const returnData = generatePayload(name, result)
                event.send(returnData)
            })
        })
    })

    event.on('message', payload => {

        const message = parse(payload);

        if (message.type === "update") {
            rclient.set(prefix + message.name, message.votes, redis.print);

            const returnData = generatePayload(message.name, message.votes)

            return broadcast(wss, returnData)
        }

    });
});


/*
// Broadcast to all.
wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};*/
