const express = require('express')
const http = require('http')
const socketIo = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

let gameState = {
    players: [],
    deck: [],
    currentCard: null,
    turnIndex: 0,
    direction: 1,
}

const createDeck = () => {
    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades']
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    let deck = []
    suits.forEach((suit) => {
        values.forEach((value) => {
            deck.push({ value, suit });
        })
    })
    return deck
}

const shuffleDeck = (deck) => {
    let m = deck.length, t, i
    while(m){
        i = Math.floor(Math.random() * m--)
        t = deck[m]
        deck[m] = deck[i]
        deck[i] = t
    }
    return deck
}

const dealCards = () => {
    const numberOfCards = 7
    gameState.players.forEach((player) => {
        player.hand = gameState.deck.splice(0, numberOfCards)
    })
}

const startGame = () => {
    gameState.deck = createDeck()
    shuffleDeck(gameState.deck)
    dealCards()
    gameState.currentCard = gameState.deck.pop()
    gameState.turnIndex = 0
    gameState.direction = 1
}

const nextTurn = () => {
    gameState.turnIndex = (gameState.turnIndex + gameState.direction + gameState.players.length) % gameState.players.length
    io.emit('gameState', gameState)
}

io.on('connection', (socket) => {
    console.log("Player Connected ", socket.id)
    socket.on('joinGame', (name) => {
        gameState.players.push({id: socket.id, name, hand: []})
        io.emit('gameState', gameState)

        if(gameState.players.length === 1){
            startGame()
            io.emit('gameState', gameState)
        }
    })
    socket.on('playCard', (cardIndex) => {
        const player = gameState.players.find((p) => p.id === socket.id)
        const card = player.hand.splice(cardIndex, 1)[0]
        gameState.currentCard = card

        if(card.value === 'J')
            gameState.direction *= -1
        nextTurn()
    })
    socket.on('disconnect', () => {
        console.log("Player Disconnected", socket.id)
        gameState.players = gameState.players.filter((p) => p.id !== socket.id)
        io.emit('gameState', gameState)
    })
})

app.use(express.static('public'))
server.listen(3000, '0.0.0.0', () => {
    console.log('http://localhost:3000')
})