/* eslint-disable @typescript-eslint/naming-convention */
import { authenticate } from '@loopback/authentication';
import { inject, intercept } from '@loopback/context';
import { repository } from '@loopback/repository';
import { del, get, HttpErrors, oas, param, Response, RestBindings } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import fs from 'fs';
import { ValidateDongIdInterceptor } from '../interceptors';
import { Dongs, Users } from '../models';
import { DongsRepository, ReceiptsRepository } from '../repositories';
import { CurrentUserProfile } from '../services';
import { ReceiptsController } from './receipts.controller';

@authenticate('jwt.access')
@intercept(ValidateDongIdInterceptor.BINDING_KEY)
export class DongsReceiptsController {
  private readonly userId: typeof Users.prototype.userId;

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
      where: { userId: this.userId, dongId: dongId, deleted: false },
    });

    if (!foundReceipts) return;

    const fileName = foundReceipts.receiptName;
    const file = await this.receiptController.validateFileName(fileName);
    response.download(file.path, fileName);

    return response;
  }

  @del('/dongs/{dongId}/receipts', {
    summary: "Delete Dongs's receipts by dongId",
    responses: {
      204: { description: 'Dongs.Receipts DELETE success. No content' },
    },
  })
  async delete(@param.path.number('dongId') dongId: typeof Dongs.prototype.dongId) {
    try {
      const foundReceipt = await this.receiptRepo.findOne({
        fields: { receiptName: true },
        where: { userId: this.userId, dongId: dongId, deleted: false },
      });

      if (foundReceipt) {
        await this.dongRepo.receipt(dongId).patch({ deleted: true }, { userId: this.userId });
        const filePath = this.receiptController.getFilePath(foundReceipt.receiptName);
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }
}
