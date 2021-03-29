import { del, get, param, RestBindings, Response, HttpErrors, oas } from '@loopback/rest';
import { inject, intercept } from '@loopback/context';
import { SecurityBindings, securityId } from '@loopback/security';
import { repository } from '@loopback/repository';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { authenticate } from '@loopback/authentication';
import Fs from 'fs';
import { Dongs, Users } from '../models';
import { ReceiptsRepository, DongsRepository } from '../repositories';
import { ValidateDongIdInterceptor } from '../interceptors';
import { ReceiptsController } from './receipts.controller';
import { CurrentUserProfile } from '../services';

@authenticate('jwt.access')
@intercept(ValidateDongIdInterceptor.BINDING_KEY)
export class DongsReceiptsController {
  private readonly userId: typeof Users.prototype.userId;

  /**
   * Constructor
   * @param handler - Inject an express request handler to deal with the request
   */
  constructor(
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @inject('controllers.ReceiptsController') public receiptController: ReceiptsController,
    @repository(DongsRepository) private dongRepo: DongsRepository,
    @repository(ReceiptsRepository) private receiptRepo: ReceiptsRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
  }

  @get('/dongs/{dongId}/receipts')
  @oas.response.file('image/jpeg', 'image/jpg', 'image/png')
  async downloafDongsReceipts(
    @param.path.number('dongId') dongId: typeof Dongs.prototype.dongId,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<Response | undefined> {
    const foundReceipts = await this.receiptRepo.findOne({
      where: { userId: this.userId, dongId: dongId },
    });

    if (!foundReceipts) return;

    const fileName = foundReceipts.receiptName;
    const file = await this.receiptController.validateFileName(fileName);
    response.download(file.path, fileName);

    return response;
  }

  @del('/dongs/{dongId}/receipts', {
    summary: "Delete Dongs's receipts by dongId",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': { description: 'Dongs.Receipts DELETE success. No content' },
    },
  })
  async delete(@param.path.number('dongId') dongId: typeof Dongs.prototype.dongId) {
    try {
      const foundReceipt = await this.receiptRepo.findOne({
        fields: { receiptName: true },
        where: { userId: this.userId, dongId: dongId },
      });

      if (foundReceipt) {
        await this.dongRepo.receipt(dongId).delete({ userId: this.userId });
        const filePath = this.receiptController.getFilePath(foundReceipt.receiptName);
        Fs.unlinkSync(filePath);
      }
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }
}
