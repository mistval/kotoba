import socketIO from 'socket.io-client';

function createSocket(namespace) {
  return socketIO(namespace, { path: '/api/socket.io' });
}

export default createSocket;
