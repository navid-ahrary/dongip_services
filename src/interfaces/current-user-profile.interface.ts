import { UserProfile } from '@loopback/security';
import { Users } from '../models';

export interface CurrentUserProfile extends UserProfile, Partial<Users> {}
