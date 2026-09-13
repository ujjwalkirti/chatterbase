// utils/verifyJwt.ts
import jsonwebtoken from 'jsonwebtoken';
import Token from '../models/Token';

export async function verifyJwt(token: string) {
    return new Promise((resolve, reject) => {
        jsonwebtoken.verify(token, process.env.ACCESS_TOKEN_SECRET!, async (err: any, decoded: any) => {
            if (err) {
                const tokenEntry = await Token.findOne({ token });

                if (tokenEntry) {
                    tokenEntry.expired = true;
                    await tokenEntry.save();
                }

                return reject(
                    err.name === 'TokenExpiredError'
                        ? new Error('Access token expired')
                        : new Error('Invalid access token')
                );
            }

            resolve(decoded);
        });
    });
}
