// middleware/auth.middleware.js
import apiError from "../utils/apiError.js";

export const authorizeAdmin = (req, res, next) => {
    if (!req.user) {
        return next(new apiError(401, "Authentication required"));
    }
    
    if (req.user.role !== 'admin') {
        return next(new apiError(403, "Admin access required"));
    }
    
    next();
};
