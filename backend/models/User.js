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
      enum: ['farmer', 'field_worker', 'veterinarian', 'officer', 'admin'],
      default: 'farmer'
    },
    isActive: {
      type: Boolean,
      default: true
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
    },
    specialization: {
      type: String,
      default: 'General Veterinary Physician'
    },
    availability: {
      type: String,
      enum: ['AVAILABLE', 'ACTIVE', 'BUSY', 'OFF_DUTY', 'ON_CALL'],
      default: 'AVAILABLE'
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    isDummy: {
      type: Boolean,
      default: false
    },
    dataSource: {
      type: String,
      default: 'SYSTEM'
    },
    area: {
      type: String,
      default: ''
    },
    clinicName: {
      type: String,
      default: ''
    },
    rating: {
      type: Number,
      default: 4.8
    },
    experience: {
      type: Number,
      default: 6
    },
    emergencyAvailable: {
      type: Boolean,
      default: true
    },
    services: {
      type: [String],
      default: ['Emergency Treatment', 'Vaccination', 'Clinical Triage', 'Artificial Insemination']
    }
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
