const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 4000;

// middleware 
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
    console.log('server is live');
})

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})
