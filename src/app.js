const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const http = require('http');
//
const app = express();

const server = http.createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 1337;

app.use(helmet());
app.use(morgan('tiny'));
app.use(express.static('./src/static'));
app.use(function(request, response, next){
    next();
});

app.set('view engine', 'pug');
app.set('views', './src/views');

app.locals.pretty = true;

require('./chatServer')(io);

app.get('/index.pug', (request, response)=>{
    //response.send('Hi');
    response.render('index');
});

app.get('/chat.pug', (request, response)=>{
    //Un paramètre pseudo est obligatoire pour accéder à cette route
    if(!request.query.pseudo){
        return response.redirect('/index.pug'); //Redirige vers page de login
    };

    const pseudo = request.query.pseudo;
    response.render('chat', {pseudo});
});

server.listen(port, ()=>{
    console.log(`serveur : http://localhost:${port}`);
});