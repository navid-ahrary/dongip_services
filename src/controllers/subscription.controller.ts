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
import {
  ValidatePhoneNumInterceptor,
  ValidateSubscriptionPlanstInterceptor,
} from '../interceptors';

export class SubscriptionController {
  constructor(
    @repository(CheckoutsRepository) public checkoutsRepo: CheckoutsRepository,
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @service(SubscriptionService) public subsService: SubscriptionService,
  ) {}

  @intercept(
    ValidatePhoneNumInterceptor.BINDING_KEY,
    ValidateSubscriptionPlanstInterceptor.BINDING_KEY,
  )
  @post('/subscription/request-checkout/', {
    summary: "Get payment's gateway url",
    responses: {
      200: {
        description: 'Checkout instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Checkouts, {
              exclude: [
                'authority',
                'phone',
                'name',
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
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CheckoutsRequest),
          examples: {
            '1 month': {
              summary: '1 month gold',
              value: {phone: '+989173456789', plan: '1MG'},
            },
            '6 month': {
              summary: '6 month gold',
              value: {phone: '+989173456789', plan: '6MG'},
            },
            '1 year': {
              summary: '1 year gold',
              value: {phone: '+989173456789', plan: '1YG'},
            },
          },
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

      const gateway = await this.subsService.getGatewayUrl(
        reqBody.plan,
        reqBody.phone,
      );

      const planAmount = this.subsService.getCheckoutAmount(reqBody.plan);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.checkoutsRepo.create({
        userId: foundUser.userId,
        phone: reqBody.phone,
        name: foundUser.name,
        authority: gateway.authority,
        gatewayUrl: gateway.url,
        plan: reqBody.plan,
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

  @get('/subscription/verify-transaction/{provider}', {
    summary: 'Call by peyment gateway',
    description: 'Gateway calls this endpoint that known as a callback url',
    responses: {
      204: {description: 'Verified'},
      422: {description: 'Not verified'},
    },
  })
  async verifyTransaction(
    @param.path.string('provider', {
      required: true,
      examples: {
        zarinpal: {
          summary: 'Zarinpal gateway callback reference',
          value: 'zarinpal',
        },
        idpay: {summary: 'IDPay gateway callback reference', value: 'idpay'},
      },
    })
    provider: string,
    @param.query.string('Status', {
      required: true,
      examples: {
        zarinpalSuccess: {summary: 'Zarinpal success', value: 'OK'},
        zarinpalFailed: {summary: 'Zarinpal failure', value: 'NOK'},
      },
    })
    txStatus: string,
    @param.query.string('Authority', {
      required: true,
      examples: {
        zarinpal: {
          summary: 'Zarinpal',
          value: 'A00000000000000000000000009876543210',
        },
        idpay: {
          summary: 'IDPay',
        },
      },
    })
    authority: string,
  ) {
    try {
      const castedAuthority = this.subsService.castString(authority);
      const foundCheckout = await this.checkoutsRepo.findById(castedAuthority);

      if (foundCheckout) {
        if (provider === 'zarinpal') {
          if (txStatus === 'OK') {
            const vTx = await this.subsService.verifyZarinpalTransaction(
              authority,
              foundCheckout.amount,
            );

            if (vTx.status === 100) {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.checkoutsRepo.updateById(foundCheckout.getId(), {
                status: txStatus,
                verifyRefId: vTx.RefID,
              });
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.checkoutsRepo.updateById(foundCheckout.getId(), {
              status: txStatus,
            });
          }

          return;
        }
      }
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }
}
