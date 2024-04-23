import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { TokenTvl } from "../entities";

@Injectable()
export class TokenTvlRepository extends BaseRepository<TokenTvl> {
  public constructor(unitOfWork: UnitOfWork) {
    super(TokenTvl, unitOfWork);
  }

  public async getTokensTvl(): Promise<TokenTvl[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.find<TokenTvl>(TokenTvl);
  }

  public createDefaultTokenTvl(address: string): TokenTvl {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      address: address,
      tvl: 0,
      balance: 0,
    };
  }
}
