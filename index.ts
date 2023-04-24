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




io.on('connection', (socket) => {

    // When a client joins a room, they send a "join-room" event with the room ID.
  socket.on('join-room', ({roomId, player}: {roomId: string, player: PlayerInterface}) => {
    // The client joins the specified room.
    socket.join(roomId);

    const currentState = roomStates.get(roomId) || {players: []}

    const playerNo = currentState.players.length + 1
    const playerU = {...player, name: `Player ${playerNo}`, turn: playerNo}

    
    // Update the room state and broadcast the new state to all clients
    currentState.players = [...currentState.players, playerU];
    roomStates.set(roomId, currentState);

    // send current state to client that joind the room
    socket.emit('get-room-state', currentState.players)

    // Broadcast to all
    socket.to(roomId).emit('player-joined-room', currentState.players)
  });



  socket.on('start-game', ({roomId, turn}: {roomId: string, turn: number}) => {
    console.log("start game")
    socket.join(roomId)
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



  // when winner ends game
  // when player played
  socket.on('end-game', ({ roomId, game}: {roomId: string, game: GameState}) => {
        socket.to(roomId).emit('update-state', { roomId, game})
  })

  socket.on('clear', () => io.emit('clear'))
})

server.listen(3001, () => {
  console.log('✔️ Server listening on port 3001')
})