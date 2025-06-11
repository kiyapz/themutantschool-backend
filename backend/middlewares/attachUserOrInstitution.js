// middlewares/attachUserOrInstitution.js
import { User } from "../models/usersModels/user.model.js";
import { Institution } from "../models/usersModels/institution.model.js";
import { asyncErrorHandler } from "./asyncHandler.js";

export const attachUserOrInstitution = asyncErrorHandler(
  async (req, res, next) => {
    const { userId, role } = req.user;

    let userDoc;

    // Check role to decide whether to query User or Institution
    if (["admin", "affiliate", "instructor", "student"].includes(role)) {
      userDoc = await User.findById(userId);
    } else if (
      ["School", "College", "Academy", "Coaching Center", "others"].includes(
        role
      )
    ) {
      userDoc = await Institution.findById(userId);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user role/type" });
    }

    if (!userDoc) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    req.userDoc = userDoc;
    next();
  }
);
