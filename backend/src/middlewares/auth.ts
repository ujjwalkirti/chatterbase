import { NextFunction, Request, Response } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import Token from '../models/Token';

function jwtTokenMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
            error: 'No access token provided in request header. Please provide the access token in the header.'
        });
    }

    jsonwebtoken.verify(token, process.env.ACCESS_TOKEN_SECRET!, async (err: any, decoded: any) => {
        if (err) {
            const tokenEntry = await Token.findOne({ token });

            if (tokenEntry) {
                tokenEntry.expired = true;
                await tokenEntry.save();

                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                    error: err.name === 'TokenExpiredError'
                        ? 'Access token is expired. Please login again.'
                        : 'Access token is invalid. Please login again.'
                });
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                    error: 'Access token is invalid and not recognized. Please login again.'
                });
            }
        }

        next();
    });
}

export default jwtTokenMiddleware;
