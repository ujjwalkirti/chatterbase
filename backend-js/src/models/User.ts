import mongoose, { Document, Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  gender: string;
  dob: string;
  password?: string;
  ip_address?: string;
  deviceDetails?: Record<string, any>;
  user_status: "anonymous" | "permanent";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    gender: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    ip_address: {
      type: String,
      required: false,
    },
    deviceDetails: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    user_status: {
      type: String,
      enum: ["anonymous", "permanent"],
      required: true,
      default: "anonymous",
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
