import { AuthenticatedUser } from '../auth/supabase.guard';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {}; 