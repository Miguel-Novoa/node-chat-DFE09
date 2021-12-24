// SERVEUR

const xss = require('xss');
const seedColor = require('seed-color');

module.exports = function(io) {

    const connectedUsers = [];
    const antiSpam = new AntiSpam();

    io.on('connection', (socket) => {
        console.log(`Socket #${socket.id} connected!`);

        // Dès qu'on a reçu un pseudo, on met la liste à jour
        socket.on('user:pseudo', (pseudo) => {
            console.log(`L'utilisateur ${pseudo} vient d'arriver sur le chat`);
            connectedUsers.push({
                id: socket.id,
                pseudo,
                color: seedColor(pseudo).toHex()
            });

            console.log('Utilisateurs connectés :', connectedUsers);

            // Envoyer la liste à jour des utilisateurs connectés à TOUS LES CLIENTS CONNECTES
            io.emit('users:list', connectedUsers);
        });

        // Dès qu'on reçoit un message d'un user, on le transmet aux autres users
        socket.on('user:message', message => {

            // Vérification que l'utilisateur (son socket ID) n'est pas dans la spam list
            if (antiSpam.isInList(socket.id)) {
                return console.info(`[antispam]: Message from ${message.pseudo} blocked!`);
            }

            // Vérification qu'on a pas reçu un message vide !
            if (message.message.trim() === '') return;

            // Nettoyer le HTML des messages (pour prévenir les attaques de type XSS)
            message.message = xss(message.message, {
                whiteList: {}
            });

            // Ajout de la couleur
            message.color = seedColor(message.pseudo).toHex();

            // Ajout du socket.id
            message.id = socket.id;

            // Transférer le message à tout le monde (y compris l'émetteur)
            io.emit('user:message', message);

            // Ajout dans la liste antispam
            antiSpam.addToList(socket.id);
        });

        // Dès que le serveur reçoit l'info de qqn en train d'écrire
        socket.on('user:typing', (user) => {
            // Envoie à tout le monde SAUF à l'émetteur
            socket.broadcast.emit('user:typing', {
                pseudo: user.pseudo,
                id: socket.id
            });
        });


        // Si un utilisateur se déconnecte, on met le tableau "connectedUsers" à jour
        socket.on('disconnect', reason => {
            let disconnectedUser = connectedUsers.findIndex(
                user => user.id === socket.id
            );
            if (disconnectedUser > -1) {
                connectedUsers.splice(disconnectedUser, 1); // Supprime l'utilisateur déconnecté du TBL
                io.emit('users:list', connectedUsers);
            }
        });
    });
};

class AntiSpam {
    static COOL_TIME = 2000;

    constructor() {
        this.spamList = [];
    }

    addToList(socketID) {
        if (!this.isInList(socketID)) {
            this.spamList.push(socketID);

            setTimeout(() => this.removeFromList(socketID), AntiSpam.COOL_TIME);
        }
    }

    removeFromList(socketID) {
        let index = this.spamList.indexOf(socketID);
        if (index > -1) {
            this.spamList.splice(index, 1);
        }
    }

    isInList(socketID) {
        return this.spamList.includes(socketID);
    }
}