const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    role: {
      type: String,
      enum: ['farmer', 'field_worker', 'officer', 'admin'],
      default: 'farmer'
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required']
    },
    village: {
      type: String,
      default: ''
    },
    block: {
      type: String,
      default: ''
    },
    district: {
      type: String,
      default: 'Pune'
    },
    state: {
      type: String,
      default: 'Maharashtra'
    },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    },
    registrationNo: {
      type: String,
      default: ''
    },
    department: {
      type: String,
      default: ''
    },
    preferredLanguage: {
      type: String,
      default: 'hi'
    }
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
