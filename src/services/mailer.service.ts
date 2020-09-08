import {bind, BindingScope} from '@loopback/core';

import {createTransport, SentMessageInfo} from 'nodemailer';
import Mail = require('nodemailer/lib/mailer');

import dotenv from 'dotenv';
dotenv.config();

const email = process.env.GMAIL_USER;
const pass = process.env.GMAIL_PASSWORD;

@bind({scope: BindingScope.SINGLETON})
export class MailerService {
  constructor() {}

  async sendMail(mailOptions: Mail.Options): Promise<SentMessageInfo> {
    const transporter = createTransport({
      service: 'gmail',
      auth: {user: email, pass: pass},
    });
    return transporter.sendMail({...mailOptions, from: email});
  }
}
