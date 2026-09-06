import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {supportService} from '../services/support.service';

function authCustomerId(req: Request): string | undefined {
  return req.auth?.type === 'customer' ? req.auth.userId : undefined;
}

function guestSessionId(req: Request): string | undefined {
  const header = req.headers['x-guest-session-id'];
  return typeof header === 'string' && header.length > 0 ? header : undefined;
}

export const supportController = {
  async getMy(req: Request, res: Response, next: NextFunction) {
    try {
      const {conversation, unreadCount} =
        await supportService.getMyConversation({
          customerId: authCustomerId(req),
          guestSessionId: guestSessionId(req)
        });
      res.status(200).json({conversation, unreadCount});
    } catch (error) {
      next(error);
    }
  },

  async getOrCreateConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const conversation = await supportService.getOrCreateConversation({
        customerId: authCustomerId(req),
        guestSessionId:
          typeof req.body?.guestSessionId === 'string'
            ? req.body.guestSessionId
            : undefined,
        guestName:
          typeof req.body?.guestName === 'string'
            ? req.body.guestName
            : undefined,
        guestContact:
          typeof req.body?.guestContact === 'string'
            ? req.body.guestContact
            : undefined
      });
      res.status(200).json({conversation});
    } catch (error) {
      next(error);
    }
  },

  async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await supportService.listMessages(req.params.id, {
        customerId: authCustomerId(req),
        guestSessionId: guestSessionId(req)
      });
      res.status(200).json({messages});
    } catch (error) {
      next(error);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await supportService.sendByCustomer(
        req.params.id,
        req.body?.body ?? '',
        {
          customerId: authCustomerId(req),
          guestSessionId: guestSessionId(req)
        }
      );
      res.status(201).json({message});
    } catch (error) {
      next(error);
    }
  },

  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = await supportService.listForOwner();
      res.status(200).json({conversations});
    } catch (error) {
      next(error);
    }
  },

  async listMessagesAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await supportService.listMessagesForOwner(
        req.params.id
      );
      res.status(200).json({messages});
    } catch (error) {
      next(error);
    }
  },

  async sendMessageAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const message = await supportService.sendByOwner(
        req.auth.userId,
        req.params.id,
        req.body?.body ?? ''
      );
      res.status(201).json({message});
    } catch (error) {
      next(error);
    }
  },

  async closeConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await supportService.closeForOwner(req.params.id);
      res.status(200).json({conversation});
    } catch (error) {
      next(error);
    }
  }
};