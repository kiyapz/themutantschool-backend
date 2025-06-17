import joi from "joi";

export const validationRegistration = (data) => {
  const schema = joi.object({
    firstName: joi.string().min(3).max(50).required(),
    lastName: joi.string().min(3).max(50).required(),
    username: joi.string().min(3).max(50).required(),
    role: joi.string().min(3).max(50).required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
  });
  return schema.validate(data);
};

export const validationInstitutionRegistration = (data) => {
  const schema = joi.object({
    name: joi.string().min(3).max(50).required(),
    institutionType: joi.string().min(3).max(50).required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    userNameId: joi.string().required(),
  });
  return schema.validate(data);
};

export const validateLogin = (data) => {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
  });
  return schema.validate(data);
};
