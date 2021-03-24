import { UserProfile } from '@loopback/security';
import { Settings, Users, UsersRels } from '../models';

export interface CurrentUserProfile extends UserProfile, Partial<Omit<Users, 'userId'>> {
  selfUserRelId?: typeof UsersRels.prototype.userId;
  language?: typeof Settings.prototype.language;
  timezone?: string;
}
