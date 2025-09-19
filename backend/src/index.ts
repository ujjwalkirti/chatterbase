import http from 'http';
import dotenv from 'dotenv';
import SocketService from './services/socket';
import express from 'express';
import router from './controllers';
import { connectToMongodb } from './config/mongoConfig';
import cors from 'cors';

const app = express();

dotenv.config();

async function init() {
    const socketService = new SocketService();

    const PORT = process.env.PORT || 3000;

    app.use(express.json());

    // configure cors
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    app.use('/api', router);

    const server = http.createServer(app);

    socketService.io.attach(server);

    // connect to database
    await connectToMongodb();
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


    socketService.initListeners();
}

init();
