const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)

import { Server } from 'socket.io'
const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

interface LandInterface  {
    id: string,
    type: string, // deed, aux,
    setID: string,
    color: string,
    name: string,
    rent: number,
    mortgageFactor: number,
    unmortgageFactor: number,
    price: number,
    maxHouses: number,
    maxHotels: number,
    mortgaged: boolean,
    houseRentFactor: number,
    image: string,
    startPos: number[],
    endPos: number[],
    owner: string,
    houses: number,
}

interface LandSetInterface {
    id: string,
    name: string,
    color: string,
    rentWithSetFactor: number,
    sellable: boolean,
}

interface LogInterface {
    message: string,
    timestamp: number,
}
interface TradeInterface {
    from: number,
            to: number,
            cashFrom: number,
            cashTo: number,
            landIDsFrom: string[],
            landIDsTo: string[]
}

interface PlayerInterface {
    name: string,
    character: string,
    address: string,
    position: string,
    cash: number,
    lands: string[],
    turn: number,
    pendingRent: boolean,
    trades: TradeInterface[],
    bankrupt: boolean,
    isComputer: boolean
}


type NetworkType = "offchain" | "testnet" | "mainnet" | "none"


 interface GameState {
    playing: boolean,
    lands: LandInterface[],
    gameStepSequence: string[],
    landSets: LandSetInterface[],
    players: PlayerInterface[],
    startingCash: number,
    logs: LogInterface[],
    bankCash: number,
    bankLands: string[]
    bankHoldings: string[],
    turn: number,
    playerHasWon: boolean
}



// Store player states of each room
const roomStates = new Map();

const initialRoomState = {
    playing: false,
    players: [],
    roomId: '',
}


