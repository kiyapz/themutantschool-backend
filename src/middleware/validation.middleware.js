// middleware/validation.middleware.js
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import apiError from "../utils/apiError.js";

/**
 * Middleware to validate MongoDB ObjectIDs in route parameters
 * @param {string} paramName - The name of the parameter to validate
 * @returns {Function} Express middleware function
 */
export const validateObjectId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id) {
            return next(new apiError(400, `${paramName} is required`));
        }
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new apiError(400, `Invalid ${paramName} format`));
        }
        
        next();
    };
};

/**
 * Middleware to validate request body using express-validator
 * Processes validation results from express-validator middleware chain
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.param,
            message: error.msg
        }));
        
        return next(new apiError(400, "Validation error", errorMessages));
    }
    
    next();
};

/**
 * Middleware to validate request query parameters
 * @param {Object} schema - Joi schema for validation
 * @returns {Function} Express middleware function
 */
export const validateQueryParams = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.query);
        
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            return next(new apiError(400, errorMessage));
        }
        
        next();
    };
};

/**
 * Middleware to validate array of IDs
 * @param {string} fieldName - The name of the field containing the array
 * @param {string} location - Where to find the field ('body', 'query', or 'params')
 * @returns {Function} Express middleware function
 */
export const validateObjectIdArray = (fieldName, location = 'body') => {
    return (req, res, next) => {
        const array = req[location][fieldName];
        
        if (!array || !Array.isArray(array)) {
            return next(new apiError(400, `${fieldName} must be an array`));
        }
        
        const invalidIds = array.filter(id => !mongoose.Types.ObjectId.isValid(id));
        
        if (invalidIds.length > 0) {
            return next(new apiError(400, `Invalid ID format in ${fieldName}`));
        }
        
        next();
    };
};
