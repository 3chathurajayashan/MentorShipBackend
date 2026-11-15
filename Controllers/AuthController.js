
import User from "../Models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
    uploadToCloudinary,
    deleteFromCloudinary
} from "../Utils/cloudinaryUpload.js";


// ================= GENERATE JWT =================

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        }
    );
};


// ================= USER RESPONSE =================

const formatUserResponse = (user) => {
    return {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture || null,
        instituteDetails: user.instituteDetails,
        educationDetails: user.educationDetails,
        isActive: user.isActive
    };
};


// ================= SIGN UP =================

export const signUp = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            password,
            role,
            instituteDetails,
            educationDetails
        } = req.body;

        // Validate required fields
        if (
            !firstName?.trim() ||
            !lastName?.trim() ||
            !email?.trim() ||
            !phone?.trim() ||
            !password ||
            !instituteDetails?.instituteName?.trim() ||
            !instituteDetails?.instituteType ||
            !educationDetails?.educationLevel
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // Validate password
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        // Prevent public admin registration
        const userRole = role || "STUDENT";

        if (!["STUDENT", "TUTOR"].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "Public registration is only available for students and tutors"
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Check existing user
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            password: hashedPassword,
            role: userRole,
            instituteDetails,
            educationDetails
        });

        // Generate JWT
        const token = generateToken(user);

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user: formatUserResponse(user)
        });

    } catch (error) {
        console.error("Sign Up Error:", error);

        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        // Handle Mongoose validation errors
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// ================= UPDATE PROFILE PICTURE =================

export const updateProfilePicture = async (req, res) => {
    let uploadedImage = null;

    try {
        // Check uploaded file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a profile picture"
            });
        }

        // Find authenticated user
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Upload new image to Cloudinary
        uploadedImage = await uploadToCloudinary(
            req.file.buffer,
            "mentorship/profile-pictures"
        );

        // Store previous image public ID
        const oldImagePublicId = user.profilePicturePublicId;

        // Update profile picture details
        user.profilePicture = uploadedImage.secure_url;
        user.profilePicturePublicId = uploadedImage.public_id;

        try {
            await user.save();
        } catch (saveError) {

            // Delete newly uploaded image if DB update fails
            await deleteFromCloudinary(uploadedImage.public_id)
                .catch((error) => {
                    console.error(
                        "Cloudinary cleanup error:",
                        error
                    );
                });

            throw saveError;
        }

        // Delete old image after successful DB update
        if (oldImagePublicId) {
            try {
                await deleteFromCloudinary(oldImagePublicId);
            } catch (error) {
                console.error(
                    "Old profile picture deletion failed:",
                    error
                );
            }
        }

        return res.status(200).json({
            success: true,
            message: "Profile picture updated successfully",
            user: formatUserResponse(user)
        });

    } catch (error) {
        console.error("Profile Picture Update Error:", error);

        // Cleanup newly uploaded image if an error occurs
        // before MongoDB successfully saves it
        if (uploadedImage?.public_id) {
            const currentUser = await User.findById(req.user?._id)
                .catch(() => null);

            if (
                !currentUser ||
                currentUser.profilePicturePublicId !== uploadedImage.public_id
            ) {
                await deleteFromCloudinary(uploadedImage.public_id)
                    .catch((cleanupError) => {
                        console.error(
                            "Cloudinary cleanup error:",
                            cleanupError
                        );
                    });
            }
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update profile picture"
        });
    }
};


// ================= SIGN IN =================

export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate fields
        if (!email?.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Find user and include password
        const user = await User.findOne({
            email: normalizedEmail
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check account status
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated"
            });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate JWT
        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: formatUserResponse(user)
        });

    } catch (error) {
        console.error("Sign In Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
