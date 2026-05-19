import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  token: { type: String, required: true },
  avatar: { type: String, default: 'default' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

export const User = mongoose.model('User', UserSchema);
