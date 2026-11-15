
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        // Basic Details
        firstName: {
            type: String,
            required: true,
            trim: true
        },

        lastName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false
        },

        // Profile Picture
        profilePicture: {
            type: String,
            default: null
        },

        profilePicturePublicId: {
            type: String,
            default: null
        },

        // RBAC
        role: {
            type: String,
            enum: ["STUDENT", "TUTOR", "ADMIN"],
            default: "STUDENT",
            required: true
        },

        // Institute Details
        instituteDetails: {
            instituteName: {
                type: String,
                required: true,
                trim: true
            },

            instituteType: {
                type: String,
                enum: ["SCHOOL", "UNIVERSITY", "COLLEGE", "OTHER"],
                required: true
            },

            faculty: {
                type: String,
                trim: true
            },

            department: {
                type: String,
                trim: true
            }
        },

        // Current Education Details
        educationDetails: {
            educationLevel: {
                type: String,
                enum: [
                    "PRIMARY",
                    "SECONDARY",
                    "O_LEVEL",
                    "A_LEVEL",
                    "DIPLOMA",
                    "UNDERGRADUATE",
                    "POSTGRADUATE",
                    "OTHER"
                ],
                required: true
            },

            currentYearOrGrade: {
                type: String,
                trim: true
            },

            fieldOfStudy: {
                type: String,
                trim: true
            }
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

export default User;
