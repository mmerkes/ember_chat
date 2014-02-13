var socketio = require('socket.io'),
	io,
	// Object that contains the socket.id as the key and 
	// the username as a value for each user
	// -> users[socket.id] = username
	users = {},
	// Holds the current room of each user, the socket.id being
	// the key, and the room name as the value
	// currentRoom[socket.id] = roomName
	currentRoom = {},
	// Holds an array of all of the names chosen to be used
	// to see if names are still available
	namesChosen = [];

module.exports = function(server) {
	io = socketio.listen(server);
	io.set('log level', 1);

	io.sockets.on('connection', function(socket) {
		chooseNameHandler(socket);
		joinRoomHandler(socket);
		messageHandler(socket);
		updateRoomList(socket);
		disconnectHandler(socket);
	});
}

// Handle choosing names for new clients
function chooseNameHandler(socket) {
	// Emit chooseName event to ask the client to choose a name
	socket.emit('chooseName');
	// Listen for the nameChosen event.
	socket.on('nameChosen', function(data) {
		var name = data.name;
		// If the name is taken, emit the nameTaken event which
		// let's the client know that they need a new name
		if( namesChosen.indexOf( name ) !== -1 ) {
			socket.emit('nameTaken');
		} 
		// Otherwise, add their socket to the users object to find
		// them later and push the name to the namesChosen array
		else {
			users[socket.id] = name;
			namesChosen.push(name);
			// Let the client know their name was successfully chosen
			socket.emit('nameSuccess', {
				name: name
			});
			// Send the user in the Lobby room
			socket.join('Lobby');
			// Track what room the client is currently in
			currentRoom[socket.id] = 'Lobby';
			// Let the client know that they've joined the Lobby
			socket.emit('roomJoined', { room: 'Lobby' });
			// Update the guest list for everyone in the lobby
			updateGuestList('Lobby');
			// Let all of the clients in the Lobby know that they
			// have a new visitor.
			socket.broadcast.to('Lobby').emit('incomingGuest', { name : name } );
		}
	});
}

// Handle clients joining different rooms
function joinRoomHandler(socket) {
	// Listening for clients requesting to join a room
	socket.on('joinRoom', function(data) {
		var room = data.room,
			previousRoom = currentRoom[socket.id],
			guests;

		// Let the previous room the client was in know that
		// they left
		socket.broadcast.to(previousRoom).emit('departingGuest', 
					{ name : users[socket.id] });
		// Remove the client from the previous room
		socket.leave(previousRoom);
		// Update what room the client is in
		currentRoom[socket.id] = room;
		// Join the client to the new room
		socket.join(room);
		// Let the new room know that they have a new visitor
		socket.broadcast.to(room).emit('incomingGuest', 
					{ name : users[socket.id] });
		// Let the client know they have successfully joined
		// a new room
		socket.emit('roomJoined', { room : room });

		// Update the guest list for everybody in the room
		// and save the list of guests
		guests = updateGuestList(room);

		// Needs to be implemented
		guests.forEach( function(guest) {
			// Send message to user of guests
			console.log(guest);
		});
		// Let the client know if they are the only guest
		if( guests.length === 1 ) {
			socket.emit('message', { message : 'You are the first person in this room.'});
		}
	}); 
}

// Handle clients leaving the room
function disconnectHandler(socket) {
	// Listen for the disconnect event on the sockets
	socket.on('disconnect', function() {
		// Find get the client's room and username
		var room = currentRoom[socket.id],
			username = users[socket.id];
		// Let the clients in the room know that a guest
		// has left
		io.sockets.in(room).emit('departingGuest',
			        { name : username });

		// remove the record of the departed client from the 
		// list of rooms, user socket.ids, and names chosen
		delete currentRoom[socket.id];
		delete users[socket.id];
		delete namesChosen[ namesChosen.indexOf(username)];
	});
}

// Handle messages from clients
function messageHandler(socket) {
	// Listen for the message event from the client
	socket.on('message', function(data) {
		// Find the room and username for the sender
		var room = currentRoom[socket.id],
			user = users[socket.id];
		// Broadcast the message to everyone in the room
		socket.broadcast.to(room).emit('message', { message : '<strong>' +
					user +  ':</strong> ' + data.message });
	});
}

// Update the sidebar with the lists of guests in the room
function updateGuestList(room) {
	// Get the lists of clients currently in the room
	var guests = io.sockets.clients(room);

	// Pull all of the usernames for each user in the room
	guests = guests.map( function(guest) {
		return users[guest.id];
	});
	// Send clients the updated guest list
	io.sockets.in(room).emit('updateGuestList', { guests: guests });

	// return the guest list for use in other functions
	return guests;
}

// Update the list of rooms for the clients
function updateRoomList(socket) {
	// Listen for the updateRooms event
	socket.on('updateRooms', function() {
		// Find all of the unique rooms
		var rooms = findUnique(currentRoom);
		// Submit the room list to the client
		socket.emit('updateRoomList', { rooms : rooms });
	});
}

// Find the unique names in a collection
function findUnique( collection ) {
	var result = [],
		uniqueSet = {},
		room;
	// Pull all of the room names
	for( item in collection ) {
		room = collection[item];
		// Add room names to an object to enforce uniqueness
		uniqueSet[room] = 1;
	}
	// Add all of the unique keys to an array
	for( room in uniqueSet ) {
		result.push(room);
	}
	// return the array of unique names
	return result;
}

// To be implemented:
// pull out rooming join notification as it's own function
// pull out leaving room as well
// allow users to private chat people











