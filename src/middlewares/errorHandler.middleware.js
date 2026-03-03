import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors
        });
    }

    // For unhandled errors, log them and send a generic 500 response
    console.error(err);
    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        errors: []
    });
};

export { errorHandler };
