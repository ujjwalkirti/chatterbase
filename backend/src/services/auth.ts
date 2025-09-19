import { MongooseError } from "mongoose";
import jwt from "jsonwebtoken";
import Token from "../models/Token";
import User from "../models/User";

class AuthService {
  constructor() {}

  async register(userDetails: any, deviceDetails: any) {
    try {
      const requiredFields = ["username", "dob", "gender"];

      if (
        !userDetails ||
        Object.keys(userDetails).length === 0 ||
        !requiredFields.every((field) =>
          Object.keys(userDetails).includes(field)
        )
      ) {
        return {
          success: false,
          message: "User details not provided",
          error: `The required fields are: ${requiredFields.join(", ")}`,
        };
      }

      if (!deviceDetails || Object.keys(deviceDetails).length === 0) {
        return {
          success: false,
          message: "Device details not provided",
        };
      }

      // generate device fingerprint
      const deviceFingerprint = JSON.stringify(deviceDetails);

      // check for existing username
      const exisitingUser = await User.findOne({
        username: userDetails.username,
      });

      if (exisitingUser) {
        const existingToken = await Token.findOne({
          username: exisitingUser.username,
          expired: false,
        });
        if (existingToken) {
          return {
            success: false,
            message: "User already exists",
          };
        } else {
          // generate  a new token
          const token = jwt.sign(
            {
              username: exisitingUser.username,
              gender: exisitingUser.gender,
              dob: exisitingUser.dob,
              user_status: exisitingUser.user_status,
            },
            process.env.ACCESS_TOKEN_SECRET as string,
            {
              expiresIn: "2h",
            }
          );
          await Token.create({
            username: exisitingUser.username,
            token,
            deviceFingerprint,
          });
          return {
            success: true,
            message: "User logged in successfully",
            data: {
              token,
            },
          };
        }
      } else {
        const user = await User.create({
          ...userDetails,
        });

        // create the token and send back as response
        const token = jwt.sign(
          {
            username: user.username,
            gender: user.gender,
            dob: user.dob,
            user_status: user.user_status,
          },
          process.env.ACCESS_TOKEN_SECRET as string,
          {
            expiresIn: "2h",
          }
        );

        await Token.create({
          username: user.username,
          token,
          deviceFingerprint,
        });

        return {
          success: true,
          message: "User registered successfully",
          data: {
            token,
          },
        };
      }
    } catch (error) {
      // if there is some mongodb generated error
      if (error instanceof MongooseError) {
        return {
          success: false,
          message: error.message,
        };
      } else {
        console.log(error);
        return {
          success: false,
          message: "Internal Server Error",
          error: error,
        };
      }
    }
  }

  async verifyToken(token: string) {
    try {
      // check if the token exists in the database and is not expired
      const existingToken = await Token.findOne({ token, expired: false });
      if (!existingToken) {
        return {
          success: false,
          message: "Invalid token",
        };
      }

      // verify the token
      const decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as jwt.JwtPayload;

      return {
        success: true,
        message: "Token is valid",
        data: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        // delete the user from db
        await User.deleteOne({ username: (jwt.decode(token) as any).username });

        // mark token as expired
        await Token.updateOne({ token, expired: false }, { expired: true });

        return {
          success: false,
          message: "Token has expired",
        };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return {
          success: false,
          message: "Invalid token",
        };
      } else {
        console.log(error);
        return {
          success: false,
          message: "Internal Server Error",
          error: error,
        };
      }
    }
  }

  async logout(token: string) {
    try {
      // check if the token exists in the database and is not expired
      const existingToken = await Token.findOne({ token, expired: false });
      if (!existingToken) {
        return {
          success: false,
          message: "Invalid token",
        };
      }

      // mark the token as expired
      existingToken.expired = true;

      // delete the user as well
      await User.deleteOne({ username: existingToken.username });
      await existingToken.save();

      return {
        success: true,
        message: "User logged out successfully",
      };
    } catch (error) {
      if (error instanceof MongooseError) {
        return {
          success: false,
          message: error.message,
        };
      } else {
        console.log(error);
        return {
          success: false,
          message: "Internal Server Error",
          error: error,
        };
      }
    }
  }
}

export default AuthService;
