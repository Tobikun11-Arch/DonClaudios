"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerRepository = void 0;
const Customer_model_1 = require("../models/Customer.model");
exports.customerRepository = {
    findByEmail: (email) => Customer_model_1.CustomerModel.findOne({ email: email.toLowerCase() }).exec(),
    findByPhoneNumber: (phoneNumber) => Customer_model_1.CustomerModel.findOne({ phoneNumber }).exec(),
    findByEmailOrPhoneNumber: (identifier) => Customer_model_1.CustomerModel.findOne({
        $or: [{ email: identifier.toLowerCase() }, { phoneNumber: identifier }]
    }).exec(),
    findById: (id) => Customer_model_1.CustomerModel.findById(id).exec(),
    listAll: () => Customer_model_1.CustomerModel.find({}).exec(),
    create: (data) => Customer_model_1.CustomerModel.create(data),
    updateProfile: (customerId, data) => Customer_model_1.CustomerModel.updateOne({ _id: customerId }, data).exec(),
    setVerificationCode: (email, code, expiry) => Customer_model_1.CustomerModel.updateOne({ email: email.toLowerCase() }, { verificationCode: code, verificationExpiry: expiry }).exec(),
    clearVerificationCode: (email) => Customer_model_1.CustomerModel.updateOne({ email: email.toLowerCase() }, { verificationCode: null, verificationExpiry: null }).exec(),
    markVerified: (email) => Customer_model_1.CustomerModel.updateOne({ email: email.toLowerCase() }, { isVerified: true, verificationCode: null, verificationExpiry: null }).exec()
};
