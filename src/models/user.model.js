import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar: {
            url: { // cloudinari url
                type: String, 
                required: true,
            },
            public_id: { // cloudinary public id
                type: String,
                required: true,
            }
        },
        coverImage: {
            url: { // cloudinari url
                type: String, 
            },
            public_id: { // cloudinary public id
                type: String,
            }
        },
        watchHistory: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video",
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        }
    }, 
    {
        timestamps: true
    }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next;

    this.password = await bcrypt.hash(this.password, 10);
    next;
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}
    
// Yeh line database ko batati hai ki username aur fullName par "Text Index" banana hai.
userSchema.index(
    { 
        username: "text", 
        fullName: "text" 
    }, 
    {
        /**
         * Kyun use kiya?
         * 1. Performance: Bina index ke MongoDB har ek user ko check karega (Collection Scan), 
         * jo slow hota hai. Indexing se ye library ki 'Index' table ki tarah kaam karta hai—seedha result dhoondta hai.
         * 2. Search Power: "text" index hone se hi hum Aggregation mein $text aur $meta: "textScore" use kar paate hain.
         * 3. Weights (Optional): Aap priority bhi de sakte hain ki username match ko fullName se zyada importance mile.
         */
        weights: {
            username: 10,
            fullName: 15
        },
        name: "UserSearchIndex"
    }
);

export const User = mongoose.model("User", userSchema);

 