io.on('connection', (socket) => {

  // When a client joins a room, they send a "join-room" event with the room ID.
  socket.on('create-room', ({roomId}: {roomId: string}) => {
    // The client joins the specified room.
    socket.join(roomId);

    

    const currentState = {
      playing: false,
      players: [],
      roomId: roomId,
  }

    // Update the room state and broadcast the new state to all clients
    // currentState.roomId = roomId;
    console.log("create room ", currentState)
    roomStates.set(roomId, currentState);

  });

  socket.on('join-room', () => {
    // Function to check if a roomId is valid (non-empty string)
    const isValidRoomId = (roomId: string) => typeof roomId === 'string' && roomId.trim() !== '';

    // Filter the roomStates map to include only entries with valid roomId properties and game has not started
    const validRooms = Array.from(roomStates.values()).filter(room => isValidRoomId(room.roomId) && (room.playing === false));

    // If there are no valid rooms, return null
    if (validRooms.length === 0) {
      socket.emit('no-room-found')
    } else {
      // Generate a random index within the range of the validRooms array length
      const randomIndex = Math.floor(Math.random() * validRooms.length);

      // Use the random index to get a random room state from the validRooms array
      const randomRoom = validRooms[randomIndex];
      const roomId = randomRoom.roomId


      // Log the random room
      console.log('joined room  ', roomId);

      // The client joins the specified room 
      socket.join(roomId);
      socket.emit('joined-room', roomId)

    }

  });

    // When a client joins a room, they send a "join-room" event with the room ID.
  socket.on('add-player-to-room', ({roomId, player}: {roomId: string, player: PlayerInterface}) => {
    // The client joins the specified room.
    // socket.join(roomId);

    console.log("add to", { roomId})

    const currentState = roomStates.get(roomId)


    console.log("player before", player)
    console.log("state before",currentState.players)

    const playersWithSameAddress = currentState.players.filter((_player: PlayerInterface) => {
      return (_player.address === player.address);
    })

    if (playersWithSameAddress.length !== 0) {
      // tell client that tried joining to piss off
      console.log({playersWithSameAddress})
      socket.emit('cannot-add-self-twice')
    } else {
      const playerNo = currentState.players.length + 1
      const playerU = {...player, name: `Player ${playerNo}`, turn: playerNo}      
      
      // Update the room state and broadcast the new state to all clients
      currentState.players = [...currentState.players, playerU];
      roomStates.set(roomId, currentState);

      // send current state to client that joind the room
      socket.emit('client-added-to-room', currentState.players)

      // Broadcast to all
      socket.to(roomId).emit('added-player-to-room', currentState.players)
    }
    
  });



  socket.on('start-game', ({roomId, turn}: {roomId: string, turn: number}) => {
    console.log("start game")
    socket.join(roomId)

    // update server room state
    const currentState = roomStates.get(roomId)
    currentState.playing = true
    roomStates.set(roomId, currentState)

    // Notify other clients in the same room that a new client is ready. 
     socket.to(roomId).emit('started-game', turn);
  });
    
    

  // When a client sends the current game state, they include the room ID.
  socket.on('rejoin', ({ roomId}) => {
    console.log('rejoined');
    socket.join(roomId)
    // Broadcast the game state to other clients in the same room.
    // socket.to(roomId).emit('get-geme-state', state);
  });

   // When a client leaves a room, they send a "leave-room" event with the room ID.
   socket.on('leave-room', (roomId) => {
    // The client leaves the specified room.
    socket.leave(roomId);
  });


  socket.on('add-player', ({roomId, player}: {roomId: string, player: PlayerInterface} ) => {
    console.log(player)
    socket.to(roomId).emit('add-player', {roomId, player})
  })

  // when player played
  socket.on('player-moved', ( { roomId, moveData}: {roomId: string, moveData: {
    player: number, landID: string,
  } }) => {
    console.log(moveData)
        socket.to(roomId).emit('player-moved', { roomId, moveData })
  })

  // when player played
  socket.on('next-turn', ( { roomId}: {roomId: string, game: GameState}) => {
    socket.to(roomId).emit('next-turn')
})


    // when player buys land
    socket.on('buy-land', ( { roomId, stateData}: {roomId: string, stateData: {
        player: number, landID: string,
      } }) => {
            socket.to(roomId).emit('buy-land', { roomId, stateData })
      })

       // when player buys land
    socket.on('unmortgage', ( { roomId, stateData}: {roomId: string, stateData: {
        player: number, landID: string,
      } }) => {
            socket.to(roomId).emit('unmortgage', { roomId, stateData })
      })
    

       // when player buys land
    socket.on('mortgage', ( { roomId, stateData}: {roomId: string, stateData: {
        player: number, landID: string,
      } }) => {
            socket.to(roomId).emit('mortgage', { roomId, stateData })
      })

      socket.on('pay-rent', ( { roomId, stateData}: {roomId: string, stateData: {
        player: number, landID: string,
      } }) => {
            socket.to(roomId).emit('ay-rent', { roomId, stateData })
      })
    
      // when bankrupt
      socket.on('bankrupt', ( { roomId, stateData}: {roomId: string, stateData: {
        player: number, bankrupter: number,
      } }) => {
            socket.to(roomId).emit('bankrupt', { roomId, stateData })
      })
    

      // when player builds
    socket.on('build', ( { roomId, stateData}: {roomId: string, stateData: {
        land: LandInterface, player: number
      } }) => {
            socket.to(roomId).emit('bankrupt', { roomId, stateData })
      })

      // when player sells
    socket.on('sell', ( { roomId, stateData}: {roomId: string, stateData: {
        land: LandInterface, player: number
      } }) => {
            socket.to(roomId).emit('sell', { roomId, stateData })
      })

      socket.on('open-trading', ( { roomId,}: {roomId: string}) => {
            socket.to(roomId).emit('open-trading')
      })

      socket.on('close-trading', ( { roomId,}: {roomId: string}) => {
        socket.to(roomId).emit('close-trading')
  })

    socket.on('dice-roll', ( { roomId, dice1, dice2}: {roomId: string, dice1: number, dice2: number}) => {
      socket.to(roomId).emit('dice-roll', {dice1, dice2})
  })

  socket.on('place-trade', ( { roomId, tradeData}: {roomId: string, tradeData: {
    from: number,
            to: number,
            cashFrom: number,
            cashTo: number,
            landIDsFrom: string[],
            landIDsTo: string[],
  }}) => {
    socket.to(roomId).emit('place-trade', tradeData)
  })

  socket.on('accept-trade', ( { roomId, player, trader}: {roomId: string, player: number, trader: number}) => {
    socket.to(roomId).emit('accept-trade', {player, trader})
  })

  socket.on('reject-trade', ( { roomId, player, trader}: {roomId: string, player: number, trader: number}) => {
    socket.to(roomId).emit('reject-trade', {player, trader})
  })



  // when winner ends game
  // when player played
  socket.on('end-game', ({ roomId}: {roomId: string}) => {
        const wasDeleted = roomStates.delete(roomId)

        if (wasDeleted ) {
          console.log(`deleted room ${roomId}`)
        } else {
          console.log(`could not delete room ${roomId}`)
        }
        socket.to(roomId).emit('end-game')
  })


  socket.on('clear', () => io.emit('clear'))
})

server.listen(3001, () => {
  console.log('✔️ Server listening on port 3001')
})