// middlewares/accessControl.middleware.js
export const canAccessUser = (req, res, next) => {
  const currentUser = req.user || req.institution;
  const targetUserId = req.params.id;

  if (
    currentUser.role === "admin" ||
    currentUser._id.toString() === targetUserId
  ) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden: Access denied" });
};

export const canAccessInstitution = (req, res, next) => {
  const user = req.institution || req.user;
  const targetId = req.params.id;

  if (user.role === "admin" || user._id.toString() === targetId) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden: Access denied" });
};

export const canAssignUser = (req, res, next) => {
  const actor = req.user || req.institution;
  const targetInstitutionId = req.body.institutionId;

  // 🪵 Log actor details
  console.log("🔐 canAssignUser → Actor:", {
    id: actor?._id?.toString(),
    role: actor?.role,
    model: actor?.model,
  });

  // 🪵 Log incoming institution ID from body
  console.log("📥 Request Body Institution ID:", targetInstitutionId);

  // Handle missing ID
  if (!targetInstitutionId) {
    console.warn("❌ Missing institutionId in request body");
    return res
      .status(400)
      .json({ message: "Missing institutionId in request body" });
  }

  // Check access rights
  const isAdmin = actor?.role === "admin";
  const isInstitution =
    actor?._id?.toString() === targetInstitutionId &&
    (actor?.role === "institution" || actor?.model === "Institution");

  console.log("✅ isAdmin:", isAdmin);
  console.log("✅ isInstitution:", isInstitution);

  if (isAdmin || isInstitution) {
    return next();
  }

  console.warn("❌ Access denied: not admin or matching institution");
  return res.status(403).json({ message: "Access denied" });
};
