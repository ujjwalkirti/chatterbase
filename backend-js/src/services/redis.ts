import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

class RedisService {
    private _pub: Redis;
    private _sub: Redis;

    constructor(){
        this._pub = new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
        });

        this._sub = new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
        });
    }

    get pub() {
        return this._pub;
    }

    get sub() {
        return this._sub;
    }

}

export default RedisService;
