import { authService } from '../services/auth.service';
export const authController = {
    async register(req, res, next) {
        try {
            const result = await authService.register(req.body);
            res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    },
    async verify(req, res, next) {
        try {
            await authService.verify(req.body.email, req.body.code);
            res.status(200).json({ message: 'Verified' });
        }
        catch (error) {
            next(error);
        }
    },
    async resendVerification(req, res, next) {
        try {
            await authService.resendVerification(req.body.email);
            res.status(200).json({ message: 'Verification code resent' });
        }
        catch (error) {
            next(error);
        }
    },
    async login(req, res, next) {
        try {
            const tokens = await authService.login(req.body.email, req.body.password);
            res.status(200).json(tokens);
        }
        catch (error) {
            next(error);
        }
    },
    async refresh(req, res, next) {
        try {
            const result = await authService.refreshAccessToken(req.body.refreshToken);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
};
