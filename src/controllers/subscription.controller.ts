import {repository} from '@loopback/repository';
import {
  getModelSchemaRef,
  requestBody,
  post,
  HttpErrors,
  get,
  param,
} from '@loopback/rest';
import {service, intercept} from '@loopback/core';
import {Checkouts, CheckoutsRequest} from '../models';
import {CheckoutsRepository, UsersRepository} from '../repositories';
import {SubscriptionService} from '../services';
import {ValidatePhoneNumInterceptor} from '../interceptors';

export class SubscriptionsController {
  constructor(
    @repository(CheckoutsRepository) public checkoutsRepo: CheckoutsRepository,
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @service(SubscriptionService) public subsService: SubscriptionService,
  ) {}

  @intercept(ValidatePhoneNumInterceptor.BINDING_KEY)
  @post('/subscriptions/request-checkout/', {
    summary: "Get payment's gateway url",
    responses: {
      200: {
        description: 'Checkout instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Checkouts, {
              exclude: [
                'checkoutId',
                'phone',
                'userId',
                'status',
                'plan',
                'amount',
                'verifyRefId',
              ],
            }),
            examples: {
              zarinpal: {
                value: {
                  name: 'Navid',
                  gatewayUrl:
                    'https://www.zarinpal.com/pg/StartPay/A00000000000000000000000001234567890',
                },
              },
              idpay: {
                value: {
                  name: 'Navid',
                  gatewayUrl:
                    'https://idpay.ir/p/ws-sandbox/d2e353189823079e1e4181772cff5292',
                },
              },
            },
          },
        },
      },
      422: {description: 'Phone and/or plan is/are not allowed'},
    },
  })
  async getGatewayUrl(
    @param.query.string('plan', {
      schema: {enum: ['plan-1', 'plan-2', 'plan-3']},
    })
    plan: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CheckoutsRequest),
          example: {phone: '+989176502184'},
        },
      },
    })
    reqBody: CheckoutsRequest,
  ): Promise<Partial<Checkouts>> {
    try {
      const foundUser = await this.usersRepo.findOne({
        fields: {userId: true, name: true},
        where: {phone: reqBody.phone},
      });

      if (!foundUser) {
        throw new Error('شماره موبایل معتبر نیست');
      }

      const gateway = await this.subsService.getGatewayUrl(plan, reqBody.phone);

      const planAmount = this.subsService.getCheckoutAmount(plan);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.checkoutsRepo.create({
        checkoutId: gateway.authority,
        userId: foundUser.userId,
        phone: reqBody.phone,
        name: foundUser.name,
        gatewayUrl: gateway.url,
        plan: plan,
        amount: planAmount,
        status: 'PENDING',
      });

      return {
        name: foundUser.name,
        gatewayUrl: gateway.url,
      };
    } catch (error) {
      console.error(error.message);
      throw new HttpErrors.UnprocessableEntity(error.message);
    }
  }

  @get('/subscriptions/verify-transactions/{provider}', {
    summary: 'Call by payment gateway',
    description: 'Gateway calls this endpoint that known as a callback url',
    responses: {
      204: {description: 'Verified'},
      422: {description: 'Not verified'},
    },
  })
  async verifyTransaction(
    @param.path.string('provider', {
      required: true,
      schema: {enum: ['zarinpal', 'idpay']},
      examples: {
        zarinpal: {summary: 'Zarinpal callback', value: 'zarinpal'},
        idpay: {summary: 'IDPay callback', value: 'idpay'},
      },
    })
    provider: string,
    @param.query.string('Status', {
      required: false,
      schema: {enum: ['OK', 'NOK']},
      examples: {
        zarinpalSuccess: {summary: 'Zarinpal success', value: 'OK'},
        zarinpalFailed: {
          summary: 'Zarinpal failure',
          description:
            'Transaction failed beacuse either ' +
            '1. User canceled the transaction; or ' +
            '2. Gateway had an internal error',
          value: 'NOK',
        },
      },
    })
    txStatus: string,
    @param.query.string('Authority', {
      required: false,
      examples: {
        zarinpal: {
          summary: 'Zarinpal autority',
          value: 'A00000000000000000000000009876543210',
        },
        idpay: {
          summary: 'IDPay',
          value: undefined,
        },
      },
    })
    authority: string,
  ) {
    try {
      const foundCheckout = await this.checkoutsRepo.findById(authority);

      if (foundCheckout) {
        switch (provider) {
          case 'zarinpal':
            // eslint-disable-next-line no-case-declarations
            const vTx = await this.subsService.verifyZarinpalTransaction(
              authority,
              foundCheckout.amount,
            );
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.checkoutsRepo.updateById(authority, {
              status: txStatus,
              verifyRefId: vTx.RefID,
            });
            break;

          case 'idpay':
            break;

          default:
            break;
        }
      }

      return;
    } catch (err) {
      console.error(JSON.stringify(err));
      throw new HttpErrors.UnprocessableEntity(err);
    }
  }

  @post('/subscriptions', {responses: {204: {description: ''}}})
  getReport(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @requestBody({content: {'application/json': {schema: {}}}}) reqBody: any,
  ) {
    console.log(reqBody);
  }
}
