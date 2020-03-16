/* eslint-disable @typescript-eslint/no-explicit-any */
import {bind, BindingScope} from '@loopback/core';
import Axios from 'axios';

import Debug from 'debug';
const debug = Debug('dongip');

import {config} from "dotenv";
config();

@bind({scope: BindingScope.TRANSIENT})
export class IpInfoService {
  constructor (
    private readonly token = process.env.IPINFO_TOKEN
  ) {}

  /*
  * get user data based on ip
  */
  public async getIpData (ip: string): Promise<any> {
    const response = await Axios.get(`https://ipinfo.io/${ip}?token=${this.token}`);
    debug(response);

    return response.data;
  }
}
