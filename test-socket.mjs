import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ Connecté :', socket.id);

  socket.emit('room:create', { pseudo: 'Joueur1' }, (res) => {
    console.log('🏠 Room créée :', JSON.stringify(res, null, 2));
  });
});

socket.on('room:updated', (data) => {
  console.log('🔄 Room mise à jour :', JSON.stringify(data, null, 2));
});

socket.on('connect_error', (err) => {
  console.error('❌ Erreur connexion :', err.message);
});
