import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique:true,
      index:true
    },
    gender: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
      required: true,
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

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
