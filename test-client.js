const io = require('socket.io-client');

console.log('==========================================');
console.log('  Bedrock Chatbot - Test Client');
console.log('==========================================\n');

const socket = io('http://localhost:3000', {
  path: '/chat',
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✅ Conectado al servidor WebSocket');
  console.log(`   Client ID: ${socket.id}\n`);

  // Enviar un mensaje de prueba
  const sessionId = `test-session-${Date.now()}`;
  console.log(`📤 Enviando mensaje de prueba...`);
  console.log(`   Session ID: ${sessionId}\n`);

  socket.emit('sendMessage', {
    sessionId: sessionId,
    content: '¿Cuál es la capital de Colombia?',
  });
});

socket.on('connected', (data) => {
  console.log('🔗 Evento "connected" recibido:', data);
});

socket.on('messageReceived', (data) => {
  console.log('✅ Mensaje recibido por el servidor');
  console.log(`   Session: ${data.sessionId}\n`);
});

socket.on('messageChunk', (data) => {
  if (data.chunk.isComplete) {
    console.log('\n✅ Respuesta completada\n');
  } else {
    process.stdout.write(data.chunk.content);
  }
});

socket.on('messageComplete', (data) => {
  console.log('==========================================');
  console.log('✅ Conversación completada exitosamente');
  console.log('==========================================\n');

  // Cerrar conexión después de 2 segundos
  setTimeout(() => {
    socket.close();
    process.exit(0);
  }, 2000);
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 Desconectado del servidor');
});

socket.on('connect_error', (error) => {
  console.error('❌ Error de conexión:', error.message);
  process.exit(1);
});

// Timeout de 30 segundos
setTimeout(() => {
  console.error('❌ Timeout: No se recibió respuesta en 30 segundos');
  socket.close();
  process.exit(1);
}, 30000);
