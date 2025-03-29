import { NextApiRequest, NextApiResponse } from 'next';
import { Server } from 'socket.io';
import { IncomingMessage, Server as HTTPServer } from 'http';

// Properly type the server instance with Socket.IO
type CustomServer = HTTPServer & {
  io?: Server;
};

type CustomResponse = NextApiResponse & {
  socket: IncomingMessage & {
    server: CustomServer;
  };
};

export default function handler(req: NextApiRequest, res: CustomResponse) {
  if (req.method === 'GET') {
    const server = res.socket.server;

    if (!server.io) {
      console.log('Initializing Socket.IO');
      const io = new Server(server, {
        path: '/api/socket',
      });

      io.on('connection', (socket) => {
        console.log('Client connected');
        
        socket.on('chat_message', (message) => {
          io.emit('chat_message', message);
        });

        socket.on('disconnect', () => {
          console.log('Client disconnected');
        });
      });

      server.io = io;
    }

    res.status(200).end();
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end('Method Not Allowed');
  }
}