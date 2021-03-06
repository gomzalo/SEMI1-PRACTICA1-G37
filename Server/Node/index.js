const express = require('express')
var bodyParser = require('body-parser')
const app = express()
const cors = require('cors')
var corsOptions = {origin: true, optionsSuccessStatus: 200}

app.use(cors(corsOptions))
app.use(bodyParser.json())
const port = 3333

app.get('/', (req, res) =>{
    res.json({mensaje: 'Testing server'})
})

app.listen(port, () => {
    console.log('Listening on http://localhost:${port}/', port)
})