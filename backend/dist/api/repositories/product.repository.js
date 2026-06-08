"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = void 0;
const Product_model_1 = require("../models/Product.model");
exports.productRepository = {
    findById: (id) => Product_model_1.ProductModel.findById(id).exec(),
    listPublic: () => Product_model_1.ProductModel.find({}).sort({ createdAt: -1 }).exec(),
    create: (data) => Product_model_1.ProductModel.create(data),
    updateById: (id, data) => Product_model_1.ProductModel.findByIdAndUpdate(id, data, { new: true }).exec(),
    deleteById: (id) => Product_model_1.ProductModel.findByIdAndDelete(id).exec()
};
