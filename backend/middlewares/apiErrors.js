import { logger } from "../utils/logger.js";
import CustomError from "./costumError.js";
// 404 Middleware
export const notFoundHandler = (req, res, next) => {
  const error = new CustomError(
    `Can't find ${req.originalUrl} on the server`,
    404
  );
  next(error);
};
