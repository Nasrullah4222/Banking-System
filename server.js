//This File starts the server and listens for requests
const app = require('./src/app');
const connectDB = require('./src/config/db');

//Connect to the database
connectDB();

//Start the server and listen on port 3000
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
