
import express from "express";

import {
    signUp,
    signIn,
    updateProfilePicture
} from "../Controllers/AuthController.js";

import {
    authenticateToken
} from "../middlewares/authMiddleware.js";

import upload from "../middlewares/UploadMiddleware.js";

const router = express.Router();

// Public authentication routes
router.post("/signup", signUp);
router.post("/signin", signIn);

// Protected profile picture route
router.put(
    "/profile-picture",
    authenticateToken,
    upload.single("profilePicture"),
    updateProfilePicture
);

export default router;
