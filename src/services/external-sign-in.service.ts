/* eslint-disable @typescript-eslint/naming-convention */
import { BindingScope, injectable } from '@loopback/core';
import axios from 'axios';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import jwt, { JwtPayload } from 'jsonwebtoken';
import _ from 'lodash';
import moment from 'moment-timezone';
import NodeRSA from 'node-rsa';

const APPLE_IDENTITY_URL = process.env.APPLE_IDENTITY_URL ?? '';
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';

@injectable({ scope: BindingScope.TRANSIENT })
export class ExternalSignInService {
  googleClient: OAuth2Client;

  constructor() {}

  public async signInWithGoogle(token: string): Promise<TokenPayload> {
    try {
      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        audience: GOOGLE_CLIENT_ID,
        idToken: token,
      });
      const payload = ticket.getPayload();

      if (payload) {
        return payload;
      } else {
        throw new Error('Google sign in failed');
      }
    } catch (err) {
      throw new Error(err.message);
    }
  }

  public async signInWithApple(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('token not valid');
      }

      const kid = decoded.header.kid;
      const pubKey = await this.getApplePublicKey(kid);

      const jwtClaims = jwt.verify(token, pubKey, { algorithms: ['RS256'] }) as JwtPayload;

      if (jwtClaims.iss !== APPLE_IDENTITY_URL)
        throw new Error('Apple identity token wrong issuer: ' + jwtClaims.iss);
      if (jwtClaims.aud !== APPLE_CLIENT_ID)
        throw new Error('Apple identity token wrong audience: ' + jwtClaims.aud);
      if (!jwtClaims.exp || jwtClaims.exp < moment.utc().unix())
        throw new Error('Apple identity token expired');

      return jwtClaims as TokenPayload;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  private async getApplePublicKey(kid: string): Promise<string> {
    try {
      const url = APPLE_IDENTITY_URL + '/auth/keys';
      const res = await axios({ method: 'GET', url });
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
