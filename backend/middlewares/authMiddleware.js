import jwt from "jsonwebtoken";
import { User } from "../models/usersModels/user.model.js";
import { Institution } from "../models/usersModels/institution.model.js";
import { InstitutionUser } from "../models/usersModels/InstitutionUser .js";
export const authenticate = (model = "user") => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("🚫 No Bearer token found");
      return res.status(401).json({ message: "Unauthorized. Token missing." });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔐 Raw Token:", token);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Decoded Token:", decoded);
      console.log("🧩 Model being authenticated:", model);

      let user;
      if (model === "user") {
        user = await User.findById(decoded.userId).select("-password");
        console.log("🔎 User found:", user);
      } else if (model === "institution") {
        user = await Institution.findById(decoded.userId).select("-password");
        console.log("🏫 Institution found:", user);
      } else if (model === "institutionUser") {
        user = await InstitutionUser.findById(decoded.userId).select(
          "-password"
        );
        console.log("👥 InstitutionUser found:", user);
      }

      if (!user) {
        console.log("🚫 No user found for decoded ID:", decoded.userId);
        return res.status(401).json({ message: "Invalid token user" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("❌ JWT verification failed:", error.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};
