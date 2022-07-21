import { BindingScope, injectable } from '@loopback/core';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import _ from 'lodash';
import NodeRSA from 'node-rsa';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const APPLE_IDENTITY_URL = 'https://appleid.apple.com/';
@injectable({ scope: BindingScope.SINGLETON })
export class ExternalSignInService {
  googleClient: OAuth2Client;

  constructor(GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '') {
    this.googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  }

  public async signInWithGoogle(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      return payload;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  signInWithApple(token: string) {}

  private async getApplePublicKey(kid: string): Promise<string> {
    try {
      const url = APPLE_IDENTITY_URL + '/auth/keys';
      const res = await axios({ url, method: 'GET' });
      const keys = res.data.keys;
      const key = _.find(keys, k => k.kid === kid);
      if (!key) {
        throw new Error('Apple public key not found');
      }

      const pubKey = new NodeRSA();
      pubKey.importKey(
        {
          n: Buffer.from(key.n, 'base64'),
          e: Buffer.from(key.e, 'base64'),
        },
        'components-public',
      );
      return pubKey.exportKey('public');
    } catch (err) {
      throw new Error(err.message);
    }
  }
}
