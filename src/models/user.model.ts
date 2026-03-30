import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
}, { versionKey: false })

export const User = mongoose.model("User", userSchema);
